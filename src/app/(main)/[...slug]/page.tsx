'use client';

import React from 'react';
import { Result, Button } from 'antd';
import { useRouter, usePathname } from 'next/navigation';

const CatchAllPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'var(--ant-color-bg-container)',
      borderRadius: 'var(--ant-border-radius-lg)',
    }}>
      <Result
        status="404"
        title="页面建设中"
        subTitle={
          <div>
            <p>该功能模块尚未开发或正在设计中</p>
            <p style={{ fontSize: 12, color: '#999' }}>Current Path: {pathname}</p>
          </div>
        }
        extra={
          <Button type="primary" onClick={() => router.push('/dashboard')}>
            返回仪表盘
          </Button>
        }
      />
    </div>
  );
};

export default CatchAllPage;
