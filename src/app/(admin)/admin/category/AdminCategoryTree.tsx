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
import {
  AddCircleOutline,
  DeleteOutline,
  ContentCopy,
  FileUploadOutlined,
  FileDownloadOutlined,
} from "@mui/icons-material";

interface AdminCategoryTreeProps extends CategoryTreeProps {
  onMenuClick?: (key: string, node: DataNode) => void;
}

const AdminCategoryTree: React.FC<AdminCategoryTreeProps> = ({
  onMenuClick,
  ...props
}) => {
  const { token } = theme.useToken();
  const { message: messageApi } = App.useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  const [createModalVisible, setCreateModalVisible] = useState(false);

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
              onClick={() => setCreateModalVisible(true)}
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
          if (key === "basic-info") {
            messageApi.info("分类基本信息功能待实现");
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
        onCancel={() => setCreateModalVisible(false)}
        onOk={(values) => {
          messageApi.success("保存成功");
          console.log(values);
          setCreateModalVisible(false);
        }}
      />
    </>
  );
};

export default AdminCategoryTree;
