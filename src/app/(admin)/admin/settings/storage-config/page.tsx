'use client';

import React from 'react';
import {
  App,
  Button,
  Divider,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  ApiOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  DatabaseOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  HddOutlined,
  KeyOutlined,
  LinkOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

type StorageProviderType = 'MINIO' | 'S3' | 'OSS' | 'AZURE_BLOB';

type StorageConfigFormValues = {
  providerType: StorageProviderType;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucketName: string;
  enabled: boolean;
};

const INITIAL_VALUES: StorageConfigFormValues = {
  providerType: 'MINIO',
  endpoint: 'http://minio:9000',
  accessKey: 'plm-storage-admin',
  secretKey: 'minio-secret-key',
  region: 'us-east-1',
  bucketName: 'plm-platform',
  enabled: true,
};

const PROVIDER_OPTIONS: Array<{ label: string; value: StorageProviderType }> = [
  { label: 'MinIO (S3 兼容)', value: 'MINIO' },
  { label: 'Amazon S3', value: 'S3' },
  { label: '阿里云 OSS', value: 'OSS' },
  { label: 'Azure Blob Storage', value: 'AZURE_BLOB' },
];

const GUIDE_ITEMS = [
  {
    icon: <DatabaseOutlined />,
    title: '存储类型',
    description: '选择兼容 S3 协议的对象存储服务，统一平台文件存储能力。',
  },
  {
    icon: <ApiOutlined />,
    title: 'API 端点',
    description: '对象存储服务访问地址，支持内网地址、网关地址或专线地址。',
  },
  {
    icon: <KeyOutlined />,
    title: '访问密钥',
    description: '配置具备对象读写权限的 Access Key 与 Secret Key。',
  },
  {
    icon: <FolderOpenOutlined />,
    title: '存储桶前缀',
    description: '用于隔离平台环境、业务对象以及后续扩展存储策略。',
  },
];

const USAGE_STATS = [
  { label: '总存储桶数', value: '12' },
  { label: '总对象数', value: '18,542' },
  { label: '总存储容量', value: '256.78 GB' },
  { label: '本月流量', value: '48.32 GB' },
];

function StatusMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <Flex vertical gap={6} style={{ minWidth: 0 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
      <Text strong style={{ fontSize: 22, lineHeight: 1.2 }}>
        {value}
      </Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {hint}
      </Text>
    </Flex>
  );
}

function GuidePanel() {
  const { token } = theme.useToken();

  return (
    <Flex vertical gap={16}>
      <Flex vertical gap={4}>
        <Text strong style={{ fontSize: 16, color: token.colorText }}>
          配置说明
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          该侧栏用于辅助管理员快速核对配置项和理解字段含义，结构与编码配置页的右侧预览区保持一致。
        </Text>
      </Flex>

      {GUIDE_ITEMS.map((item, index) => (
        <React.Fragment key={item.title}>
          <Flex align="flex-start" gap={12}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: token.colorInfoBg,
                color: token.colorInfo,
                flex: '0 0 auto',
                marginTop: 2,
              }}
            >
              {item.icon}
            </Flex>
            <Flex vertical gap={4} style={{ minWidth: 0 }}>
              <Text strong>{item.title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.description}
              </Text>
            </Flex>
          </Flex>
          {index < GUIDE_ITEMS.length - 1 ? <Divider style={{ margin: 0 }} /> : null}
        </React.Fragment>
      ))}
    </Flex>
  );
}

function StatsPanel() {
  return (
    <Flex vertical gap={16}>
      <Space size={8}>
        <BarChartOutlined />
        <Text strong style={{ fontSize: 16 }}>
          存储使用统计
        </Text>
      </Space>

      {USAGE_STATS.map((item, index) => (
        <React.Fragment key={item.label}>
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.label}
            </Text>
            <Text strong style={{ fontSize: 24, lineHeight: 1.1 }}>
              {item.value}
            </Text>
          </Flex>
          {index < USAGE_STATS.length - 1 ? <Divider style={{ margin: 0 }} /> : null}
        </React.Fragment>
      ))}
    </Flex>
  );
}

