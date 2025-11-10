import { ProLayout, PageContainer } from '@ant-design/pro-components';
import { Layout, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import dayjs from 'dayjs';

interface MenuItem {
  path: string;
  name: string;
  icon?: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/products', name: '产品管理' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const menuData = useMemo(
    () =>
      menuItems.map((m) => ({
        path: m.path,
        name: m.name,
      })),
    [],
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <ProLayout
        title="PLM Cloud"
        logo={undefined}
        layout="mix"
        navTheme="light"
        token={{
          header: {
            colorBgHeader: token.colorBgElevated,
          },
        }}
        location={{ pathname: location.pathname }}
        route={{
          path: '/',
          routes: menuData,
        }}
        menuItemRender={(item, dom) => (
          <div
            onClick={() => item.path && navigate(item.path)}
            style={{ cursor: 'pointer' }}
          >
            {dom}
          </div>
        )}
        footerRender={() => (
          <div style={{ textAlign: 'center', padding: 8, fontSize: 12 }}>
            © {dayjs().format('YYYY')} PLM Cloud Platform
          </div>
        )}
      >
        <PageContainer ghost>
          <Outlet />
        </PageContainer>
      </ProLayout>
    </Layout>
  );
}
