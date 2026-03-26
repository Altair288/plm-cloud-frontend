'use client';

import React, { useMemo } from 'react';
import { Flex, Typography, Button, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CodeSegment, SegmentType, SubRuleConfig } from './types';
import { generateSubRulePreview } from './types';
import SegmentCard from './SegmentCard';

const { Text } = Typography;

interface SegmentDesignerProps {
  config: SubRuleConfig;
  /** 可选区域标题（如"根节点编码规则"、"子级派生规则"） */
  title?: string;
  /** 覆盖预览文本（用于层级继承模式下的组合预览） */
  previewOverride?: string;
  onAddSegment: (type: SegmentType) => void;
  onRemoveSegment: (id: string) => void;
  onUpdateSegment: (id: string, updates: Partial<CodeSegment>) => void;
  onMoveSegment: (id: string, direction: 'up' | 'down') => void;
}

const SegmentDesigner: React.FC<SegmentDesignerProps> = ({
  config,
  title,
  previewOverride,
  onAddSegment,
  onRemoveSegment,
  onUpdateSegment,
  onMoveSegment,
}) => {
  const { token } = theme.useToken();
  const rawPreview = useMemo(() => generateSubRulePreview(config), [config]);
  const preview = previewOverride ?? rawPreview;

  return (
    <Flex vertical gap={14}>
      {title && (
        <Flex vertical gap={4}>
          <Text strong style={{ fontSize: 14, color: token.colorText }}>{title}</Text>
        </Flex>
      )}

      <div
        style={{
          padding: '10px 14px',
          borderRadius: token.borderRadiusLG,
          background: token.colorInfoBg,
          borderInlineStart: `3px solid ${token.colorInfo}`,
        }}
      >
        <Flex align="center" gap={8}>
          <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>编码预览</Text>
          <Text
            strong
            style={{
              fontSize: 15,
              fontFamily: 'monospace',
              color: token.colorPrimary,
              letterSpacing: 0.5,
            }}
          >
            {preview}
          </Text>
        </Flex>
      </div>

      <Flex vertical gap={12}>
        {config.segments.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 12,
            }}
          >
            {config.segments.map((segment, idx) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                index={idx}
                total={config.segments.length}
                onChange={onUpdateSegment}
                onRemove={onRemoveSegment}
                onMoveUp={(id) => onMoveSegment(id, 'up')}
                onMoveDown={(id) => onMoveSegment(id, 'down')}
              />
            ))}
          </div>
        )}

        {config.segments.length === 0 && (
          <Flex
            justify="center"
            align="center"
            style={{
              padding: 28,
              border: `1px dashed ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillQuaternary,
            }}
          >
            <Text type="secondary">暂无编码段，请点击“新增片段”开始配置</Text>
          </Flex>
        )}

        <Flex justify="flex-start">
          <Button
            size="small"
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => onAddSegment('STRING')}
          >
            新增片段
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default SegmentDesigner;
