import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MoreOutlined,
  NumberOutlined,
  FontColorsOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import {
  List,
  Button,
  Dropdown,
  MenuProps,
  Typography,
  theme,
  Tag,
  Checkbox,
} from "antd";
import {
  AddCircleOutline,
  DeleteOutline,
  ContentCopy,
} from "@mui/icons-material";
import BaseToolbar, { type BaseToolbarState, type ToolbarAction } from "@/components/TreeToolbar/BaseToolbar";
import { AttributeItem, AttributeType } from "./types";
import FloatingContextMenu from "@/components/ContextMenu/FloatingContextMenu";

interface AttributeListProps {
  dataSource: AttributeItem[];
  setDataSource: (data: AttributeItem[]) => void;
  selectedAttributeIds: string[];
  activeAttributeId: string | null;
  onSelectionChange: (ids: string[], primaryId: string | null) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onAddAttribute?: () => void;
  onDuplicateAttribute?: (item: AttributeItem) => void;
  onDeleteAttribute?: (item: AttributeItem) => void;
  onBatchRemoveAttributes?: (ids: string[]) => void;
}

const { Text } = Typography;
// ... existing getTypeIcon code ...
const getTypeIcon = (type: AttributeType) => {
  switch (type) {
    case "string":
      return <FontColorsOutlined style={{ color: "#1890ff" }} />;
    case "number":
      return <NumberOutlined style={{ color: "#52c41a" }} />;
    case "date":
      return <CalendarOutlined style={{ color: "#fa8c16" }} />;
    case "boolean":
      return <CheckSquareOutlined style={{ color: "#722ed1" }} />;
    case "enum":
      return <UnorderedListOutlined style={{ color: "#13c2c2" }} />;
    case "multi-enum":
      return <UnorderedListOutlined style={{ color: "#13c2c2" }} />;
    default:
      return <FontColorsOutlined />;
  }
};

const getTypeLabel = (type: AttributeType) => {
  switch (type) {
    case "string":
      return "文本型";
    case "number":
      return "数字型";
    case "date":
      return "日期型";
    case "boolean":
      return "布尔型";
    case "enum":
      return "枚举型（单选）";
    case "multi-enum":
      return "枚举型（多选）";
    default:
      return type;
  }
};

const LEFT_INDICATOR_WIDTH = 4;
const CHECKBOX_COL_WIDTH = 32;
const INDEX_COL_WIDTH = 30;
const TYPE_COL_WIDTH = 100;
const STATUS_COL_WIDTH = 44;
const HORIZONTAL_PADDING = 16;
const ACTION_COL_RESERVED_WIDTH = 40;
const COLUMN_GAP = 8;
const LIST_GRID_TEMPLATE_COLUMNS = `${CHECKBOX_COL_WIDTH}px ${INDEX_COL_WIDTH}px minmax(0, 1fr) minmax(0, 1fr) ${TYPE_COL_WIDTH}px ${STATUS_COL_WIDTH}px`;

