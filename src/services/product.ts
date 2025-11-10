import type { Product } from '@/models/product';

// 列出产品：真实实现中应为 request.get('/api/products')
export async function listProducts(): Promise<Product[]> {
  try {
    const mock: Product[] = [
      { id: 'P1001', name: '测试产品A', category: '类别1', status: 'ACTIVE', updatedAt: '2025-11-01' },
      { id: 'P1002', name: '测试产品B', category: '类别2', status: 'INACTIVE', updatedAt: '2025-11-02' },
    ];
    return mock;
  } catch (e) {
    return Promise.reject(e);
  }
}
