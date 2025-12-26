import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';

export const metadata = {
  title: 'PLM Cloud Platform',
  description: 'Product Lifecycle Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-cn">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
