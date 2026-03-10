import React, { useRef, useEffect, useState } from "react";
import { App, Button, theme } from "antd";
import type { MenuProps } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import CategoryTree, {
  CategoryTreeProps,
} from "@/features/category/CategoryTree";
import FloatingContextMenu from "@/components/ContextMenu/FloatingContextMenu";
import CreateCategoryModal from "./components/CreateCategoryModal";
import { metaCategoryApi, type MetaCategoryDetailDto } from "@/services/metaCategory";
import {
  AddCircleOutline,
  DeleteOutline,
  ContentCopy,
  FileUploadOutlined,
  FileDownloadOutlined,
} from "@mui/icons-material";

interface AdminCategoryTreeProps extends CategoryTreeProps {
  onMenuClick?: (key: string, node: DataNode) => void;
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

const AdminCategoryTree: React.FC<AdminCategoryTreeProps> = ({
  onMenuClick,
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
          taxonomy?: string;
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
      .getNodePath(nodeRef.id, nodeRef.taxonomy || "UNSPSC")
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

  return (
    <>
      <CategoryTree
        ref={containerRef}
        {...props}
        onRightClick={handleRightClick}
        toolbarRender={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<AddCircleOutline fontSize="small" />}
              style={{ color: token.colorPrimary }}
              onClick={() => {
                const activeKey = props.selectedKeys?.[0];
                const activeNode = activeKey ? findNodeByKey(props.treeData, activeKey) : null;
                openCreateModal(activeNode);
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<DeleteOutline fontSize="small" />}
              style={{ color: token.colorPrimary }}
            />
            <Button
              type="text"
              size="small"
              icon={<ContentCopy fontSize="small" />}
              style={{ color: token.colorPrimary }}
            />
            <Button
              type="text"
              size="small"
              icon={<FileUploadOutlined fontSize="small" />}
              style={{ color: token.colorPrimary }}
            />
            <Button
              type="text"
              size="small"
              icon={<FileDownloadOutlined fontSize="small" />}
              style={{ color: token.colorPrimary }}
            />
          </div>
        }
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
    </>
  );
};

export default AdminCategoryTree;
