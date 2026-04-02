import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Button,
  Checkbox,
  Dropdown,
  Empty,
  MenuProps,
  Table,
  Typography,
  theme,
} from "antd";
import type { TableColumnsType } from "antd";
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
const ATTRIBUTE_INDEX_COL_WIDTH = 40;
const ATTRIBUTE_META_COL_WIDTH = 112;
const ATTRIBUTE_CHECKBOX_COL_WIDTH = 48;

type AttributeColumnKey = 'name' | 'attributeField' | 'type';
type AttributeColumnShareMap = Record<AttributeColumnKey, number>;

const ATTRIBUTE_MIN_COLUMN_SHARE: AttributeColumnShareMap = {
  name: 30,
  attributeField: 30,
  type: 22,
};

const ATTRIBUTE_DEFAULT_COLUMN_SHARES: AttributeColumnShareMap = {
  name: 38,
  attributeField: 34,
  type: 28,
};

interface ResizableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width?: string;
  minShare?: number;
  onResize?: (share: number) => void;
}

const distributeDeltaAcrossAttributeColumns = (
  previous: AttributeColumnShareMap,
  activeKey: AttributeColumnKey,
  requestedShare: number,
): AttributeColumnShareMap => {
  const currentShare = previous[activeKey];
  const delta = requestedShare - currentShare;

  if (Math.abs(delta) < 0.01) {
    return previous;
  }

  const otherKeys = (Object.keys(previous) as AttributeColumnKey[]).filter((key) => key !== activeKey);
  const next = { ...previous };

  if (delta > 0) {
    let remainingDelta = delta;
    for (const key of otherKeys) {
      const maxShrink = next[key] - ATTRIBUTE_MIN_COLUMN_SHARE[key];
      if (maxShrink <= 0) {
        continue;
      }

      const applied = Math.min(maxShrink, remainingDelta / (otherKeys.length || 1) || remainingDelta);
      next[key] -= applied;
      remainingDelta -= applied;
    }

    if (remainingDelta > 0) {
      for (const key of otherKeys) {
        if (remainingDelta <= 0) {
          break;
        }
        const maxShrink = next[key] - ATTRIBUTE_MIN_COLUMN_SHARE[key];
        if (maxShrink <= 0) {
          continue;
        }
        const applied = Math.min(maxShrink, remainingDelta);
        next[key] -= applied;
        remainingDelta -= applied;
      }
    }

    next[activeKey] = requestedShare - remainingDelta;
  } else {
    const growDelta = Math.abs(delta);
    const totalOtherShare = otherKeys.reduce((sum, key) => sum + previous[key], 0);
    next[activeKey] = requestedShare;
    otherKeys.forEach((key) => {
      const ratio = totalOtherShare > 0 ? previous[key] / totalOtherShare : 1 / otherKeys.length;
      next[key] += growDelta * ratio;
    });
  }

  const total = (Object.values(next) as number[]).reduce((sum, value) => sum + value, 0);
  if (total > 0) {
    const factor = 100 / total;
    (Object.keys(next) as AttributeColumnKey[]).forEach((key) => {
      next[key] = Number((next[key] * factor).toFixed(2));
    });
  }

  return next;
};

const ResizableHeaderCell: React.FC<ResizableHeaderCellProps> = ({
  width,
  minShare = 20,
  onResize,
  children,
  style,
  ...restProps
}) => {
  const startXRef = useRef(0);
  const startShareRef = useRef(typeof width === 'string' ? Number.parseFloat(width) || 0 : 0);
  const tableWidthRef = useRef(0);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const headerCell = event.currentTarget.parentElement;
    const tableElement = headerCell?.closest('table');

    startXRef.current = event.clientX;
    startShareRef.current = typeof width === 'string' ? Number.parseFloat(width) || 0 : 0;
    tableWidthRef.current = tableElement?.getBoundingClientRect().width || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (tableWidthRef.current <= 0) return;
      const deltaPercent = ((moveEvent.clientX - startXRef.current) / tableWidthRef.current) * 100;
      const nextShare = Math.max(minShare, startShareRef.current + deltaPercent);
      onResize?.(nextShare);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th {...restProps} style={{ ...style, width, position: 'relative' }}>
      {children}
      {typeof width === 'string' && onResize ? (
        <div className="attribute-list-resize-handle" onMouseDown={handleMouseDown} />
      ) : null}
    </th>
  );
};

