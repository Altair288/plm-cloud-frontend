import React, { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { ProLayout } from '@ant-design/pro-components';
import HeaderRight from './components/HeaderRight';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { themeTokens, componentTokens } from '../styles/theme';
import { getPalette } from '../styles/colors';
import type { AppPalette } from '../styles/colors';

// 简易菜单数据（后续可由权限/接口动态生成）
interface MenuItem {
  path: string;
  name: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

const menuData: MenuItem[] = [
  { path: '/dashboard', name: '仪表盘' },
  { path: '/product', name: '产品管理' },
  { path: '/system', name: '系统设置' },
  { path: '/user', name: '用户中心' },
];

// 选中菜单 key 通过 location.pathname 自动匹配，无需在 menu 里直接传 selectedKeys（否则类型不匹配）

const BasicLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const stored = window.localStorage.getItem('plm-theme-mode');
    if (stored) {
      return stored === 'dark';
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const palette = useMemo<AppPalette>(
    () => getPalette(isDarkMode ? 'dark' : 'light'),
    [isDarkMode]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('plm-theme-mode', isDarkMode ? 'dark' : 'light');
    document.body.setAttribute('data-theme', palette.mode);
    document.body.style.backgroundColor = palette.bgLayout;
    document.body.style.color = palette.textPrimary;
  }, [isDarkMode, palette]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemScheme = (event: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem('plm-theme-mode');
      if (!stored) {
        setIsDarkMode(event.matches);
      }
    };
    media.addEventListener('change', handleSystemScheme);
    return () => media.removeEventListener('change', handleSystemScheme);
  }, []);

  const currentComponentTokens = useMemo(() => ({
    ...componentTokens,
    Layout: {
      ...componentTokens.Layout,
      headerBg: palette.headerBg,
      siderBg: palette.siderBg,
    },
    Menu: {
      ...componentTokens.Menu,
      // Ant Design Menu token keys align with CSS variables used by ProLayout
      itemColor: palette.menuText,
      itemSelectedColor: palette.menuTextSelected,
      itemSelectedBg: palette.menuItemSelectedBg,
    },
  }), [palette]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // ProLayout 根据 location 自动匹配选中菜单，无需手动 selectedKeys

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          ...themeTokens,
          colorBgLayout: palette.bgLayout,
          colorBgContainer: palette.bgContainer,
          colorText: palette.textPrimary,
          colorTextSecondary: palette.textSecondary,
          colorBorder: palette.borderColor,
          colorBorderSecondary: palette.borderColor,
          colorTextHeading: palette.textPrimary,
        },
        components: currentComponentTokens,
      }}
    >
      <ProLayout
        title="PLM Cloud Platform"
        token={{
          header: {
            colorBgHeader: palette.headerBg,
            heightLayoutHeader: themeTokens.headerHeight,
          },
          sider: {
            colorMenuBackground: palette.siderBg,
            colorTextMenu: palette.menuText,
            colorTextMenuSelected: palette.menuTextSelected,
            colorBgMenuItemSelected: palette.menuItemSelectedBg,
          },
        }}
        logo={false}
        layout="mix" // top + side
        fixedHeader
        navTheme={isDarkMode ? 'realDark' : 'light'}
        location={location}
        menuDataRender={() => menuData}
        menuItemRender={(item, dom) => (
          <span
            onClick={() => {
              if (item.path) navigate(item.path);
            }}
          >
            {dom}
          </span>
        )}
        avatarProps={undefined}
        rightContentRender={() => (
          <HeaderRight
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            palette={palette}
          />
        )}
        menu={{
          defaultOpenAll: true,
        }}
  // header 高度通过 token.header.heightLayoutHeader 控制
        siderWidth={themeTokens.siderWidth}
      >
        <div
          style={{
            padding: 24,
            minHeight: `calc(100vh - ${themeTokens.headerHeight}px)`,
            background: palette.bgLayout,
          }}
        >
          {children ?? <Outlet />}
        </div>
      </ProLayout>
    </ConfigProvider>
  );
};

export default BasicLayout;
