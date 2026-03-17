import React, { useRef, useEffect, useState } from "react";
import { App, Button, Dropdown, Input, Tooltip, theme } from "antd";
import type { MenuProps } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  SearchOutlined,
  CloseOutlined,
  ImportOutlined,
  ExportOutlined,
  MoreOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import CategoryTree, {
  CategoryTreeToolbarState,
  CategoryTreeProps,
} from "@/features/category/CategoryTree";
import {
  TOOLBAR_ACTIONS_EXPANDED_WIDTH,
  TOOLBAR_CONTROL_GAP,
  TOOLBAR_SEARCH_CLOSE_BUTTON_SIZE,
  TOOLBAR_SEARCH_EXPANDED_WIDTH,
  createCircleButtonStyle,
  createToolbarPillStyle,
} from "./components/toolbarStyles";
import FloatingContextMenu from "@/components/ContextMenu/FloatingContextMenu";
import CreateCategoryModal from "./components/CreateCategoryModal";
import BatchTransferModal from "./components/BatchTransferModal";
import { metaCategoryApi, type MetaCategoryDetailDto } from "@/services/metaCategory";
import { semanticStatusColors } from "@/styles/colors";

interface AdminCategoryTreeProps extends CategoryTreeProps {
  onMenuClick?: (key: string, node: DataNode) => void;
  onBatchDelete?: (nodes: DataNode[]) => void;
  onTransferSuccess?: () => void;
  onCategoryCreated?: (
    created: MetaCategoryDetailDto,
    parent?: {
      id?: string | null;
      code?: string;
      name?: string;
      level?: number;
      path?: string;
    } | null,
  ) => void;
}

type CategorySemanticStatus = "CREATED" | "EFFECTIVE" | "INVALID";

const normalizeCategoryStatus = (status?: string): CategorySemanticStatus => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "EFFECTIVE" || normalized === "ACTIVE") return "EFFECTIVE";
  if (normalized === "INVALID" || normalized === "INACTIVE") return "INVALID";
  return "CREATED";
};

const statusActionLabel: Record<CategorySemanticStatus, string> = {
  CREATED: "转创建",
  EFFECTIVE: "转生效",
  INVALID: "转失效",
};

/* ── Toolbar 子组件：状态驱动按钮区 ── */
interface ToolbarActionsProps {
  token: ReturnType<typeof theme.useToken>["token"];
  searchPlaceholder?: string;
  showCheckableToggle?: boolean;
  hasCheckedNodes: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onCut: () => void;
  onCopy: () => void;
  toolbarState: CategoryTreeToolbarState;
}

