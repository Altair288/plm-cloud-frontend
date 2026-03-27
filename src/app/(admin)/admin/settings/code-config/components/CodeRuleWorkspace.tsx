import React, { useState, useMemo, useCallback } from 'react';
import { Flex, Typography, Button, Input, Select, Switch, Divider, Tag, Tabs, App, theme } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import type { CodeRule, CodeSegment, SegmentType, SubRuleKey, SubRuleConfig } from './types';
import {
  SEPARATOR_OPTIONS,
  STATUS_OPTIONS,
  BUSINESS_OBJECT_OPTIONS,
  SUB_RULE_TABS,
  VARIABLE_KEY_OPTIONS,
  isCategoryObject,
  createDefaultSegment,
  createDefaultSubRules,
  generateSubRulePreview,
  generateChildPreview,
} from './types';
import SegmentDesigner from './SegmentDesigner';
import CodeRulePreviewPanel from './CodeRulePreviewPanel';

const { Text } = Typography;

const CHILD_SUFFIX_VARIABLE_OPTIONS = VARIABLE_KEY_OPTIONS.filter((option) => option.value !== 'PARENT_CODE');

interface CodeRuleWorkspaceProps {
  rule: CodeRule;
  onSave: (rule: CodeRule) => void;
}

const CodeRuleWorkspace: React.FC<CodeRuleWorkspaceProps> = ({ rule: initialRule, onSave }) => {
  const { token } = theme.useToken();
  const { modal, message } = App.useApp();
  const [editingRule, setEditingRule] = useState<CodeRule>(initialRule);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<SubRuleKey>('category');
  const [previewPanelVisible, setPreviewPanelVisible] = useState(true);

  const isCategory = useMemo(() => isCategoryObject(editingRule.businessObject), [editingRule.businessObject]);

  // 规则切换时重置编辑状态
  React.useEffect(() => {
    setEditingRule(initialRule);
    setHasChanges(false);
    setActiveTab('category');
  }, [initialRule.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 业务对象变更时，确保分类对象拥有 subRules
  React.useEffect(() => {
    if (isCategoryObject(editingRule.businessObject) && !editingRule.subRules) {
      setEditingRule(prev => ({ ...prev, subRules: createDefaultSubRules() }));
    }
  }, [editingRule.businessObject, editingRule.subRules]);

  const updateField = useCallback(<K extends keyof CodeRule>(key: K, value: CodeRule[K]) => {
    setEditingRule(prev => {
      if (key === 'separator') {
        const nextSeparator = value as CodeRule['separator'];
        const currentSubRules = prev.subRules;

        return {
          ...prev,
          [key]: value,
          subRules: currentSubRules
            ? {
                category: { ...currentSubRules.category, separator: nextSeparator },
                attribute: { ...currentSubRules.attribute, separator: nextSeparator },
                enum: { ...currentSubRules.enum, separator: nextSeparator },
              }
            : currentSubRules,
        };
      }

      return { ...prev, [key]: value };
    });
    setHasChanges(true);
  }, []);

  // ===== 子规则辅助 =====
  const updateSubRule = useCallback((tabKey: SubRuleKey, updater: (prev: SubRuleConfig) => SubRuleConfig) => {
    setEditingRule(prev => {
      const currentSubRules = prev.subRules ?? createDefaultSubRules();
      return {
        ...prev,
        subRules: {
          ...currentSubRules,
          [tabKey]: updater(currentSubRules[tabKey]),
        },
      };
    });
    setHasChanges(true);
  }, []);

  // ===== 通用片段操作（委托到对应 subRule）=====
  const handleAddSegment = useCallback((type: SegmentType = 'STRING') => {
    const newSegment = createDefaultSegment(type);
    if (isCategory) {
      updateSubRule(activeTab, prev => ({
        ...prev,
        segments: [...prev.segments, newSegment],
      }));
    } else {
      setEditingRule(prev => ({
        ...prev,
        segments: [...prev.segments, newSegment],
      }));
      setHasChanges(true);
    }
  }, [isCategory, activeTab, updateSubRule]);

  const handleRemoveSegment = useCallback((id: string) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除此编码段吗？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        if (isCategory) {
          updateSubRule(activeTab, prev => ({
            ...prev,
            segments: prev.segments.filter(s => s.id !== id),
          }));
        } else {
          setEditingRule(prev => ({
            ...prev,
            segments: prev.segments.filter(s => s.id !== id),
          }));
          setHasChanges(true);
        }
      },
    });
  }, [modal, isCategory, activeTab, updateSubRule]);

  const handleUpdateSegment = useCallback((id: string, updates: Partial<CodeSegment>) => {
    if (isCategory) {
      updateSubRule(activeTab, prev => ({
        ...prev,
        segments: prev.segments.map(s => s.id === id ? { ...s, ...updates } : s),
      }));
    } else {
      setEditingRule(prev => ({
        ...prev,
        segments: prev.segments.map(s => s.id === id ? { ...s, ...updates } : s),
      }));
      setHasChanges(true);
    }
  }, [isCategory, activeTab, updateSubRule]);

  const handleMoveSegment = useCallback((id: string, direction: 'up' | 'down') => {
    const doMove = (segments: CodeSegment[]): CodeSegment[] => {
      const idx = segments.findIndex(s => s.id === id);
      if (idx < 0) return segments;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= segments.length) return segments;
      const next = [...segments];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    };
    if (isCategory) {
      updateSubRule(activeTab, prev => ({ ...prev, segments: doMove(prev.segments) }));
    } else {
      setEditingRule(prev => ({ ...prev, segments: doMove(prev.segments) }));
      setHasChanges(true);
    }
  }, [isCategory, activeTab, updateSubRule]);

  // ===== 子级派生编码段操作（仅分类编码 Tab + inheritParentPrefix ON） =====
  const handleAddChildSegment = useCallback((type: SegmentType = 'STRING') => {
    updateSubRule('category', prev => ({
      ...prev,
      childSegments: [...(prev.childSegments ?? []), createDefaultSegment(type)],
    }));
  }, [updateSubRule]);

  const handleRemoveChildSegment = useCallback((id: string) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除此编码段吗？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        updateSubRule('category', prev => ({
          ...prev,
          childSegments: (prev.childSegments ?? []).filter(s => s.id !== id),
        }));
      },
    });
  }, [modal, updateSubRule]);

  const handleUpdateChildSegment = useCallback((id: string, updates: Partial<CodeSegment>) => {
    updateSubRule('category', prev => ({
      ...prev,
      childSegments: (prev.childSegments ?? []).map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, [updateSubRule]);

  const handleMoveChildSegment = useCallback((id: string, direction: 'up' | 'down') => {
    updateSubRule('category', prev => {
      const segs = [...(prev.childSegments ?? [])];
      const idx = segs.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= segs.length) return prev;
      [segs[idx], segs[targetIdx]] = [segs[targetIdx], segs[idx]];
      return { ...prev, childSegments: segs };
    });
  }, [updateSubRule]);

  // ===== 保存 =====
  const handleSave = useCallback(() => {
    if (!editingRule.name.trim()) {
      message.error('请填写规则名称');
      return;
    }
    if (!editingRule.code.trim()) {
      message.error('请填写规则编码');
      return;
    }
    if (!editingRule.businessObject) {
      message.error('请选择业务对象');
      return;
    }
    // 分类对象验证 subRules，非分类验证 segments
    if (isCategoryObject(editingRule.businessObject)) {
      const sub = editingRule.subRules;
      const hasAnySegment = sub && Object.values(sub).some(cfg => cfg.segments.length > 0);
      if (!hasAnySegment) {
        message.error('至少在一个编码类型中添加编码段');
        return;
      }
    } else if (editingRule.segments.length === 0) {
      message.error('至少添加一个编码段');
      return;
    }
    onSave(editingRule);
    setHasChanges(false);
    message.success('保存成功');
  }, [editingRule, onSave, message]);

  // ===== 撤销 =====
  const handleReset = useCallback(() => {
    if (!hasChanges) return;
    modal.confirm({
      title: '放弃修改',
      content: '当前有未保存的修改，确定要放弃吗？',
      okText: '放弃',
      okButtonProps: { danger: true },
      cancelText: '继续编辑',
      onOk: () => {
        setEditingRule(initialRule);
        setHasChanges(false);
      },
    });
  }, [hasChanges, initialRule, modal]);

  const basicInfoFieldStyle: React.CSSProperties = {
    minWidth: 0,
    display: 'grid',
    gridTemplateRows: 'minmax(20px, auto) 32px',
    rowGap: 4,
    alignContent: 'start',
  };

  const basicInfoLabelStyle: React.CSSProperties = {
    fontSize: 12,
    lineHeight: '30px',
    display: 'block',
    margin: 0,
  };

  return (
    <Flex vertical style={{ height: '100%', background: token.colorBgContainer }}>
      {/* ===== 顶部操作栏 ===== */}
      <Flex
        align="center"
        justify="space-between"
        style={{
          padding: '0 16px',
          height: 48,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        <Flex align="center" gap={8}>
          <Text strong style={{ fontSize: 16 }}>{editingRule.name}</Text>
          <Tag
            color={
              editingRule.status === 'ACTIVE' ? 'success'
                : editingRule.status === 'DRAFT' ? 'warning'
                : 'default'
            }
          >
            {STATUS_OPTIONS.find(o => o.value === editingRule.status)?.label}
          </Tag>
          {hasChanges && <Tag color="orange">未保存</Tag>}
        </Flex>

        <Flex align="center" gap={8}>
          <Button
            size="small"
            icon={previewPanelVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setPreviewPanelVisible((prev) => !prev)}
          >
            {previewPanelVisible ? '隐藏预览' : '显示预览'}
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            保存
          </Button>
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            取消
          </Button>
        </Flex>
      </Flex>

      {/* ===== 可滚动内容区 ===== */}
      <Flex style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          className="code-rule-workspace-scroll"
          style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', padding: '20px 24px 28px' }}
        >
          <Flex vertical gap={20}>
          <div>
            <Flex vertical gap={4} style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16, color: token.colorText }}>
                基本信息
              </Text>
            </Flex>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <div style={{ ...basicInfoFieldStyle, gridColumn: 'span 2' }}>
                <Text type="secondary" style={basicInfoLabelStyle}>
                  应用对象 <Text type="danger">*</Text>
                </Text>
                <Select
                  size="middle"
                  showSearch
                  placeholder="选择应用对象"
                  value={editingRule.businessObject || undefined}
                  onChange={(v) => updateField('businessObject', v)}
                  options={BUSINESS_OBJECT_OPTIONS.map(o => ({ value: o, label: o }))}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ ...basicInfoFieldStyle, gridColumn: 'span 2' }}>
                <Text type="secondary" style={basicInfoLabelStyle}>
                  规则编码 <Text type="danger">*</Text>
                </Text>
                <Input
                  size="middle"
                  placeholder="输入规则编码"
                  value={editingRule.code}
                  onChange={(e) => updateField('code', e.target.value)}
                />
              </div>
              <div style={{ ...basicInfoFieldStyle, gridColumn: 'span 2' }}>
                <Text type="secondary" style={basicInfoLabelStyle}>
                  规则名称 <Text type="danger">*</Text>
                </Text>
                <Input
                  size="middle"
                  placeholder="输入规则名称"
                  value={editingRule.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              
              <div style={{ ...basicInfoFieldStyle, gridColumn: 'span 2' }}>
                <Text type="secondary" style={basicInfoLabelStyle}>
                  默认段间分隔符 <Text type="danger">*</Text>
                </Text>
                <Select
                  size="middle"
                  value={editingRule.separator}
                  onChange={(v) => updateField('separator', v)}
                  options={SEPARATOR_OPTIONS}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ ...basicInfoFieldStyle, gridColumn: 'span 3' }}>
                <Text type="secondary" style={basicInfoLabelStyle}>描述</Text>
                <Input
                  size="middle"
                  placeholder="编码规则描述"
                  value={editingRule.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
              <div style={{ ...basicInfoFieldStyle, gridColumn: 'span 1' }}>
                <Text type="secondary" style={basicInfoLabelStyle}>使用状态</Text>
                <Select
                  size="middle"
                  value={editingRule.status}
                  onChange={(v) => updateField('status', v)}
                  options={STATUS_OPTIONS}
                  style={{ width: '100%' }}
                />
              </div>
              <Flex vertical gap={6} style={{ gridColumn: 'span 3', minWidth: 0 }}>
                <Text type="secondary" style={basicInfoLabelStyle}>层级规则</Text>
              <Flex
                align="center"
                justify="space-between"
                style={{
                  padding: '0px 12px',
                  borderRadius: token.borderRadius,
                  background: token.colorFillQuaternary,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12 }}>开启层级派生</Text>
                <Switch
                  size="small"
                  checked={editingRule.inheritParentPrefix}
                  onChange={(v) => updateField('inheritParentPrefix', v)}
                />
              </Flex>
              </Flex>
            </div>
          </div>

          <Divider
            style={{
              margin: '4px -24px 0',
              width: 'calc(100% + 48px)',
              minWidth: 'calc(100% + 48px)',
            }}
          />

          <div>
            <Flex vertical gap={4} style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16, color: token.colorText }}>
                编码设计
              </Text>
            </Flex>

            {isCategory ? (
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as SubRuleKey)}
                size="small"
                items={SUB_RULE_TABS.map(tab => {
                  const subRule = editingRule.subRules?.[tab.key] ?? { separator: '-', segments: [] };
                  const showHierarchy = tab.key === 'category' && editingRule.inheritParentPrefix;

                  if (showHierarchy) {
                    const rootPreview = generateSubRulePreview(subRule);
                    const childPreview = generateChildPreview(rootPreview, subRule);
                    const childConfig: SubRuleConfig = {
                      separator: editingRule.separator,
                      segments: subRule.childSegments ?? [],
                    };

                    return {
                      key: tab.key,
                      label: tab.label,
                      children: (
                        <Flex vertical gap={18} style={{ paddingTop: 8 }}>
                          <div
                            style={{
                              padding: '4px 0 2px',
                            }}
                          >
                            <Flex align="center" gap={12} wrap>
                              <Flex align="center" gap={6}>
                                <Tag color="blue" style={{ margin: 0 }}>根节点</Tag>
                                <Text
                                  strong
                                  style={{ fontFamily: 'inherit', fontSize: 14, color: token.colorText }}
                                >
                                  {rootPreview}
                                </Text>
                              </Flex>
                              <div
                                style={{
                                  padding: '2px 10px',
                                  borderRadius: 999,
                                  background: token.colorFillQuaternary,
                                }}
                              >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  派生后
                                </Text>
                              </div>
                              <Flex align="center" gap={6}>
                                <Tag color="cyan" style={{ margin: 0 }}>子级</Tag>
                                <Text
                                  strong
                                  style={{ fontFamily: 'inherit', fontSize: 14, color: token.colorText }}
                                >
                                  {childPreview}
                                </Text>
                              </Flex>
                            </Flex>
                          </div>

                          <SegmentDesigner
                            title="根节点编码规则"
                            config={subRule}
                            onAddSegment={handleAddSegment}
                            onRemoveSegment={handleRemoveSegment}
                            onUpdateSegment={handleUpdateSegment}
                            onMoveSegment={handleMoveSegment}
                          />

                          <div
                            style={{
                              borderTop: `1px solid ${token.colorBorderSecondary}`,
                              paddingTop: 18,
                            }}
                          >
                            <SegmentDesigner
                              title="子级派生规则"
                              config={childConfig}
                              previewOverride={childPreview}
                              variableOptions={CHILD_SUFFIX_VARIABLE_OPTIONS}
                              onAddSegment={handleAddChildSegment}
                              onRemoveSegment={handleRemoveChildSegment}
                              onUpdateSegment={handleUpdateChildSegment}
                              onMoveSegment={handleMoveChildSegment}
                            />
                          </div>
                        </Flex>
                      ),
                    };
                  }

                  return {
                    key: tab.key,
                    label: tab.label,
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <SegmentDesigner
                          config={subRule}
                          onAddSegment={handleAddSegment}
                          onRemoveSegment={handleRemoveSegment}
                          onUpdateSegment={handleUpdateSegment}
                          onMoveSegment={handleMoveSegment}
                        />
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <SegmentDesigner
                config={{ separator: editingRule.separator, segments: editingRule.segments }}
                onAddSegment={handleAddSegment}
                onRemoveSegment={handleRemoveSegment}
                onUpdateSegment={handleUpdateSegment}
                onMoveSegment={handleMoveSegment}
              />
            )}
          </div>
          </Flex>
        </div>

        <div
          style={{
            width: previewPanelVisible ? 360 : 0,
            minWidth: previewPanelVisible ? 360 : 0,
            borderLeft: previewPanelVisible ? `1px solid ${token.colorBorderSecondary}` : 'none',
            transition: 'width 0.2s ease, min-width 0.2s ease',
            overflow: 'hidden',
            flexShrink: 0,
            background: token.colorBgLayout,
          }}
        >
          {previewPanelVisible ? <CodeRulePreviewPanel rule={editingRule} activeTab={activeTab} /> : null}
        </div>
      </Flex>
    </Flex>
  );
};

export default CodeRuleWorkspace;
