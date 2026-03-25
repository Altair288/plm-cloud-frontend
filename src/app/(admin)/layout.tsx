'use client';
import React from 'react';
import { 
  UserOutlined, 
  SettingOutlined, 
  DashboardOutlined, 
  SafetyCertificateOutlined,
  AppstoreOutlined,
  CodeOutlined
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
    name: '数据能力建设',
    icon: <AppstoreOutlined />,
    children: [
      { path: "/admin/category/1", name: "产品类" },
      { path: "/admin/category/2", name: "物料类" },
      { path: "/admin/category/3", name: "BOM类" },
      { path: "/admin/category/4", name: "工艺类" },
      { path: "/admin/category/5", name: "测试类" },
      { path: "/admin/category/6", name: "实验类" },
    ],
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
    children: [
      {
        path: '/admin/settings/code-config',
        name: '编码配置',
        icon: <CodeOutlined />,
      },
    ],
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
