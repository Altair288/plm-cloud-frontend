'use client';

import React, { useMemo } from 'react';
import { Empty, Flex, Tag, Tree, Typography, theme } from 'antd';
import type { TreeDataNode } from 'antd';
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
}

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
    ],
  };
};

const CodeRulePreviewPanel: React.FC<CodeRulePreviewPanelProps> = ({ rule, activeTab }) => {
  const { token } = theme.useToken();

  const treeData = useMemo<TreeDataNode[]>(() => {
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

    if (!isCategoryObject(rule.businessObject)) {
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
        ),
      ),
    ];
  }, [rule, activeTab]);

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
          以树形结构展示当前编码规则、预览结果与派生关系。
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