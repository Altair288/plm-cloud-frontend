'use client';

import { ProTable } from '@ant-design/pro-components';
import { useCallback, useState } from 'react';
import { listProducts } from '@/services/product';
import type { Product } from '@/models/product';

export default function ProductPage() {
  const [data, setData] = useState<Product[]>([]);

  const request = useCallback(async () => {
    const res = await listProducts();
    setData(res);
    return {
      data: res,
      success: true,
      total: res.length,
    };
  }, []);

  return (
    <ProTable<Product>
      rowKey="id"
      headerTitle="产品列表"
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '名称', dataIndex: 'name' },
        { title: '分类', dataIndex: 'category' },
        { title: '状态', dataIndex: 'status' },
        { title: '更新时间', dataIndex: 'updatedAt' },
      ]}
      request={request}
      pagination={{ pageSize: 10 }}
      dataSource={data}
      search={false}
    />
  );
}
