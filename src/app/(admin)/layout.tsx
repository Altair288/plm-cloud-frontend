'use client';
import React, { useEffect, useMemo } from 'react';
import { 
  UserOutlined, 
  SettingOutlined, 
  DashboardOutlined, 
  SafetyCertificateOutlined,
  AppstoreOutlined,
  CodeOutlined
} from '@ant-design/icons';
import UnifiedLayout, { MenuItem } from "@/layouts/UnifiedLayout";
import { useDictionary } from '@/contexts/DictionaryContext';
import { useProtectedPlatformAdminAccess } from '@/hooks/useProtectedPlatformAdminAccess';
import {
  CATEGORY_BUSINESS_DOMAIN_DICT_CODE,
  formatCategoryBusinessDomainMenuLabel,
  getCategoryBusinessDomainConfigs,
  getCategoryBusinessDomainPath,
} from '@/features/category/businessDomains';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ensureBatch, getEntries } = useDictionary();
  const checkingAccess = useProtectedPlatformAdminAccess({ loadingMessage: '正在验证平台管理员访问权限...' });

  useEffect(() => {
    void ensureBatch([CATEGORY_BUSINESS_DOMAIN_DICT_CODE]);
  }, [ensureBatch]);

  const businessDomainEntries = getEntries(CATEGORY_BUSINESS_DOMAIN_DICT_CODE);
  const businessDomains = useMemo(
    () => getCategoryBusinessDomainConfigs(businessDomainEntries),
    [businessDomainEntries],
  );

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
      children: businessDomains.map((item) => ({
        path: getCategoryBusinessDomainPath(item.code),
        name: formatCategoryBusinessDomainMenuLabel(item.label),
      })),
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
        {
          path: '/admin/settings/storage-config',
          name: '存储配置',
          icon: <SettingOutlined />,
        }
      ],
    },
  ];

  if (checkingAccess) {
    return null;
  }

  return (
    <UnifiedLayout 
      menuData={adminMenuData} 
      title="PLM Cloud Platform - Admin Panel"
      homePath="/admin/dashboard"
      homeTitle="管理概览"
      headerAuthMode="platform-admin"
    >
        {children}
    </UnifiedLayout>
  );
}