const ToolbarActions: React.FC<ToolbarActionsProps> = ({
  token,
  searchPlaceholder,
  showCheckableToggle,
  hasCheckedNodes,
  onAdd,
  onDelete,
  onCut,
  onCopy,
  toolbarState,
}) => {
  const moreMenuItems: MenuProps["items"] = [
    { key: "import", label: "导入", icon: <ImportOutlined /> },
    { key: "export", label: "导出", icon: <ExportOutlined /> },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: TOOLBAR_CONTROL_GAP,
          flexShrink: 0,
        }}
      >
        <Tooltip title="新增子分类" mouseEnterDelay={0.4}>
          <Button
            type="default"
            size="small"
            icon={<PlusOutlined />}
            style={createCircleButtonStyle(token, "primary")}
            onClick={onAdd}
          />
        </Tooltip>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            maxWidth: hasCheckedNodes ? TOOLBAR_ACTIONS_EXPANDED_WIDTH : 0,
            opacity: hasCheckedNodes ? 1 : 0,
            transition: "max-width 0.25s ease, opacity 0.2s ease",
            gap: TOOLBAR_CONTROL_GAP,
          }}
        >
          <Tooltip title="删除" mouseEnterDelay={0.4}>
            <Button
              type="default"
              size="small"
              icon={<DeleteOutlined />}
              style={createCircleButtonStyle(token, "danger")}
              onClick={onDelete}
            />
          </Tooltip>
          <Tooltip title="移动" mouseEnterDelay={0.4}>
            <Button
              type="default"
              size="small"
              icon={<SwapOutlined />}
              style={createCircleButtonStyle(token, "neutral")}
              onClick={onCut}
            />
          </Tooltip>
          <Tooltip title="复制" mouseEnterDelay={0.4}>
            <Button
              type="default"
              size="small"
              icon={<CopyOutlined />}
              style={createCircleButtonStyle(token, "neutral")}
              onClick={onCopy}
            />
          </Tooltip>
        </div>

        <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]}>
          <Tooltip title="更多操作" mouseEnterDelay={0.4}>
            <Button
              type="default"
              size="small"
              icon={<MoreOutlined />}
              style={createCircleButtonStyle(token, "neutral")}
            />
          </Tooltip>
        </Dropdown>
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: TOOLBAR_CONTROL_GAP,
          flexShrink: 0,
        }}
      >
        <div
          style={createToolbarPillStyle(token, toolbarState.searchExpanded || !!toolbarState.searchValue)}
        >
          {(toolbarState.searchExpanded || toolbarState.searchValue) && (
            <SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
          )}
          <div
            style={{
              width: toolbarState.searchExpanded || toolbarState.searchValue ? TOOLBAR_SEARCH_EXPANDED_WIDTH : 0,
              opacity: toolbarState.searchExpanded || toolbarState.searchValue ? 1 : 0,
              transition: "width 0.2s ease, opacity 0.2s ease",
              overflow: "hidden",
            }}
          >
            <Input
              size="small"
              variant="borderless"
              placeholder={searchPlaceholder || "搜索分类"}
              value={toolbarState.searchValue}
              onChange={toolbarState.onSearchChange}
              onBlur={() => {
                if (!toolbarState.searchValue) {
                  toolbarState.onSearchVisibilityChange(false);
                }
              }}
              style={{ paddingInline: 0, background: "transparent" }}
            />
          </div>
          <Button
            size="small"
            type="default"
            icon={toolbarState.searchExpanded || toolbarState.searchValue ? <CloseOutlined /> : <SearchOutlined />}
            aria-label="切换搜索"
            onClick={() => {
              if (toolbarState.searchExpanded || toolbarState.searchValue) {
                toolbarState.onSearchClear();
                return;
              }
              toolbarState.onSearchVisibilityChange(true);
            }}
            style={createCircleButtonStyle(
              token,
              toolbarState.searchExpanded || !!toolbarState.searchValue ? "primary" : "neutral",
              toolbarState.searchExpanded || !!toolbarState.searchValue
                ? TOOLBAR_SEARCH_CLOSE_BUTTON_SIZE
                : undefined,
            )}
          />
        </div>

        {showCheckableToggle && (
          <Button
            size="small"
            type="default"
            icon={<CheckOutlined />}
            aria-label="切换复选框"
            onClick={toolbarState.onCheckableToggle}
            style={createCircleButtonStyle(
              token,
              toolbarState.checkableEnabled ? "primary" : "neutral",
            )}
          />
        )}
      </div>
    </div>
  );
};

