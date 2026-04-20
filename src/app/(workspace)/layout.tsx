'use client';

import React, { useEffect, useState } from 'react';
import { HomeOutlined } from '@ant-design/icons';
import { Skeleton } from 'antd';
import { useRouter } from 'next/navigation';
import UnifiedLayout, { type MenuItem } from '@/layouts/UnifiedLayout';
import { readPersistedAuthSnapshot } from '@/utils/authStorage';
import './workspace-onboarding.css';

interface SidebarSkeletonItemProps {
  width: number;
}

const SidebarSkeletonItem: React.FC<SidebarSkeletonItemProps> = ({ width }) => {
  return (
    <div className="workspace-sidebar-skeleton-item">
      <span className="workspace-sidebar-skeleton-dot-slot">
        <span className="workspace-sidebar-skeleton-dot" />
      </span>
      <span className="workspace-sidebar-skeleton-line-shell" style={{ width }}>
        <Skeleton.Button
          active
          size="small"
          shape="round"
          block
          className="workspace-sidebar-skeleton-line"
        />
      </span>
    </div>
  );
};

const onboardingMenuData: MenuItem[] = [
  {
    path: '/workspace/create',
    name: '主页',
    icon: <HomeOutlined />,
  },
  {
    path: '/workspace/create/ghost-1',
    name: '占位 1',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={104} />,
  },
  {
    path: '/workspace/create/ghost-2',
    name: '占位 2',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={72} />,
  },
  {
    path: '/workspace/create/ghost-3',
    name: '占位 3',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={120} />,
  },
  {
    path: '/workspace/create/ghost-4',
    name: '占位 4',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={88} />,
  },
  {
    path: '/workspace/create/ghost-5',
    name: '占位 5',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={64} />,
  },
  {
    path: '/workspace/create/ghost-6',
    name: '占位 6',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={96} />,
  },
  {
    path: '/workspace/create/ghost-7',
    name: '占位 7',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={110} />,
  },
  {
    path: '/workspace/create/ghost-8',
    name: '占位 8',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={78} />,
  },
  {
    path: '/workspace/create/ghost-9',
    name: '占位 9',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={56} />,
  },
  {
    path: '/workspace/create/ghost-10',
    name: '占位 10',
    disabled: true,
    menuRenderContent: <SidebarSkeletonItem width={132} />,
  },
];

const WorkspaceOnboardingLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const snapshot = readPersistedAuthSnapshot();
    if (snapshot.platformAuth.principalType === 'platform-admin') {
      setBlocked(true);
      router.replace('/admin/dashboard');
    }
  }, [router]);

  if (blocked) {
    return null;
  }

  return (
    <UnifiedLayout
      menuData={onboardingMenuData}
      homePath="/workspace/create"
      homeTitle="创建工作区"
      title="PLM Cloud Platform"
      // workspace/create 复用共享布局时关闭右上角操作区，避免把常规业务头部带进 onboarding。
      showHeaderRight={false}
      // onboarding 不需要多标签页，这里通过开关关闭，不再额外维护一套分支布局。
      showTabs={false}
      // onboarding 主体直接铺开内容区，不套默认卡片容器。
      contentVariant="plain"
    >
      {children}
    </UnifiedLayout>
  );
};

export default WorkspaceOnboardingLayout;