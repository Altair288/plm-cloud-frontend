'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Flex, Spin, Tag, Tree, Typography, theme } from 'antd';
import type { TreeDataNode } from 'antd';
import type { CodeRulePreviewResponseDto } from '@/models/codeRule';
import { codeRuleApi } from '@/services/codeRule';
import type { CodeRule, CodeSegment, SubRuleConfig, SubRuleKey } from './types';
import {
  DATE_FORMAT_OPTIONS,
  RESET_RULE_OPTIONS,
  SUB_RULE_TABS,
  VARIABLE_KEY_OPTIONS,
  generateChildPreview,
  generateSegmentPreview,
  generateSubRulePreview,
  getSegmentTypeLabel,
  isCategoryObject,
} from './types';

const { Text } = Typography;

interface CodeRulePreviewPanelProps {
  rule: CodeRule;
  activeTab: SubRuleKey;
  hasUnsavedChanges?: boolean;
}

const PREVIEW_EXAMPLE_COUNT = 3;

const formatOptionLabel = (
  options: Array<{ value: string; label: string }>,
  value?: string,
): string => options.find((option) => option.value === value)?.label ?? value ?? '未设置';

const describeSegment = (segment: CodeSegment): string => {
  switch (segment.type) {
    case 'STRING':
      return segment.value || '空字符';
    case 'DATE':
      return formatOptionLabel(DATE_FORMAT_OPTIONS, segment.dateFormat);
    case 'VARIABLE':
      return formatOptionLabel(VARIABLE_KEY_OPTIONS, segment.variableKey);
    case 'SEQUENCE': {
      const length = `${segment.length ?? 4} 位`;
      const startValue = `起始 ${segment.startValue ?? 1}`;
      const step = `步长 ${segment.step ?? 1}`;
      const resetRule = formatOptionLabel(RESET_RULE_OPTIONS, segment.resetRule);
      return [length, startValue, step, resetRule].join(' / ');
    }
  }
};

const createTextTitle = (
  label: string,
  value?: string,
  emphasis?: boolean,
): React.ReactNode => (
  <Flex vertical gap={1} style={{ minWidth: 0 }}>
    <Text
      strong={emphasis}
      style={{
        fontSize: 12,
        color: emphasis ? 'var(--ant-color-text)' : 'var(--ant-color-text-secondary)',
      }}
    >
      {label}
    </Text>
    {value ? (
      <Text style={{ fontSize: 12, color: 'var(--ant-color-text)' }} ellipsis>
        {value}
      </Text>
    ) : null}
  </Flex>
);

const buildSegmentNodes = (prefix: string, segments: CodeSegment[]): TreeDataNode[] => {
  if (segments.length === 0) {
    return [
      {
        key: `${prefix}-empty`,
        title: createTextTitle('未配置编码段'),
        isLeaf: true,
      },
    ];
  }

  return segments.map((segment, index) => ({
    key: `${prefix}-segment-${segment.id}`,
    title: createTextTitle(`第 ${index + 1} 段 · ${getSegmentTypeLabel(segment.type)}`, describeSegment(segment)),
    isLeaf: true,
  }));
};

const buildSubRuleNode = (
  key: SubRuleKey,
  label: string,
  subRule: SubRuleConfig,
  inheritParentPrefix: boolean,
  isActive: boolean,
  backendPreview?: TreeDataNode,
): TreeDataNode => {
  const preview = generateSubRulePreview(subRule);

  if (key === 'category' && inheritParentPrefix) {
    const rootPreview = preview;
    const childPreview = generateChildPreview(rootPreview, subRule);

    return {
      key: `tab-${key}`,
      title: (
        <Flex align="center" gap={8}>
          <Text strong style={{ fontSize: 12 }}>{label}</Text>
          {isActive ? <Tag color="blue" style={{ margin: 0 }}>当前</Tag> : null}
        </Flex>
      ),
      children: [
        {
          key: `tab-${key}-root`,
          title: createTextTitle('根节点完整编码', rootPreview, true),
          children: buildSegmentNodes(`tab-${key}-root`, subRule.segments),
        },
        {
          key: `tab-${key}-child`,
          title: createTextTitle('子级完整编码', childPreview, true),
          children: [
            {
              key: `tab-${key}-child-prefix`,
              title: createTextTitle('自动继承父级前缀', rootPreview),
              isLeaf: true,
            },
            ...buildSegmentNodes(`tab-${key}-child`, subRule.childSegments ?? []),
          ],
        },
        ...(backendPreview ? [backendPreview] : []),
      ],
    };
  }

  return {
    key: `tab-${key}`,
    title: (
      <Flex align="center" gap={8}>
        <Text strong style={{ fontSize: 12 }}>{label}</Text>
        {isActive ? <Tag color="blue" style={{ margin: 0 }}>当前</Tag> : null}
      </Flex>
    ),
    children: [
      {
        key: `tab-${key}-preview`,
        title: createTextTitle('编码预览', preview, true),
        children: buildSegmentNodes(`tab-${key}`, subRule.segments),
      },
      ...(backendPreview ? [backendPreview] : []),
    ],
  };
};

