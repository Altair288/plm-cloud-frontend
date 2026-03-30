import React, { useRef, useEffect, useState } from "react";
import { App } from "antd";
import type { MenuProps } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import CategoryTree, {
  CategoryTreeToolbarState,
  CategoryTreeProps,
} from "@/features/category/CategoryTree";
import FloatingContextMenu from "@/components/ContextMenu/FloatingContextMenu";
import CreateCategoryModal from "./components/CreateCategoryModal";
import BatchTransferModal from "./components/BatchTransferModal";
import AdminCategoryTreeToolbar from "./components/AdminCategoryTreeToolbar";
import {
  metaCategoryApi,
  type MetaCategoryBatchTransferResponseDto,
  type MetaCategoryBatchTransferTopologyResponseDto,
  type MetaCategoryDetailDto,
} from "@/services/metaCategory";
import { semanticStatusColors } from "@/styles/colors";

interface AdminCategoryTreeProps extends CategoryTreeProps {
  defaultBusinessDomain?: string;
  onMenuClick?: (key: string, node: DataNode) => void;
  onBatchDelete?: (nodes: DataNode[]) => void;
  onTransferSuccess?: (response: MetaCategoryBatchTransferResponseDto | MetaCategoryBatchTransferTopologyResponseDto) => void;
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

const AdminCategoryTree: React.FC<AdminCategoryTreeProps> = ({
  defaultBusinessDomain,
  onMenuClick,
  onBatchDelete,
  onTransferSuccess,
  onCategoryCreated,
  ...props
}) => {
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
      businessDomain?: string;
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
            businessDomain: nodeRef.businessDomain,
            rootCode: undefined,
            rootName: undefined,
          }
        : null,
    );
    setCreateModalVisible(true);

    if (!nodeRef?.id) return;

    metaCategoryApi
      .getNodePath(nodeRef.id, nodeRef.businessDomain || defaultBusinessDomain || '')
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
            <AdminCategoryTreeToolbar
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
        defaultBusinessDomain={defaultBusinessDomain}
        submitLoading={createSubmitting}
        onCancel={() => setCreateModalVisible(false)}
        onOk={async (values) => {
          setCreateSubmitting(true);
          try {
            const created = await metaCategoryApi.createCategory(
              {
                code: values.code,
                generationMode: values.generationMode,
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
        defaultBusinessDomain={defaultBusinessDomain}
        onCancel={() => setTransferModalVisible(false)}
        onSuccess={(response) => {
          onTransferSuccess?.(response);
          messageApi.success("批量移动/复制已完成，分类树已刷新");
        }}
      />
    </>
  );
};

export default AdminCategoryTree;
