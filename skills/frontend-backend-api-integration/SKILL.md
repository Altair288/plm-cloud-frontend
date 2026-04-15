---
name: plm-frontend-backend-api-integration
description: PLM Cloud 前后端接口对接标准规范（Next.js + TypeScript + Axios + Java API）。当用户提到“接口对接”“联调规范”“字段映射”“DTO定义”“接口错误处理”“新增后端接口接入页面”“前后端联调流程”时，必须优先使用本技能，按既有项目结构输出完整对接方案与落地文件清单。
---

# PLM 前后端接口对接标准规范 Skill

本技能用于指导在当前项目中进行稳定、可维护、可回溯的前后端接口对接，避免“接口能通但结构混乱”的问题。

## 1. 对接目标与原则

- 单一职责分层：`配置层 -> 请求层 -> 服务层 -> 模型层 -> 页面层`。
- 类型先行：所有请求/响应结构先定义 TypeScript DTO，再进入页面。
- 接口语义对齐：前端字段命名、枚举值、分页结构必须与后端文档保持一致。
- 失败可追踪：错误处理必须可感知（业务提示）且可定位（日志/错误对象）。
- 渐进增强：先打通主链路（列表/详情/保存），再做批量、导入、边界优化。

## 2. 本项目现有对接实例位置（必须优先参考）

### 2.1 前端基础链路

- API 地址配置：`src/config/index.ts`
  - 关键值：`API_BASE_URL` 来自 `NEXT_PUBLIC_API_BASE_URL`。
- Axios 请求实例与拦截器：`src/services/request.ts`
  - 统一 `baseURL/timeout/response error` 入口。
- 通用请求 Hook：`src/hooks/useRequest.ts`
  - 统一 `loading/error/data/run` 状态流。

### 2.2 服务层实例（真实对接）

- 分类接口：`src/services/metaCategory.ts`
  - 例如：`listNodes`、`getNodePath`、`search`、`listChildrenBatch`、`getTaxonomy`。
- 属性接口：`src/services/metaAttribute.ts`
  - 例如：`listAttributes`、`getAttributeDetail`、`createAttribute`、`updateAttribute`、`deleteAttribute`、`importAttributes`。
- 认证接口占位：`src/services/auth.ts`
- 产品接口示例（当前为 mock）：`src/services/product.ts`

### 2.3 模型层实例

- 属性 DTO：`src/models/metaAttribute.ts`
- 产品 DTO：`src/models/product.ts`
- 页面内部展示模型：`src/app/(admin)/admin/category/components/types.ts`

### 2.4 页面层联调实例

- 属性设计器（完整链路示例）：`src/app/(admin)/admin/category/AttributeDesigner.tsx`
  - 包含：列表请求、详情请求、DTO 映射、保存提交、枚举值转换、脏数据检测。
- 分类树管理：`src/app/(admin)/admin/category/AdminCategoryTree.tsx`

### 2.5 后端接口文档（主参考）

- 属性 API：`../plm-cloud-platform/api-document/api-specification-documentation/attribute-api.md`
- 分类 API：`../plm-cloud-platform/api-document/api-specification-documentation/category-api.md`
- 分类移动或复制 API：`../plm-cloud-platform/api-document/api-specification-documentation/category-batch-transfer-api.md`
- 字典 API：`../plm-cloud-platform/api-document/api-specification-documentation/dictionary-api.md`
- 编码规则 API：`../plm-cloud-platform/api-document/api-specification-documentation/code-rule-api.md`
- workbook导出 API：`../plm-cloud-platform/api-document/api-specification-documentation/workbook-export-api.md`
- auth服务 API：`../plm-cloud-platform/1. system-document/system-user-api-document/auth-service-frontend-integration.md`

### 2.6 后端代码（副参考）

#### plm-attribute-service相关
- controller 层：`../plm-cloud-platform/plm-attribute-service/src/main/java/com/plm/attribute/version/controller`
- service 层：`../plm-cloud-platform/plm-attribute-service/src/main/java/com/plm/attribute/version/service`
- dto 层：`../plm-cloud-platform/plm-common/src/main/java/com/plm/common/api/dto`
- domain 层：`../plm-cloud-platform/plm-common/src/main/java/com/plm/common/version/domain`
- repository 层：`../plm-cloud-platform/plm-infrastructure/src/main/java/com/plm/infrastructure/version/repository`

#### plm-auth-service相关

- controller 层：`../plm-cloud-platform/plm-auth-service/src/main/java/com/plm/auth/controller`
- service 层：`../plm-cloud-platform/plm-auth-service/src/main/java/com/plm/auth/service`
- dto 层：`../plm-cloud-platform/plm-common/src/main/java/com/plm/common/api/dto/auth`
- domain 层：`../plm-cloud-platform/plm-common/src/main/java/com/plm/common/domain/auth`
- repository 层：`../plm-cloud-platform/plm-infrastructure/src/main/java/com/plm/infrastructure/repository/auth`

## 3. 标准对接流程（必须按顺序执行）

1. 明确业务场景与接口能力
- 输入：页面需求（列表/详情/保存/删除/导入）。
- 动作：对照后端 API 文档确认可用接口、参数、限制、错误码。
- 输出：接口对接清单（endpoint + method + params + response）。

