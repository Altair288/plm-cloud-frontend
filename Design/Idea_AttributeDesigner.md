# 核心目标（你页面需要满足的具体需求）

1. **让用户在一个工作区内完成：看结构 → 编辑属性元数据 → 管理枚举值（Value Domain）**，过程清晰、无迷失。
2. **降低误操作风险**（误删/误改），并保证回滚/审计能力。
3. **在属性/枚举很多时保持可操作性**（搜索、分组、虚拟滚动、批量操作）。
4. **支持工程级需求**：导入/导出、版本/草稿、并发冲突处理、权限控制、可扩展的高级规则编辑。

---

# 1 布局与视觉层级（改动可见且影响最大）

当前是左右两列。建议改为更明确的三层语义（仍是视觉上两列，但右侧细分）：

```
Header (Item context + global actions)
┌────────────────────────────────────────────┐
│ Left Pane (Attribute Navigator, search)    │ Right Pane (Attribute Workspace)            │
│  - Groups/Filters/Virtual list              │  ┌─ Top: Attribute Meta (read/edit toggle)  │
│  - Selected item highlight                  │  └─ Bottom: Value Domain (tabbed / table)  │
└────────────────────────────────────────────┘
Footer (Save status / Undo / Help)
```

具体建议：

* Header 左侧：Item 名称、code、breadcrumb；右侧：`+ New Attribute`、`Import/Export`、`Preview`、`Save Schema`（明确禁用/启用状态）。
* Left Pane 固定宽度（可折叠）；支持分组折叠、搜索、筛选（DataType / Required / Status 标签）。
* Right Pane 顶部：显示当前 Attribute 标题、Code、Quick meta（type/unit/required）与 `Edit / Save / Cancel` 按钮（明确分离只读与编辑态）。
* Right Pane 底部（Value Domain）使用表格或网格，顶部工具栏（+New / Import / Batch actions / Filter / Sort）。
* Footer 显示实时保存状态（Saved / Unsaved changes / Last saved by X at T），并放置 `Undo` / `Redo` 快捷（若实现）。

---

# 2 Attribute Navigator（左列） — 强化为“结构导航器”

要点与交互：

* **虚拟化列表** 支持数百/上千属性。
* 每条显示：DisplayName、Code、DataType 图标、Required/Status 标签（小徽章）。
* 支持：搜索（模糊、拼音/英文）、分组（功能组/标准 vs 扩展）、筛选器（DataType、必填、状态）。
* 行交互：单击 → 选中（右侧加载）；hover 显示轻量操作（Duplicate / Quick enable/disable / More）。
* 次级菜单（⋯）中放危险操作（Delete、Move、Export Values、Audit Log）。
* 支持拖拽重新排序（若属性有序）；拖拽时显示“影响范围提示”。
* 列表顶部：`New Attribute`（打开右侧编辑以新建），并支持“模板”下拉（选择已有 Attribute 模板快速创建）。

---

# 3 Attribute 编辑区（右侧上部：Attribute Meta）

字段与交互建议：

* 显示区域分为两列表单（responsive）：Left = Display Name / Code / Unit / Required, Right = Data Type / Default / Visibility / Help Text。
* **Read-only 默认**：进入页面默认是只读，点击 `Edit` 才进入编辑态（降低误改风险）。编辑态后显示 `Save`、`Cancel`、`Save Draft`。
* 必填字段显示即时验证（inline），Code 字段建议自动检查唯一性（debounced）。
* `Data Type` 变更需二次确认（如果切换会影响现有值，弹出提示并显示受影响条目数）。
* Advanced area（折叠）：Validation Rule、Regex、Min/Max、Precision、Locale settings、Display rules（visibility expressions）。折叠默认关闭。
* 提供 `Preview` 按钮：在右下角打开小 preview panel，展示当前属性在产品详情页的展示效果（便于校验 label/format）。

---

# 4 Value Domain（右侧下部：枚举管理）

为枚举区制定独立、功能丰富的模块化设计：

结构：

* 顶部工具栏：`+ New Value`、`Import CSV`、`Export CSV`、`Bulk Edit`、`Sort`、`Filter`、`Search`。
* 主表格列：Order、Code、Label（多语言）、Status (enabled/disabled)、Description、UsageCount（被多少 Items 引用）、Actions (Edit / Disable / Delete / Move).
* 行编辑：支持行内编辑（Label / Status / Code），复杂编辑点击 `Edit` 打开右侧小 modal 或 inline expansion（视字段复杂度）。
* 删除策略：默认“软删除/禁用”，删除前弹窗显示影响（例如：哪些 Items 使用该值），并提供“替换为其它值”的选项（批量迁移）。
* 排序支持拖拽（显示实时 order preview）或通过 order 列数值编辑。
* 支持“批量操作”：启用/禁用、合并值、导出、替换引用。
* 提供 `History / Audit` tab 显示该枚举历史修改、谁修改、变更详情。

---

# 5 CRUD 流程与防错设计（必须工业化）

要点：

* **显式 Edit → Save/Cancel**；编辑态有明显视觉区别（顶部条 + 按钮），未保存时 `Save` 强提醒。
* **草稿/版本**：编辑 Attribute/Enum 时，支持 Save Draft（不会生效到生产数据，便于审核）。最终 `Publish Schema` 或 `Apply` 才影响下游。
* **事务性操作**：对枚举的大改（批量删除/合并/替换）必须在后台走事务，支持回滚或生成补救脚本。
* **并发冲突**：每个资源带 ETag/version 字段；保存时服务器检测冲突并展示 diff/merge UI（显示谁在修改、差异、选择保留）。
* **软删除 + 恢复**：默认禁用而不是删除，提供回收站与恢复机制。
* **确认/影响预览**：像删除、类型转换等危险操作前，弹出影响预览（受影响 item 列表、count、示例），并要求二次确认。

