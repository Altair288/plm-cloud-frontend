import React, { useMemo } from 'react';
import type { MenuProps } from 'antd';
import { Dropdown, Avatar, Typography, Space } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  SkinOutlined,
  GlobalOutlined,
  FileTextOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import type { AppPalette } from '@/styles/colors';

interface HeaderRightProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  palette: AppPalette;
}

const HeaderRight: React.FC<HeaderRightProps> = ({ isDarkMode, onToggleTheme, palette }) => {
  const menuItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'profile-group',
        type: 'group',
        label: '配置文件',
        children: [
          {
            key: 'profile-email',
            label: (
              <Space size={4}>
                <FileTextOutlined />
                <Typography.Text style={{ color: palette.textSecondary }}>
                  1755529573@qq.com
                </Typography.Text>
              </Space>
            ),
            disabled: true,
          },
        ],
      },
      { type: 'divider', key: 'divider-1' },
      {
        key: 'language',
        label: '语言 (简体中文)',
        icon: <GlobalOutlined />,
        children: [
          { key: 'lang-zh', label: '简体中文' },
          { key: 'lang-en', label: 'English' },
          { key: 'lang-ja', label: '日本語' },
        ],
      },
      { key: 'billing', label: '账单', icon: <CreditCardOutlined /> },
      {
        key: 'theme',
        label: (
          <Space size={4}>
            <span>深色模式</span>
            <Typography.Text style={{ color: palette.textSecondary }}>
              {isDarkMode ? '已开启' : '已关闭'}
            </Typography.Text>
          </Space>
        ),
        icon: <SkinOutlined />,
      },
      { type: 'divider', key: 'divider-2' },
      { key: 'logout', label: '退出登录', icon: <LogoutOutlined /> },
    ],
    [isDarkMode, palette]
  );

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'theme') {
      onToggleTheme();
    }
  };

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items: menuItems, onClick: handleMenuClick }}
      placement="bottomRight"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          cursor: 'pointer',
          borderRadius: 999,
          transition: 'background-color 0.2s ease',
          color: palette.textPrimary,
        }}
      >
        <Avatar size={28} icon={<UserOutlined />} />
        <Typography.Text strong style={{ color: palette.textPrimary }}>
          个人简介
        </Typography.Text>
        <SettingOutlined style={{ color: palette.iconColor }} />
      </div>
    </Dropdown>
  );
};

export default HeaderRight;
