import React, { useState } from 'react';
import { theme, Splitter, Button, Space, message } from 'antd';
import { PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import CategoryTree from './components/CategoryTree';
import CategoryDetail from './components/CategoryDetail';
import CategoryMarketplace, { type CartItem } from './components/CategoryMarketplace';

const CategoryPage: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG, colorBorderSecondary },
  } = theme.useToken();

  const [selectedKey, setSelectedKey] = useState<React.Key>('CAT-001-01');
  const [selectedNode, setSelectedNode] = useState<DataNode | undefined>({ title: '休闲零食', key: 'CAT-001-01-01' }); // 默认选中一个用于展示
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [marketplaceVisible, setMarketplaceVisible] = useState(false);
  
  const onSelect: TreeProps['onSelect'] = (keys, info) => {
    if (keys.length > 0) {
      setSelectedKey(keys[0]);
      setSelectedNode(info.node);
    } else {
      setSelectedKey('');
      setSelectedNode(undefined);
    }
  };

  const handleMarketplaceOk = (items: CartItem[]) => {
    console.log('Imported items:', items);
    message.success(`成功导入 ${items.length} 个分类及其属性配置！`);
    setMarketplaceVisible(false);
    // 这里后续可以调用API将 items 保存到用户的分类树中
  };

  return (
    <div style={{ height: 'calc(100vh - 201px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />}>新建分类</Button>
          <Button icon={<ShoppingCartOutlined />} onClick={() => setMarketplaceVisible(true)}>从标准库导入</Button>
        </Space>
      </div>

      <Splitter
        onCollapse={(collapsed) => setLeftCollapsed(collapsed[0] ?? false)}
        style={{
          flex: 1,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          border: `1px solid ${colorBorderSecondary}`,
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Splitter.Panel
          defaultSize={280}
          min={200}
          max={600}
          collapsible={{ end: true, showCollapsibleIcon: leftCollapsed ? true : 'auto' }}
        >
          <CategoryTree onSelect={onSelect} />
        </Splitter.Panel>
        <Splitter.Panel>
          <div style={{ height: '100%', padding: '24px 0' }}>
            <CategoryDetail selectedKey={selectedKey} selectedNode={selectedNode} />
          </div>
        </Splitter.Panel>
      </Splitter>

      <CategoryMarketplace 
        open={marketplaceVisible}
        onCancel={() => setMarketplaceVisible(false)}
        onOk={handleMarketplaceOk}
      />
    </div>
  );
};

export default CategoryPage;
