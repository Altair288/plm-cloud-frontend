'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Splitter, theme, Flex, Typography, Button, Input, List, Empty, Tag, Card, Space, Form, Select, InputNumber, Divider, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, DeleteOutlined, SettingOutlined, FontColorsOutlined, NumberOutlined, CalendarOutlined } from '@ant-design/icons';
import BaseTreeToolbar from '@/components/TreeToolbar/BaseTreeToolbar';

const { Title, Text } = Typography;

type ColumnKey = 'name' | 'code' | 'scope';
type ColumnShareMap = Record<ColumnKey, number>;

interface ResizableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width?: string;
  minShare?: number;
  onResize?: (share: number) => void;
}

const MIN_COLUMN_SHARE: ColumnShareMap = {
  name: 28,
  code: 24,
  scope: 24,
};

const DEFAULT_COLUMN_SHARES: ColumnShareMap = {
  name: 42,
  code: 29,
  scope: 29,
};

const ResizableHeaderCell: React.FC<ResizableHeaderCellProps> = ({ width, minShare = 20, onResize, children, style, ...restProps }) => {
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
      if (tableWidthRef.current <= 0) {
        return;
      }

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

// ================= 类型定义 =================
export interface CodeSegment {
  id: string;
  type: 'STRING' | 'DATE' | 'SEQUENCE';
  value?: string;           // 用于 STRING 类型
  dateFormat?: string;      // 用于 DATE 类型
  length?: number;          // 用于 SEQUENCE 类型
  resetRule?: 'NEVER' | 'DAILY' | 'YEARLY'; // 重置规则
}

export interface CodeRule {
  id: string;
  name: string;
  code: string;
  scope: string;
  description?: string;
  segments: CodeSegment[];
}

// ================= Mock 数据 =================
const mockRules: CodeRule[] = [
  {
    id: 'rule_1',
    name: '物料编码规则',
    code: 'MATERIAL_CODE',
    scope: '物料分类',
    description: '用于所有标准物料的自动编号',
    segments: [
      { id: 's1', type: 'STRING', value: 'MAT-' },
      { id: 's2', type: 'DATE', dateFormat: 'YYYYMM' },
      { id: 's3', type: 'STRING', value: '-' },
      { id: 's4', type: 'SEQUENCE', length: 5, resetRule: 'YEARLY' }
    ]
  },
  {
    id: 'rule_2',
    name: '文档图纸规则',
    code: 'DOC_CODE',
    scope: '文档对象',
    description: '研发设计图纸生成规则',
    segments: [
      { id: 's1', type: 'STRING', value: 'DOC' },
      { id: 's2', type: 'SEQUENCE', length: 6, resetRule: 'NEVER' }
    ]
  }
];

const CHECKBOX_COL_WIDTH = 48;
const COLUMN_KEYS: ColumnKey[] = ['name', 'code', 'scope'];

const distributeDeltaAcrossColumns = (
  currentShares: ColumnShareMap,
  targetKey: ColumnKey,
  requestedShare: number,
): ColumnShareMap => {
  const otherKeys = COLUMN_KEYS.filter((key) => key !== targetKey);
  const minTargetShare = MIN_COLUMN_SHARE[targetKey];
  const maxTargetShare = 100 - otherKeys.reduce((sum, key) => sum + MIN_COLUMN_SHARE[key], 0);
  const clampedTargetShare = Math.min(maxTargetShare, Math.max(minTargetShare, requestedShare));
  const delta = clampedTargetShare - currentShares[targetKey];

  if (Math.abs(delta) < 0.01) {
    return currentShares;
  }

  const nextShares = { ...currentShares };
  nextShares[targetKey] = clampedTargetShare;

  if (delta > 0) {
    let remainingDelta = delta;
    const totalShrinkCapacity = otherKeys.reduce(
      (sum, key) => sum + Math.max(0, currentShares[key] - MIN_COLUMN_SHARE[key]),
      0,
    );

    for (const key of otherKeys) {
      const shrinkCapacity = Math.max(0, currentShares[key] - MIN_COLUMN_SHARE[key]);
      const allocatedDelta = totalShrinkCapacity > 0
        ? (delta * shrinkCapacity) / totalShrinkCapacity
        : delta / otherKeys.length;
      const actualDelta = Math.min(shrinkCapacity, allocatedDelta, remainingDelta);
      nextShares[key] = currentShares[key] - actualDelta;
      remainingDelta -= actualDelta;
    }

    for (const key of otherKeys) {
      if (remainingDelta <= 0.01) {
        break;
      }
      const shrinkCapacity = Math.max(0, nextShares[key] - MIN_COLUMN_SHARE[key]);
      const actualDelta = Math.min(shrinkCapacity, remainingDelta);
      nextShares[key] -= actualDelta;
      remainingDelta -= actualDelta;
    }
  } else {
    const growDelta = Math.abs(delta);
    const totalGrowBase = otherKeys.reduce((sum, key) => sum + currentShares[key], 0);
    let distributed = 0;

    for (const key of otherKeys) {
      const actualDelta = totalGrowBase > 0
        ? (growDelta * currentShares[key]) / totalGrowBase
        : growDelta / otherKeys.length;
      nextShares[key] = currentShares[key] + actualDelta;
      distributed += actualDelta;
    }

    const remainder = growDelta - distributed;
    if (Math.abs(remainder) > 0.01) {
      nextShares[otherKeys[otherKeys.length - 1]] += remainder;
    }
  }

  const totalShare = COLUMN_KEYS.reduce((sum, key) => sum + nextShares[key], 0);
  if (Math.abs(totalShare - 100) > 0.01) {
    nextShares.scope += 100 - totalShare;
  }

  return nextShares;
};

// ================= 左侧：规则列表组件 =================
const CodeRuleList = ({ 
  rules, 
  activeId, 
  onSelect 
}: { 
  rules: CodeRule[], 
  activeId: string | null, 
  onSelect: (id: string) => void 
}) => {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [checkableEnabled, setCheckableEnabled] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [columnShares, setColumnShares] = useState<ColumnShareMap>(DEFAULT_COLUMN_SHARES);

  const filteredRules = rules.filter(r => 
    r.name.includes(searchText) || r.code.includes(searchText)
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
        if (!nextValue) {
          setCheckedKeys([]);
        }
        return nextValue;
      });
    },
  }), [searchText, searchExpanded, checkableEnabled, checkedKeys]);

  const columns: TableColumnsType<CodeRule> = [
    {
      title: '编码名称',
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
      title: '编码 Code',
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
      title: '编码作用域',
      dataIndex: 'scope',
      key: 'scope',
      align: 'center',
      width: `${columnShares.scope}%`,
      ellipsis: true,
      onHeaderCell: () => ({
        width: `${columnShares.scope}%`,
        minShare: MIN_COLUMN_SHARE.scope,
        onResize: (share: number) => handleColumnResize('scope', share),
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

  return (
    <Flex vertical style={{ height: '100%', background: token.colorBgContainer }}>
      {/* 列表工具栏 */}
      <Flex align="center" style={{ padding: '0 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, height: 48 }}>
        <BaseTreeToolbar
          toolbarState={toolbarState}
          searchPlaceholder="搜索规则"
          batchActionsVisible={checkedKeys.length > 0}
          primaryActions={[
            {
              key: 'add',
              icon: <PlusOutlined />,
              tooltip: '新增规则',
              variant: 'primary',
              onClick: () => {}
            }
          ]}
          batchActions={[
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              tooltip: '批量删除',
              variant: 'danger',
              onClick: () => {}
            }
          ]}
        />
      </Flex>
      
      {/* 列表主体区 */}
      <div className="code-rule-list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <Table<CodeRule>
          className={`code-rule-list-table ${checkableEnabled ? 'code-rule-list-table--checkable' : ''}`}
          rowKey="id"
          size="small"
          tableLayout="fixed"
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          pagination={false}
          dataSource={filteredRules}
          columns={columns}
          rowSelection={rowSelection}
          onRow={(record) => ({
            onClick: (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('.ant-checkbox-wrapper') || target.closest('.ant-checkbox')) {
                return;
              }
              onSelect(record.id);
            },
          })}
          rowClassName={(record) => (record.id === activeId ? 'code-rule-row-active' : 'code-rule-row')}
        />
      </div>
      
      {/* 底部信息 */}
      <div style={{ padding: 8, borderTop: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, textAlign: 'center', fontSize: 12, color: token.colorTextQuaternary }}>
        共 {filteredRules.length} 个规则
      </div>

      <style jsx global>{`
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

        .code-rule-list-table table {
          width: 100% !important;
        }

        .code-rule-list-table .ant-table-thead > tr > th,
        .code-rule-list-table .ant-table-tbody > tr > td {
          padding-top: 12px;
          padding-bottom: 12px;
        }

        .code-rule-list-table .ant-table-thead > tr > th {
          background: ${token.colorFillAlter};
          color: ${token.colorTextSecondary};
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          position: sticky;
          top: 0;
          z-index: 2;
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

// ================= 右侧：设计工作区组件 =================
const CodeRuleWorkspace = ({ rule }: { rule: CodeRule }) => {
  const { token } = theme.useToken();
  const [isEditing, setIsEditing] = useState(false);
  const [segments, setSegments] = useState<CodeSegment[]>(rule.segments);

  // 当外部选中的 rule 变化时，重置本地状态
  React.useEffect(() => {
    setSegments(rule.segments);
    setIsEditing(false);
  }, [rule]);

  // 动态生成预览编码
  const previewCode = useMemo(() => {
    return segments.map(seg => {
      if (seg.type === 'STRING') return seg.value || '';
      if (seg.type === 'DATE') {
        const d = new Date();
        const yyyy = d.getFullYear().toString();
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        if (seg.dateFormat === 'YYYYMMDD') return `${yyyy}${mm}${dd}`;
        if (seg.dateFormat === 'YYYYMM') return `${yyyy}${mm}`;
        if (seg.dateFormat === 'YYYY') return yyyy;
        return 'DATE';
      }
      if (seg.type === 'SEQUENCE') {
        return '0'.repeat((seg.length || 4) - 1) + '1';
      }
      return '';
    }).join('');
  }, [segments]);

  const renderSegmentIcon = (type: string) => {
    if (type === 'STRING') return <FontColorsOutlined style={{ color: '#1890ff' }} />;
    if (type === 'DATE') return <CalendarOutlined style={{ color: '#fa8c16' }} />;
    if (type === 'SEQUENCE') return <NumberOutlined style={{ color: '#52c41a' }} />;
    return <SettingOutlined />;
  };

  return (
    <Flex vertical style={{ height: '100%', background: token.colorBgContainer }}>
      {/* 顶部 Header Toolbar */}
      <Flex align="center" justify="space-between" style={{ padding: '8px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, height: 48 }}>
        <Space size={12}>
          <Title level={5} style={{ margin: 0 }}>{rule.name}</Title>
          <Tag color="blue">{rule.code}</Tag>
        </Space>
        <Space size="small">
          {!isEditing ? (
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>编辑设计</Button>
          ) : (
            <>
              <Button size="small" onClick={() => { setIsEditing(false); setSegments(rule.segments); }}>取消</Button>
              <Button type="primary" size="small" icon={<SaveOutlined />} onClick={() => setIsEditing(false)}>保存</Button>
            </>
          )}
        </Space>
      </Flex>

      <div className="code-rule-workspace-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24 }}>
        <Flex vertical gap="large">
          {/* 实时预览区 */}
          <Card size="small" style={{ backgroundColor: token.colorInfoBg, borderColor: token.colorInfoBorder, borderRadius: token.borderRadiusLG }}>
            <Flex vertical gap="small">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>编码规则实时预览区</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', color: token.colorPrimary, letterSpacing: 2 }}>
                {previewCode || '-'}
              </div>
            </Flex>
          </Card>

          {/* 规则分段配置区 */}
          <Card size="small" title="分段设计" extra={isEditing && <Button type="dashed" size="small" icon={<PlusOutlined />}>添加段</Button>}>
            <List
              dataSource={segments}
              renderItem={(seg, index) => (
                <List.Item
                  actions={isEditing ? [
                    <Button key="del" type="text" danger icon={<DeleteOutlined />} size="small" />
                  ] : undefined}
                >
                  <List.Item.Meta
                    avatar={<div style={{ fontSize: 20, marginTop: 4 }}>{renderSegmentIcon(seg.type)}</div>}
                    title={<Text strong>{seg.type === 'STRING' ? '固定字符' : seg.type === 'DATE' ? '当前时间' : '自增流水号'}</Text>}
                    description={
                      isEditing ? (
                        <Space style={{ marginTop: 8 }} wrap>
                          {seg.type === 'STRING' && (
                            <Input placeholder="输入字符" value={seg.value} onChange={e => {
                              const newSegs = [...segments];
                              newSegs[index].value = e.target.value;
                              setSegments(newSegs);
                            }} />
                          )}
                          {seg.type === 'DATE' && (
                            <Select value={seg.dateFormat} style={{ width: 150 }} onChange={val => {
                              const newSegs = [...segments];
                              newSegs[index].dateFormat = val;
                              setSegments(newSegs);
                            }}>
                              <Select.Option value="YYYY">YYYY(年)</Select.Option>
                              <Select.Option value="YYYYMM">YYYYMM(年月)</Select.Option>
                              <Select.Option value="YYYYMMDD">YYYYMMDD(年月日)</Select.Option>
                            </Select>
                          )}
                          {seg.type === 'SEQUENCE' && (
                            <>
                              <InputNumber addonBefore="位数" value={seg.length} min={1} max={10} onChange={val => {
                                const newSegs = [...segments];
                                newSegs[index].length = val || 4;
                                setSegments(newSegs);
                              }} />
                              <Select value={seg.resetRule} style={{ width: 120 }}>
                                <Select.Option value="NEVER">不重置</Select.Option>
                                <Select.Option value="YEARLY">按年重置</Select.Option>
                                <Select.Option value="MONTHLY">按月重置</Select.Option>
                                <Select.Option value="DAILY">按天重置</Select.Option>
                              </Select>
                            </>
                          )}
                        </Space>
                      ) : (
                        <Space style={{ marginTop: 4 }}>
                          {seg.type === 'STRING' && <Tag>{seg.value}</Tag>}
                          {seg.type === 'DATE' && <Tag>{seg.dateFormat}</Tag>}
                          {seg.type === 'SEQUENCE' && <Tag>长度: {seg.length}</Tag>}
                          {seg.type === 'SEQUENCE' && seg.resetRule && <Tag color="default">重置: {seg.resetRule}</Tag>}
                        </Space>
                      )
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Flex>
      </div>
    </Flex>
  );
};

// ================= 主页面入口 =================
export default function CodeSettingPage() {
  const { token } = theme.useToken();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rules, setRules] = useState<CodeRule[]>(mockRules);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(mockRules[0].id);

  const activeRule = useMemo(() => rules.find(r => r.id === activeRuleId), [rules, activeRuleId]);

  return (
    <div style={{
      height: "calc(100vh - 163px)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      overflow: "hidden",
    }}>
      <Splitter
        onCollapse={(collapsed) => setLeftCollapsed(collapsed[0] ?? false)}
        style={{
          flex: 1,
          minHeight: 0,
          background: "var(--ant-color-bg-container, #fff)",
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <Splitter.Panel defaultSize={450} min={350} max={550} collapsible={{ end: true, showCollapsibleIcon: leftCollapsed ? true : "auto" }}>
          <CodeRuleList rules={rules} activeId={activeRuleId} onSelect={setActiveRuleId} />
        </Splitter.Panel>
        
        <Splitter.Panel>
          <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
            {activeRule ? (
              <CodeRuleWorkspace rule={activeRule} />
            ) : (
              <Flex justify="center" align="center" style={{ height: "100%", background: token.colorBgLayout }}>
                <Empty description="请在左侧选择一个规则进行设计" />
              </Flex>
            )}
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}