const buildBackendPreviewNode = (params: {
  subRuleKey: SubRuleKey;
  preview?: CodeRulePreviewResponseDto | null;
  loading: boolean;
  error?: string | null;
  isNew?: boolean;
  hasUnsavedChanges?: boolean;
}): TreeDataNode => {
  const { subRuleKey, preview, loading, error, isNew, hasUnsavedChanges } = params;

  if (loading) {
    return {
      key: `tab-${subRuleKey}-backend-loading`,
      title: (
        <Flex align="center" gap={8}>
          <Text strong style={{ fontSize: 12 }}>后端预览</Text>
          <Spin size="small" />
        </Flex>
      ),
      isLeaf: true,
    };
  }

  if (isNew) {
    return {
      key: `tab-${subRuleKey}-backend-unsaved`,
      title: createTextTitle('后端预览', '新建规则集需先保存后才能调用预览接口'),
      isLeaf: true,
    };
  }

  if (error) {
    return {
      key: `tab-${subRuleKey}-backend-error`,
      title: createTextTitle('后端预览失败', error),
      isLeaf: true,
    };
  }

  if (!preview) {
    return {
      key: `tab-${subRuleKey}-backend-empty`,
      title: createTextTitle('后端预览', hasUnsavedChanges ? '存在未保存修改，当前后端预览基于上次保存结果' : '暂无后端预览结果'),
      isLeaf: true,
    };
  }

  return {
    key: `tab-${subRuleKey}-backend`,
    title: createTextTitle('后端预览', preview.examples[0] || '未生成样例', true),
    children: [
      {
        key: `tab-${subRuleKey}-backend-sequence-scope`,
        title: createTextTitle('序列桶', preview.resolvedSequenceScope || '未返回'),
        isLeaf: true,
      },
      {
        key: `tab-${subRuleKey}-backend-period-key`,
        title: createTextTitle('周期桶', preview.resolvedPeriodKey || '未返回'),
        isLeaf: true,
      },
      {
        key: `tab-${subRuleKey}-backend-context`,
        title: createTextTitle(
          '预览上下文',
          Object.entries(preview.resolvedContext || {}).map(([contextKey, value]) => `${contextKey}=${value}`).join(' / ') || '无',
        ),
        isLeaf: true,
      },
      {
        key: `tab-${subRuleKey}-backend-examples`,
        title: createTextTitle('样例列表', preview.examples.join(' / ') || '无'),
        isLeaf: true,
      },
      {
        key: `tab-${subRuleKey}-backend-warnings`,
        title: createTextTitle('预览警告', preview.warnings.join(' / ') || '无'),
        isLeaf: true,
      },
      ...(hasUnsavedChanges ? [{
        key: `tab-${subRuleKey}-backend-stale`,
        title: createTextTitle('提示', '当前存在未保存修改，后端预览基于最近一次保存版本'),
        isLeaf: true,
      }] : []),
    ],
  };
};

const buildPreviewContext = async (rule: CodeRule, activeTab: SubRuleKey): Promise<CodeRulePreviewResponseDto | null> => {
  const businessDomain = String(rule.businessDomain || rule.ruleSetMeta?.businessDomain || rule.code || '').trim().toUpperCase();
  const metadata = rule.ruleMetadata;
  if (!businessDomain || !metadata) {
    return null;
  }

  const previewCategory = async () => {
    const categoryRuleCode = metadata.category?.ruleCode;
    if (!categoryRuleCode) {
      return null;
    }
    return codeRuleApi.previewRule(categoryRuleCode, {
      context: {
        BUSINESS_DOMAIN: businessDomain,
        SUB_RULE_KEY: 'category',
      },
      count: PREVIEW_EXAMPLE_COUNT,
    });
  };

  const previewAttribute = async (categoryCode: string) => {
    const attributeRuleCode = metadata.attribute?.ruleCode;
    if (!attributeRuleCode) {
      return null;
    }
    return codeRuleApi.previewRule(attributeRuleCode, {
      context: {
        BUSINESS_DOMAIN: businessDomain,
        CATEGORY_CODE: categoryCode,
        SUB_RULE_KEY: 'attribute',
      },
      count: PREVIEW_EXAMPLE_COUNT,
    });
  };

  const previewEnum = async (categoryCode: string, attributeCode: string) => {
    const enumRuleCode = metadata.enum?.ruleCode;
    if (!enumRuleCode) {
      return null;
    }
    return codeRuleApi.previewRule(enumRuleCode, {
      context: {
        BUSINESS_DOMAIN: businessDomain,
        CATEGORY_CODE: categoryCode,
        ATTRIBUTE_CODE: attributeCode,
        SUB_RULE_KEY: 'enum',
      },
      count: PREVIEW_EXAMPLE_COUNT,
    });
  };

  if (activeTab === 'category') {
    return previewCategory();
  }

  const categoryPreview = await previewCategory();
  const categoryCode = categoryPreview?.examples[0] || `${businessDomain}-0001`;

  if (activeTab === 'attribute') {
    return previewAttribute(categoryCode);
  }

  const attributePreview = await previewAttribute(categoryCode);
  const attributeCode = attributePreview?.examples[0] || `ATTR-${categoryCode}-000001`;

  return previewEnum(categoryCode, attributeCode);
};