2. 定义或更新前端 DTO（模型层）
- 在 `src/models/<domain>.ts` 新增/调整请求与响应类型。
- 要求：
  - 与后端字段同名优先，避免无意义重命名。
  - 枚举值使用联合类型，禁止裸字符串到处散落。
  - 分页统一结构：`content/totalElements/totalPages/size/number`。

3. 编写服务层 API（services）
- 在 `src/services/<domain>.ts` 封装接口，页面不直接写 URL。
- 要求：
  - 常量化基础路径（如 `CATEGORY_BASE`）。
  - 每个方法写清注释：HTTP 方法 + 路径 + 业务说明。
  - 文件上传使用 `FormData` 且声明 `multipart/form-data`。

4. 页面模型映射与适配
- 在页面或 feature 层集中做 DTO -> UI Model 映射。
- 优先参考：`AttributeDesigner.tsx` 中 `mapListItemToAttributeItem`、`mapDetailToAttributeItem`。
- 规则：
  - 后端 `bool` 与前端 `boolean` 等差异必须集中转换。
  - 时间字段统一格式化展示，原始值保留在 DTO 侧。
  - 不在 JSX 内直接拼接复杂转换逻辑。

5. 接入请求状态流与交互反馈
- 使用 `useRequest` 或等价模式管理 `loading/error/data`。
- 用户反馈最少包含：加载失败、保存成功/失败、删除确认、未保存离开提醒。
- 错误优先透传后端 message（`request.ts` 已做基础透传）。

6. 联调验证与回归
- 主链路验证：列表、详情、创建、更新、删除。
- 边界验证：空数据、分页越界、字段为空、后端 400/500。
- 主题与布局一致性验证：不因接口接入破坏 UI 风格与状态表现。

## 4. 关键注意事项（高优先级）

- 不要在页面组件内直接写 `axios.get('/api/...')`，必须经过 `src/services/`。
- 不要把后端 DTO 直接当 UI 模型使用，必须有适配层。
- 不要忽略查询参数编码（如 `encodeURIComponent(id)`，见 `metaCategory.ts`）。
- 不要吞掉错误；至少保留可显示给用户的 message 和可定位的错误对象。
- 不要把 mock 与真实接口混用却无标识；mock 文件需明确注释并给出替换目标。
- 不要让同一领域出现多套分页结构，统一走 PageResponse。
- 不要修改全局 `request.ts` 行为来适配单接口，优先在服务层局部处理。
- 页面lint语法检测使用 npx tsc --noEmit 来检查类型错误。默认无输出表示检查通过，出现错误时会有详细的错误信息和文件位置提示。

## 5. 推荐文件落位模板（新增接口时）

- DTO：`src/models/<domain>.ts`
- Service：`src/services/<domain>.ts`
- 页面/功能对接：
  - 路由页面：`src/app/(admin)/admin/<module>/page.tsx`
  - 复杂逻辑页：`src/app/(admin)/admin/<module>/<Feature>.tsx`
  - 复用组件：`src/app/(admin)/admin/<module>/components/*.tsx` 或 `src/features/<domain>/`

## 6. 标准实现骨架（示例）

```ts
// src/models/example.ts
export interface ExampleItemDto {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

```ts
// src/services/example.ts
import request from './request';
import type { ExampleItemDto, PageResponse } from '@/models/example';

const EXAMPLE_BASE = '/api/example';

export const exampleApi = {
  list(params: { keyword?: string; page?: number; size?: number }): Promise<PageResponse<ExampleItemDto>> {
    return request.get(`${EXAMPLE_BASE}`, { params });
  },
};
```

```tsx
// 页面中集中映射 DTO -> ViewModel
const mapDtoToView = (dto: ExampleItemDto) => ({
  key: dto.id,
  code: dto.code,
  name: dto.name,
  enabled: dto.status === 'ACTIVE',
});
```

## 7. 本项目对接流程实例（Category + Attribute）

1. 读文档确认接口
- 分类：`nodes/path/search/nodes:children-batch/taxonomies`
- 属性：`attribute-defs` 列表/详情/创建/更新/删除/导入

2. 定义 DTO
- `src/models/metaAttribute.ts`（属性详情、版本、写入 DTO）

3. 封装 services
- `src/services/metaCategory.ts`
- `src/services/metaAttribute.ts`

4. 页面映射与联调
- `src/app/(admin)/admin/category/AttributeDesigner.tsx`
  - 列表 DTO -> `AttributeItem`
  - 详情 DTO -> `AttributeItem`
  - `enum` 值映射
  - 保存时 UI 模型 -> `MetaAttributeUpsertRequestDto`

5. 交互与异常
- 保存成功提示、加载失败提示、未保存离开确认等

## 8. 输出要求（AI/开发执行时）

每次给出接口对接方案时，必须输出：

1. 对接目标与范围（本次涉及的接口与页面）
2. 后端文档对应关系（接口逐条映射）
3. 文件改动清单（精确到路径）
4. DTO 与 Service 代码片段
5. 页面映射逻辑说明（含字段转换）
6. 联调验证清单（主流程 + 边界）
7. 风险点与回滚建议

当用户说“按项目现有方式做接口联调/对接或者实现接口对接”时，直接执行本 skill。
