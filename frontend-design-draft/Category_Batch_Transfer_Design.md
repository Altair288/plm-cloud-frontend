# 分类批量移动与复制功能设计草案

> **⚠️ 重要开发前提 (CRITICAL)**
> **当前阶段仅联调 GET 查询类接口获取真实树数据，所有的写操作（移动、复制的确认提交）暂时不做后端接口接入，仅在前端模拟成功效果或打印 Payload，保障开发流程的前端闭环。**

## 1. 页面目标
提供一个直观的双树视图（左右分栏）界面，允许管理员通过拖拽的方式，将源分类树（左侧）的节点移动或复制到目标分类树（右侧）的指定节点层级下。解决复杂的分类层级重构和分类跨组复用场景。

## 2. 界面与信息架构 (Information Architecture)

基于提供的原型思路，页面采用 **经典的双拼视图 (Split View)**，整体布局基于现有的 `UnifiedLayout` 风格（外层 16px 间距，卡片 12px 圆角）。

### 2.1 页面区块划分
*   **顶部工具/说明栏 (Header):** 简要说明操作指引（如：“请从左侧拖拽节点至右侧目标节点完成移动或复制”）。
*   **左侧源树区 (Source Tree - Left):**
    *   区域标题：“已选源分类”（或“当前源分类”）。
    *   **数据来源**：由用户在此前界面通过复选框勾选出的目标条目构建而成的“精简子集树”。
        *   *补全上下文 (Context Preservation)*：为防止层级迷失，未被直接勾选但作为链路必需的父级节点（如 A -> B -> [C] 中的 A 和 B）将以**“浅色/只读”**态向下透传展示，仅真正被勾选的叶子或分支端点允许被拖拽作为源，极大降低操作的认知断层。
    *   **Antd `Tree` 组件**：配置为允许作为拖拽源（Draggable）。
*   **中间指示器 (分界线/状态提示):** 
    *   可选用分割线或中间加一个象征性箭头（如原生拖拽时的拖影代替）。
*   **右侧目标树区 (Target Tree - Right):**
    *   区域标题：“目标位置（接收方）”。
    *   搜索框。
    *   **Antd `Tree` 组件**：配置为允许作为拖拽目标（Drop Target）。
    *   **交互细节**：实现 Auto-expand on drag over（悬浮自动展开）与节点高亮（Highlight on hover）。
*   **底部操作栏 (Footer Actions):**
    *   根据用户的拖拽释放落点，动态显示当前待确认的操作。
    *   包含“确认移动”、“确认复制”、“属性预览（选做）”、“取消”按钮。

## 3. 核心交互流程设计 (Interaction Flow)

1.  **查找与加载**：
    *   **左侧源树**：直接加载用户前期通过复选框选出的目标分类节点，自动呈现为一棵精简的待操作“选中树”，无需再次通过搜索框过滤。
    *   **右侧目标树**：保持展示全量树结构，提供搜索框供用户快速定位和展开右侧的目标父节点。
2.  **拖拽操作 (Drag & Drop)**：
    *   用户按住左侧选中节点（例如 `A01`）。
    *   拖向右侧树的某个节点（例如 `B01`）。
    *   **稳定且优雅的自动展开 (Debounced Auto-expand)**：当拖拽经过 `B01` 上方时，加入约 400ms 的防抖定时器。只有真实停留时间达标才更新 `expandedKeysRight` 以免展开过于灵敏。在此悬停期间，为 `B01` 添加微弱的**“呼吸灯”效果**，作为“系统正在响应并准备展开”的视觉引导。
3.  **释放与意图选择 (Drop & Action Select)**：
    *   **虚位待命 (Pending State)**：拖拽 Drop 后不马上调接口与锁定形态，而是在右侧目标位置插入一个带有 `dashed`（虚线）边框或 Loading 占位符的**“镜像虚拟节点”**以作视觉补偿。
    *   此时底部操作栏激活，用户选择意图是“移动”还是“复制”。
    *   **取消机制**：用户若放错位置，点击操作栏的“取消”或直接按下 `Esc` 键，虚拟节点会平滑消失，右侧树无缝恢复原样。
4.  **区分“移动”与“复制”的 UI 语义**：
    *   **移动 (Move)**：这属于结构性调整（剪切并粘贴）。底部按钮：`<Button type="primary">确认移动</Button>`。
    *   **复制 (Copy)**：属于新增数据。底部按钮：`<Button style={{ backgroundColor: '#52c41a', color: 'white' }}>确认复制</Button>`（采用绿色或明显区别于主色的安全色调）。