const CodeRulePreviewPanel: React.FC<CodeRulePreviewPanelProps> = ({ rule, activeTab, hasUnsavedChanges = false }) => {
  const { token } = theme.useToken();
  const [backendPreview, setBackendPreview] = useState<CodeRulePreviewResponseDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const usesSubRules = Boolean(rule.ruleSetMeta) || isCategoryObject(rule.businessObject);
  const previewRequestKey = useMemo(() => {
    const businessDomain = String(rule.businessDomain || rule.ruleSetMeta?.businessDomain || rule.code || '').trim().toUpperCase();

    return JSON.stringify({
      businessDomain,
      activeTab,
      isNew: Boolean(rule.isNew),
      hasUnsavedChanges,
      categoryRuleCode: rule.ruleMetadata?.category?.ruleCode || '',
      attributeRuleCode: rule.ruleMetadata?.attribute?.ruleCode || '',
      enumRuleCode: rule.ruleMetadata?.enum?.ruleCode || '',
    });
  }, [
    activeTab,
    hasUnsavedChanges,
    rule.businessDomain,
    rule.code,
    rule.isNew,
    rule.ruleMetadata?.attribute?.ruleCode,
    rule.ruleMetadata?.category?.ruleCode,
    rule.ruleMetadata?.enum?.ruleCode,
    rule.ruleSetMeta?.businessDomain,
  ]);
  const previewRule = useMemo(() => rule, [previewRequestKey]);

  useEffect(() => {
    if (!previewRule.ruleMetadata || previewRule.isNew) {
      setBackendPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    if (hasUnsavedChanges) {
      setBackendPreview(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setBackendPreview(null);
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const result = await buildPreviewContext(previewRule, activeTab);
        if (!cancelled) {
          setBackendPreview(result);
        }
      } catch (error) {
        if (!cancelled) {
          const message = typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string'
            ? String(Reflect.get(error, 'message'))
            : '调用后端预览失败';
          setPreviewError(message);
          setBackendPreview(null);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [activeTab, hasUnsavedChanges, previewRequestKey, previewRule]);

  const treeData = useMemo<TreeDataNode[]>(() => {
    const backendPreviewNode = buildBackendPreviewNode({
      subRuleKey: activeTab,
      preview: backendPreview,
      loading: previewLoading,
      error: previewError,
      isNew: rule.isNew,
      hasUnsavedChanges,
    });

    const baseNodes: TreeDataNode[] = [
      {
        key: 'base-info',
        title: createTextTitle('基础配置', undefined, true),
        children: [
          {
            key: 'base-businessObject',
            title: createTextTitle('应用对象', rule.businessObject || '未选择'),
            isLeaf: true,
          },
          {
            key: 'base-separator',
            title: createTextTitle('默认段间分隔符', rule.separator === '' ? '无分隔符' : rule.separator),
            isLeaf: true,
          },
          {
            key: 'base-inherit',
            title: createTextTitle('层级派生', rule.inheritParentPrefix ? '已开启' : '未开启'),
            isLeaf: true,
          },
        ],
      },
    ];

    if (!usesSubRules) {
      return [
        ...baseNodes,
        {
          key: 'single-rule',
          title: createTextTitle('当前编码规则', undefined, true),
          children: [
            {
              key: 'single-rule-preview',
              title: createTextTitle('编码预览', generateSubRulePreview({ separator: rule.separator, segments: rule.segments }), true),
              children: buildSegmentNodes('single-rule', rule.segments),
            },
            backendPreviewNode,
          ],
        },
      ];
    }

    const subRules = rule.subRules;
    if (!subRules) {
      return baseNodes;
    }

    return [
      ...baseNodes,
      ...SUB_RULE_TABS.map((tab) =>
        buildSubRuleNode(
          tab.key,
          tab.label,
          subRules[tab.key],
          rule.inheritParentPrefix,
          activeTab === tab.key,
          activeTab === tab.key ? backendPreviewNode : undefined,
        ),
      ),
    ];
  }, [activeTab, backendPreview, hasUnsavedChanges, previewError, previewLoading, rule, usesSubRules]);

  if (treeData.length === 0) {
    return (
      <Flex justify="center" align="center" style={{ height: '100%' }}>
        <Empty description="暂无可预览的编码配置" />
      </Flex>
    );
  }

  return (
    <Flex vertical style={{ height: '100%', background: token.colorBgElevated }}>
      <Flex
        vertical
        gap={2}
        style={{
          padding: '14px 16px 12px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Text strong style={{ fontSize: 14 }}>配置预览</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          以树形结构展示当前配置、本地预览和当前页签的后端预览结果。
        </Text>
      </Flex>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
        <Tree
          blockNode
          showLine
          defaultExpandAll
          selectedKeys={[`tab-${activeTab}`]}
          treeData={treeData}
        />
      </div>
    </Flex>
  );
};

export default CodeRulePreviewPanel;