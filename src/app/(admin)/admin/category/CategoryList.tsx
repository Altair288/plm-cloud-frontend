import React, { useRef, useState, useEffect } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  PartitionOutlined,
  TagsOutlined,
  EllipsisOutlined
} from '@ant-design/icons';
import { Button, message, Modal, Form, Input, Tag, Dropdown, MenuProps, Space } from 'antd';
import type { ProColumns, ActionType } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { MetaCategoryBrowseNodeDto, metaCategoryApi } from '@/services/metaCategory';

interface Props {
  parentKey?: React.Key;
  parentNode?: any; // CategoryTreeNode type
  onDesignAttribute?: (record: CategoryTableItem) => void;
}

interface CategoryTableItem extends MetaCategoryBrowseNodeDto {
  level: 'segment' | 'family' | 'class' | 'commodity' | 'item';
  parentKey?: string;
  familyCode?: string;
}

const CategoryList: React.FC<Props> = ({ parentKey, parentNode, onDesignAttribute }) => {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [currentRow, setCurrentRow] = useState<CategoryTableItem | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Context Menu State
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    record: CategoryTableItem | null;
  }>({ visible: false, x: 0, y: 0, record: null });

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenuState.visible) {
        setContextMenuState({ ...contextMenuState, visible: false });
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [contextMenuState]);

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
      title: '编码',
      dataIndex: 'code',
      width: 150,
      copyable: true,
      render: (dom) => <div className="flex items-center h-full text-base">{dom}</div>
    },
    {
      title: '标题',
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
      title: '级别',
      dataIndex: 'level',
      width: 120,
      render: (_, record) => (
        <div className="flex items-center h-full">
          <Tag color={getLevelColor(record.level)}>{record.level?.toUpperCase()}</Tag>
        </div>
      )
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => {
        // High frequency actions
        const actions = [];

        if (record.level === 'commodity' || record.level === 'item') {
          actions.push(
            <a
              key="attr"
              onClick={() => onDesignAttribute?.(record)}
            >
              属性设计
            </a>
          );
        }

        actions.push(
          <a key="edit" onClick={() => handleEdit(record)}>编辑</a>
        );

        // Low frequency actions in dropdown
        const moreItems: MenuProps['items'] = [
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(record)
          }
        ];

        return [
          <Space size="middle" key="actions">
            {actions}
          </Space>,
          <Dropdown key="more" menu={{ items: moreItems }} placement="bottomLeft">
            <a className="ant-dropdown-link" onClick={e => e.preventDefault()}>
              <EllipsisOutlined style={{ fontSize: 16 }} />
            </a>
          </Dropdown>
        ];
      },
    },
  ];

  const menuItems: MenuProps['items'] = [
    {
      key: 'attr',
      label: '属性设计',
      icon: <TagsOutlined />,
      disabled: !(contextMenuState.record?.level === 'commodity' || contextMenuState.record?.level === 'item'),
      onClick: () => {
        if (contextMenuState.record) onDesignAttribute?.(contextMenuState.record);
      }
    },
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => {
        if (contextMenuState.record) handleEdit(contextMenuState.record);
      }
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        if (contextMenuState.record) handleDelete(contextMenuState.record);
      }
    }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'segment': return 'blue';
      case 'family': return 'cyan';
      case 'class': return 'geekblue';
      case 'commodity': return 'purple';
      case 'item': return 'magenta';
      default: return 'default';
    }
  };

  return (
    <>
      <div className="category-list-container">
        <style>{`
            .category-list-container .ant-table-body {
                overflow-y: auto !important;
            }
          `}</style>
        <ProTable<CategoryTableItem>
          headerTitle={parentNode ? <>{parentNode.title}</> : 'Children List'}
          actionRef={actionRef}
          rowKey="key"
          search={false}
          options={false}
          request={fetchData}
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          tableAlertRender={false}
          onRow={(record) => ({
            onContextMenu: (e) => {
              e.preventDefault();
              setContextMenuState({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                record,
              });
            }
          })}
          toolBarRender={() => [
            selectedRowKeys.length > 0 && (
              <Space key="batch">
                <Button
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: '批量删除',
                      content: `确定要删除这 ${selectedRowKeys.length} 个项目吗？`,
                      onOk: () => {
                        message.success('批量删除成功');
                        setSelectedRowKeys([]);
                        actionRef.current?.reload();
                      }
                    })
                  }}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Space>
            ),
            <Button key="button" icon={<PlusOutlined />} type="primary" onClick={handleCreate}>
              新建子项
            </Button>,
          ]}
          columns={columns}
          size="small"
          scroll={{ y: 'calc(100vh - 325px)' }}
        />
      </div>

      {/* Context Menu Anchor */}
      <Dropdown
        key={`${contextMenuState.x}-${contextMenuState.y}`}
        menu={{ items: menuItems }}
        open={contextMenuState.visible}
        trigger={['contextMenu']}
        onOpenChange={(v) => { if (!v) setContextMenuState(s => ({ ...s, visible: false })) }}
      >
        <span style={{ position: 'fixed', left: contextMenuState.x, top: contextMenuState.y, width: 1, height: 1 }} />
      </Dropdown>

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
