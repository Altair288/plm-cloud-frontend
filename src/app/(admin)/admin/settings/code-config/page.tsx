'use client';

import React, { useState, useMemo } from 'react';
import { Splitter, theme, Flex, Typography, Button, Input, List, Empty, Tag, Card, Alert, Space, Form, Select, InputNumber, Divider } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, DeleteOutlined, SettingOutlined, FontColorsOutlined, NumberOutlined, CalendarOutlined, AppstoreOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

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
  description?: string;
  segments: CodeSegment[];
}

// ================= Mock 数据 =================
const mockRules: CodeRule[] = [
  {
    id: 'rule_1',
    name: '物料编码规则',
    code: 'MATERIAL_CODE',
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
    description: '研发设计图纸生成规则',
    segments: [
      { id: 's1', type: 'STRING', value: 'DOC' },
      { id: 's2', type: 'SEQUENCE', length: 6, resetRule: 'NEVER' }
    ]
  }
];

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

  const filteredRules = rules.filter(r => 
    r.name.includes(searchText) || r.code.includes(searchText)
  );

  return (
    <Flex vertical style={{ height: '100%', background: token.colorBgContainer }}>
      {/* 列表工具栏 */}
      <Flex justify="space-between" align="center" style={{ padding: '8px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, height: 48 }}>
        <Input.Search 
          placeholder="搜索规则" 
          allowClear 
          style={{ width: '100%', marginRight: 8 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button type="primary" size="small" icon={<PlusOutlined />} />
      </Flex>
      
      {/* 列表主体 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <List
          dataSource={filteredRules}
          renderItem={(item) => {
            const isActive = item.id === activeId;
            return (
              <List.Item
                onClick={() => onSelect(item.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderLeft: `4px solid ${isActive ? token.colorPrimary : 'transparent'}`,
                  background: isActive ? token.controlItemBgActive : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <List.Item.Meta
                  title={<Text strong style={{ color: isActive ? token.colorPrimary : token.colorText }}>{item.name}</Text>}
                  description={<Text type="secondary" style={{ fontSize: 12 }}>{item.code}</Text>}
                />
              </List.Item>
            );
          }}
        />
      </div>
      
      {/* 底部信息 */}
      <div style={{ padding: 8, borderTop: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, textAlign: 'center', fontSize: 12, color: token.colorTextQuaternary }}>
        共 {filteredRules.length} 个规则
      </div>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
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
        <Splitter.Panel defaultSize={350} min={250} max={500} collapsible={{ end: true, showCollapsibleIcon: leftCollapsed ? true : "auto" }}>
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
