import React from "react";
import { theme } from "antd";
import type { MenuProps } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  ImportOutlined,
  ExportOutlined,
  MoreOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { CategoryTreeToolbarState } from "@/features/category/CategoryTree";
import BaseToolbar, { type ToolbarAction } from "@/components/TreeToolbar/BaseToolbar";
import {
  TOOLBAR_ACTIONS_EXPANDED_WIDTH,
} from "@/components/TreeToolbar/treeToolbarStyles";

export interface AdminCategoryTreeToolbarProps {
  searchPlaceholder?: string;
  showCheckableToggle?: boolean;
  hasCheckedNodes: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onCut: () => void;
  onCopy: () => void;
  toolbarState: CategoryTreeToolbarState;
}

const moreMenuItems: MenuProps["items"] = [
  { key: "import", label: "导入", icon: <ImportOutlined /> },
  { key: "export", label: "导出", icon: <ExportOutlined /> },
];

const AdminCategoryTreeToolbar: React.FC<AdminCategoryTreeToolbarProps> = ({
  searchPlaceholder,
  showCheckableToggle,
  hasCheckedNodes,
  onAdd,
  onDelete,
  onCut,
  onCopy,
  toolbarState,
}) => {
  const { token } = theme.useToken();

  const primaryActions: ToolbarAction[] = [
    {
      key: "add",
      icon: <PlusOutlined />,
      tooltip: "新增子分类",
      onClick: onAdd,
      variant: "primary",
    },
  ];

  const batchActions: ToolbarAction[] = [
    {
      key: "delete",
      icon: <DeleteOutlined />,
      tooltip: "删除",
      onClick: onDelete,
      variant: "danger",
    },
    {
      key: "move",
      icon: <SwapOutlined />,
      tooltip: "移动",
      onClick: onCut,
      variant: "neutral",
    },
    {
      key: "copy",
      icon: <CopyOutlined />,
      tooltip: "复制",
      onClick: onCopy,
      variant: "neutral",
    },
  ];

  const trailingActions: ToolbarAction[] = [
    {
      key: "more",
      type: "dropdown",
      icon: <MoreOutlined />,
      tooltip: "更多操作",
      menuItems: moreMenuItems,
      variant: "neutral",
    },
  ];

  return (
    <BaseToolbar
      toolbarState={toolbarState}
      searchPlaceholder={searchPlaceholder}
      showCheckableToggle={showCheckableToggle}
      batchActionsVisible={hasCheckedNodes}
      batchActionsExpandedWidth={TOOLBAR_ACTIONS_EXPANDED_WIDTH}
      primaryActions={primaryActions}
      batchActions={batchActions}
      trailingActions={trailingActions}
    />
  );
};

export default AdminCategoryTreeToolbar;