type AttributeTableRow = AttributeItem & {
  rowIndex: number;
};

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
  const [checkableEnabled, setCheckableEnabled] = useState(false);
  const [columnShares, setColumnShares] = useState<AttributeColumnShareMap>(ATTRIBUTE_DEFAULT_COLUMN_SHARES);

  useEffect(() => {
    if (activeAttributeId && listRef.current) {
      const safeRowKey = activeAttributeId.replaceAll('"', '\\"');
      const element = listRef.current.querySelector(`tr[data-row-key="${safeRowKey}"]`);
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

  const handleColumnResize = useCallback((columnKey: AttributeColumnKey, nextShare: number) => {
    setColumnShares((prev) => distributeDeltaAcrossAttributeColumns(prev, columnKey, nextShare));
  }, []);

  const handleRowContextMenu = useCallback((event: React.MouseEvent, item: AttributeItem) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedRowKeys.includes(item.id)) {
      emitSelectionChange([item.id], item.id);
      setAnchorRowId(item.id);
    }
    setContextMenuRowId(item.id);
    setContextMenuState({
      open: true,
      x: event.clientX,
      y: event.clientY,
      target: "row",
      item,
    });
  }, [selectedRowKeys]);

  const handleCheckableToggle = useCallback(() => {
    const nextCheckableEnabled = !checkableEnabled;
    setCheckableEnabled(nextCheckableEnabled);

    if (!nextCheckableEnabled && selectedRowKeys.length > 1) {
      emitSelectionChange(activeAttributeId ? [activeAttributeId] : [], activeAttributeId);
    }
  }, [activeAttributeId, checkableEnabled, selectedRowKeys]);

  const toolbarState = useMemo<BaseToolbarState>(() => ({
    checkableEnabled,
    checkedKeys: selectedRowKeys,
    checkedCount: selectedRowKeys.length,
    searchValue: searchText,
    searchExpanded,
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => onSearchTextChange(e.target.value),
    onSearchVisibilityChange: setSearchExpanded,
    onSearchClear: () => onSearchTextChange(''),
    onCheckableToggle: handleCheckableToggle,
  }), [checkableEnabled, handleCheckableToggle, onSearchTextChange, searchExpanded, searchText, selectedRowKeys]);

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
  const tableData = useMemo<AttributeTableRow[]>(() => (
    filteredData.map((item, index) => ({
      ...item,
      rowIndex: index + 1,
    }))
  ), [filteredData]);
  const isEmpty = tableData.length === 0;

  const columns = useMemo<TableColumnsType<AttributeTableRow>>(() => [
    ...(checkableEnabled ? [{
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Checkbox
            checked={tableData.length > 0 && filteredSelectedCount === tableData.length}
            indeterminate={filteredSelectedCount > 0 && filteredSelectedCount < tableData.length}
            onChange={handleSelectAll}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ),
      key: 'selection',
      width: ATTRIBUTE_CHECKBOX_COL_WIDTH,
      align: 'center' as const,
      render: (_: unknown, record: AttributeTableRow) => (
        <Checkbox
          checked={selectedRowKeys.includes(record.id)}
          onChange={(event) => handleSelectRow(record.id, event.target.checked)}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    }] : []),
    {
      title: '序号',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: ATTRIBUTE_INDEX_COL_WIDTH,
      align: 'center' as const,
      render: (value: number) => (
        <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
          {value}
        </Text>
      ),
    },
    {
      title: '属性名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
      width: `${columnShares.name}%`,
      ellipsis: true,
      onHeaderCell: () => ({
        width: `${columnShares.name}%`,
        minShare: ATTRIBUTE_MIN_COLUMN_SHARE.name,
        onResize: (share: number) => handleColumnResize('name', share),
      }),
      render: (value: string) => (
        <Text
          strong
          style={{ fontSize: 14, minWidth: 0, textAlign: 'center', display: 'block' }}
          ellipsis={{ tooltip: value || '未命名属性' }}
        >
          {value || (
            <span style={{ color: token.colorTextQuaternary, fontStyle: 'italic' }}>
              未命名属性
            </span>
          )}
        </Text>
      ),
    },
    {
      title: '属性字段',
      dataIndex: 'attributeField',
      key: 'attributeField',
      align: 'center' as const,
      width: `${columnShares.attributeField}%`,
      ellipsis: true,
      onHeaderCell: () => ({
        width: `${columnShares.attributeField}%`,
        minShare: ATTRIBUTE_MIN_COLUMN_SHARE.attributeField,
        onResize: (share: number) => handleColumnResize('attributeField', share),
      }),
      render: (value?: string) => (
        <Text
          type="secondary"
          style={{ fontSize: 12, fontFamily: 'monospace', minWidth: 0, textAlign: 'center', display: 'block' }}
          ellipsis={{ tooltip: value || '-' }}
        >
          {value || '-'}
        </Text>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'type',
      key: 'type',
      width: `${columnShares.type}%`,
      align: 'center' as const,
      onHeaderCell: () => ({
        width: `${columnShares.type}%`,
        minShare: ATTRIBUTE_MIN_COLUMN_SHARE.type,
        onResize: (share: number) => handleColumnResize('type', share),
      }),
      render: (value: AttributeType, record) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            minWidth: 0,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}
            title={value}
          >
            {getTypeIcon(value)}
            <span style={{ fontSize: 12 }}>{getTypeLabel(value)}</span>
          </span>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
            {record.required ? (
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: token.colorError,
                }}
                title="必填"
              />
            ) : null}
            <Dropdown
              key={`more-${record.id}`}
              menu={{ items: getMenuItems(record) }}
              trigger={["click"]}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined style={{ color: token.colorTextQuaternary }} />}
                onClick={(event) => event.stopPropagation()}
              />
            </Dropdown>
          </div>
        </div>
      ),
    },
  ], [
    checkableEnabled,
    columnShares.attributeField,
    columnShares.name,
    columnShares.type,
    filteredSelectedCount,
    getMenuItems,
    handleColumnResize,
    handleSelectAll,
    selectedRowKeys,
    tableData.length,
    token.colorError,
    token.colorTextQuaternary,
  ]);

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
          showCheckableToggle
          batchActionsVisible={checkableEnabled && selectedRowKeys.length > 0}
          primaryActions={primaryActions}
          batchActions={batchActions}
          trailingActions={trailingActions}
        />
      </div>

      {/* List Area */}
      <div
        style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: 'hidden' }}
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
        <div className="attribute-list-table-shell">
          <Table<AttributeTableRow>
            className={`attribute-list-table ${isEmpty ? 'attribute-list-table--empty' : ''}`}
            rowKey="id"
            size="small"
            tableLayout="fixed"
            components={{ header: { cell: ResizableHeaderCell } }}
            style={{ height: '99%' }}
            pagination={false}
            dataSource={tableData}
            columns={columns}
            locale={{ emptyText: null }}
            onRow={(record) => ({
              onMouseDown: (event) => {
                if (!event.shiftKey) return;
                const target = event.target as HTMLElement;
                if (!target.closest('input, textarea, [contenteditable="true"]')) {
                  event.preventDefault();
                }
              },
              onClick: (event) => {
                const target = event.target as HTMLElement;
                if (target.closest('.ant-checkbox-wrapper') || target.closest('.ant-checkbox') || target.closest('.ant-dropdown-trigger')) {
                  return;
                }
                handleExplorerSelect(record.id, event);
              },
              onContextMenu: (event) => handleRowContextMenu(event, record),
            })}
            rowClassName={(record) => {
              const isActive = activeAttributeId === record.id;
              const isSelected = selectedRowKeys.includes(record.id);
              const isNew = record.id.startsWith('new_attr_');
              if (isActive) {
                return 'attribute-list-row-active';
              }
              if (isNew) {
                return 'attribute-list-row-new';
              }
              if (contextMenuRowId === record.id || isSelected) {
                return 'attribute-list-row-selected';
              }
              return 'attribute-list-row';
            }}
          />
          {isEmpty ? (
            <div className="attribute-list-empty-state" aria-hidden="true">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无属性" />
            </div>
          ) : null}
        </div>
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

      <style jsx global>{`
        .attribute-list-table-shell {
          position: relative;
          height: 100%;
          min-height: 0;
        }
        .attribute-list-table .ant-table,
        .attribute-list-table .ant-table-container {
          background: ${token.colorBgContainer};
          width: 100%;
        }
        .attribute-list-table,
        .attribute-list-table .ant-spin-nested-loading,
        .attribute-list-table .ant-spin-container,
        .attribute-list-table .ant-table,
        .attribute-list-table .ant-table-container,
        .attribute-list-table .ant-table-content {
          height: 100%;
        }
        .attribute-list-table--empty .ant-table-placeholder {
          display: none;
        }
        .attribute-list-empty-state {
          position: absolute;
          top: 46px;
          right: 0;
          bottom: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${token.colorBgContainer};
        }
        .attribute-list-table table {
          width: 100% !important;
        }
        .attribute-list-table .ant-table-thead > tr > th,
        .attribute-list-table .ant-table-tbody > tr > td {
          padding-top: 12px;
          padding-bottom: 12px;
        }
        .attribute-list-table .ant-table-thead > tr > th {
          height: 46px;
          padding-top: 0;
          padding-bottom: 0;
          background: ${token.colorFillAlter};
          color: ${token.colorTextSecondary};
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          position: sticky;
          top: 0;
          z-index: 2;
          vertical-align: middle;
        }
        .attribute-list-table .ant-table-thead > tr > th.ant-table-selection-column,
        .attribute-list-table .ant-table-tbody > tr > td.ant-table-selection-column {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          vertical-align: middle;
        }
        .attribute-list-table .ant-table-thead > tr > th:first-child,
        .attribute-list-table .ant-table-tbody > tr > td:first-child {
          padding-left: 12px;
        }
        .attribute-list-table .ant-table-thead > tr > th:last-child,
        .attribute-list-table .ant-table-tbody > tr > td:last-child {
          padding-right: 12px;
        }
        .attribute-list-table .ant-table-tbody > tr > td {
          background: ${token.colorBgContainer};
          text-align: center;
          cursor: pointer;
          transition: background 0.2s ease;
          user-select: none;
          -webkit-user-select: none;
        }
        .attribute-list-table .ant-table-tbody > tr.attribute-list-row:hover > td {
          background: ${token.controlItemBgHover};
        }
        .attribute-list-table .ant-table-tbody > tr.attribute-list-row-selected > td {
          background: ${token.controlItemBgHover};
        }
        .attribute-list-table .ant-table-tbody > tr.attribute-list-row-new > td {
          background: ${token.colorInfoBg};
        }
        .attribute-list-table .ant-table-tbody > tr.attribute-list-row-new:hover > td {
          background: ${token.colorInfoBgHover || token.colorInfoBg};
        }
        .attribute-list-table .ant-table-tbody > tr.attribute-list-row-active > td {
          background: ${token.controlItemBgActive} !important;
        }
        .attribute-list-table .ant-table-tbody > tr.attribute-list-row-active > td:first-child {
          box-shadow: inset 4px 0 0 ${token.colorPrimary};
        }
        .attribute-list-resize-handle {
          position: absolute;
          top: 0;
          right: -5px;
          width: 10px;
          height: 100%;
          cursor: col-resize;
          z-index: 3;
        }
        .attribute-list-resize-handle::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 4px;
          transform: translateY(-50%);
          width: 2px;
          height: 18px;
          border-radius: 999px;
          background: ${token.colorBorder};
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .attribute-list-table .ant-table-thead > tr > th:hover .attribute-list-resize-handle::after {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default AttributeList;