export default function StorageConfigPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [form] = Form.useForm<StorageConfigFormValues>();
  const [savedValues, setSavedValues] = React.useState(INITIAL_VALUES);
  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [previewPanelVisible, setPreviewPanelVisible] = React.useState(true);
  const [lastCheckedAt, setLastCheckedAt] = React.useState('2025-05-26 15:30:45');

  const providerLabel =
    PROVIDER_OPTIONS.find((item) => item.value === savedValues.providerType)?.label ?? savedValues.providerType;

  const sectionDividerStyle = {
    margin: '4px -24px 0',
    width: 'calc(100% + 48px)',
    minWidth: 'calc(100% + 48px)',
  } as const;

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
    gap: 16,
    alignItems: 'start',
  } as const;

  const handleTestConnection = async () => {
    setTesting(true);
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    try {
      await form.validateFields(['providerType', 'endpoint', 'accessKey', 'secretKey', 'bucketName']);
      setLastCheckedAt(formatter.format(new Date()).replace(/\//g, '-'));
      message.success('连接检测通过，当前页面尚未接入真实后端。');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (values: StorageConfigFormValues) => {
    setSaving(true);
    try {
      setSavedValues(values);
      message.success('存储配置已保存');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(savedValues);
    message.info('已重置为当前已保存配置');
  };

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: token.colorBgContainer,
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        wrap="wrap"
        style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Flex vertical gap={6}>
          <Flex align="center" gap={8} wrap>
            <Title level={4} style={{ margin: 0 }}>
              存储配置
            </Title>
            <Tag color={savedValues.enabled ? 'success' : 'default'}>
              {savedValues.enabled ? '启用中' : '未启用'}
            </Tag>
            <Tag color="blue">{savedValues.providerType}</Tag>
          </Flex>
          <Text type="secondary">
            配置对象存储服务，用于平台文件、模型、预览等资源的统一存储管理。
          </Text>
        </Flex>

        <Space wrap>
          <Button
            size="middle"
            icon={previewPanelVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setPreviewPanelVisible((prev) => !prev)}
          >
            {previewPanelVisible ? '隐藏概览' : '显示概览'}
          </Button>
          <Button size="middle" icon={<LinkOutlined />} loading={testing} onClick={handleTestConnection}>
            检测连接
          </Button>
          <Button size="middle" icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button type="primary" size="middle" icon={<SaveOutlined />} loading={saving} onClick={() => void form.submit()}>
            保存配置
          </Button>
        </Space>
      </Flex>

      <Flex style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px 28px',
          }}
        >
          <Form<StorageConfigFormValues>
            form={form}
            layout="vertical"
            initialValues={savedValues}
            onFinish={handleSave}
          >
            <Flex vertical gap={20}>
              <div>
                <Flex vertical gap={4} style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 16, color: token.colorText }}>
                    存储服务状态
                  </Text>
                  <Text type="secondary">
                    当前平台默认文件存储链路与最近一次连接检测结果。
                  </Text>
                </Flex>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: token.borderRadiusLG,
                      background: token.colorFillQuaternary,
                    }}
                  >
                    <StatusMetric
                      label="当前状态"
                      value={
                        <Space size={8}>
                          <CheckCircleFilled style={{ color: token.colorSuccess }} />
                          <span>{savedValues.enabled ? '运行中' : '已停用'}</span>
                        </Space>
                      }
                      hint={savedValues.enabled ? '服务正常运行' : '配置已保存，当前未启用'}
                    />
                  </div>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: token.borderRadiusLG,
                      background: token.colorFillQuaternary,
                    }}
                  >
                    <StatusMetric label="存储类型" value={savedValues.providerType} hint={providerLabel} />
                  </div>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: token.borderRadiusLG,
                      background: token.colorFillQuaternary,
                    }}
                  >
                    <StatusMetric label="API 端点" value={savedValues.endpoint} hint="当前活动访问地址" />
                  </div>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: token.borderRadiusLG,
                      background: token.colorFillQuaternary,
                    }}
                  >
                    <StatusMetric label="最近检测" value={lastCheckedAt} hint="连接成功" />
                  </div>
                </div>
              </div>

              <Divider style={sectionDividerStyle} />

              <div>
                <Flex vertical gap={4} style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 16, color: token.colorText }}>
                    存储服务配置
                  </Text>
                </Flex>

                <div style={gridStyle}>
                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <Form.Item
                      label="存储类型"
                      name="providerType"
                      rules={[{ required: true, message: '请选择存储类型' }]}
                    >
                      <Select options={PROVIDER_OPTIONS} />
                    </Form.Item>
                  </div>

                  <div style={{ gridColumn: 'span 4', minWidth: 0 }}>
                    <Form.Item
                      label="API 端点"
                      name="endpoint"
                      rules={[{ required: true, message: '请输入 API 端点' }]}
                      extra={<Text type="secondary" style={{ fontSize: 12 }}>示例: http://minio:9000 或 https://s3.example.com</Text>}
                    >
                      <Input prefix={<ApiOutlined />} placeholder="请输入对象存储访问地址" />
                    </Form.Item>
                  </div>

                  <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
                    <Form.Item
                      label="默认存储区域"
                      name="region"
                      extra={<Text type="secondary" style={{ fontSize: 12 }}>默认: us-east-1</Text>}
                    >
                      <Input placeholder="请输入存储区域" />
                    </Form.Item>
                  </div>

                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <Form.Item
                      label="存储桶前缀"
                      name="bucketName"
                      rules={[{ required: true, message: '请输入存储桶前缀' }]}
                      extra={<Text type="secondary" style={{ fontSize: 12 }}>平台桶名前缀</Text>}
                    >
                      <Input prefix={<HddOutlined />} placeholder="请输入默认存储桶前缀" />
                    </Form.Item>
                  </div>

                  <div style={{ gridColumn: 'span 6', minWidth: 0 }}>
                    <Form.Item
                      label="访问密钥 (Access Key)"
                      name="accessKey"
                      rules={[{ required: true, message: '请输入 Access Key' }]}
                    >
                      <Input.Password placeholder="请输入访问密钥" />
                    </Form.Item>
                  </div>

                  <div style={{ gridColumn: 'span 6', minWidth: 0 }}>
                    <Form.Item
                      label="秘密密钥 (Secret Key)"
                      name="secretKey"
                      rules={[{ required: true, message: '请输入 Secret Key' }]}
                    >
                      <Input.Password placeholder="请输入秘密密钥" />
                    </Form.Item>
                  </div>
                </div>
              </div>

              <Divider style={sectionDividerStyle} />

              <div>
                <Flex vertical gap={4} style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 16, color: token.colorText }}>
                    存储策略
                  </Text>
                </Flex>

                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillQuaternary,
                  }}
                >
                  <Flex align="center" justify="space-between" gap={16}>
                    <Flex vertical gap={4} style={{ minWidth: 0 }}>
                      <Text strong>启用存储服务</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        开启后平台文件上传、预览和下载将默认使用当前配置。
                      </Text>
                    </Flex>
                    <Form.Item name="enabled" valuePropName="checked" noStyle>
                      <Switch />
                    </Form.Item>
                  </Flex>
                </div>
              </div>
            </Flex>
          </Form>
        </div>

        <div
          style={{
            width: previewPanelVisible ? 600 : 0,
            minWidth: previewPanelVisible ? 360 : 0,
            borderLeft: previewPanelVisible ? `1px solid ${token.colorBorderSecondary}` : 'none',
            transition: 'width 0.2s ease, min-width 0.2s ease',
            overflow: 'hidden',
            flexShrink: 0,
            background: token.colorBgLayout,
          }}
        >
          {previewPanelVisible ? (
            <div style={{ height: '100%', overflowY: 'auto', padding: '20px 20px 24px' }}>
              <Flex vertical gap={20}>
                <div>
                  <Flex align="center" justify="space-between" gap={12}>
                    <Text strong style={{ fontSize: 16 }}>
                      配置概览
                    </Text>
                    <Tag color={savedValues.enabled ? 'success' : 'default'}>
                      {savedValues.enabled ? '运行中' : '停用'}
                    </Tag>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    右侧面板用于集中展示配置说明和统计信息，不再在主区域额外拆成多个卡片。
                  </Text>
                </div>

                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: token.borderRadiusLG,
                    background: token.colorBgContainer,
                  }}
                >
                  <Flex vertical gap={12}>
                    <Flex justify="space-between" gap={12}>
                      <Text type="secondary">存储类型</Text>
                      <Text strong>{providerLabel}</Text>
                    </Flex>
                    <Flex justify="space-between" gap={12}>
                      <Text type="secondary">API 端点</Text>
                      <Text strong style={{ textAlign: 'right' }}>{savedValues.endpoint}</Text>
                    </Flex>
                    <Flex justify="space-between" gap={12}>
                      <Text type="secondary">默认区域</Text>
                      <Text strong>{savedValues.region || '-'}</Text>
                    </Flex>
                    <Flex justify="space-between" gap={12}>
                      <Text type="secondary">桶前缀</Text>
                      <Text strong>{savedValues.bucketName}</Text>
                    </Flex>
                    <Flex justify="space-between" gap={12}>
                      <Text type="secondary">最近检测</Text>
                      <Text strong>{lastCheckedAt}</Text>
                    </Flex>
                  </Flex>
                </div>

                <Divider style={{ margin: 0 }} />
                <GuidePanel />
                <Divider style={{ margin: 0 }} />
                <StatsPanel />
              </Flex>
            </div>
          ) : null}
        </div>
      </Flex>
    </div>
  );
}
