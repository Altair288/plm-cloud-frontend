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
import { AttributeItem, EnumOptionItem } from "./types";

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
        labelStyle={{ width: "120px" }}
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
        <Descriptions.Item label="帮助文本 (Help Text)">
          {attribute.description || "-"}
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
                        基本信息 (Basic Information)
                      </Title>
                      <Form.Item
                        label="名称 (Display Name)"
                        name="name"
                        rules={[{ required: true }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        label="编码 (Code)"
                        name="code"
                        rules={[{ required: true }]}
                      >
                        <Input disabled={!attribute.isLatest} />
                      </Form.Item>
                      <Form.Item
                        label="描述 (Description)"
                        name="description"
                        style={{ marginBottom: 0 }}
                      >
                        <Input />
                      </Form.Item>
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
                        数据定义 (Data Definition)
                      </Title>
                      <Form.Item label="数据类型 (Data Type)" name="type">
                        <Select disabled>
                          <Option value="string">String</Option>
                          <Option value="number">Number</Option>
                          <Option value="boolean">Boolean</Option>
                          <Option value="enum">Enum</Option>
                          <Option value="multi-enum">Multi Enum</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="单位 (Unit)" name="unit">
                        <Input />
                      </Form.Item>
                      <Form.Item
                        label="默认值 (Default Value)"
                        style={{ marginBottom: 0 }}
                      >
                        <Input disabled placeholder="-" />
                      </Form.Item>
                    </div>
                  </Col>
                </Row>
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

                <div
                  style={{
                    marginTop: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    padding: 8,
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
                    高级规则与验证 (Advanced Rules & Validation)
                  </Title>

                  {/* Number Constraints */}
                  {attribute.type === "number" && (
                    <>
                      <Form.Item
                        label="约束模式 (Constraint Mode)"
                        name="constraintMode"
                        style={{ marginBottom: 16 }}
                      >
                        <Radio.Group buttonStyle="solid" size="small">
                          <Radio.Button value="none">自由 (Free)</Radio.Button>
                          <Radio.Button value="range">
                            范围 (Range)
                          </Radio.Button>
                          <Radio.Button value="list">列表 (List)</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                      {attribute.constraintMode === "range" && (
                        <Flex gap="small">
                          <Form.Item
                            label="最小值 (Min)"
                            name={["rangeConfig", "min"]}
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <InputNumber
                              size="small"
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            label="最大值 (Max)"
                            name={["rangeConfig", "max"]}
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <InputNumber
                              size="small"
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            label="步长 (Step)"
                            name={["rangeConfig", "step"]}
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <InputNumber
                              size="small"
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                        </Flex>
                      )}
                      {attribute.constraintMode === "none" && (
                        <Form.Item
                          label="精度 (Precision)"
                          name="precision"
                          style={{ marginBottom: 0, width: 200 }}
                        >
                          <InputNumber size="small" style={{ width: "100%" }} />
                        </Form.Item>
                      )}
                    </>
                  )}

                  {/* String Constraints */}
                  {attribute.type === "string" && (
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          label="最大长度 (Max Length)"
                          name="maxLength"
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={16}>
                        <Form.Item
                          label="正则表达式 (Regex Pattern)"
                          name="pattern"
                          style={{ marginBottom: 0 }}
                        >
                          <Input prefix="/" />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}

                  {/* Enum Render Type */}
                  {(attribute.type === "enum" ||
                    attribute.type === "multi-enum") && (
                    <Form.Item
                      label="渲染样式 (Render Style)"
                      name="renderType"
                      help="Selection affects Value Domain columns"
                      style={{ marginBottom: 0 }}
                    >
                      <Radio.Group buttonStyle="solid" size="small">
                        <Radio.Button value="text">文本 (Text)</Radio.Button>
                        <Radio.Button value="color">颜色 (Color)</Radio.Button>
                        <Radio.Button value="image">图片 (Image)</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  )}

                  {/* Default fallback for other types */}
                  {attribute.type !== "number" &&
                    attribute.type !== "string" &&
                    attribute.type !== "enum" &&
                    attribute.type !== "multi-enum" && (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="当前类型无高级配置 (No advanced settings for this type)"
                      />
                    )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Form>
  );

  const renderValueDomain = () => {
    const currentRenderType = attribute.renderType || "text";

    const enumColumns: ProColumns<EnumOptionItem>[] = [
      {
        title: "排序 (Sort)",
        dataIndex: "order",
        width: 48,
        editable: false,
        render: () => (
          <UnorderedListOutlined
            style={{ cursor: "move", color: token.colorTextTertiary }}
          />
        ),
      },
      {
        title: currentRenderType === "color" ? "十六进制颜色" : "代码/值",
        dataIndex: "value",
        valueType: currentRenderType === "color" ? "color" : "text",
        width: currentRenderType === "color" ? 100 : 120,
        formItemProps: { rules: [{ required: true }] },
      },
      {
        title: "显示标签 (Display Label)",
        dataIndex: "label",
        width: 150,
        formItemProps: { rules: [{ required: true }] },
      },
      {
        title: "状态 (State)",
        dataIndex: "state", // Assuming state/status field
        valueType: "select",
        valueEnum: {
          active: { text: "激活", status: "Success" },
          disabled: { text: "禁用", status: "Error" },
        },
        width: 80,
      },
      {
        title: "描述 (Description)",
        dataIndex: "description",
        valueType: "text",
        ellipsis: true,
      },
    ];

    if (currentRenderType === "image") {
      enumColumns.splice(3, 0, {
        title: "图片 (Image)",
        dataIndex: "image",
        width: 60,
        render: (_, r) => (r.image ? <PictureOutlined /> : "-"),
        renderFormItem: () => <Input prefix={<UploadOutlined />} />,
      });
    }

    enumColumns.push({
      title: "操作 (Actions)",
      valueType: "option",
      width: 200,
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
    });

    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <Flex
          justify="space-between"
          align="center"
          style={{
            padding: "4px 8px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
          }}
        >
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                /* Add New */
              }}
            >
              新增值 (New Value)
            </Button>
            <Divider type="vertical" />
            <Button type="text" size="small" icon={<ImportOutlined />}>
              导入 (Import)
            </Button>
            <Button type="text" size="small" icon={<ExportOutlined />}>
              导出 (Export)
            </Button>
            <Button type="text" size="small" icon={<EditOutlined />}>
              批量 (Batch)
            </Button>
          </Space>
          <Space size="small">
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索值 (Search values)"
              size="small"
              style={{ width: 120 }}
              variant="borderless"
            />
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

  if (!isListMode || !isEditing) {
    return (
      <Flex vertical style={getContainerStyle()}>
        {renderHeader()}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {isEditing ? renderEditForm() : renderReadOnlyMeta()}
        </div>
      </Flex>
    );
  }

  return (
    <Flex vertical style={getContainerStyle()}>
      {renderHeader()}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Splitter orientation="vertical">
          <Splitter.Panel defaultSize="50%" min="30%" max="70%">
            {isEditing ? renderEditForm() : renderReadOnlyMeta()}
          </Splitter.Panel>
          <Splitter.Panel>{renderValueDomain()}</Splitter.Panel>
        </Splitter>
      </div>
    </Flex>
  );
};

export default AttributeWorkspace;
