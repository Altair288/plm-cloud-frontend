export type ThemeMode = 'light' | 'dark';

export interface AppPalette {
  mode: ThemeMode;
  textPrimary: string;
  textSecondary: string;
  bgLayout: string;
  bgContainer: string;
  headerBg: string;
  siderBg: string;
  menuText: string;
  menuTextSecondary: string;
  menuTextSelected: string;
  menuItemSelectedBg: string;
  menuBgHover: string;
  menuBgActive: string;
  borderColor: string;
  shadowColor: string;
  iconColor: string;
  iconColorActive: string;
  notificationBg: string;
  notificationBorder: string;
}

export const lightPalette: AppPalette = {
  mode: 'light',
  textPrimary: '#1f2329', // 主文本颜色
  textSecondary: '#4b5563', // 次级文本颜色
  bgLayout: '#f5f7fa', // 全局页面背景色
  bgContainer: '#ffffff', // 卡片/容器背景色
  headerBg: '#ffffff', // 顶部导航背景色
  siderBg: '#ffffff', // 侧边栏背景色
  menuText: '#1f2329', // 菜单文字颜色
  menuTextSecondary: '#6b7280', // 菜单次级文字颜色
  menuTextSelected: '#0f62fe', // 菜单选中项文字颜色
  menuItemSelectedBg: '#e8f2ff', // 菜单选中项背景色
  menuBgHover: '#f5f8ff', // 菜单悬停背景色
  menuBgActive: '#e0e9ff', // 菜单激活背景色
  borderColor: '#e5e7eb', // 边框颜色
  shadowColor: 'rgba(15, 24, 40, 0.08)', // 阴影颜色
  iconColor: 'rgba(0, 0, 0, 0.45)', // 图标默认颜色
  iconColorActive: '#0f62fe', // 图标激活颜色
  notificationBg: 'rgba(15, 98, 254, 0.08)', // 通知背景色
  notificationBorder: 'rgba(15, 98, 254, 0.15)', // 通知边框颜色
};

export const darkPalette: AppPalette = {
  mode: 'dark',
  textPrimary: '#e6f1ff', // 主文本颜色
  textSecondary: 'rgba(229, 234, 244, 0.65)', // 次级文本颜色
  bgLayout: '#0f111a', // 全局页面背景色
  bgContainer: '#141414', // 卡片/容器背景色
  headerBg: '#141414', // 顶部导航背景色
  siderBg: '#1f1f1f', // 侧边栏背景色
  menuText: '#d3d7de', // 菜单文字颜色
  menuTextSecondary: 'rgba(211, 215, 222, 0.65)', // 菜单次级文字颜色
  menuTextSelected: '#ffffff', // 菜单选中项文字颜色
  menuItemSelectedBg: 'rgba(15, 98, 254, 0.25)', // 菜单选中项背景色
  menuBgHover: 'rgba(255, 255, 255, 0.06)', // 菜单悬停背景色
  menuBgActive: 'rgba(15, 98, 254, 0.35)', // 菜单激活背景色
  borderColor: 'rgba(255, 255, 255, 0.12)', // 边框颜色
  shadowColor: 'rgba(0, 0, 0, 0.35)', // 阴影颜色
  iconColor: 'rgba(255, 255, 255, 0.65)', // 图标默认颜色
  iconColorActive: '#3d8bfd', // 图标激活颜色
  notificationBg: 'rgba(255, 255, 255, 0.08)', // 通知背景色
  notificationBorder: 'rgba(255, 255, 255, 0.08)', // 通知边框颜色
};

export const getPalette = (mode: ThemeMode): AppPalette =>
  mode === 'dark' ? darkPalette : lightPalette;