const AttributeList: React.FC<AttributeListProps> = ({
  dataSource,
  setDataSource,
  selectedAttributeIds,
  activeAttributeId,
  onSelectionChange,
  searchText,
  onSearchTextChange,
  onAddAttribute,
  onDuplicateAttribute,
  onDeleteAttribute,
  onBatchRemoveAttributes,
}) => {
  const { token } = theme.useToken();
  const listRef = useRef<HTMLDivElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(Boolean(searchText));

  useEffect(() => {
    if (activeAttributeId && listRef.current) {
      const element = document.getElementById(`attr-list-item-${activeAttributeId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeAttributeId, dataSource.length]);

  useEffect(() => {
    if (searchText) {
      setSearchExpanded(true);
    }
  }, [searchText]);

  const filteredData = dataSource.filter(
    (item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.code.toLowerCase().includes(searchText.toLowerCase()) ||
      item.attributeField?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const [anchorRowId, setAnchorRowId] = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    open: boolean;
    x: number;
    y: number;
    target: "row" | "blank";
    item: AttributeItem | null;
  }>({ open: false, x: 0, y: 0, target: "blank", item: null });
  const [contextMenuRowId, setContextMenuRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!anchorRowId) return;
    if (!dataSource.some((item) => item.id === anchorRowId)) {
      setAnchorRowId(null);
    }
  }, [anchorRowId, dataSource]);

  const selectedRowKeys = selectedAttributeIds;
  const singleSelectedAttribute = useMemo(() => {
    if (selectedRowKeys.length !== 1) {
      return null;
    }

    const selectedId = String(selectedRowKeys[0]);
    return dataSource.find((item) => item.id === selectedId) || null;
  }, [dataSource, selectedRowKeys]);

  const emitSelectionChange = (ids: string[], primaryId: string | null) => {
    const normalizedIds = Array.from(new Set(ids));
    const nextPrimary =
      normalizedIds.length === 1 && primaryId && normalizedIds.includes(primaryId)
        ? primaryId
        : normalizedIds.length === 1
          ? normalizedIds[0]
          : null;
    onSelectionChange(normalizedIds, nextPrimary);
  };

  const handleExplorerSelect = (clickedId: string, event: React.MouseEvent) => {
    const visibleIds = filteredData.map((item) => item.id);
    const clickedIndex = visibleIds.indexOf(clickedId);
    if (clickedIndex < 0) return;

    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    const current = selectedRowKeys.map((key) => String(key));
    const currentSet = new Set(current);
    let nextSelection: string[] = [];

    if (isShift && anchorRowId && visibleIds.includes(anchorRowId)) {
      const anchorIndex = visibleIds.indexOf(anchorRowId);
      const [start, end] =
        anchorIndex <= clickedIndex
          ? [anchorIndex, clickedIndex]
          : [clickedIndex, anchorIndex];
      const rangeIds = visibleIds.slice(start, end + 1);
      if (isCtrlOrMeta) {
        nextSelection = Array.from(new Set([...current, ...rangeIds]));
      } else {
        nextSelection = rangeIds;
      }
    } else if (isCtrlOrMeta) {
      if (currentSet.has(clickedId)) {
        nextSelection = current.filter((id) => id !== clickedId);
      } else {
        nextSelection = [...current, clickedId];
      }
    } else {
      nextSelection = [clickedId];
    }

    setAnchorRowId(clickedId);
    emitSelectionChange(nextSelection, nextSelection.length === 1 ? clickedId : null);
  };

  const handleSelectAll = (e: any) => {
    const visibleIds = filteredData.map((item) => item.id);
    const current = selectedRowKeys.map((key) => String(key));
    if (e.target.checked) {
      emitSelectionChange(Array.from(new Set([...current, ...visibleIds])), null);
    } else {
      const visibleSet = new Set(visibleIds);
      emitSelectionChange(current.filter((id) => !visibleSet.has(id)), null);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const current = selectedRowKeys.map((key) => String(key));
    if (checked) {
      emitSelectionChange([...current, id], null);
    } else {
      emitSelectionChange(current.filter((key) => key !== id), null);
    }
    setAnchorRowId(id);
  };

  const handleDuplicate = (item: AttributeItem) => {
    onDuplicateAttribute?.(item);
  };

  const handleDelete = (item: AttributeItem) => {
    if (onDeleteAttribute) {
      onDeleteAttribute(item);
    } else {
      setDataSource(dataSource.filter((d) => d.id !== item.id));
    }
  };

  const getMenuItems = (item: AttributeItem): MenuProps["items"] => [
    {
      key: "duplicate",
      label: "复制 (Duplicate)",
      icon: <CopyOutlined />,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        handleDuplicate(item);
      },
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "删除 (Delete)",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        handleDelete(item);
      },
    },
  ];

  const handleToolbarBatchDelete = () => {
    const ids = selectedRowKeys.map((key) => String(key));
    if (ids.length === 0) return;

    if (onBatchRemoveAttributes) {
      onBatchRemoveAttributes(ids);
    } else {
      setDataSource(dataSource.filter((d) => !ids.includes(d.id)));
    }
    emitSelectionChange([], null);
  };

  const handleToolbarDuplicate = () => {
    if (!singleSelectedAttribute) {
      return;
    }

    handleDuplicate(singleSelectedAttribute);
  };

  const toolbarState = useMemo<BaseToolbarState>(() => ({
    checkableEnabled: true,
    checkedKeys: selectedRowKeys,
    checkedCount: selectedRowKeys.length,
    searchValue: searchText,
    searchExpanded,
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => onSearchTextChange(e.target.value),
    onSearchVisibilityChange: setSearchExpanded,
    onSearchClear: () => onSearchTextChange(''),
    onCheckableToggle: () => undefined,
  }), [onSearchTextChange, searchExpanded, searchText, selectedRowKeys]);

  const primaryActions = useMemo<ToolbarAction[]>(() => [
    {
      key: 'add',
      icon: <PlusOutlined />,
      tooltip: '新增属性',
      variant: 'primary',
      onClick: () => onAddAttribute?.(),
    },
  ], [onAddAttribute]);

  const batchActions = useMemo<ToolbarAction[]>(() => [
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      tooltip: '批量删除',
      variant: 'danger',
      onClick: handleToolbarBatchDelete,
      disabled: selectedRowKeys.length === 0,
    },
  ], [selectedRowKeys.length]);

  const trailingActions = useMemo<ToolbarAction[]>(() => [
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      tooltip: '复制属性',
      variant: 'neutral',
      onClick: handleToolbarDuplicate,
      disabled: !singleSelectedAttribute,
    },
    {
      key: 'import',
      icon: <ImportOutlined />,
      tooltip: '导入属性',
      variant: 'neutral',
      disabled: true,
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      tooltip: '导出属性',
      variant: 'neutral',
      disabled: true,
    },
  ], [handleToolbarDuplicate, singleSelectedAttribute]);

  const filteredIds = filteredData.map((item) => item.id);
  const filteredSet = new Set(filteredIds);
  const filteredSelectedCount = selectedRowKeys.filter((key) =>
    filteredSet.has(String(key)),
  ).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: token.colorBgContainer,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: 46,
          padding: "0 16px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <BaseToolbar
          toolbarState={toolbarState}
          searchPlaceholder="筛选属性"
          showCheckableToggle={false}
          batchActionsVisible={selectedRowKeys.length > 0}
          primaryActions={primaryActions}
          batchActions={batchActions}
          trailingActions={trailingActions}
        />
      </div>

      {/* List Area */}
      <div
        style={{ flex: 1, overflowY: "auto" }}
        ref={listRef}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuRowId(null);
          setContextMenuState({
            open: true,
            x: e.clientX,
            y: e.clientY,
            target: "blank",
            item: null,
          });
        }}
        onScroll={() => {
          if (contextMenuState.open) {
            setContextMenuState((prev) => ({ ...prev, open: false }));
            setContextMenuRowId(null);
          }
        }}
      >
        <FloatingContextMenu
          open={contextMenuState.open}
          x={contextMenuState.x}
          y={contextMenuState.y}
          items={
            contextMenuState.target === "blank"
              ? [
                  {
                    key: "add",
                    label: "新增属性",
                    icon: <AddCircleOutline fontSize="small" />,
                  },
                ]
              : [
                  {
                    key: "duplicate",
                    label: "复制",
                    icon: <ContentCopy fontSize="small" />,
                    disabled: !contextMenuState.item,
                  },
                  {
                    key: "delete",
                    label: "删除",
                    icon: <DeleteOutline fontSize="small" />,
                    danger: true,
                    disabled: !contextMenuState.item,
                  },
                ]
          }
          onMenuClick={({ key, domEvent }) => {
            domEvent.stopPropagation();
            if (key === "add") onAddAttribute?.();
            if (key === "duplicate" && contextMenuState.item) {
              handleDuplicate(contextMenuState.item);
            }
            if (key === "delete" && contextMenuState.item) {
              handleDelete(contextMenuState.item);
            }
            setContextMenuState((prev) => ({ ...prev, open: false }));
            setContextMenuRowId(null);
          }}
          onClose={() => {
            setContextMenuState((prev) => ({ ...prev, open: false }));
            setContextMenuRowId(null);
          }}
        />
        <div style={{
          padding: `8px ${HORIZONTAL_PADDING}px`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          borderLeft: `${LEFT_INDICATOR_WIDTH}px solid transparent`,
          background: token.colorBgContainer,
          paddingRight: ACTION_COL_RESERVED_WIDTH,
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: LIST_GRID_TEMPLATE_COLUMNS,
              columnGap: COLUMN_GAP,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Checkbox
                checked={filteredData.length > 0 && filteredSelectedCount === filteredData.length}
                indeterminate={filteredSelectedCount > 0 && filteredSelectedCount < filteredData.length}
                onChange={handleSelectAll}
              />
            </div>
            <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>序号</Text>
            <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>属性名称</Text>
            <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>属性字段</Text>
            <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>数据类型</Text>
            <div />
          </div>
        </div>

        <List
          itemLayout="horizontal"
          dataSource={filteredData}
          split={false}
          renderItem={(item, index) => {
            const isActive = activeAttributeId === item.id;
            const isSelected = selectedRowKeys.includes(item.id);
            const isChecked = selectedRowKeys.includes(item.id);
            return (
              <div id={`attr-list-item-${item.id}`}>
                <List.Item
                style={{
                  padding: `12px ${HORIZONTAL_PADDING}px`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  borderLeft: `${LEFT_INDICATOR_WIDTH}px solid ${isActive ? token.colorPrimary : "transparent"}`,
                  background: isActive
                    ? token.controlItemBgActive
                    : isSelected
                      ? token.controlItemBgHover
                    : contextMenuRowId === item.id
                      ? token.controlItemBgHover
                      : "transparent",
                  position: "relative",
                  paddingRight: `${ACTION_COL_RESERVED_WIDTH}px`
                }}
                className={!isSelected ? "hover:bg-gray-50" : ""}
                onMouseDown={(e) => {
                  if (!e.shiftKey) return;
                  const target = e.target as HTMLElement;
                  if (!target.closest("input, textarea, [contenteditable='true']")) {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => handleExplorerSelect(item.id, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!selectedRowKeys.includes(item.id)) {
                    emitSelectionChange([item.id], item.id);
                    setAnchorRowId(item.id);
                  }
                  setContextMenuRowId(item.id);
                  setContextMenuState({
                    open: true,
                    x: e.clientX,
                    y: e.clientY,
                    target: "row",
                    item,
                  });
                }}
              >
                <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
                  <Dropdown
                    key="more"
                    menu={{ items: getMenuItems(item) }}
                    trigger={["click"]}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={
                        <MoreOutlined
                          style={{ color: token.colorTextQuaternary }}
                        />
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
                <div
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: LIST_GRID_TEMPLATE_COLUMNS,
                    columnGap: COLUMN_GAP,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Checkbox 
                      checked={isChecked} 
                      onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>
                    {index + 1}
                  </Text>

                  <Text
                    strong
                    style={{ fontSize: 14, minWidth: 0, textAlign: "center", display: "block" }}
                    ellipsis={{ tooltip: item.name || "未命名属性" }}
                  >
                    {item.name || (
                      <span
                        style={{
                          color: token.colorTextQuaternary,
                          fontStyle: "italic",
                        }}
                      >
                        未命名属性
                      </span>
                    )}
                  </Text>

                  <Text
                    type="secondary"
                    style={{ fontSize: 12, fontFamily: "monospace", minWidth: 0, textAlign: "center", display: "block" }}
                    ellipsis={{ tooltip: item.attributeField }}
                  >
                    {item.attributeField || '-'}
                  </Text>

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                    title={item.type}
                  >
                    {getTypeIcon(item.type)}
                    <span style={{ fontSize: 12 }}>
                      {getTypeLabel(item.type)}
                    </span>
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {item.id.startsWith("new_attr_") ? (
                      <Tag
                        color="processing"
                        style={{ marginInlineEnd: 0, paddingInline: 6, lineHeight: "18px", height: 20 }}
                      >
                        NEW
                      </Tag>
                    ) : item.required ? (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: token.colorError,
                        }}
                        title="必填"
                      ></div>
                    ) : null}
                  </div>
                </div>
                </List.Item>
              </div>
            );
          }}
        />
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: 8,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgLayout,
          textAlign: "center",
          fontSize: 12,
          color: token.colorTextQuaternary,
        }}
      >
        共 {dataSource.length} 个属性
      </div>
    </div>
  );
};

export default AttributeList;
