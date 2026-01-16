'use client';
import React from 'react';
import { 
  UserOutlined, 
  SettingOutlined, 
  DashboardOutlined, 
  SafetyCertificateOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import UnifiedLayout, { MenuItem } from "@/layouts/UnifiedLayout";

const adminMenuData: MenuItem[] = [
  {
    path: '/admin/dashboard',
    name: '管理概览',
    icon: <DashboardOutlined />,
  },
  {
    path: '/admin/category',
    name: '分类管理',
    icon: <AppstoreOutlined />,
  },
  {
    path: '/admin/users',
    name: '用户管理',
    icon: <UserOutlined />,
  },
  {
    path: '/admin/roles',
    name: '角色权限',
    icon: <SafetyCertificateOutlined />,
  },
  {
    path: '/admin/settings',
    name: '系统设置',
    icon: <SettingOutlined />,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedLayout 
      menuData={adminMenuData} 
      title="PLM Cloud Platform - Admin Panel"
      homePath="/admin/dashboard"
      homeTitle="管理概览"
    >
        {children}
    </UnifiedLayout>
  );
}
