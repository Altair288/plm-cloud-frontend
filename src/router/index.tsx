import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ProductPage from '@/pages/Product';
import LoginPage from '@/pages/Login';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'products', element: <ProductPage /> },
      { path: '*', element: <div style={{ padding: 24 }}>404 - 页面不存在</div> },
    ],
  },
]);

export default router;
