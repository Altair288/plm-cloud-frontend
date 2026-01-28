import React, { useEffect } from "react";
import {
  Empty,
  Typography,
  Tabs,
  Form,
  Input,
  Select,
  Switch,
  Space,
  InputNumber,
  Divider,
  Alert,
  theme,
  Flex,
  Tag,
  Radio,
  Slider,
  Upload,
  Button
} from "antd";
import type { TabsProps } from "antd";
import {
  InfoCircleOutlined,
  ControlOutlined,
  SettingOutlined,
  DatabaseOutlined,
  UploadOutlined,
  PictureOutlined
} from "@ant-design/icons";
import { EditableProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-table";
import { AttributeItem, AttributeType, EnumOptionItem } from "./types";

interface AttributeWorkspaceProps {
  attribute: AttributeItem | null;
  onUpdate: (key: string, value: any) => void;
  enumOptions: EnumOptionItem[];
  setEnumOptions: (data: EnumOptionItem[]) => void;
}

const { Option } = Select;
const { Text, Title } = Typography;

const AttributeWorkspace: React.FC<AttributeWorkspaceProps> = ({
  attribute,
  onUpdate,
  enumOptions,
  setEnumOptions,
}) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  // Sync form with attribute
  useEffect(() => {
    if (attribute) {
      form.setFieldsValue(attribute);
    } else {
      form.resetFields();
    }
  }, [attribute, form]);

  if (!attribute) {
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          height: "100%",
          color: token.colorTextQuaternary,
          background: token.colorBgLayout,
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="请选择一个属性进行配置 (Select an attribute to configure)"
        />
      </Flex>
    );
  }

  const handleFormChange = (changedValues: any, allValues: any) => {
    Object.keys(changedValues).forEach((key) => {
      onUpdate(key, changedValues[key]);
    });
  };

  // --- Sub-components ---

  const renderGeneralSettings = () => (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleFormChange}
      style={{ padding: 24, maxWidth: 600 }}
    >
      <Form.Item
        label="显示名称 (Display Name)"
        name="name"
        rules={[{ required: true }]}
      >
        <Input placeholder="e.g. Material" />
      </Form.Item>
      <Flex gap="middle">
        <Form.Item
          label="编码 (Code)"
          name="code"
          style={{ flex: 1 }}
          rules={[{ required: true }]}
        >
          <Input placeholder="attribute_code" disabled={!attribute.isLatest} />
        </Form.Item>
        <Form.Item label="单位 (Unit)" name="unit" style={{ width: 120 }}>
          <Input placeholder="e.g. kg, mm" />
        </Form.Item>
      </Flex>
      <Form.Item label="数据类型 (Data Type)" name="type">
        <Select>
          <Option value="string">String</Option>
          <Option value="number">Number</Option>
          <Option value="boolean">Boolean</Option>
          <Option value="date">Date</Option>
          <Option value="enum">Enumeration (Single)</Option>
          <Option value="multi-enum">Enumeration (Multi)</Option>
        </Select>
      </Form.Item>
      <Form.Item label="描述 (Description)" name="description">
        <Input.TextArea placeholder="内部备注... (Internal note...)" rows={3} />
      </Form.Item>
    </Form>
  );

  const renderConstraintsSettings = () => {
    // 1. 判断是否需要显示列表配置器 (枚举 或 数值列表模式)
    const isListMode =
      attribute.type === "enum" ||
      attribute.type === "multi-enum" ||
      (attribute.type === "number" && attribute.constraintMode === "list");

    if (isListMode) {
      // 默认渲染类型为 text
      const currentRenderType = attribute.renderType || 'text';

      const enumColumns: ProColumns<EnumOptionItem>[] = [
        {
          title: currentRenderType === 'color' ? "颜色值 (Hex)" : "值/编码 (Value)",
          dataIndex: "value",
          valueType: currentRenderType === 'color' ? 'color' : 'text',
          width: "20%",
          formItemProps: { rules: [{ required: true }] },
        },
        {
          title: "标签 (Label)",
          dataIndex: "label",
          width: "25%",
          formItemProps: { rules: [{ required: true }] },
        },
        // 新增列：描述
        {
          title: "描述 (Desc)",
          dataIndex: "description",
          valueType: "text",
          width: "20%",
        },
      ];

      // 图片模式下显示图片列
      if (currentRenderType === 'image') {
        enumColumns.push({
          title: "图片 (Img)",
          dataIndex: "image",
          width: 80,
          render: (_, record) => (
             record.image ? <PictureOutlined style={{color: token.colorPrimary}} /> : "-"
          ),
          renderFormItem: () => (
             <Input prefix={<UploadOutlined />} placeholder="URL" />
          )
        });
      }

      // 文本模式下，仍然保留“UI颜色”列 (用于Tags/Badges)，但如果是颜色模式，value本身就是颜色，不需要此列
      if (currentRenderType === 'text' && (attribute.type === "enum" || attribute.type === "multi-enum")) {
        enumColumns.push({
          title: "UI颜色",
          dataIndex: "color",
          valueType: "color",
          width: 60,
          tooltip: "用于在界面上显示Tag的颜色 (Color for UI Tags)"
        });
      }

      enumColumns.push({
          title: "操作",
          valueType: "option",
          width: 60,
          render: (text, record, _, action) => [
            <a
              key="del"
              onClick={() =>
                setEnumOptions(enumOptions.filter((i) => i.id !== record.id))
              }
              style={{ color: token.colorError }}
            >
              删除
            </a>,
          ],
        });

      return (
        <div
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          {attribute.type === "number" && (
             <div style={{ padding: "16px 24px 0" }}>
                <Flex align="center" justify="space-between">
                     <Radio.Group 
                        value={attribute.constraintMode} 
                        onChange={e => onUpdate("constraintMode", e.target.value)}
                        buttonStyle="solid"
                     >
                        <Radio.Button value="none">无限制</Radio.Button>
                        <Radio.Button value="range">范围区间</Radio.Button>
                        <Radio.Button value="list">离散列表</Radio.Button>
                     </Radio.Group>
                </Flex>
                <Divider style={{ margin: "12px 0" }} />
             </div>
          )}

          {(attribute.type === "enum" || attribute.type === "multi-enum") && (
             <div style={{ padding: "16px 24px 0" }}>
                <Flex align="center" gap="small">
                     <Text strong>渲染样式 (Render Style): </Text>
                     <Radio.Group 
                        value={attribute.renderType || 'text'} 
                        onChange={e => onUpdate("renderType", e.target.value)}
                        buttonStyle="solid"
                        size="small"
                     >
                        <Radio.Button value="text">文本 (Text)</Radio.Button>
                        <Radio.Button value="color">颜色 (Color)</Radio.Button>
                        <Radio.Button value="image">图片 (Image)</Radio.Button>
                     </Radio.Group>
                </Flex>
                <Divider style={{ margin: "12px 0" }} />
             </div>
          )}

          <div style={{ padding: "0 24px 8px" }}>
            <Alert
              message={
                 attribute.type === 'number' 
                 ? "请输入允许的数值列表 (Enter allowed numeric values)." 
                 : "枚举值的更改将立即应用到草稿中 (Changes to enum values are applied immediately)."
              }
              type="info"
              showIcon
            />
          </div>
          <div style={{ flex: 1, overflow: "hidden", padding: 8 }}>
            <EditableProTable<EnumOptionItem>
              rowKey="id"
              recordCreatorProps={{
                position: "bottom",
                record: () => ({
                  id: Math.random().toString(36).substr(2, 9),
                  code: "",
                  value: "",
                  label: "",
                  order: 0,
                }),
                creatorButtonText: "添加选项 (Add Option)",
              }}
              columns={enumColumns}
              value={enumOptions}
              onChange={(values) => setEnumOptions([...values])}
              scroll={{ y: 300 }}
              editable={{ type: "multiple" }}
              ghost
            />
          </div>
        </div>
      );
    }

    return (
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        style={{ padding: 24, maxWidth: 600 }}
      >
        {attribute.type === "string" && (
          <>
            <Form.Item label="最大长度 (Max Length)" name="maxLength">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="正则模式 (Regex Pattern)" name="pattern">
              <Input prefix="/" suffix="/" />
            </Form.Item>
          </>
        )}
        
        {attribute.type === "number" && (
           <>
              <Form.Item label="约束模式 (Constraint Mode)" name="constraintMode" initialValue="none">
                 <Radio.Group buttonStyle="solid">
                    <Radio.Button value="none">自由输入 (Free)</Radio.Button>
                    <Radio.Button value="range">范围区间 (Range)</Radio.Button>
                    <Radio.Button value="list">离散列表 (List)</Radio.Button> 
                 </Radio.Group>
              </Form.Item>

              {attribute.constraintMode === 'range' && (
                  <div style={{ background: token.colorFillAlter, padding: 16, borderRadius: 8, marginBottom: 24 }}>
                      <Flex gap="middle">
                        <Form.Item label="最小值 (Min)" name={['rangeConfig', 'min']} style={{ flex: 1 }}>
                          <InputNumber style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="最大值 (Max)" name={['rangeConfig', 'max']} style={{ flex: 1 }}>
                          <InputNumber style={{ width: "100%" }} />
                        </Form.Item>
                      </Flex>
                      <Form.Item label="步长 (Step)" name={['rangeConfig', 'step']} help="例如：0.5 表示只能输入 10, 10.5, 11...">
                          <InputNumber style={{ width: "100%" }} />
                      </Form.Item>
                      
                      <Divider plain>预览 (Preview)</Divider>
                      <Slider range defaultValue={[20, 50]} disabled />
                  </div>
              )}

              {attribute.constraintMode !== 'range' && (
                 <Flex gap="middle">
                    <Form.Item
                        label="精度 (Precision)"
                        name="precision"
                        style={{ flex: 1 }}
                        help="小数位 (Decimal places)"
                    >
                    <InputNumber style={{ width: "100%" }} min={0} max={10} />
                    </Form.Item>
                 </Flex>
              )}
           </>
        )}

        {attribute.type === "boolean" && (
          <Empty
            description="布尔类型无可用约束 (No constraints...)"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
        {attribute.type === "date" && (
          <Empty
            description="日期类型无可用约束 (No constraints...)"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Form>
    );
  };

  const renderAdvancedSettings = () => (
    <Form
      form={form}
      layout="horizontal"
      onValuesChange={handleFormChange}
      style={{ padding: 24, maxWidth: 600 }}
      labelCol={{ span: 16 }}
      wrapperCol={{ span: 8 }}
      labelAlign="left"
    >
      <Divider titlePlacement="start" plain>
        验证 (Validation)
      </Divider>
      <Form.Item
        label="必填字段 (Required Field)"
        name="required"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="唯一值 (Unique Value)"
        name="unique"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Divider titlePlacement="start" plain>
        显示与搜索 (Display & Search)
      </Divider>
      <Form.Item
        label="表单中隐藏 (Hidden in Forms)"
        name="hidden"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="只读 (Read Only)"
        name="readonly"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="搜索索引 (Index for Search)"
        name="searchable"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </Form>
  );

  const items: TabsProps["items"] = [
    {
      key: "general",
      label: (
        <span>
          <InfoCircleOutlined /> 常规 (General)
        </span>
      ),
      children: renderGeneralSettings(),
    },
    {
      key: "constraints",
      label: (
        <span>
          <ControlOutlined /> 规则 (Rules)
        </span>
      ),
      children: renderConstraintsSettings(),
    },
    {
      key: "advanced",
      label: (
        <span>
          <SettingOutlined /> 高级 (Advanced)
        </span>
      ),
      children: renderAdvancedSettings(),
    },
  ];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: token.colorBgContainer,
      }}
    >
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        style={{
          height: 56,
          padding: "0 24px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Space size={16}>
          <div
            style={{
              padding: 6,
              background: token.colorPrimaryBg,
              borderRadius: token.borderRadiusSM,
              color: token.colorPrimary,
              display: "flex",
            }}
          >
            <DatabaseOutlined style={{ fontSize: 18 }} />
          </div>
          <Flex vertical gap={2}>
            <Text strong style={{ fontSize: 16, lineHeight: 1.2 }}>
              {attribute.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {attribute.code}
            </Text>
          </Flex>
        </Space>
        <Tag>{attribute.type}</Tag>
      </Flex>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Tabs
          defaultActiveKey="general"
          items={items}
          style={{ height: "100%" }}
          renderTabBar={(props, DefaultTabBar) => (
            <div
              style={{
                padding: "0 24px",
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <DefaultTabBar {...props} />
            </div>
          )}
        />
      </div>

      {/* Override Tabs content scroll */}
      <style>
        {`
          .ant-tabs-content {
              height: 100%;
          }
          .ant-tabs-tabpane {
              height: 100%;
              overflow-y: auto;
          }
       `}
      </style>
    </div>
  );
};

export default AttributeWorkspace;
