import React from 'react';
import { Card, Descriptions, Tabs, Tag, Typography, Empty, Button, Space } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

const { Title } = Typography;

interface CategoryDetailProps {
  selectedKey?: React.Key;
  selectedNode?: DataNode;
}

const CategoryDetail: React.FC<CategoryDetailProps> = ({ selectedKey, selectedNode }) => {
  if (!selectedKey) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
        <Empty description="请选择左侧分类查看详情" />
      </div>
    );
  }

  // 模拟根据 selectedKey 获取的数据
  const isIndustry = String(selectedKey).startsWith('IND');
  
  const items = [
    {
      key: '1',
      label: '基础信息',
      children: (
        <Card bordered={false} title="基本信息" extra={<Button type="link" icon={<EditOutlined />}>编辑</Button>}>
          <Descriptions column={2}>
            <Descriptions.Item label="分类名称">{typeof selectedNode?.title === 'function' ? (selectedNode!.title as (data: DataNode) => React.ReactNode)(selectedNode as DataNode) : selectedNode?.title}</Descriptions.Item>
            <Descriptions.Item label="分类编码">{selectedKey}</Descriptions.Item>
            <Descriptions.Item label="类型">
                {isIndustry ? <Tag color="blue">行业分类</Tag> : <Tag color="green">自定义分类</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color="success">启用</Tag></Descriptions.Item>
            <Descriptions.Item label="创建人">System Admin</Descriptions.Item>
            <Descriptions.Item label="创建时间">2025-01-01</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {isIndustry ? '系统预置的行业标准分类，不可删除。' : '用户自定义的物料/产品分类文件夹。'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: '2',
      label: '扩展属性',
      children: (
        <Card bordered={false} title="属性定义" extra={<Button type="primary" size="small" icon={<PlusOutlined />}>添加属性</Button>}>
           <ProTable
            search={false}
            options={false}
            pagination={false}
            dataSource={[
                { id: 1, name: '材质', code: 'MATERIAL', type: '文本', required: '是' },
                { id: 2, name: '重量(kg)', code: 'WEIGHT', type: '数值', required: '否' },
                { id: 3, name: '供应商', code: 'VENDOR', type: '引用', required: '是' },
            ]}
            columns={[
                { title: '属性名称', dataIndex: 'name' },
                { title: '属性编码', dataIndex: 'code' },
                { title: '数据类型', dataIndex: 'type' },
                { title: '是否必填', dataIndex: 'required' },
                {
                    title: '操作',
                    valueType: 'option',
                    render: () => [<a key="edit">编辑</a>, <a key="del" style={{color: 'red'}}>删除</a>],
                },
            ]}
            rowKey="id"
           />
        </Card>
      ),
    },
    {
      key: '3',
      label: '编码规则',
      children: (
        <Card bordered={false}>
            <Empty description="暂未配置自动编码规则" />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {typeof selectedNode?.title === 'function' ? (selectedNode!.title as (data: DataNode) => React.ReactNode)(selectedNode as DataNode) : selectedNode?.title}
        </Title>
        <Space>
            {!isIndustry && <Button danger icon={<DeleteOutlined />}>删除分类</Button>}
            <Button type="primary" icon={<PlusOutlined />}>新建子分类</Button>
        </Space>
      </div>
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default CategoryDetail;
