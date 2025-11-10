# PLM Cloud Frontend (React + Vite + Ant Design Pro + ECharts)

本项目基于 Vite + React + TypeScript，并整合 Ant Design Pro 组件体系与 ECharts，用于构建 PLM (Product Lifecycle Management) 云平台前端。

## 目录结构

```text
src/
  assets/              # 静态资源
  components/          # 可复用通用组件（后续补充）
  config/              # 全局配置与常量
  hooks/               # 自定义 Hooks
  layouts/             # 布局（ProLayout 包装）
  models/              # TS 类型与领域模型
  pages/               # 页面入口（Dashboard, Product 等）
  router/              # 路由配置（createBrowserRouter）
  services/            # API 请求封装 & 业务服务
  utils/               # 工具函数
  App.tsx              # Re-export 主布局
  main.tsx             # 应用入口挂载 + RouterProvider
```

## 快速开始

```powershell
npm install
npm run dev
```

浏览器访问: [http://localhost:5173](http://localhost:5173)

默认代理配置：`/api` → `VITE_API_BASE_URL`（在 `.env.development` 中可调整）。

## 技术要点

- Ant Design ProLayout 提供导航与统一框架。
- ProTable 用于复杂列表（示例：产品列表）。
- ECharts 用于图表分析（示例：Dashboard 柱状图）。
- Axios 封装统一请求实例（`src/services/request.ts`）。
- 路由采用 `react-router-dom@7` Data Router。
- 通过 `@` 路径别名简化导入（tsconfig & vite.config 已配置）。

## 后续可扩展

- 接入鉴权：在 `request.interceptors.request` 注入 Token。
- 国际化：引入 `react-intl` 或 `@umijs/max` 风格自建 locale。
- 状态管理：基于 Redux Toolkit 或 Zustand。
- Mock 服务：使用 `vite-plugin-mock` 在开发阶段模拟后端。
- ECharts 主题与按需加载：结合 `echarts/core` 手动注册需要的组件以减小包体积。

---

## 原模板说明（保留）

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
