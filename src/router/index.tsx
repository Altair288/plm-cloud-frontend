import { createBrowserRouter } from 'react-router-dom';
import BasicLayout from '@/layouts/BasicLayout';
import Dashboard from '@/pages/Dashboard';
import ProductPage from '@/pages/Product';
import CategoryPage from '@/pages/Category';
import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
  path: '/',
  element: <BasicLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'products', element: <ProductPage /> },
      { path: 'category/list', element: <CategoryPage /> },
      { path: '*', element: <div style={{ padding: 24 }}>404 - 页面不存在</div> },
    ],
  },
]);

export default router;
