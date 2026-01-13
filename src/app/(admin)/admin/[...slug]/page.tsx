'use client';

import React from 'react';
import { Result, Button } from 'antd';
import { useRouter, usePathname } from 'next/navigation';

const AdminCatchAllPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'var(--ant-color-bg-container)', // Uses tokens from Admin Layout's theme
      borderRadius: 'var(--ant-border-radius-lg)',
    }}>
      <Result
        status="404"
        title="管理功能建设中"
        subTitle={
          <div>
            <p>该管理模块尚未开发或正在设计中</p>
            <p style={{ fontSize: 12, color: '#999' }}>Current Path: {pathname}</p>
          </div>
        }
        extra={
          <Button type="primary" onClick={() => router.push('/admin/dashboard')}>
            返回管理概览
          </Button>
        }
      />
    </div>
  );
};

export default AdminCatchAllPage;
