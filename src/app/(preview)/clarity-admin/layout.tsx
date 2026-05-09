'use client';

import React from 'react';
import ClarityUnifiedLayout from '@/layouts/demo/ClarityUnifiedLayout';

// Using Antd icons purely as SVG nodes or Clarity icons mapped. We'll use Clarity cds-icons for consistency.
const mockMenuData = [
  {
    path: '/clarity-admin/dashboard',
    name: 'Dashboard',
    icon: <cds-icon shape="dashboard"></cds-icon>
  },
  {
    path: '/clarity-admin/category',
    name: 'Category Management',
    icon: <cds-icon shape="view-list"></cds-icon>,
    children: [
      {
        path: '/clarity-admin/category/list',
        name: 'Category List'
      },
      {
        path: '/clarity-admin/category/market',
        name: 'Marketplace'
      }
    ]
  },
  {
    path: '/clarity-admin/products',
    name: 'Products',
    icon: <cds-icon shape="box"></cds-icon>
  },
  {
    path: '/clarity-admin/workspace',
    name: 'Workspace Settings',
    icon: <cds-icon shape="cog"></cds-icon>
  }
];

export default function AdminPreviewLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ClarityUnifiedLayout 
      menuData={mockMenuData}
      homePath="/clarity-admin/dashboard"
      homeTitle="Dashboard"
      title="PLM Cloud (Clarity)"
      currentUser="altair@example.com"
    >
      {children}
    </ClarityUnifiedLayout>
  );
}