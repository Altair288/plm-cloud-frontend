import React, { useEffect, useState } from "react";
import {
  Empty,
  Typography,
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
  Button,
  Descriptions,
  Splitter,
  Badge,
  Tooltip,
  Row,
  Col,
  Collapse,
  Tabs,
  Modal,
} from "antd";
import {
  InfoCircleOutlined,
  EditOutlined,
  AppstoreOutlined,
  SaveOutlined,
  CloseOutlined,
  DatabaseOutlined,
  UploadOutlined,
  PictureOutlined,
  ColumnWidthOutlined,
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  DeleteOutlined,
  HistoryOutlined,
  UnorderedListOutlined,
  BarsOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { EditableProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-table";
import { AttributeItem, EnumOptionItem, AttributeType } from "./types";

interface AttributeWorkspaceProps {
  attribute: AttributeItem | null;
  onUpdate: (key: string, value: any) => void;
  enumOptions: EnumOptionItem[];
  setEnumOptions: (data: EnumOptionItem[]) => void;
  onDiscard?: (id: string) => void;
}

const { Option } = Select;
const { Text, Title } = Typography;
const { Panel } = Collapse;

const AttributeWorkspace: React.FC<AttributeWorkspaceProps> = ({
  attribute,
  onUpdate,
  enumOptions,
  setEnumOptions,
  onDiscard,
}) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success">("idle");

  // Sync form with attribute
  useEffect(() => {
    if (attribute) {
      form.setFieldsValue(attribute);
    } else {
      form.resetFields();
    }
  }, [attribute, form]);

  // Handle selection change
  useEffect(() => {
    if (attribute) {
      const isNew =
        attribute.name === "New Attribute" &&
        attribute.code.startsWith("new_attr_");
      setIsEditing(isNew);
      setSaveStatus("idle"); // Reset status on switch
    } else {
      setIsEditing(false);
      setSaveStatus("idle");
    }
  }, [attribute?.id]);

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
          description="请选择一个属性进行配置 (Select an attribute)"
        />
      </Flex>
    );
  }

  const handleFormChange = (changedValues: any) => {
    Object.keys(changedValues).forEach((key) => {
      onUpdate(key, changedValues[key]);
    });
  };

  const handleSave = () => {
    form
      .validateFields()
      .then(() => {
        setIsEditing(false);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleCancel = () => {
    if (
      attribute?.name === "New Attribute" &&
      attribute?.code.startsWith("new_attr_") &&
      onDiscard
    ) {
      Modal.confirm({
        title: "保存为草稿? (Save as Draft?)",
        content:
          "这是一个新属性，是否将其保存为临时草稿？(This is a new attribute. Do you want to save it as a temporary draft?)",
        okText: "保存 (Save)",
        cancelText: "丢弃 (Discard)",
        okButtonProps: { type: "primary" },
        cancelButtonProps: { danger: true },
        onOk: () => {
          setIsEditing(false);
        },
        onCancel: () => {
          onDiscard(attribute.id);
        },
      });
    } else {
      setIsEditing(false);
    }
  };

  // Determine Modes
  const isListMode =
    attribute.type === "enum" ||
    attribute.type === "multi-enum" ||
    (attribute.type === "number" && attribute.constraintMode === "list");

  // --- Render Sections ---

  const renderHeader = () => (
    <Flex
      align="center"
      justify="space-between"
      style={{
        padding: "8px 16px",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        height: 48,
      }}
    >
      <Space size={12}>
        <Title level={5} style={{ margin: 0 }}>
          {attribute.name}
        </Title>
        <Tag color="cyan">V{attribute.version}.0</Tag>
        <Text type="secondary" copyable style={{ fontSize: 12 }}>
          {attribute.code}
        </Text>
        <Tag color="blue" variant="filled">
          {attribute.type}
        </Tag>
      </Space>

      <Space size="small">
        {!isEditing ? (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setIsEditing(true)}
          >
            编辑 (Edit)
          </Button>
        ) : (
          <>
            <Button size="small" onClick={handleCancel}>
              取消
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存
            </Button>
          </>
        )}
      </Space>
    </Flex>
  );

  const renderReadOnlyMeta = () => (
    <div style={{ padding: 12, overflowY: "auto", height: "100%" }}>
      <Descriptions
        column={2}
        bordered
        size="small"
        labelStyle={{ width: "180px" }}
      >
        <Descriptions.Item label="名称 (Display Name)">
          {attribute.name}
        </Descriptions.Item>
        <Descriptions.Item label="数据类型 (Data Type)">
          {attribute.type}
        </Descriptions.Item>
        <Descriptions.Item label="编码 (Code)">
          {attribute.code}
        </Descriptions.Item>
        <Descriptions.Item label="默认值 (Default)">-</Descriptions.Item>
        <Descriptions.Item label="单位 (Unit)">
          {attribute.unit || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="可见性 (Visibility)">
          <Space separator={<Divider orientation="vertical" />}>
            <Text>{attribute.hidden ? "Hidden" : "Visible"}</Text>
            <Text>{attribute.readonly ? "Read-only" : "Writable"}</Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="必填 (Required)">
          {attribute.required ? "Yes" : "No"}
        </Descriptions.Item>
        <Descriptions.Item label="描述 (Description)">
          {attribute.description || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="创建人 (Created By)">
            {attribute.createdBy || "Admin"}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间 (Created At)">
            {attribute.createdAt || "2023-01-01 12:00"}
        </Descriptions.Item>
        <Descriptions.Item label="修改人 (Modified By)">
            {attribute.modifiedBy || "Admin"}
        </Descriptions.Item>
        <Descriptions.Item label="修改时间 (Modified At)">
            {attribute.modifiedAt || "2023-10-24 14:30"}
        </Descriptions.Item>
      </Descriptions>

      {/* Constraints Display */}
      {(attribute.type === "number" || attribute.type === "string") && (
        <div style={{ marginTop: 12 }}>
          <Descriptions
            title="约束 (Constraints)"
            column={2}
            bordered
            size="small"
            labelStyle={{ width: "120px" }}
          >
            {attribute.type === "string" && (
              <>
                <Descriptions.Item label="最大长度 (Max Length)">
                  {attribute.maxLength || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="模式 (Pattern)">
                  {attribute.pattern || "-"}
                </Descriptions.Item>
              </>
            )}
            {attribute.type === "number" && (
              <>
                <Descriptions.Item label="模式 (Mode)">
                  {attribute.constraintMode}
                </Descriptions.Item>
                {attribute.constraintMode === "range" ? (
                  <Descriptions.Item label="范围 (Range)">{`[${attribute.rangeConfig?.min}, ${attribute.rangeConfig?.max}]`}</Descriptions.Item>
                ) : (
                  <Descriptions.Item label="精度 (Precision)">
                    {attribute.precision}
                  </Descriptions.Item>
                )}
              </>
            )}
          </Descriptions>
        </div>
      )}
    </div>
  );

  const renderEditForm = () => (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleFormChange}
      style={{ height: "100%", overflowY: "auto" }}
      initialValues={attribute}
      size="small"
    >
      <Tabs
        defaultActiveKey="basic"
        style={{ height: "100%" }}
        tabBarStyle={{ padding: "0 16px", margin: 0 }}
        items={[
          {
            key: "basic",
            label: (
              <span>
                <BarsOutlined /> 基础 (Basic)
              </span>
            ),
            children: (
              <div style={{ padding: 12 }}>
                <div
                  style={{
                    background: token.colorFillQuaternary,
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <Title
                    level={5}
                    style={{
                      marginTop: 0,
                      marginBottom: 15,
                      fontSize: 16,
                      color: token.colorTextSecondary,
                    }}
                  >
                    属性详情 (Attribute Details)
                  </Title>
                  <Row gutter={24}>
                    <Col span={4}>
                      <Form.Item
                        label="名称 (Display Name)"
                        name="name"
                        rules={[{ required: true }]}
                      >
                        <Input size="middle" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="编码 (Code)"
                        name="code"
                        rules={[{ required: true }]}
                      >
                        <Input disabled={!attribute.isLatest} size="middle" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="描述 (Description)"
                        name="description"
                        style={{ marginBottom: 0 }}
                      >
                        <Input size="middle" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="数据类型 (Data Type)" name="type">
                        <Select size="middle">
                          <Option value="string">String</Option>
                          <Option value="number">Number</Option>
                          <Option value="boolean">Boolean</Option>
                          <Option value="enum">Enum</Option>
                          <Option value="multi-enum">Multi Enum</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="单位 (Unit)" name="unit">
                        <Input size="middle" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="默认值 (Default Value)" name="defaultValue">
                        <Input placeholder="-" size="middle" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <Row gutter={24}>
                    <Col span={6}>
                       <Form.Item label="创建人 (Created By)">
                         <Input disabled value={attribute.createdBy || "Admin"} variant="borderless" size="middle" />
                       </Form.Item>
                    </Col>
                     <Col span={6}>
                       <Form.Item label="创建时间 (Created At)">
                         <Input disabled value={attribute.createdAt || "2023-01-01 12:00"} variant="borderless" size="middle" />
                       </Form.Item>
                    </Col>
                    <Col span={6}>
                       <Form.Item label="修改人 (Modified By)">
                         <Input disabled value={attribute.modifiedBy || "Admin"} variant="borderless" size="middle" />
                       </Form.Item>
                    </Col>
                     <Col span={6}>
                       <Form.Item label="修改时间 (Modified At)">
                         <Input disabled value={attribute.modifiedAt || "2023-10-24 14:30"} variant="borderless" size="middle" />
                       </Form.Item>
                    </Col>
                  </Row>
                </div>
              </div>
            ),
          },
          {
            key: "settings",
            label: (
              <span>
                <SettingOutlined /> 设置 (Settings)
              </span>
            ),
            children: (
              <div style={{ padding: 12 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div
                      style={{
                        background: token.colorFillQuaternary,
                        borderRadius: 8,
                        padding: 8,
                        height: "100%",
                      }}
                    >
                      <Title
                        level={5}
                        style={{
                          marginTop: 0,
                          marginBottom: 16,
                          fontSize: 13,
                          color: token.colorTextSecondary,
                        }}
                      >
                        行为控制 (Behavior)
                      </Title>
                      <Flex vertical gap="middle">
                        <Flex justify="space-between" align="center">
                          <span>必填 (Required)</span>
                          <Form.Item
                            name="required"
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <span>唯一 (Unique)</span>
                          <Form.Item
                            name="unique"
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Flex>
                      </Flex>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div
                      style={{
                        background: token.colorFillQuaternary,
                        borderRadius: 8,
                        padding: 8,
                        height: "100%",
                      }}
                    >
                      <Title
                        level={5}
                        style={{
                          marginTop: 0,
                          marginBottom: 16,
                          fontSize: 13,
                          color: token.colorTextSecondary,
                        }}
                      >
                        可见性 (Visibility)
                      </Title>
                      <Flex vertical gap="middle">
                        <Flex justify="space-between" align="center">
                          <span>隐藏 (Hidden)</span>
                          <Form.Item
                            name="hidden"
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <span>只读 (Read-only)</span>
                          <Form.Item
                            name="readonly"
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <span>搜索索引 (Search Index)</span>
                          <Form.Item
                            name="searchable"
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Flex>
                      </Flex>
                    </div>
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />
    </Form>
  );

  const renderValueDomain = () => {
    // Helper to update attribute type
    const handleTypeChange = (newType: AttributeType) => {
      onUpdate("type", newType);
      form.setFieldValue("type", newType);
    };

    // Helper to update specific fields
    const updateAttribute = (updates: Partial<AttributeItem>) => {
      Object.entries(updates).forEach(([key, value]) => {
        onUpdate(key, value);
      });
      form.setFieldsValue(updates);
    };

    const CommonHelper = ({
      title,
      extra,
      children,
    }: {
      title: string;
      extra?: React.ReactNode;
      children: React.ReactNode;
    }) => (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Flex
          justify="space-between"
          align="center"
          style={{
            padding: "8px 12px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorPrimaryBg,
          }}
        >
          <Space size="small">
            <AppstoreOutlined />
            <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
          </Space>
          {extra}
        </Flex>
        <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    );

    // 1. String: Text Rules
    if (attribute.type === "string") {
      return (
        <CommonHelper
          title="文本规则 (Text Rules)"
          extra={
            <Button
              size="small"
              type="link"
              onClick={() => handleTypeChange("enum")}
            >
              转为枚举 (Convert to Enum)
            </Button>
          }
        >
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="最小长度 (Min Length)">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    value={attribute.minLength}
                    onChange={(v) =>
                      updateAttribute({ minLength: v || undefined })
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="最大长度 (Max Length)">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    value={attribute.maxLength}
                    onChange={(v) =>
                      updateAttribute({ maxLength: v || undefined })
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="正则表达式 (Regex Pattern)">
              <Input
                prefix="/"
                placeholder="e.g. ^[a-z]+$"
                value={attribute.pattern}
                onChange={(e) => updateAttribute({ pattern: e.target.value })}
              />
            </Form.Item>
          </Form>
        </CommonHelper>
      );
    }

    // 2. Number: Numeric Rules
    if (attribute.type === "number") {
      return (
        <CommonHelper
          title="数值规则 (Numeric Rules)"
          extra={
            <Button
              size="small"
              type="link"
              onClick={() => handleTypeChange("enum")}
            >
              转为枚举 (Convert to Enum)
            </Button>
          }
        >
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="最小值 (Min Value)">
                  <InputNumber
                    style={{ width: "100%" }}
                    value={attribute.min}
                    onChange={(v) => updateAttribute({ min: v || undefined })}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="最大值 (Max Value)">
                  <InputNumber
                    style={{ width: "100%" }}
                    value={attribute.max}
                    onChange={(v) => updateAttribute({ max: v || undefined })}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="步长 (Step)">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    value={attribute.step}
                    onChange={(v) => updateAttribute({ step: v || undefined })}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="精度 (Precision)">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    max={10}
                    value={attribute.precision}
                    onChange={(v) =>
                      updateAttribute({ precision: v || undefined })
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </CommonHelper>
      );
    }

    // 3. Boolean: Display Config
    if (attribute.type === "boolean") {
      return (
        <CommonHelper title="布尔配置 (Boolean Configuration)">
          <Form layout="vertical" size="small">
            <Form.Item label="True 显示文本 (Display for True)">
              <Input
                placeholder="e.g. Yes, Open, Active"
                value={attribute.trueLabel}
                onChange={(e) => updateAttribute({ trueLabel: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="False 显示文本 (Display for False)">
              <Input
                placeholder="e.g. No, Closed, Inactive"
                value={attribute.falseLabel}
                onChange={(e) =>
                  updateAttribute({ falseLabel: e.target.value })
                }
              />
            </Form.Item>
          </Form>
        </CommonHelper>
      );
    }

    const currentRenderType = attribute.renderType || "text";

    const enumColumns: ProColumns<EnumOptionItem>[] = [
      {
        title: "序号",
        valueType: "index",
        width: 80,
        render: (_, __, index) => <span style={{ color: token.colorTextTertiary }}>{index + 1}</span>,
      },
      {
        title: "编码 (Code)",
        dataIndex: "code",
        width: 120,
        formItemProps: { rules: [{ required: true }] },
      },
      {
        title: currentRenderType === "color" ? "颜色 (Color)" : "枚举值 (Value)",
        dataIndex: "value",
        valueType: currentRenderType === "color" ? "color" : "text",
        width: currentRenderType === "color" ? 120 : 120,
        formItemProps: { rules: [{ required: true }] },
      },
      {
        title: "显示标签 (Label)",
        dataIndex: "label",
        formItemProps: { rules: [{ required: true }] },
      },
      {
        title: "操作",
        valueType: "option",
        width: 160,
        render: (text, record, _, action) => [
          <a key="edit" onClick={() => action?.startEditable?.(record.id)}>
            编辑 (Edit)
          </a>,
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

    if (currentRenderType === "image") {
      enumColumns.splice(2, 0, {
        title: "图片",
        dataIndex: "image",
        width: 80,
        render: (_, r) => (r.image ? <PictureOutlined /> : "-"),
        renderFormItem: () => <Input prefix={<UploadOutlined />} />,
      });
    }

    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <Flex
          justify="space-between"
          align="center"
          style={{
            padding: "8px 12px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorPrimaryBg,
          }}
        >
          <Space size="small">
            <AppstoreOutlined />
            <span style={{ fontWeight: 600, fontSize: 13 }}>枚举值定义</span>
          </Space>
          <Space>
            <Radio.Group
              value={currentRenderType}
              onChange={(e) =>
                updateAttribute({ renderType: e.target.value as any })
              }
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="text">文本</Radio.Button>
              <Radio.Button value="color">颜色</Radio.Button>
              <Radio.Button value="image">图片</Radio.Button>
            </Radio.Group>
            <Button
              type="text"
              size="small"
              icon={<SortAscendingOutlined />}
              title="排序 (Sort)"
            />
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined />}
              title="审计日志 (Audit Log)"
            />
          </Space>
        </Flex>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <EditableProTable<EnumOptionItem>
            rowKey="id"
            size="small"
            recordCreatorProps={{
              position: "bottom",
              record: () => ({
                id: Math.random().toString(36).substr(2, 9),
                code: "",
                value: "",
                label: "",
                order: 0,
              }),
              creatorButtonText: "Add Item",
            }}
            columns={enumColumns}
            value={enumOptions}
            onChange={(values) => setEnumOptions([...values])}
            scroll={{ y: 300 }}
            editable={{ type: "multiple" }}
            ghost
            search={false}
            options={false}
            pagination={false}
          />
        </div>
      </div>
    );
  };

  const getContainerStyle = () => ({
    height: "100%",
    background: token.colorBgContainer,
    border: `2px solid ${
      saveStatus === "success"
        ? token.colorSuccess
        : isEditing
          ? token.colorPrimary
          : "transparent"
    }`,
    transition: "all 0.3s ease",
    boxShadow:
      saveStatus === "success"
        ? `0 0 8px ${token.colorSuccessBg}`
        : isEditing
          ? `0 0 8px ${token.colorPrimaryBg}`
          : "none",
  });

  if (!isEditing) {
    return (
      <Flex vertical style={getContainerStyle()}>
        {renderHeader()}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {renderReadOnlyMeta()}
        </div>
      </Flex>
    );
  }

  return (
    <Flex vertical style={getContainerStyle()}>
      {renderHeader()}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Splitter orientation="vertical">
          <Splitter.Panel defaultSize="40%" min="30%" max="80%">
            {renderEditForm()}
          </Splitter.Panel>
          <Splitter.Panel>{renderValueDomain()}</Splitter.Panel>
        </Splitter>
      </div>
    </Flex>
  );
};

export default AttributeWorkspace;
