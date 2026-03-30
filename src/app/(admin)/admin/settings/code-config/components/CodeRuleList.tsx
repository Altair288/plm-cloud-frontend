import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Empty, Flex, Typography, Table, theme } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import BaseTreeToolbar from '@/components/TreeToolbar/BaseTreeToolbar';
import type {
  CodeRule,
  ColumnKey,
  ColumnShareMap,
} from './types';
import {
  COLUMN_KEYS,
  MIN_COLUMN_SHARE,
  DEFAULT_COLUMN_SHARES,
  CHECKBOX_COL_WIDTH,
  distributeDeltaAcrossColumns,
} from './types';

const { Text } = Typography;

// ================= 可调宽表头单元格 =================
interface ResizableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width?: string;
  minShare?: number;
  onResize?: (share: number) => void;
}

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
        <div className="code-rule-resize-handle" onMouseDown={handleMouseDown} />
      ) : null}
    </th>
  );
};

// ================= Props =================
interface CodeRuleListProps {
  rules: CodeRule[];
  loading?: boolean;
  allowMutations?: boolean;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh?: () => void;
  onAdd?: () => void;
  onBatchDelete?: (ids: React.Key[]) => void;
}

const CodeRuleList: React.FC<CodeRuleListProps> = ({
  rules,
  loading = false,
  allowMutations = true,
  activeId,
  onSelect,
  onRefresh,
  onAdd,
  onBatchDelete,
}) => {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [checkableEnabled, setCheckableEnabled] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [columnShares, setColumnShares] = useState<ColumnShareMap>(DEFAULT_COLUMN_SHARES);

  const filteredRules = useMemo(
    () => rules.filter((rule) => {
      const keyword = searchText.trim();
      if (!keyword) {
        return true;
      }

      return [rule.name, rule.code, rule.businessObject]
        .some((value) => value?.includes(keyword));
    }),
    [rules, searchText],
  );

  const handleColumnResize = useCallback((columnKey: ColumnKey, nextShare: number) => {
    setColumnShares((prev) => distributeDeltaAcrossColumns(prev, columnKey, nextShare));
  }, []);

  const toolbarState = useMemo(() => ({
    checkableEnabled,
    checkedKeys,
    checkedCount: checkedKeys.length,
    searchValue: searchText,
    searchExpanded,
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value),
    onSearchVisibilityChange: setSearchExpanded,
    onSearchClear: () => setSearchText(''),
    onCheckableToggle: () => {
      setCheckableEnabled((prev) => {
        const nextValue = !prev;
        if (!nextValue) setCheckedKeys([]);
        return nextValue;
      });
    },
  }), [searchText, searchExpanded, checkableEnabled, checkedKeys]);

  const columns: TableColumnsType<CodeRule> = [
    {
      title: '规则集名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
      width: `${columnShares.name}%`,
      ellipsis: true,
      onHeaderCell: () => ({
        width: `${columnShares.name}%`,
        minShare: MIN_COLUMN_SHARE.name,
        onResize: (share: number) => handleColumnResize('name', share),
      }),
      render: (value: string, record: CodeRule) => (
        <Text
          strong
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            color: record.id === activeId ? token.colorPrimary : token.colorText,
          }}
        >
          {value}
        </Text>
      ),
    },
    {
      title: '业务域编码',
      dataIndex: 'code',
      key: 'code',
      align: 'center',
      width: `${columnShares.code}%`,
      ellipsis: true,
      onHeaderCell: () => ({
        width: `${columnShares.code}%`,
        minShare: MIN_COLUMN_SHARE.code,
        onResize: (share: number) => handleColumnResize('code', share),
      }),
      render: (value: string) => (
        <Text
          type="secondary"
          style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 12, fontFamily: 'monospace' }}
          ellipsis={{ tooltip: value }}
        >
          {value}
        </Text>
      ),
    },
    {
      title: '业务领域',
      dataIndex: 'businessObject',
      key: 'businessObject',
      align: 'center',
      width: `${columnShares.businessObject}%`,
      ellipsis: true,
      onHeaderCell: () => ({
        width: `${columnShares.businessObject}%`,
        minShare: MIN_COLUMN_SHARE.businessObject,
        onResize: (share: number) => handleColumnResize('businessObject', share),
      }),
      render: (value: string) => (
        <Text type="secondary" style={{ display: 'block', width: '100%', textAlign: 'center' }} ellipsis={{ tooltip: value }}>
          {value}
        </Text>
      ),
    },
  ];

  const rowSelection = checkableEnabled
    ? {
        selectedRowKeys: checkedKeys,
        onChange: (nextSelectedRowKeys: React.Key[]) => setCheckedKeys(nextSelectedRowKeys),
        columnWidth: CHECKBOX_COL_WIDTH,
      }
    : undefined;

  const isEmpty = !loading && filteredRules.length === 0;

  return (
    <Flex vertical style={{ height: '100%', background: token.colorBgContainer }}>
      {/* 列表工具栏 */}
      <Flex align="center" style={{ padding: '0 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, height: 48 }}>
        <BaseTreeToolbar
          toolbarState={toolbarState}
          searchPlaceholder="搜索规则集"
          showCheckableToggle={allowMutations}
          batchActionsVisible={allowMutations && checkedKeys.length > 0}
          primaryActions={allowMutations && onAdd ? [
            {
              key: 'add',
              icon: <PlusOutlined />,
              tooltip: '新增规则',
              variant: 'primary',
              onClick: onAdd,
            },
          ] : []}
          batchActions={allowMutations && onBatchDelete ? [
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              tooltip: '批量删除',
              variant: 'danger',
              onClick: () => {
                onBatchDelete(checkedKeys);
                setCheckedKeys([]);
                setCheckableEnabled(false);
              },
            },
          ] : []}
          trailingActions={onRefresh ? [
            {
              key: 'refresh',
              icon: <ReloadOutlined />,
              tooltip: '刷新规则集',
              onClick: onRefresh,
              variant: 'neutral',
              disabled: loading,
            },
          ] : []}
        />
      </Flex>

      {/* 列表主体 */}
      <div className="code-rule-list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <div className="code-rule-list-table-shell">
          <Table<CodeRule>
            className={`code-rule-list-table ${checkableEnabled ? 'code-rule-list-table--checkable' : ''} ${isEmpty ? 'code-rule-list-table--empty' : ''}`}
            rowKey="id"
            size="small"
            tableLayout="fixed"
            components={{ header: { cell: ResizableHeaderCell } }}
            style={{ height: '99%' }}
            pagination={false}
            loading={loading}
            dataSource={filteredRules}
            columns={columns}
            locale={{ emptyText: null }}
            rowSelection={rowSelection}
            onRow={(record) => ({
              onClick: (event) => {
                const target = event.target as HTMLElement;
                if (target.closest('.ant-checkbox-wrapper') || target.closest('.ant-checkbox')) return;
                onSelect(record.id);
              },
            })}
            rowClassName={(record) => (record.id === activeId ? 'code-rule-row-active' : 'code-rule-row')}
          />
          {isEmpty ? (
            <div className="code-rule-list-empty-state" aria-hidden="true">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无数据"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* 底部统计 */}
      <div style={{
        padding: 8,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgLayout,
        textAlign: 'center',
        fontSize: 12,
        color: token.colorTextQuaternary,
      }}>
        共 {filteredRules.length} 个规则
      </div>

      {/* 全局样式 */}
      <style jsx global>{`
        .code-rule-list-table-shell {
          position: relative;
          height: 100%;
          min-height: 0;
        }
        .code-rule-list-scroll,
        .code-rule-workspace-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${token.colorBorder} transparent;
        }
        .code-rule-list-scroll::-webkit-scrollbar,
        .code-rule-workspace-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .code-rule-list-scroll::-webkit-scrollbar-track,
        .code-rule-workspace-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .code-rule-list-scroll::-webkit-scrollbar-thumb,
        .code-rule-workspace-scroll::-webkit-scrollbar-thumb {
          background: ${token.colorBorder};
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }
        .code-rule-list-scroll::-webkit-scrollbar-thumb:hover,
        .code-rule-workspace-scroll::-webkit-scrollbar-thumb:hover {
          background: ${token.colorTextQuaternary};
          border: 3px solid transparent;
          background-clip: padding-box;
        }

        .code-rule-list-table .ant-table,
        .code-rule-list-table .ant-table-container {
          background: ${token.colorBgContainer};
          width: 100%;
        }
        .code-rule-list-table,
        .code-rule-list-table .ant-spin-nested-loading,
        .code-rule-list-table .ant-spin-container,
        .code-rule-list-table .ant-table,
        .code-rule-list-table .ant-table-container,
        .code-rule-list-table .ant-table-content {
          height: 100%;
        }
        .code-rule-list-table--empty .ant-table-placeholder {
          display: none;
        }
        .code-rule-list-empty-state {
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
        .code-rule-list-table table {
          width: 100% !important;
        }
        .code-rule-list-table .ant-table-thead > tr > th,
        .code-rule-list-table .ant-table-tbody > tr > td {
          padding-top: 12px;
          padding-bottom: 12px;
        }
        .code-rule-list-table .ant-table-thead > tr > th {
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
        .code-rule-list-table .ant-table-thead > tr > th.ant-table-selection-column,
        .code-rule-list-table .ant-table-tbody > tr > td.ant-table-selection-column {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          vertical-align: middle;
        }
        .code-rule-list-table:not(.code-rule-list-table--checkable) .ant-table-thead > tr > th:first-child,
        .code-rule-list-table:not(.code-rule-list-table--checkable) .ant-table-tbody > tr > td:first-child {
          padding-left: 20px;
        }
        .code-rule-list-table .ant-table-selection-column {
          width: ${CHECKBOX_COL_WIDTH}px !important;
          min-width: ${CHECKBOX_COL_WIDTH}px;
          text-align: center;
          padding-left: 12px !important;
          padding-right: 12px !important;
        }
        .code-rule-list-table .ant-table-tbody > tr.code-rule-row > td,
        .code-rule-list-table .ant-table-tbody > tr.code-rule-row-active > td {
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .code-rule-list-table .ant-table-tbody > tr.code-rule-row:hover > td {
          background: ${token.controlItemBgHover};
        }
        .code-rule-list-table .ant-table-tbody > tr.code-rule-row-active > td {
          background: ${token.controlItemBgActive} !important;
        }
        .code-rule-list-table .ant-table-tbody > tr.code-rule-row-active > td:first-child {
          box-shadow: inset 4px 0 0 ${token.colorPrimary};
        }
        .code-rule-list-table .ant-table-tbody > tr > td {
          background: ${token.colorBgContainer};
          text-align: center;
        }

        .code-rule-resize-handle {
          position: absolute;
          top: 0;
          right: -5px;
          width: 10px;
          height: 100%;
          cursor: col-resize;
          z-index: 3;
        }
        .code-rule-resize-handle::after {
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
        .code-rule-list-table .ant-table-thead > tr > th:hover .code-rule-resize-handle::after {
          opacity: 1;
        }
      `}</style>
    </Flex>
  );
};

export default CodeRuleList;