---

# 6 状态管理与后端契约（工程化）

前端/后端建议接口与实现策略（示例）：

API 建议：

* GET /items/{itemId}/attributes → attribute list （支持 filters, pagination）
* GET /attributes/{attrId} → attribute meta + optionally values
* POST /items/{itemId}/attributes → create attribute
* PUT /attributes/{attrId} → replace attribute (use version)
* PATCH /attributes/{attrId} → partial update
* GET /attributes/{attrId}/values → enum values
* POST /attributes/{attrId}/values → create value (supports bulk)
* PATCH /attributes/{attrId}/values/bulk → bulk update
* POST /attributes/{attrId}/publish → publish schema

实现模式：

* 前端使用 optimistic updates for simple edits（但对危险操作必须等后端响应并回滚 on error）。
* 使用 ETag/version + conditional PUT。
* 所有 destructive operations 推送到后台任务队列（返回 taskId，提供 polling / notification）。
* 支持 `dryRun` query param 来预览影响（例如 DELETE?dryRun=true 返回 affected count + examples）。

数据模型示例（attribute）：

```json
{
  "id": "attr_123",
  "itemId": "item_456",
  "code": "FMAXD",
  "displayName": { "zh": "最大力", "en": "Max Force" },
  "dataType": "number",
  "unit": "kN",
  "required": false,
  "description": "...",
  "advanced": {
    "min": 0,
    "max": 10000,
    "precision": 2
  },
  "valueDomain": {
    "type": "enum",
    "valuesCount": 23,
    "ref": "/attributes/attr_123/values"
  },
  "version": 7,
  "status": "active"
}
```

value 示例：

```json
{
  "id": "val_77",
  "attributeId": "attr_123",
  "code": "VAL_A",
  "label": {"zh":"蓝色","en":"Blue"},
  "order": 1,
  "status":"enabled",
  "usageCount": 42,
  "createdBy":"user_1"
}
```

---

# 7 权限、审核与合规

* Attribute/Schema 的修改权限应细分（view / propose / approve / publish）。
* 推荐工作流：编辑 → Save Draft → Submit for Approval → Approve → Publish。审批记录保留在日志（可回滚）。
* Audit log（谁、何时、做了什么、旧值→新值）为每个 attribute & value 提供 `Log` 按钮。

---

# 8 性能/可扩展性细节

* 左侧用虚拟化，右侧 Value 表格支持分页/搜索/服务端排序。
* 对于大量枚举，支持批量导入/导出 CSV、分片加载。
* 延迟加载：只有在选中 attribute 时才加载其 values（或预fetch 下一个）。
* 搜索/筛选最好走后端全文检索（Elasticsearch/PG search）。

---

# 9 可用性与键盘交互

* 支持键盘上下选择左列属性（Enter 打开编辑），Esc 取消编辑，Ctrl+S 保存。
* 强化可访问性（ARIA 标记），所有表单字段均有 label、说明与错误提示。
* 提供 `help` / contextual tips（小问号 tooltip）和文档链接。

---

# 10 测试与验收（交付标准）

每个改动应有明确验收项：

* 左侧导航：搜索/筛选/分页/虚拟化正确返回匹配项。
* 编辑流程：Edit → modify → Save → 数据存储正确、version++、无冲突。
* 危险操作：Delete（dryRun）展示受影响 items、Cancel 不删除。
* 并发：两用户并发 edit，保存方按 version 检测冲突并展示 diff merge。
* Bulk 操作：导入 CSV 正常解析且支持映射字段。
* 权限：不同角色看到的按钮/能力应正确限制。
* 自动化回归测试覆盖主要路径。

---

# 11 小细节建议（可直接实施的 UX 改进）

* Attribute List 每项右侧显示 usageCount（轻灰），帮助判断删除风险。
* Attribute 编辑态顶部显示 `Unsaved changes` 粉色横条并禁止直接切换属性（或提示确认）。
* `Save Schema` 做成两级：`Save Draft`（私有）与 `Publish`（生效）。
* 在 Value 表格提供 `Preview Sample` 按钮查看当前 Item 上该值的显示（或样本产品）。
* 提供 `Open in Drawer` 快捷（从页面切换到 Drawer 快速修一项），并在 Drawer 加 `Open full editor` 链接。

---

# 12 实施优先级（建议迭代路线）

1. 实现基础三区布局 + 左侧虚拟列表 + 右侧只读 meta + Read→Edit 切换。
2. 实现 Value Domain 表格（CRUD 基础）、行内编辑、软删除。
3. 加入草稿/发布流程、版本号与 ETag 并发保护。
4. 批量导入/导出、dryRun 删除、影响预览。
5. 审批/权限/审计日志与并发合并 UI。
6. 优化性能（prefetch/virtualization）与无障碍、键盘快捷、国际化。

---

# 参考（快速可用组件/库）

* 表格/表单：Antd 6（Form, Table, Drawer/Modal, Tabs）
* 虚拟化：react-window / react-virtualized
* 拖拽排序：dnd-kit（现代、无 jQuery）
* 差异/合并视图：react-diff-view 或自定义差异展示组件。
* 后端并发策略：ETag + If-Match header 或 optimistic locking（DB-level version）。

---

如果你希望我继续：我可以在下一个回复中直接给出

* A：**右侧 Attribute 编辑区的具体字段布局（字段顺序 + 校验规则 + 示例值）**（JSON 表单示例）
* B：**枚举值表格的列设计与行级动作实现细节（含 API payload 示例）**
* C：**Draft/Publish/Approval 的工作流图 + REST API 示例**

请选择要我展开的一个（我将直接给出可执行的字段级与接口级细节）。
