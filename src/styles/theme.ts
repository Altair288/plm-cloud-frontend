// 全局主题 Token 抽离，便于统一管理与后续动态切换
// 可扩展：暗色模式、品牌定制、尺寸密度等
export const themeTokens = {
  colorPrimary: '#0f62fe',
  borderRadius: 4,
  headerHeight: 56,
  siderWidth: 224,
};

// Ant Design ConfigProvider 组件级别覆盖示例
export const componentTokens = {
  Layout: {
    headerBg: '#fff',
    headerHeight: 56,
    siderBg: '#fff',
  },
  Menu: {
    itemBorderRadius: 4,
  },
};
