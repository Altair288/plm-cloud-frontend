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
} from "antd";
import type { TabsProps } from "antd";
import {
  InfoCircleOutlined,
  ControlOutlined,
  SettingOutlined,
  DatabaseOutlined,
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
    if (attribute.type === "enum" || attribute.type === "multi-enum") {
      const enumColumns: ProColumns<EnumOptionItem>[] = [
        {
          title: "编码 (Code)",
          dataIndex: "value",
          width: "30%",
          formItemProps: { rules: [{ required: true }] },
        },
        {
          title: "标签 (Label)",
          dataIndex: "label",
          width: "30%",
          formItemProps: { rules: [{ required: true }] },
        },
        {
          title: "颜色 (Color)",
          dataIndex: "color",
          valueType: "color",
          width: 80,
        },
        {
          title: "操作 (Action)",
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
              删除 (Delete)
            </a>,
          ],
        },
      ];

      return (
        <div
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "16px 24px 0" }}>
            <Alert
              title="枚举值的更改将立即应用到草稿中 (Changes to enum values are applied immediately to draft)."
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
          <Flex gap="middle">
            <Form.Item label="最小值 (Min)" name="min" style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="最大值 (Max)" name="max" style={{ flex: 1 }}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label="精度 (Precision)"
              name="precision"
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: "100%" }} min={0} max={10} />
            </Form.Item>
          </Flex>
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
