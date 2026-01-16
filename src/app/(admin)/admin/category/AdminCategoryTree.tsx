import React, { useRef, useEffect, useState } from "react";
import { Dropdown, MenuProps, message } from "antd";
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

const AdminCategoryTree: React.FC<CategoryTreeProps> = (props) => {
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

  const renderContextMenuInfo = (node: DataNode | null) => {
    if (!node) return { items: [] };
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
    return { items };
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
      />
      <Dropdown
        menu={{
          items: renderContextMenuInfo(contextMenuState.node).items,
          onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation();
            message.info(
              `Action: ${key} on Node: ${contextMenuState.node?.key}`
            );
            setContextMenuState((prev) => ({ ...prev, visible: false }));
          },
        }}
        open={contextMenuState.visible}
        onOpenChange={(visible) => {
          if (!visible)
            setContextMenuState((prev) => ({ ...prev, visible: false }));
        }}
        trigger={["contextMenu"]}
      >
        <div
          style={{
            position: "fixed",
            left: contextMenuState.x,
            top: contextMenuState.y,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </Dropdown>
    </>
  );
};

export default AdminCategoryTree;
