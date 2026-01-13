'use client';
import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

const mockUsers: UserItem[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    status: 'active',
    lastLogin: '2023-10-01 12:00:00',
  },
  {
    id: '2',
    name: 'Normal User',
    email: 'user@example.com',
    role: 'USER',
    status: 'active',
    lastLogin: '2023-10-02 14:30:00',
  },
];

export default function AdminUsersPage() {
  const columns: ProColumns<UserItem>[] = [
    {
      title: '用户名',
      dataIndex: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      render: (_, record) => (
        <Tag color={record.role === 'ADMIN' ? 'red' : 'blue'}>
          {record.role}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        active: { text: '正常', status: 'Success' },
        disabled: { text: '禁用', status: 'Error' },
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      render: () => [
        <a key="edit">编辑</a>,
        <a key="delete" style={{ color: 'red' }}>删除</a>,
      ],
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <ProTable<UserItem>
        headerTitle="用户列表"
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          <Button key="button" icon={<PlusOutlined />} type="primary">
            新建用户
          </Button>,
        ]}
        request={async () => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));
          return {
            data: mockUsers,
            success: true,
            total: mockUsers.length,
          };
        }}
        columns={columns}
      />
    </div>
  );
}
