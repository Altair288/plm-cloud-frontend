import React from "react";
import { theme } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  ImportOutlined,
  ExportOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { CategoryTreeToolbarState } from "@/features/category/CategoryTree";
import BaseToolbar, { type ToolbarAction } from "@/components/TreeToolbar/BaseToolbar";
import { TOOLBAR_ACTIONS_EXPANDED_WIDTH } from "@/components/TreeToolbar/treeToolbarStyles";

export interface AdminCategoryTreeToolbarProps {
  searchPlaceholder?: string;
  showCheckableToggle?: boolean;
  hasCheckedNodes: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onCut: () => void;
  onCopy: () => void;
  onImport?: () => void;
  onExport?: () => void;
  toolbarState: CategoryTreeToolbarState;
}

const CATEGORY_BATCH_ACTIONS_EXPANDED_WIDTH = TOOLBAR_ACTIONS_EXPANDED_WIDTH + 36;

const AdminCategoryTreeToolbar: React.FC<AdminCategoryTreeToolbarProps> = ({
  searchPlaceholder,
  showCheckableToggle,
  hasCheckedNodes,
  onAdd,
  onDelete,
  onCut,
  onCopy,
  onImport,
  onExport,
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
    {
      key: "import",
      icon: <ImportOutlined />,
      tooltip: "导入",
      onClick: onImport,
      variant: "neutral",
    },
  ];

  const batchActions: ToolbarAction[] = [
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
    {
      key: "delete",
      icon: <DeleteOutlined />,
      tooltip: "删除",
      onClick: onDelete,
      variant: "danger",
    },
    {
      key: "export",
      icon: <ExportOutlined />,
      tooltip: "导出已选分类",
      onClick: onExport,
      variant: "neutral",
    },
  ];

  return (
    <BaseToolbar
      toolbarState={toolbarState}
      searchPlaceholder={searchPlaceholder}
      showCheckableToggle={showCheckableToggle}
      batchActionsVisible={hasCheckedNodes}
      batchActionsExpandedWidth={CATEGORY_BATCH_ACTIONS_EXPANDED_WIDTH}
      primaryActions={primaryActions}
      batchActions={batchActions}
    />
  );
};

export default AdminCategoryTreeToolbar;