import React from 'react';
import { Flex, Typography, Button, Input, InputNumber, Select, Tooltip, theme } from 'antd';
import { DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { CodeSegment, SegmentType } from './types';
import {
  SEGMENT_TYPE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  RESET_RULE_OPTIONS,
  VARIABLE_KEY_OPTIONS,
} from './types';

const { Text } = Typography;

interface SegmentCardProps {
  segment: CodeSegment;
  index: number;
  total: number;
  onChange: (id: string, updates: Partial<CodeSegment>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const { token } = theme.useToken();

  const handleTypeChange = (type: SegmentType) => {
    const base: Partial<CodeSegment> = {
      type,
      value: undefined,
      dateFormat: undefined,
      variableKey: undefined,
      length: undefined,
      startValue: undefined,
      step: undefined,
      resetRule: undefined,
    };
    switch (type) {
      case 'STRING':
        onChange(segment.id, { ...base, value: '' });
        break;
      case 'DATE':
        onChange(segment.id, { ...base, dateFormat: 'YYYYMM' });
        break;
      case 'VARIABLE':
        onChange(segment.id, { ...base, variableKey: 'PARENT_CODE' });
        break;
      case 'SEQUENCE':
        onChange(segment.id, { ...base, length: 4, startValue: 1, step: 1, resetRule: 'YEARLY' });
        break;
    }
  };

  const renderTypeFields = () => {
    switch (segment.type) {
      case 'STRING':
        return (
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              固定值 <Text type="danger">*</Text>
            </Text>
            <Input
              size="small"
              placeholder="输入固定字符，如 MAT-"
              value={segment.value}
              onChange={(e) => onChange(segment.id, { value: e.target.value })}
              style={{ maxWidth: 280 }}
            />
          </Flex>
        );

      case 'DATE':
        return (
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              日期格式 <Text type="danger">*</Text>
            </Text>
            <Select
              size="small"
              value={segment.dateFormat}
              onChange={(v) => onChange(segment.id, { dateFormat: v })}
              options={DATE_FORMAT_OPTIONS}
              style={{ maxWidth: 280 }}
            />
          </Flex>
        );

      case 'VARIABLE':
        return (
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              引用变量 <Text type="danger">*</Text>
            </Text>
            <Select
              size="small"
              value={segment.variableKey}
              onChange={(v) => onChange(segment.id, { variableKey: v })}
              options={VARIABLE_KEY_OPTIONS}
              style={{ maxWidth: 280 }}
            />
          </Flex>
        );

      case 'SEQUENCE':
        return (
          <Flex gap={16} wrap>
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                编码位数 <Text type="danger">*</Text>
              </Text>
              <InputNumber
                size="small"
                min={1}
                max={12}
                value={segment.length}
                onChange={(v) => onChange(segment.id, { length: v ?? 4 })}
                style={{ width: 100 }}
              />
            </Flex>
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>起始值</Text>
              <InputNumber
                size="small"
                min={0}
                value={segment.startValue}
                onChange={(v) => onChange(segment.id, { startValue: v ?? 1 })}
                style={{ width: 100 }}
              />
            </Flex>
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>步长</Text>
              <InputNumber
                size="small"
                min={1}
                value={segment.step}
                onChange={(v) => onChange(segment.id, { step: v ?? 1 })}
                style={{ width: 100 }}
              />
            </Flex>
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>重置规则</Text>
              <Select
                size="small"
                value={segment.resetRule}
                onChange={(v) => onChange(segment.id, { resetRule: v })}
                options={RESET_RULE_OPTIONS}
                style={{ width: 140 }}
              />
            </Flex>
          </Flex>
        );
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgElevated,
        padding: '14px 16px',
        height: '100%',
      }}
    >
      <Flex vertical gap={12}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <Flex align="center" gap={12} wrap>
            <Text strong style={{ fontSize: 13, color: token.colorText, whiteSpace: 'nowrap' }}>
              编码第 {index + 1} 段
            </Text>
            <Select
              size="small"
              value={segment.type}
              onChange={handleTypeChange}
              options={SEGMENT_TYPE_OPTIONS}
              style={{ width: 128 }}
            />
          </Flex>
          <Flex align="center" gap={2}>
            <Tooltip title="上移">
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined style={{ fontSize: 12 }} />}
                disabled={index === 0}
                onClick={() => onMoveUp(segment.id)}
                style={{ width: 24, height: 24, color: token.colorTextSecondary }}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined style={{ fontSize: 12 }} />}
                disabled={index === total - 1}
                onClick={() => onMoveDown(segment.id)}
                style={{ width: 24, height: 24, color: token.colorTextSecondary }}
              />
            </Tooltip>
            <Tooltip title="删除此段">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                onClick={() => onRemove(segment.id)}
                style={{ width: 24, height: 24 }}
              />
            </Tooltip>
          </Flex>
        </Flex>

        <div
          style={{
            paddingTop: 12,
            borderTop: `1px dashed ${token.colorBorderSecondary}`,
          }}
        >
          {renderTypeFields()}
        </div>
      </Flex>
    </div>
  );
};

export default SegmentCard;