5.  **冲突处理的最佳实践：预览模式 (Preview)**：
    *   **即时预览**：如果“移动”或“复制”检测到目的地已有同名且必然发生冲突，点击确认前，直接在右侧树的虚拟节点上展示更名结果（如 `分类A (副本)`）。
    *   **原地编辑**：赋予用户在此节点上的就地编辑权（In-place Edit）。一旦用户觉得自动赋名不合适，点击编辑名称后敲击回车，后端收到并写入的就是最终“无需返工”的数据，免去“提交 -> 接口报错 -> 弹框改名”的僵硬循环。
6.  **非法移动拦截 (防止逻辑死循环)**：
    *   **规则限制**：在移动操作中，绝不能将一个父节点移动到它自己的子节点或子树区域下（这会导致树结构的死循环）。
    *   **UI 表现**：在进行拖拽或选定源节点时，应当通过动态计算，将右侧目标树中所有属于“左侧选中项及其后代子项”的节点设置 `disabled` 属性。使其呈现为 **灰色不可选** 状态，并在底层拦截 `onDrop` 事件，禁止将其作为目标位置展示。
7.  **状态管理中的操作锁 (Concurrency Protection)**：
    *   **并发保护**：在用户真正决断并点击“确认移动/复制”后，给整个 `TransferWorkspace` 进行阻塞，盖上全屏 Loading 遮罩。
    *   **必要性**：树结构的重构和索引更新（不仅涉及自节点，也可能涉及大规模后代节点层级计算）通常略有耗时，“操作锁”能有效截断手速过快的二次连踩，防止数据库层级死锁或导致 `Tree Corrupt` 的严重异常发生。

## 4. 前端落位设计 (File Structure & Conventions)

假设此页面为管理端专门用于分类重构的高级视图。

### 4.1 目录结构规划
优先落在管理端 `src/app/(admin)/admin/category/` 下（或视权限划分也可独立为一个工作区路由）。

```text
src/app/(admin)/admin/category/batch-transfer/
├── page.tsx                           // 新增：页面主容器（状态与分发）
├── components/
│   ├── TransferWorkspace.tsx          // 新增：左右双树主工作区
│   ├── DraggableSourceTree.tsx        // 新增：左侧源树封装
│   ├── DropTargetTree.tsx             // 新增：右侧目标树封装（含自动展开逻辑）
│   ├── ActionFooter.tsx               // 新增：底部操作按钮栏
│   └── ConflictResolveModal.tsx       // 新增：同名冲突处理弹窗
```

### 4.2 关键组件技术选型 (Ant Design)
*   **双栏布局**：不使用原生的 `Transfer` 组件（因为它不支持复杂的树状结构拖拽），手动使用 `<Row>` + `<Col>` 或 Flex 布局，两侧放置带有 `<Card>` 外框的树组件。
*   **拖动能力**：直接使用 Antd `Tree` 组件自带的 `draggable` 属性。
    *   监听 `onDragStart`（获取源节点数据）。
    *   监听 `onDragEnter`（实现自动展开目标节点，通过受控的 `expandedKeys` 实现）。
    *   监听 `onDrop`（计算插入位置是 `dragOver`、`dragOverGapTop` 还是 `dragOverGapBottom`，主要限制为只能成为子节点或兄弟节点）。

### 4.3 状态管理考量 (State)
需要在 `TransferWorkspace` 中维护以下状态：
```typescript
const [sourceNode, setSourceNode] = useState<TreeNode | null>(null);
const [targetNode, setTargetNode] = useState<TreeNode | null>(null);
const [pendingAction, setPendingAction] = useState<'move' | 'copy' | null>(null);
const [expandedKeysRight, setExpandedKeysRight] = useState<React.Key[]>([]); // 控制右侧展开
```

## 5. 验证与一致性检查清单 (已评审确认 ✅)
1. [x] **主题一致**：卡片颜色、分割线颜色需使用 `theme.useToken()`，禁止写死 `#f0f0f0` 等十六进制。
2. [x] **反馈及时**：拖拽时的 ghost 元素、目标节点的 highlight（通过覆盖 antd 的 `--tree-node-hover-bg` 变量或自带属性）必须明显。
3. [x] **防误触**：拖动释放后必须有明确的“确认”步骤，不能 drop 后直接调接口修改真实数据。
4. [x] **请求规范**：移动和复制的 API 调用需收口在 `src/services/category.ts` 中，使用统一定义的 DTO。

---
*设计草案 v1.1 - 已包含最近的评审反馈*
