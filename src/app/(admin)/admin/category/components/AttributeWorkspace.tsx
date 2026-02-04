import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
  Upload,
  Image,
  Dropdown,
} from "antd";
import type { MenuProps } from "antd";
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
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  ICellRendererParams,
  Theme,
} from "ag-grid-community";
import { AttributeItem, EnumOptionItem, AttributeType } from "./types";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface AttributeWorkspaceProps {
  attribute: AttributeItem | null;
  onUpdate: (key: string, value: any) => void;
  enumOptions: EnumOptionItem[];
  setEnumOptions: (data: EnumOptionItem[]) => void;
  onDiscard?: (id: string) => void;
  onSave?: (attribute: AttributeItem) => Promise<void>;
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
  onSave,
}) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success">("idle");
  const gridRef = useRef<AgGridReact>(null);

  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    record: EnumOptionItem | null;
  }>({
    open: false,
    x: 0,
    y: 0,
    record: null,
  });

  const enumOptionsRef = useRef(enumOptions);
  useEffect(() => {
    enumOptionsRef.current = enumOptions;
  }, [enumOptions]);

  const showGridImage = attribute?.renderType === "image";

  const colDefs = useMemo<ColDef<EnumOptionItem>[]>(() => {
    const ImageCellRenderer = (params: ICellRendererParams) => {
      const beforeUpload = (file: File) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          params.node.setDataValue("image", reader.result);
        };
        return false;
      };

      const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        params.node.setDataValue("image", undefined);
      };

      return (
        <Flex align="center" justify="space-between" style={{ width: "100%" }}>
          {params.value ? (
            <Image
              src={params.value}
              alt="preview"
              width={24}
              height={24}
              style={{ objectFit: "cover", borderRadius: 4 }}
              preview={{
                mask: null,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                background: token.colorFillAlter,
                borderRadius: 4,
              }}
            />
          )}
          {params.value && (
            <Button
              type="text"
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={handleRemove}
              title="删除图片 (Delete Image)"
              style={{
                marginLeft: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          )}
          <Upload
            showUploadList={false}
            beforeUpload={beforeUpload}
            accept="image/*"
          >
            <Button
              type="text"
              size="small"
              icon={<UploadOutlined />}
              title={params.value ? "更换图片 (Replace)" : "上传图片 (Upload)"}
              style={{
                color: token.colorTextSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          </Upload>
        </Flex>
      );
    };

    const baseDefs: ColDef<EnumOptionItem>[] = [
      {
        headerName: "",
        valueGetter: "node.rowIndex + 1",
        width: 50,
        flex: 0,
        editable: false,
        pinned: "left",
        lockPosition: true,
        suppressMovable: true,
        resizable: false,
        cellStyle: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: token.colorFillAlter,
          color: token.colorTextSecondary,
          fontWeight: 600,
        },
      },
      {
        headerName: "",
        width: 50,
        pinned: "left",
        lockPosition: true,
        suppressMovable: true,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        flex: 0,
        resizable: false,
        cellStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
      },
      {
        headerName: "编码 (Code)",
        field: "code",
        editable: true,
        flex: 1,
        rowDrag: true,
      },
      {
        headerName: "枚举值 (Value)",
        field: "value",
        editable: true,
        flex: 1,
        cellEditor: "agTextCellEditor",
      },
      {
        headerName: "显示标签 (Label)",
        field: "label",
        editable: true,
        flex: 1,
      },
      {
        headerName: "操作",
        width: 70,
        flex: 0,
        editable: false,
        sortable: false,
        pinned: "right",
        lockPosition: true,
        cellStyle: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        cellRenderer: (params: ICellRendererParams) => (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() =>
              setEnumOptions(
                enumOptionsRef.current.filter(
                  (item) => item.id !== params.data.id,
                ),
              )
            }
          />
        ),
      },
    ];

    if (showGridImage) {
      baseDefs.splice(4, 0, {
        headerName: "图片 (Image)",
        field: "image",
        width: 120,
        flex: 0,
        editable: false,
        cellRenderer: ImageCellRenderer,
        cellStyle: { display: "flex", alignItems: "center" },
      });
    }

    return baseDefs;
  }, [showGridImage, token, setEnumOptions]);

  // Sync form with attribute
  useEffect(() => {
    if (attribute) {
      form.setFieldsValue(attribute);
    } else {
      form.resetFields();
    }
  }, [attribute, form]); // Reset form when attribute prop changes

  // Handle selection change
  useEffect(() => {
    if (attribute) {
      const isNew = attribute.id.startsWith("new_attr_");
      
      // If it's a new attribute, we might want to ensure clean state
      if (isNew) {
         // Reset form to default values for new attribute to avoid leftover state
         form.resetFields();
         form.setFieldsValue(attribute);
      }
      
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
      .then(async () => {
        if (onSave && attribute) {
          setSaveStatus("loading");
          try {
             await onSave(attribute);
             setIsEditing(false);
             setSaveStatus("success");
             setTimeout(() => setSaveStatus("idle"), 2000);
          } catch (e) {
             setSaveStatus("idle");
             // Error handling should be done by onSave or global message
          }
        } else {
             setIsEditing(false);
             setSaveStatus("success");
             setTimeout(() => setSaveStatus("idle"), 2000);
        }
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
        <Descriptions.Item label="默认值 (Default)">
          {isListMode && attribute.defaultValue
            ? (Array.isArray(attribute.defaultValue)
                ? attribute.defaultValue
                : [attribute.defaultValue]
              )
                .map(
                  (val: any) =>
                    enumOptions.find((o) => o.value === val)?.label || val,
                )
                .join(", ")
            : attribute.defaultValue || "-"}
        </Descriptions.Item>
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
                      <Form.Item
                        label="默认值 (Default Value)"
                        name="defaultValue"
                      >
                        {isListMode ? (
                          <Select
                            placeholder="选择默认值 (Select default)"
                            allowClear
                            mode={
                              attribute.type === "multi-enum"
                                ? "multiple"
                                : undefined
                            }
                            size="middle"
                            optionLabelProp="label"
                          >
                            {enumOptions.map((opt) => (
                              <Option
                                key={opt.id}
                                value={opt.value}
                                label={opt.label || opt.value}
                              >
                                <Space>
                                  {opt.image && (
                                    <img
                                      src={opt.image}
                                      alt={opt.label}
                                      style={{
                                        width: 16,
                                        height: 16,
                                        objectFit: "cover",
                                        borderRadius: 2,
                                        verticalAlign: "middle",
                                      }}
                                    />
                                  )}
                                  <span>
                                    {opt.label
                                      ? `${opt.value} - ${opt.label}`
                                      : opt.value}
                                  </span>
                                </Space>
                              </Option>
                            ))}
                          </Select>
                        ) : (
                          <Input placeholder="-" size="middle" />
                        )}
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Row gutter={24}>
                    <Col span={6}>
                      <Form.Item label="创建人 (Created By)">
                        <Input
                          disabled
                          value={attribute.createdBy || "Admin"}
                          variant="borderless"
                          size="middle"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="创建时间 (Created At)">
                        <Input
                          disabled
                          value={attribute.createdAt || "2023-01-01 12:00"}
                          variant="borderless"
                          size="middle"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="修改人 (Modified By)">
                        <Input
                          disabled
                          value={attribute.modifiedBy || "Admin"}
                          variant="borderless"
                          size="middle"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="修改时间 (Modified At)">
                        <Input
                          disabled
                          value={attribute.modifiedAt || "2023-10-24 14:30"}
                          variant="borderless"
                          size="middle"
                        />
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
                          fontSize: 16,
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
                          fontSize: 16,
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

    const showImage = attribute.renderType === "image";

    const handleAddRow = () => {
      const newItem: EnumOptionItem = {
        id: Math.random().toString(36).substr(2, 9),
        code: "",
        value: "",
        label: "",
        order: enumOptions.length + 1,
      };
      const newOptions = [...enumOptions, newItem];
      setEnumOptions(newOptions);

      // Automatically scroll to the newly added row
      setTimeout(() => {
        if (gridRef.current && gridRef.current.api) {
          const lastIndex = newOptions.length - 1;
          gridRef.current.api.ensureIndexVisible(lastIndex, "bottom");
          gridRef.current.api.setFocusedCell(lastIndex, "code");
        }
      }, 100);
    };

    const handleContextMenu = (params: any) => {
      params.event.preventDefault();
      setContextMenu({
        open: true,
        x: params.event.clientX,
        y: params.event.clientY,
        record: params.data,
      });
    };

    const contextMenuItems: MenuProps["items"] = [
      {
        key: "add",
        label: "新增行 (Add Row)",
        icon: <PlusOutlined />,
        onClick: () => {
          handleAddRow();
          setContextMenu((prev) => ({ ...prev, open: false }));
        },
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        label: "删除此行 (Delete Row)",
        icon: <DeleteOutlined />,
        danger: true,
        disabled: !contextMenu.record,
        onClick: () => {
          if (contextMenu.record) {
            setEnumOptions(
              enumOptions.filter((item) => item.id !== contextMenu.record?.id),
            );
          }
          setContextMenu((prev) => ({ ...prev, open: false }));
        },
      },
    ];

    const handleExport = () => {
      const header = ["Code", "Value", "Label", "Image"];
      const csvContent = [
        header.join(","),
        ...enumOptions.map((item) =>
          [item.code, item.value, item.label, item.image || ""]
            .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `enum_options_${new Date().getTime()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    };

    const handleImport = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split(/\r\n|\n/);
        const newItems: EnumOptionItem[] = [];
        lines.forEach((line, index) => {
          if (!line.trim()) return;
          const parts = line
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((s) => s.replace(/^"|"$/g, "").trim());
          if (
            index === 0 &&
            (parts[0].toLowerCase() === "code" ||
              parts[0].toLowerCase() === '"code"')
          )
            return;

          if (parts.length >= 3) {
            newItems.push({
              id: Math.random().toString(36).substr(2, 9),
              code: parts[0],
              value: parts[1],
              label: parts[2],
              image: parts[3] ? parts[3] : undefined,
              order: enumOptions.length + newItems.length + 1,
            });
          }
        });
        setEnumOptions([...enumOptions, ...newItems]);
      };
      reader.readAsText(file);
      return false;
    };

    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {createPortal(
          <Dropdown
            key={`${contextMenu.x}-${contextMenu.y}`}
            menu={{ items: contextMenuItems }}
            open={contextMenu.open}
            onOpenChange={(open) => {
              if (!open) setContextMenu((prev) => ({ ...prev, open: false }));
            }}
            trigger={["click"]}
            destroyOnHidden
          >
            <div
              style={{
                position: "fixed",
                left: contextMenu.x,
                top: contextMenu.y,
                width: 1,
                height: 1,
                pointerEvents: "none",
              }}
            />
          </Dropdown>,
          document.body,
        )}
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
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddRow}
              title="新增 (Add)"
            >
              新增
            </Button>
            <Divider orientation="vertical" />
            <Upload
              beforeUpload={handleImport}
              showUploadList={false}
              accept=".csv"
            >
              <Button
                type="text"
                size="small"
                icon={<ImportOutlined />}
                title="导入 (Import)"
              >
                导入
              </Button>
            </Upload>
            <Button
              type="text"
              size="small"
              icon={<ExportOutlined />}
              onClick={handleExport}
              title="导出 (Export)"
            >
              导出
            </Button>
            <Divider orientation="vertical" />
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              图片描述 (Image Description)
            </span>
            <Switch
              size="small"
              checked={showImage}
              onChange={(checked) =>
                updateAttribute({ renderType: checked ? "image" : "text" })
              }
            />
            <Divider orientation="vertical" />
          </Space>
        </Flex>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <AgGridReact
            ref={gridRef}
            preventDefaultOnContextMenu={true}
            onCellContextMenu={handleContextMenu}
            onBodyScroll={() => {
              if (contextMenu.open) {
                setContextMenu((prev) => ({ ...prev, open: false }));
              }
            }}
            theme={themeQuartz}
            rowData={enumOptions}
            columnDefs={colDefs}
            getRowId={(params) => params.data.id}
            rowSelection="multiple"
            defaultColDef={{
              flex: 1,
              editable: true,
              resizable: true,
            }}
            onCellValueChanged={(event) => {
              const newOptions = [...enumOptions];
              const index = newOptions.findIndex((i) => i.id === event.data.id);
              if (index > -1) {
                newOptions[index] = event.data;
                setEnumOptions(newOptions);
              }
            }}
            rowDragManaged={true}
            animateRows={true}
            onRowDragEnd={(event) => {
              const newOrder: EnumOptionItem[] = [];
              event.api.forEachNode((node) => {
                if (node.data)
                  newOrder.push({
                    ...node.data,
                    order: (node.rowIndex || 0) + 1,
                  });
              });
              setEnumOptions(newOrder);
            }}
            stopEditingWhenCellsLoseFocus={true}
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
