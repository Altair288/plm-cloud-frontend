import React, { useRef, useState, useEffect } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  PartitionOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { Button, message, Modal, Form, Input, Tag } from 'antd';
import type { ProColumns, ActionType } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { MetaCategoryBrowseNodeDto, metaCategoryApi } from '@/services/metaCategory';

interface Props {
  parentKey?: React.Key;
  parentNode?: any; // CategoryTreeNode type
}

interface CategoryTableItem extends MetaCategoryBrowseNodeDto {
  level: 'segment' | 'family' | 'class' | 'commodity' | 'item';
  parentKey?: string;
  familyCode?: string;
}

const CategoryList: React.FC<Props> = ({ parentKey, parentNode }) => {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [currentRow, setCurrentRow] = useState<CategoryTableItem | null>(null);

  // Mock Request: Fetch children based on parentNode
  const fetchData = async () => {
    if (!parentNode) return { data: [], success: true };

    try {
      const node = parentNode;
      let items: CategoryTableItem[] = [];

      if (node.level === 'segment') {
        const families = await metaCategoryApi.listUnspscFamilies(node.dataRef.code);
        items = families.map(f => ({ ...f, level: 'family', parentKey: node.key as string }));
      } else if (node.level === 'family') {
        const groups = await metaCategoryApi.listUnspscClassesWithCommodities(node.dataRef.code);
        items = groups.map(g => ({ ...g.clazz, level: 'class', parentKey: node.key as string }));
      } else if (node.level === 'class') {
        if (!node.familyCode) {
          // Fallback for missing context
          return { data: [], success: true };
        }
        const groups = await metaCategoryApi.listUnspscClassesWithCommodities(node.familyCode);
        const targetGroup = groups.find(g => g.clazz.key === node.dataRef?.key || g.clazz.code === node.dataRef?.code);
        if (targetGroup && targetGroup.commodities) {
          items = targetGroup.commodities.map(c => ({ ...c, level: 'commodity', parentKey: node.key as string }));
        }
      } else if (node.level === 'commodity') {
        if (!node.classCode) {
          return { data: [], success: true };
        }
        const groups = await metaCategoryApi.listUnspscClassesWithCommodities(node.classCode);
        const targetGroup = groups.find(g => g.clazz.key === node.dataRef?.key || g.clazz.code === node.dataRef?.code);
        if (targetGroup && targetGroup.commodities) {
          items = targetGroup.commodities.map(c => ({ ...c, level: 'item', parentKey: node.key as string }));
        }
      }
      return { data: items, success: true };
    } catch (error) {
      console.error(error);
      return { data: [], success: false };
    }
  };

  useEffect(() => {
    if (actionRef.current) {
      actionRef.current.reload();
    }
  }, [parentKey]);

  const handleCreate = () => {
    setModalType('create');
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: CategoryTableItem) => {
    setModalType('edit');
    setCurrentRow(record);
    form.setFieldsValue({
      code: record.code,
      title: record.title
    });
    setIsModalVisible(true);
  };

  const handleDelete = (record: CategoryTableItem) => {
    Modal.confirm({
      title: 'Are you sure?',
      content: `Delete ${record.level}: ${record.title}?`,
      onOk: () => {
        message.success('Mock Delete Success');
        actionRef.current?.reload();
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Submit', modalType, values);
      // Mock API call
      message.success(`${modalType === 'create' ? 'Created' : 'Updated'} successfully`);
      setIsModalVisible(false);
      actionRef.current?.reload();
    } catch (e) {
      // validate failed
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'segment': return <AppstoreOutlined className="mr-2" />;
      case 'family': return <PartitionOutlined className="mr-2" />;
      case 'class': return <PartitionOutlined className="mr-2" />;
      case 'commodity': return <TagsOutlined className="mr-2" />;
      default: return null;
    }
  };

  const columns: ProColumns<CategoryTableItem>[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      width: 150,
      copyable: true,
      render: (dom) => <div className="flex items-center h-full text-base">{dom}</div>
    },
    {
      title: 'Title',
      dataIndex: 'title',
      ellipsis: true,
      render: (_, record) => (
        <div className="flex items-center h-full text-base">
          {getLevelIcon(record.level)}
          <span>{record.title}</span>
        </div>
      )
    },
    {
      title: 'Level',
      dataIndex: 'level',
      width: 120,
      render: (_, record) => (
        <div className="flex items-center h-full">
          <Tag icon={getLevelIcon(record.level)}>{record.level?.toUpperCase()}</Tag>
        </div>
      )
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <div className="flex items-center h-full gap-2">
          <a key="edit" onClick={() => handleEdit(record)}><EditOutlined /> Edit</a>
          <a key="delete" className="text-red-500" onClick={() => handleDelete(record)}><DeleteOutlined /> Delete</a>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="category-list-container">
        <style>{`
            .category-list-container .ant-table-body {
                overflow-y: auto !important;
            }
          `}</style>
        <ProTable<CategoryTableItem>
          headerTitle={parentNode ? <>{parentNode.title} - Children</> : 'Children List'}
          actionRef={actionRef}
          rowKey="key"
          search={false}
          options={false}
          request={fetchData}
          pagination={{
            defaultPageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50', '100'],
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 总共 ${total} 条`,
          }}
          toolBarRender={() => [
            <Button key="button" icon={<PlusOutlined />} type="primary" onClick={handleCreate}>
              New Child
            </Button>,
          ]}
          columns={columns}
          size="middle"
          scroll={{ y: 'calc(100vh - 400px)' }}
        />
      </div>
      <Modal
        title={modalType === 'create' ? 'Create New Category' : 'Edit Category'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. 10000000" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Live Plant and Animal Material" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CategoryList;