const AdminCategoryTree: React.FC<AdminCategoryTreeProps> = ({
  onMenuClick,
  onBatchDelete,
  onTransferSuccess,
  onCategoryCreated,
  ...props
}) => {
  const { token } = theme.useToken();
  const { message: messageApi } = App.useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createParentNode, setCreateParentNode] = useState<{
    id?: string | null;
    code?: string;
    name?: string;
    level?: number;
    path?: string;
    rootCode?: string;
    rootName?: string;
  } | null>(null);

  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: DataNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  // === 迁移 / 复制 弹窗状态 ===
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferAction, setTransferAction] = useState<'move' | 'copy' | null>(null);
  const [transferCheckedKeys, setTransferCheckedKeys] = useState<React.Key[]>([]);

  // Add global contextmenu interception
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Logic: If right-click happens inside the tree container, block default menu
      if (
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const renderContextMenuItems = (
    node: DataNode | null,
  ): MenuProps["items"] => {
    if (!node) return [];
    const nodeRef = (node as any)?.dataRef as
      | { code?: string; name?: string; level?: number }
      | undefined;
    const titleText =
      nodeRef?.code || nodeRef?.name
        ? `${nodeRef?.code || "-"} - ${nodeRef?.name || "未命名分类"}`
        : typeof node.title === "string"
          ? node.title
          : String(node.key);
    const levelText = nodeRef?.level ? `L${nodeRef.level}` : "-";
    const currentStatus = normalizeCategoryStatus((node as any)?.dataRef?.status);
    const transitionTargets = (["CREATED", "EFFECTIVE", "INVALID"] as CategorySemanticStatus[])
      .filter((status) => status !== currentStatus);

    const items: MenuProps["items"] = [
      {
        key: "header",
        label: (
          <span style={{ cursor: "default", color: "#888", fontSize: "12px" }}>
            节点: {titleText} | 层级: {levelText}
          </span>
        ),
        disabled: true,
        style: { cursor: "default", background: "rgba(0,0,0,0.02)" },
      },
      { type: "divider" },
      { key: "add", label: "新增子分类", icon: <PlusOutlined /> },
      { key: "rename", label: "重命名", icon: <EditOutlined /> },
      {
        key: "status-transition",
        label: "状态转换",
        icon: <SwapOutlined />,
        children: transitionTargets.map((status) => ({
          key: `status:${status}`,
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: semanticStatusColors[status],
                  display: "inline-block",
                }}
              />
              {statusActionLabel[status]}
            </span>
          ),
        })),
      },
      { type: "divider" },
      {
        key: "basic-info",
        label: "分类基本信息",
        icon: <InfoCircleOutlined />,
      },
      { type: "divider" },
      { key: "design", label: "属性设计", icon: <SettingOutlined /> },
      { type: "divider" },
      { key: "delete", label: "删除", icon: <DeleteOutlined />, danger: true },
    ];
    return items;
  };

  const handleRightClick: TreeProps["onRightClick"] = ({ event, node }) => {
    setContextMenuState({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node: node as DataNode,
    });
  };

  const findNodeByKey = (list: DataNode[], key: React.Key): DataNode | null => {
    for (const node of list) {
      if (node.key === key) return node;
      if (node.children) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  const openCreateModal = (node?: DataNode | null) => {
    const nodeRef = (node as any)?.dataRef as
      | {
          id?: string;
          code?: string;
          name?: string;
          level?: number;
          path?: string;
          businessDomain?: string;
        }
      | undefined;

    setCreateParentNode(
      nodeRef
        ? {
            id: nodeRef.id,
            code: nodeRef.code,
            name: nodeRef.name,
            level: nodeRef.level,
            path: nodeRef.path,
            rootCode: undefined,
            rootName: undefined,
          }
        : null,
    );
    setCreateModalVisible(true);

    if (!nodeRef?.id) return;

    metaCategoryApi
      .getNodePath(nodeRef.id, nodeRef.businessDomain || "MATERIAL")
      .then((pathNodes) => {
        const rootNode = pathNodes?.[0];
        if (!rootNode) return;
        setCreateParentNode((prev) => {
          if (!prev || prev.id !== nodeRef.id) return prev;
          return {
            ...prev,
            rootCode: rootNode.code,
            rootName: rootNode.name,
          };
        });
      })
      .catch(() => {
        // Keep fallback behavior if path query fails.
      });
  };

  const resolveCheckedNodes = (checkedKeys: React.Key[]) => {
    if (checkedKeys.length === 0) return [];
    return checkedKeys
      .map((key) => findNodeByKey(props.treeData, key))
      .filter((node): node is DataNode => !!node);
  };

  const resolveSingleCheckedNode = (checkedKeys: React.Key[]) => {
    if (checkedKeys.length === 0) return null;
    if (checkedKeys.length > 1) {
      messageApi.info("当前操作仅支持单个分类");
      return null;
    }
    return findNodeByKey(props.treeData, checkedKeys[0]);
  };

  return (
    <>
      <CategoryTree
        ref={containerRef}
        {...props}
        onRightClick={handleRightClick}
        toolbarRender={(toolbarState: CategoryTreeToolbarState) => {
          const { checkableEnabled, checkedKeys } = toolbarState;
          const hasCheckedNodes = checkableEnabled && checkedKeys.length > 0;

          return (
            <ToolbarActions
              token={token}
              searchPlaceholder={props.searchPlaceholder}
              showCheckableToggle={props.showCheckableToggle !== false}
              hasCheckedNodes={hasCheckedNodes}
              toolbarState={toolbarState}
              onAdd={() => {
                const activeKey = props.selectedKeys?.[0];
                const activeNode = activeKey ? findNodeByKey(props.treeData, activeKey) : null;
                openCreateModal(activeNode);
              }}
              onDelete={() => {
                if (!hasCheckedNodes) return;
                const nodes = resolveCheckedNodes(checkedKeys);
                if (!nodes.length) return;
                if (nodes.length === 1 && onMenuClick) {
                  onMenuClick("delete", nodes[0]);
                  return;
                }
                onBatchDelete?.(nodes);
              }}
              onCut={() => {
                if (!hasCheckedNodes) return;
                setTransferAction('move');
                setTransferCheckedKeys(checkedKeys);
                setTransferModalVisible(true);
              }}
              onCopy={() => {
                if (!hasCheckedNodes) return;
                setTransferAction('copy');
                setTransferCheckedKeys(checkedKeys);
                setTransferModalVisible(true);
              }}
            />
          );
        }}
      />
      <FloatingContextMenu
        open={contextMenuState.visible}
        x={contextMenuState.x}
        y={contextMenuState.y}
        items={renderContextMenuItems(contextMenuState.node)}
        onMenuClick={({ key, domEvent }) => {
          domEvent.stopPropagation();
          if (key === "add") {
            openCreateModal(contextMenuState.node);
            setContextMenuState((prev) => ({ ...prev, visible: false }));
            return;
          }
          if (onMenuClick && contextMenuState.node) {
            onMenuClick(key, contextMenuState.node);
          } else {
            messageApi.info(
              `Action: ${key} on Node: ${contextMenuState.node?.key}`,
            );
          }
          setContextMenuState((prev) => ({ ...prev, visible: false }));
        }}
        onClose={() => {
          setContextMenuState((prev) => ({ ...prev, visible: false }));
        }}
      />

      <CreateCategoryModal
        open={createModalVisible}
        parentNode={createParentNode}
        submitLoading={createSubmitting}
        onCancel={() => setCreateModalVisible(false)}
        onOk={async (values) => {
          setCreateSubmitting(true);
          try {
            const created = await metaCategoryApi.createCategory(
              {
                code: values.code,
                name: values.name,
                businessDomain: values.businessDomain,
                parentId: values.parentId || undefined,
                status: values.status,
                description: values.description,
              },
              { operator: "admin" },
            );
            messageApi.success("分类创建成功");
            setCreateModalVisible(false);
            onCategoryCreated?.(created, createParentNode);
          } catch (e: any) {
            const msg = e?.message || e?.error || "分类创建失败";
            messageApi.error(msg);
            throw e;
          } finally {
            setCreateSubmitting(false);
          }
        }}
      />

      {/* 批量移动/复制视图弹窗 */}
      <BatchTransferModal
        open={transferModalVisible}
        actionType={transferAction}
        checkedKeys={transferCheckedKeys}
        fullTreeData={props.treeData}
        onCancel={() => setTransferModalVisible(false)}
        onSuccess={() => {
          onTransferSuccess?.();
          messageApi.success("批量移动/复制已完成，分类树已刷新");
        }}
      />
    </>
  );
};

export default AdminCategoryTree;
