'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function ClarityCatchAllPage() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      flexDirection: 'column',
      padding: '2rem',
      backgroundColor: '#fff',
      borderRadius: '4px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }}>
      <cds-icon shape="wrench" size="64" style={{ color: '#0072a3', marginBottom: '1rem' }}></cds-icon>
      <h2 style={{ margin: 0 }}>页面建设中 - 预览模式</h2>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>该功能模块尚未在 Clarity UI 预览中实现。</p>
      <p style={{ fontSize: 12, color: '#999' }}>当前路径: {pathname}</p>
      
      <button 
        className="btn btn-primary" 
        onClick={() => router.push('/clarity-main/dashboard')}
        style={{ marginTop: '1rem' }}
      >
        <cds-icon shape="home" style={{ marginRight: '0.25rem' }}></cds-icon>
        返回仪表盘
      </button>
    </div>
  );
}