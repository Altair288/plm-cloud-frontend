---
name: plm-frontend-page-design
description: 基于 PLM Cloud Frontend（Next.js App Router + TypeScript + Ant Design + ProLayout）的页面设计与实现规范。只要用户提到“页面设计”“后台页面”“管理端界面”“列表/表单/详情页”“主题风格统一”“按现有项目风格开发新页面”，都应优先使用本技能，即使用户没有明确说“用 skill”。
compatibility:
  framework: Next.js 16 App Router
  language: TypeScript + React 19
  ui: Ant Design 6 + ProComponents
---

# PLM 前端页面设计 Skill

用于在当前仓库中新增或改造页面时，保证技术实现、目录结构与视觉风格一致，避免出现“能用但不统一”的页面。

## 1. 项目基线（必须对齐）

- 路由框架：`Next.js App Router`，目录在 `src/app/`，按路由组组织（如 `(admin)`、`(auth)`、`(main)`）。
- UI 体系：`antd@6` + `@ant-design/pro-components`，布局基于 `src/layouts/UnifiedLayout.tsx`。
- 主题来源：
  - 设计 token：`src/styles/theme.ts`
  - 调色板：`src/styles/colors.ts`
  - 全局主题变量与滚动条/菜单样式：`src/app/globals.css`
- 页面应复用已有组件与交互模式，优先放在：
  - 通用组件：`src/components/`
  - 业务功能：`src/features/<domain>/`
  - 路由页面：`src/app/<route>/page.tsx`

## 2. 风格与视觉规范

### 2.1 颜色与主题

- 主色使用 `#0f62fe`（来源 `themeTokens.colorPrimary`）。
- 必须兼容明暗主题，禁止写死单一背景/文字色。
- 页面容器、文字、边框颜色优先从 Antd `theme.useToken()` 或 `palette` 映射值获取。
- 菜单、Tab、悬停、选中态必须与 `globals.css` 中 CSS 变量一致（如 `--menu-*`、`--tab-*`）。

### 2.2 空间与层次

- 页面主容器遵循当前布局节奏：外层间距 `16px`，卡片圆角 `12px`，分区阴影与边框风格保持一致。
- 工具栏高度、分割线、列表密度保持企业后台风格：紧凑、可扫描、不过度装饰。
- 信息层级顺序：`页面标题/工具条 -> 筛选区 -> 主内容区 -> 分页或辅助信息`。

### 2.3 组件选型

- 列表/表格优先：`ProTable` 或 `Table`（视复杂度）。
- 表单优先：`Form` + `Form.Item` + Antd 规范校验。
- 详情/分区优先：`Card`、`Descriptions`、`Tabs`。
- 图标优先 `@ant-design/icons`，仅在已有模块已使用 MUI 图标时才局部延续。

## 3. 页面开发流程（执行步骤）

1. 先确认页面类型：列表页、表单页、详情页、工作台页。
2. 定位路由组与落地目录，遵循现有 `src/app/(...)/...` 组织方式。
3. 拆分页面为：容器层（状态/请求）+ 展示层（纯 UI）。
4. 请求逻辑通过 `src/services/` 与 `src/hooks/useRequest.ts` 风格处理，不在组件内散落硬编码请求。
5. 将复用度高的片段抽到 `src/components/` 或 `src/features/`，避免在 `page.tsx` 堆积实现。
6. 用 token/palette 校准主题，检查明暗模式表现。
7. 完成后进行最小可用验证：路由可达、交互可用、主题一致、无明显样式漂移。

## 4. 输出要求（给开发者/AI 的交付格式）

每次产出页面方案时，按以下结构输出：

1. 页面目标：一句话说明业务目的。
2. 信息架构：页面区块划分与关键交互。
3. 文件变更清单：明确到路径（新增/修改）。
4. 关键实现代码：仅给核心片段，不贴无关样板。
5. 风格对齐说明：说明如何复用 `themeTokens`、`palette`、`UnifiedLayout` 约定。
6. 验证清单：列出可手工验证的 5-8 条检查项。

## 5. 禁止事项

- 不要引入与当前项目冲突的全新 UI 体系（如 Tailwind-only 重写）。
- 不要绕开 `App Router` 采用旧式页面组织。
- 不要大量内联硬编码颜色、圆角、阴影，破坏主题统一。
- 不要为了“炫技”加入与业务无关的复杂动画。
- 不要修改 `UnifiedLayout` 的全局行为，除非用户明确要求。

## 6. 可复用页面骨架（示例）

```tsx
'use client';

import { Card, Space, Typography, theme } from 'antd';

export default function ExamplePage() {
  const { token } = theme.useToken();

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        style={{
          borderRadius: 12,
          borderColor: token.colorBorderSecondary,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          页面标题
        </Typography.Title>
      </Card>

      <Card
        style={{
          borderRadius: 12,
          borderColor: token.colorBorderSecondary,
        }}
      >
        页面主内容
      </Card>
    </Space>
  );
}
```

## 7. 设计质量自检清单

- 是否遵循了 `src/app` 路由与目录规范。
- 是否使用了统一 token，而非硬编码风格值。
- 是否在明暗模式下都可读、可用。
- 是否复用了现有组件/布局，而非重复造轮子。
- 是否将业务逻辑与展示逻辑做了合理分层。
- 是否保留企业后台的清晰信息密度与操作路径。

当用户要求“按当前项目风格设计/实现新页面”时，直接执行本 skill。
