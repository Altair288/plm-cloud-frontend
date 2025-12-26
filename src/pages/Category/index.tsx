import React, { useState } from 'react';
import { theme, Splitter, Button, Space, message, Modal, Input, Form } from 'antd';
import { PlusOutlined, ShoppingCartOutlined, FolderOutlined } from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import CategoryTree from './components/CategoryTree';
import CategoryDetail from './components/CategoryDetail';
import CategoryMarketplace from './components/CategoryMarketplace';
import { defaultUserTreeData } from './mockData';

const CategoryPage: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG, colorBorderSecondary },
  } = theme.useToken();

  const [selectedKey, setSelectedKey] = useState<React.Key>('CAT-001-01');
  const [selectedNode, setSelectedNode] = useState<DataNode | undefined>({ title: '休闲零食', key: 'CAT-001-01-01' }); // 默认选中一个用于展示
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [marketplaceVisible, setMarketplaceVisible] = useState(false);
  const [treeData, setTreeData] = useState<DataNode[]>(defaultUserTreeData);

  // 新建分类相关状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createParentKey, setCreateParentKey] = useState<React.Key | null>(null); // null 表示根节点
  const [form] = Form.useForm();
  
  const onSelect: TreeProps['onSelect'] = (keys, info) => {
    if (keys.length > 0) {
      setSelectedKey(keys[0]);
      setSelectedNode(info.node);
    } else {
      setSelectedKey('');
      setSelectedNode(undefined);
    }
  };

  // --- CRUD Logic ---

  const handleDeleteCategory = (key: React.Key) => {
    const deleteNode = (data: DataNode[]): DataNode[] => {
      return data
        .filter(item => item.key !== key)
        .map(item => {
          if (item.children) {
            return {
              ...item,
              children: deleteNode(item.children),
            };
          }
          return item;
        });
    };

    setTreeData(prev => deleteNode(prev));
    message.success('分类已删除');
    setSelectedKey('');
    setSelectedNode(undefined);
  };

  const handleOpenCreateModal = (parentKey: React.Key | null = null) => {
    setCreateParentKey(parentKey);
    form.resetFields();
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = () => {
    form.validateFields().then(values => {
      const newKey = `NEW-${Date.now()}`;
      const newNode: DataNode = {
        title: values.name,
        key: newKey,
        icon: <FolderOutlined />,
        isLeaf: true,
      };

      if (createParentKey === null) {
        // Add to root (In this mock, we might want to restrict root addition or just add it)
        // For now, let's assume root addition is allowed and it's a new "Industry" or top level category
        setTreeData(prev => [...prev, newNode]);
      } else {
        // Add to parent
        const addNode = (data: DataNode[]): DataNode[] => {
          return data.map(node => {
            if (node.key === createParentKey) {
              return {
                ...node,
                children: [...(node.children || []), newNode],
                isLeaf: false,
              };
            }
            if (node.children) {
              return {
                ...node,
                children: addNode(node.children),
              };
            }
            return node;
          });
        };
        setTreeData(prev => addNode(prev));
      }

      message.success('分类创建成功');
      setCreateModalVisible(false);
    });
  };

  const handleMarketplaceOk = (newTreeData: DataNode[]) => {
    setTreeData(newTreeData);
    message.success('分类导入成功');
    setMarketplaceVisible(false);
  };

  return (
    <div style={{ height: 'calc(100vh - 201px)', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreateModal(null)}>新建分类</Button>
          <Button icon={<ShoppingCartOutlined />} onClick={() => setMarketplaceVisible(true)}>从标准库导入</Button>
        </Space>
      </div>

      <Splitter
        onCollapse={(collapsed) => setLeftCollapsed(collapsed[0] ?? false)}
        style={{
          flex: 1,
          minHeight: 0,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          border: `1px solid ${colorBorderSecondary}`,
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <Splitter.Panel
          defaultSize={280}
          min={200}
          max={600}
          collapsible={{ end: true, showCollapsibleIcon: leftCollapsed ? true : 'auto' }}
        >
          <CategoryTree onSelect={onSelect} treeData={treeData} />
        </Splitter.Panel>
        <Splitter.Panel>
          <div style={{ height: '100%', padding: '24px 0' }}>
            <CategoryDetail 
              selectedKey={selectedKey} 
              selectedNode={selectedNode} 
              onDelete={handleDeleteCategory}
              onCreateSub={handleOpenCreateModal}
            />
          </div>
        </Splitter.Panel>
      </Splitter>

      <CategoryMarketplace 
        open={marketplaceVisible}
        onCancel={() => setMarketplaceVisible(false)}
        onOk={handleMarketplaceOk}
        userTreeData={treeData}
      />

      <Modal
        title={createParentKey ? "新建子分类" : "新建根分类"}
        open={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="分类编码"
            initialValue={`CAT-${Date.now()}`} // Auto-generate a mock code
          >
            <Input disabled placeholder="自动生成" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryPage;
