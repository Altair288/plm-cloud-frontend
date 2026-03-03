import React, { useRef, useEffect, useState } from "react";
import { App, Button, theme } from "antd";
import type { MenuProps } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import CategoryTree, {
  CategoryTreeProps,
} from "@/features/category/CategoryTree";
import FloatingContextMenu from "@/components/ContextMenu/FloatingContextMenu";
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

  const renderContextMenuItems = (node: DataNode | null): MenuProps["items"] => {
    if (!node) return [];
    const titleText =
      typeof node.title === "string"
        ? node.title
        : (node.title as any)?.props?.children?.[0] || "Selected Node";

    const items: MenuProps["items"] = [
      {
        key: "header",
        label: (
          <span style={{ cursor: "default", color: "#888", fontSize: "12px" }}>
            操作: {titleText}
          </span>
        ),
        disabled: true,
        style: { cursor: "default", background: "rgba(0,0,0,0.02)" },
      },
      { type: "divider" },
      { key: "add", label: "新增子分类", icon: <PlusOutlined /> },
      { key: "rename", label: "重命名", icon: <EditOutlined /> },
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
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <Button
              type="text"
              size="small"
              icon={<AddCircleOutline fontSize="small" />}
              style={{ color: token.colorPrimary }}
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
    </>
  );
};

export default AdminCategoryTree;
