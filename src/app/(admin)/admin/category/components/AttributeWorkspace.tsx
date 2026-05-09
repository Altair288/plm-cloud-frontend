import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  App,
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
  Button,
  Descriptions,
  Splitter,
  Row,
  Col,
  Tabs,
  Upload,
  Image,
  Slider,
  Table,
} from "antd";
import type { MenuProps } from "antd";
import {
  EditOutlined,
  AppstoreOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined,
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  BarsOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  CellContextMenuEvent,
  themeQuartz,
  ICellRendererParams,
} from "ag-grid-community";
import { AttributeItem, EnumOptionItem, AttributeType } from "./types";
import FloatingContextMenu from "@/components/ContextMenu/FloatingContextMenu";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface AttributeWorkspaceProps {
  attribute: AttributeItem | null;
  selectedCount?: number;
  onUpdate: (key: string, value: unknown) => void;
  enumOptions: EnumOptionItem[];
  setEnumOptions: (data: EnumOptionItem[]) => void;
  previewLoading?: boolean;
  previewWarnings?: string[];
  allowManualCodeOverride?: boolean;
  allowManualEnumCodeOverride?: boolean;
  onDiscard?: (id: string) => void;
  onSave?: (attribute: AttributeItem) => Promise<void>;
  onSaveAndNext?: (attribute: AttributeItem) => Promise<void>;
  showSaveAndNext?: boolean;
  onCancelEdit?: () => void;
  hasUnsavedChanges?: boolean;
}

const { Option } = Select;
const { Text, Title } = Typography;
const READ_ONLY_ENUM_TABLE_HEADER_OFFSET = 47;

interface ErrorWithMessage {
  message?: string;
  error?: string;
}

interface AttributeFormChangeMap extends Record<string, unknown> {
  type?: AttributeType;
}

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    const candidate = error as ErrorWithMessage;
    return candidate.message || candidate.error || "";
  }
  return "";
};

const isEmptyDefaultValue = (value: AttributeItem["defaultValue"]) =>
  value === undefined || value === null || (Array.isArray(value) && value.length === 0);

const normalizeNumericDefaultValue = (value: AttributeItem["defaultValue"]) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeBooleanDefaultValue = (value: AttributeItem["defaultValue"]) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return undefined;
};

const normalizeMultiEnumDefaultValue = (value: AttributeItem["defaultValue"]) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getBooleanDisplayLabel = (attribute: AttributeItem, value: boolean) => {
  if (value) {
    return attribute.trueLabel?.trim() || "True";
  }
  return attribute.falseLabel?.trim() || "False";
};

const formatDefaultValueForDisplay = (
  attribute: AttributeItem,
  enumOptions: EnumOptionItem[],
) => {
  if (isEmptyDefaultValue(attribute.defaultValue)) {
    return "-";
  }

  if (attribute.type === "boolean") {
    const normalized = normalizeBooleanDefaultValue(attribute.defaultValue);
    return normalized === undefined ? "-" : getBooleanDisplayLabel(attribute, normalized);
  }

  if (attribute.type === "multi-enum") {
    return normalizeMultiEnumDefaultValue(attribute.defaultValue)
      .map((item) => enumOptions.find((option) => option.value === item)?.label || item)
      .join(", ");
  }

  if (attribute.type === "enum") {
    const rawValue = String(attribute.defaultValue);
    return enumOptions.find((option) => option.value === rawValue)?.label || rawValue;
  }

  return String(attribute.defaultValue);
};

const getRenderTypeLabel = (renderType?: AttributeItem["renderType"]) => {
  if (renderType === "image") {
    return "图片 (Image)";
  }
  if (renderType === "color") {
    return "颜色 (Color)";
  }
  return "文本 (Text)";
};

const ATTRIBUTE_TYPE_LABELS: Record<AttributeType, string> = {
  string: "文本",
  number: "数值",
  boolean: "布尔",
  date: "日期",
  enum: "单选枚举",
  "multi-enum": "多选枚举",
};

const getAttributeTypeLabel = (type: AttributeType) => ATTRIBUTE_TYPE_LABELS[type] || type;

const supportsUnitForType = (type: AttributeType) => type === "number";

const getEnumDefaultValueSet = (attribute: AttributeItem) => {
  if (attribute.type === "multi-enum") {
    return new Set(normalizeMultiEnumDefaultValue(attribute.defaultValue));
  }

  if (attribute.type === "enum") {
    const normalized = normalizeDefaultValueForType(attribute.type, attribute.defaultValue);
    return normalized ? new Set([String(normalized)]) : new Set<string>();
  }

  return new Set<string>();
};

const normalizeDefaultValueForType = (
  type: AttributeType,
  value: AttributeItem["defaultValue"],
) => {
  if (type === "boolean") {
    return normalizeBooleanDefaultValue(value);
  }
  if (type === "number") {
    return normalizeNumericDefaultValue(value);
  }
  if (type === "multi-enum") {
    const normalized = normalizeMultiEnumDefaultValue(value);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (type === "enum") {
    if (Array.isArray(value)) {
      return value[0] || undefined;
    }
    return value === undefined || value === null || value === "" ? undefined : String(value);
  }
  if (Array.isArray(value)) {
    return value[0] || undefined;
  }
  return value === undefined || value === null || value === "" ? undefined : String(value);
};

const AttributeWorkspace: React.FC<AttributeWorkspaceProps> = ({
  attribute,
  selectedCount = 0,
  onUpdate,
  enumOptions,
  setEnumOptions,
  onDiscard,
  onSave,
  onSaveAndNext,
  showSaveAndNext,
  onCancelEdit,
  hasUnsavedChanges,
}) => {
  const { token } = theme.useToken();
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);
  const [numericDefaultSliderOpenFor, setNumericDefaultSliderOpenFor] = useState<string | null>(null);
  const [readOnlyEnumTableScrollY, setReadOnlyEnumTableScrollY] = useState(240);
  const [saveStatusState, setSaveStatusState] = useState<{
    attributeId: string | null;
    status: "idle" | "loading" | "success";
  }>({
    attributeId: null,
    status: "idle",
  });
  const gridRef = useRef<AgGridReact>(null);
  const readOnlyEnumTableContainerRef = useRef<HTMLDivElement | null>(null);

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
  const isEditing = attribute ? attribute.id.startsWith("new_attr_") || editingAttributeId === attribute.id : false;
  const numericDefaultSliderContextKey = attribute ? `${attribute.id}:${attribute.type}` : null;
  const numericDefaultSliderOpen = numericDefaultSliderContextKey !== null && numericDefaultSliderOpenFor === numericDefaultSliderContextKey;
  const saveStatus = attribute && saveStatusState.attributeId === attribute.id ? saveStatusState.status : "idle";

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

  // Consolidated effect to handle attribute changes
  const prevAttributeIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!attribute) {
      prevAttributeIdRef.current = undefined;
      form.resetFields();
      return;
    }

    if (attribute.id !== prevAttributeIdRef.current) {
      // Attribute selection changed: switch editing mode by attribute type
      form.resetFields();
      form.setFieldsValue(attribute);
      prevAttributeIdRef.current = attribute.id;
      return;
    }

    // Same attribute updated while editing: keep form in sync.
    if (isEditing) {
      form.setFieldsValue(attribute);
    }
  }, [attribute, form, isEditing]);

  useEffect(() => {
    // Ensure form values are written only after edit form is mounted.
    if (!isEditing || !attribute) return;
    form.setFieldsValue(attribute);
  }, [isEditing, attribute, form]);

  useEffect(() => {
    const container = readOnlyEnumTableContainerRef.current;
    if (!container || attribute?.type !== "enum" && attribute?.type !== "multi-enum") {
      return;
    }

    const updateTableScrollY = () => {
      const nextHeight = Math.max(
        container.clientHeight - READ_ONLY_ENUM_TABLE_HEADER_OFFSET,
        120,
      );
      setReadOnlyEnumTableScrollY(nextHeight);
    };

    updateTableScrollY();

    const observer = new ResizeObserver(() => {
      updateTableScrollY();
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [attribute?.id, attribute?.type, enumOptions.length]);

  /* Removed conflicting useEffects */

  if (!attribute) {
    if (selectedCount > 1) {
      return (
        <Flex
          vertical
          justify="center"
          align="center"
          style={{
            height: "100%",
            background: token.colorBgLayout,
            padding: 24,
          }}
        >
          <AppstoreOutlined style={{ fontSize: 52, color: token.colorInfo, marginBottom: 20 }} />
          <Title level={3} style={{ margin: 0, marginBottom: 16 }}>
            已选择 {selectedCount} 个属性
          </Title>
          <Alert
            type="info"
            showIcon
            message="选择单个属性以查看详细信息并编辑"
            style={{ maxWidth: 520, width: "100%" }}
          />
        </Flex>
      );
    }

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

  const handleFormChange = (changedValues: AttributeFormChangeMap) => {
    if (attribute && "type" in changedValues) {
      const nextType = changedValues.type as AttributeType;
      const currentDefaultValue = form.getFieldValue("defaultValue") ?? attribute.defaultValue;
      const nextDefaultValue = normalizeDefaultValueForType(
        nextType,
        currentDefaultValue,
      );
      const nextUnit = supportsUnitForType(nextType)
        ? (form.getFieldValue("unit") ?? attribute.unit)
        : undefined;

      onUpdate("type", nextType);
      onUpdate("defaultValue", nextDefaultValue);
      onUpdate("unit", nextUnit);
      form.setFieldValue("defaultValue", nextDefaultValue);
      form.setFieldValue("unit", nextUnit);
      return;
    }

    Object.keys(changedValues).forEach((key) => {
      onUpdate(key, changedValues[key]);
    });
  };

  const buildFormSnapshot = () => {
    if (!attribute) {
      return null;
    }

    const formValues = form.getFieldsValue(true) as Partial<AttributeItem>;
    const nextType = (formValues.type as AttributeType | undefined) ?? attribute.type;
    const rawDefaultValue = form.getFieldValue("defaultValue");

    return {
      ...attribute,
      ...formValues,
      type: nextType,
      unit: supportsUnitForType(nextType)
        ? (typeof formValues.unit === "string"
            ? formValues.unit.trim() || undefined
            : attribute.unit)
        : undefined,
      defaultValue: normalizeDefaultValueForType(
        nextType,
        rawDefaultValue ?? attribute.defaultValue,
      ),
    } as AttributeItem;
  };

  const handleSave = (saveAndNext: boolean = false) => {
    form
      .validateFields()
      .then(async () => {
        const nextAttribute = buildFormSnapshot();

        if (nextAttribute && ((saveAndNext && onSaveAndNext) || (!saveAndNext && onSave))) {
          setSaveStatusState({ attributeId: nextAttribute.id, status: "loading" });
          try {
             if (saveAndNext && onSaveAndNext) {
               await onSaveAndNext(nextAttribute);
             } else if (onSave) {
               await onSave(nextAttribute);
               setEditingAttributeId(null);
             }
             setSaveStatusState({ attributeId: nextAttribute.id, status: "success" });
             setTimeout(() => setSaveStatusState({ attributeId: nextAttribute.id, status: "idle" }), 2000);
           } catch (error) {
             setSaveStatusState({ attributeId: nextAttribute.id, status: "idle" });
             // Error handling should be done by onSave or global message
             const errorMsg = getErrorMessage(error);
             if (errorMsg.includes("attribute already exists")) {
               form.setFields([
                 {
                   name: "code",
                   errors: ["属性编码已存在，请修改"],
                 },
               ]);
             }
          }
        } else {
             setEditingAttributeId(null);
             setSaveStatusState({ attributeId: attribute.id, status: "success" });
             setTimeout(() => setSaveStatusState({ attributeId: attribute.id, status: "idle" }), 2000);
        }
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleCancel = () => {
    if (
      attribute?.id.startsWith("new_attr_") &&
      onDiscard
    ) {
      modal.confirm({
        title: "放弃新建? (Discard New Attribute?)",
        content:
          "这是一个未保存的新属性，取消将直接删除该属性。是否确认放弃？(This is an unsaved new attribute. Canceling will delete it. Are you sure?)",
        okText: "放弃 (Discard)",
        cancelText: "继续编辑 (Continue Editing)",
        okButtonProps: { danger: true },
        onOk: () => {
          onDiscard(attribute.id);
        },
      });
    } else {
      onCancelEdit?.();
      setEditingAttributeId(null);
    }
  };

  // Determine Modes
  const isListMode =
    attribute.type === "enum" ||
    attribute.type === "multi-enum" ||
    (attribute.type === "number" && attribute.constraintMode === "list");
  const isNewAttribute = attribute.id.startsWith("new_attr_");

  // --- Render Sections ---

  const renderHeader = () => (
    <Flex
      align="center"
      justify="space-between"
      style={{
        padding: "8px 16px",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        height: 44,
      }}
    >
      <Space size={12}>
        <Title level={5} style={{ margin: 0 }}>
          {attribute.name}
        </Title>
        {hasUnsavedChanges && (
          <Tag color="warning" variant="filled" style={{ marginInlineEnd: 0 }}>
            未保存
          </Tag>
        )}
        <Tag color="cyan">V{attribute.version}.0</Tag>
        <Text type="secondary" copyable style={{ fontSize: 12 }}>
          {attribute.attributeField || attribute.code}
        </Text>
        <Tag color="blue" variant="filled">
          {getAttributeTypeLabel(attribute.type)}
        </Tag>
      </Space>

      <Space size="small">
        {!isEditing ? (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              if (!attribute) return;
              setEditingAttributeId(attribute.id);
            }}
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
              onClick={() => handleSave(false)}
            >
              保存
            </Button>
            {showSaveAndNext && (
              <Button
                size="small"
                onClick={() => handleSave(true)}
              >
                保存并转至下一条
              </Button>
            )}
          </>
        )}
      </Space>
    </Flex>
  );

  const renderReadOnlyMeta = () => {
    const sortedEnumOptions = [...enumOptions].sort(
      (left, right) => (left.order ?? 0) - (right.order ?? 0),
    );
    const defaultValueSet = getEnumDefaultValueSet(attribute);
    const isEnumType = attribute.type === "enum" || attribute.type === "multi-enum";
    const enumTableColumns = [
      {
        title: "#",
        dataIndex: "index",
        key: "index",
        width: 56,
        align: "center" as const,
        render: (_: unknown, __: EnumOptionItem, index: number) => (
          <Text type="secondary">{index + 1}</Text>
        ),
      },
      {
        title: "枚举值",
        dataIndex: "value",
        key: "value",
        width: attribute.renderType === "image" ? 120 : 220,
        render: (value: string, option: EnumOptionItem, index: number) => (
          <Flex align="center" gap={8}>
            {option.image ? (
              <Image
                src={option.image}
                alt={option.value || option.label || `enum-option-${index + 1}`}
                width={24}
                height={24}
                style={{ objectFit: "cover", borderRadius: 4, flex: "0 0 auto" }}
                preview={false}
              />
            ) : null}
            <Text ellipsis style={{ minWidth: 0 }}>
              {value || "-"}
            </Text>
          </Flex>
        ),
      },
      {
        title: "显示标签",
        dataIndex: "label",
        key: "label",
        render: (value: string) => (
          <Text ellipsis style={{ minWidth: 0 }}>
            {value || "-"}
          </Text>
        ),
      },
      {
        title: "编码",
        dataIndex: "code",
        key: "code",
        width: 320,
        render: (value: string) => (
          <Text type="secondary" ellipsis style={{ minWidth: 0 }}>
            {value || "-"}
          </Text>
        ),
      },
      {
        title: "默认值",
        key: "isDefault",
        width: 96,
        align: "center" as const,
        render: (_: unknown, option: EnumOptionItem) => (
          defaultValueSet.has(option.value) ? (
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              默认
            </Tag>
          ) : (
            <Text type="secondary">-</Text>
          )
        ),
      },
    ];

    return (
      <div
        style={{
          padding: 12,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
      <Title
        level={5}
        style={{
          marginTop: 0,
          marginBottom: 12,
          fontSize: 16,
          color: token.colorTextSecondary,
        }}
      >
        基础信息 (Basic Information)
      </Title>
      <Descriptions
        column={2}
        bordered
        size="small"
        styles={{ label: { width: "180px" } }}
      >
        <Descriptions.Item label="名称 (Display Name)">
          {attribute.name}
        </Descriptions.Item>
        <Descriptions.Item label="数据类型 (Data Type)">
          {getAttributeTypeLabel(attribute.type)}
        </Descriptions.Item>
        <Descriptions.Item label="属性字段 (Attribute Field)">
          {attribute.attributeField || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="编码 (Code)">
          {attribute.code}
        </Descriptions.Item>
        <Descriptions.Item label="默认值 (Default)">
          {formatDefaultValueForDisplay(attribute, enumOptions)}
        </Descriptions.Item>
        <Descriptions.Item label="单位 (Unit)">
          {supportsUnitForType(attribute.type) ? (attribute.unit || "-") : "-"}
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

      <Title
        level={5}
        style={{
          marginTop: 16,
          marginBottom: 12,
          fontSize: 16,
          color: token.colorTextSecondary,
        }}
      >
        类型配置 (Type Configuration)
      </Title>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: isEnumType ? 1 : "0 0 auto",
          minHeight: 0,
        }}
      >
        <Descriptions
          column={2}
          bordered
          size="small"
          styles={{ label: { width: "180px" } }}
        >
          <Descriptions.Item label="数据类型 (Data Type)">
            {getAttributeTypeLabel(attribute.type)}
          </Descriptions.Item>
          <Descriptions.Item label="默认值策略 (Default Strategy)">
            {attribute.defaultValue === undefined || attribute.defaultValue === null
              ? "未配置 (Not Configured)"
              : "已配置 (Configured)"}
          </Descriptions.Item>
          {attribute.type === "number" ? (
            <>
              <Descriptions.Item label="最小值 (Min Value)">
                {attribute.min ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="最大值 (Max Value)">
                {attribute.max ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="步长 (Step)">
                {attribute.step ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="精度 (Precision)">
                {attribute.precision ?? "-"}
              </Descriptions.Item>
            </>
          ) : null}
          {attribute.type === "boolean" ? (
            <>
              <Descriptions.Item label="True 显示文本 (True Label)">
                {attribute.trueLabel || "True"}
              </Descriptions.Item>
              <Descriptions.Item label="False 显示文本 (False Label)">
                {attribute.falseLabel || "False"}
              </Descriptions.Item>
            </>
          ) : null}
          {isEnumType ? (
            <>
              <Descriptions.Item label="渲染方式 (Render Type)">
                {getRenderTypeLabel(attribute.renderType)}
              </Descriptions.Item>
              <Descriptions.Item label="可选项数量 (Option Count)">
                {enumOptions.length}
              </Descriptions.Item>
            </>
          ) : null}
          {(attribute.type === "string" || attribute.type === "date") ? (
            <Descriptions.Item label="附加配置 (Additional Config)" span={2}>
              当前数据类型暂无额外配置。
            </Descriptions.Item>
          ) : null}
        </Descriptions>

        {isEnumType ? (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <Text
              type="secondary"
              style={{
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              选项内容 (Options)
            </Text>
            <div
              ref={readOnlyEnumTableContainerRef}
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
              }}
            >
              <Table
                className="app-ant-table-scroll"
                size="small"
                bordered={false}
                pagination={false}
                columns={enumTableColumns}
                dataSource={sortedEnumOptions}
                rowKey="id"
                scroll={{ y: readOnlyEnumTableScrollY, x: 760 }}
                onRow={(record) => ({
                  style: {
                    background: defaultValueSet.has(record.value)
                      ? token.colorPrimaryBg
                      : token.colorBgContainer,
                  },
                })}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
    );
  };

  const renderEditForm = () => (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleFormChange}
      style={{ height: "100%", overflowY: "auto" }}
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
                    background: "transparent",
                    borderRadius: 0,
                    padding: 0,
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
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12} md={12} lg={12} xl={6}>
                      <Form.Item
                        label="名称 (Display Name)"
                        name="name"
                        rules={[{ required: true }]}
                      >
                        <Input size="middle" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={12} xl={6}>
                      <Form.Item
                        label="属性字段 (Attribute Field)"
                        name="attributeField"
                      >
                        <Input size="middle" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={12} xl={6}>
                      <Form.Item
                        label="编码 (Code)"
                        name="code"
                        rules={[{ required: true }]}
                      >
                        <Input
                          disabled={!attribute.isLatest}
                          size="middle"
                          placeholder={isNewAttribute ? "系统会先自动建议编码，你也可以直接改写" : undefined}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={12} xl={6}>
                      <Form.Item label="数据类型 (Data Type)" name="type">
                        <Select size="middle">
                          <Option value="string">文本</Option>
                          <Option value="number">数值</Option>
                          <Option value="boolean">布尔</Option>
                          <Option value="date">日期</Option>
                          <Option value="enum">单选枚举</Option>
                          <Option value="multi-enum">多选枚举</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={24} md={24} lg={12} xl={10}>
                      <Form.Item
                        label="描述 (Description)"
                        name="description"
                      >
                        <Input size="middle" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={6} xl={7}>
                      <Form.Item label="单位 (Unit)" name="unit">
                        <Input
                          size="middle"
                          disabled={!supportsUnitForType(attribute.type)}
                          placeholder={supportsUnitForType(attribute.type) ? undefined : "当前数据类型不支持单位"}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={6} xl={7}>
                      <Form.Item label="默认值 (Default Value)">
                        {attribute.type === "boolean" ? (
                          <Select
                            placeholder="选择默认值 (Select default)"
                            allowClear
                            size="middle"
                            value={normalizeBooleanDefaultValue(attribute.defaultValue)}
                            onChange={(value) => {
                              onUpdate("defaultValue", value);
                              form.setFieldValue("defaultValue", value);
                            }}
                            onClear={() => {
                              onUpdate("defaultValue", undefined);
                              form.setFieldValue("defaultValue", undefined);
                            }}
                            options={[
                              {
                                label: getBooleanDisplayLabel(attribute, true),
                                value: true,
                              },
                              {
                                label: getBooleanDisplayLabel(attribute, false),
                                value: false,
                              },
                            ]}
                          />
                        ) : attribute.type === "number" ? (
                          <Flex
                            vertical
                            gap={8}
                            onMouseLeave={() => {
                              setNumericDefaultSliderOpenFor(null);
                            }}
                          >
                            <InputNumber
                              style={{ width: "100%" }}
                              size="middle"
                              min={attribute.min}
                              max={attribute.max}
                              step={typeof attribute.step === "number" && attribute.step > 0 ? attribute.step : 1}
                              precision={attribute.precision}
                              placeholder="输入默认值 (Enter default)"
                              value={normalizeNumericDefaultValue(attribute.defaultValue)}
                              onFocus={() => {
                                if (
                                  typeof attribute.min === "number" &&
                                  typeof attribute.max === "number" &&
                                  attribute.max > attribute.min
                                ) {
                                  setNumericDefaultSliderOpenFor(numericDefaultSliderContextKey);
                                }
                              }}
                              onClick={() => {
                                if (
                                  typeof attribute.min === "number" &&
                                  typeof attribute.max === "number" &&
                                  attribute.max > attribute.min
                                ) {
                                  setNumericDefaultSliderOpenFor(numericDefaultSliderContextKey);
                                }
                              }}
                              onChange={(value) => {
                                const nextValue = value === null ? undefined : value;
                                onUpdate("defaultValue", nextValue);
                                form.setFieldValue("defaultValue", nextValue);
                              }}
                            />
                            {numericDefaultSliderOpen &&
                            typeof attribute.min === "number" &&
                            typeof attribute.max === "number" &&
                            attribute.max > attribute.min ? (
                              <div
                                style={{
                                  padding: 12,
                                  borderRadius: token.borderRadiusLG,
                                  border: `1px solid ${token.colorBorderSecondary}`,
                                  background: token.colorFillQuaternary,
                                }}
                              >
                                <Slider
                                  min={attribute.min}
                                  max={attribute.max}
                                  step={typeof attribute.step === "number" && attribute.step > 0 ? attribute.step : 1}
                                  value={normalizeNumericDefaultValue(attribute.defaultValue)}
                                  onChange={(value) => {
                                    const nextValue = Array.isArray(value) ? value[0] : value;
                                    onUpdate("defaultValue", nextValue);
                                    form.setFieldValue("defaultValue", nextValue);
                                  }}
                                  tooltip={{ open: false }}
                                />
                                <Flex justify="space-between" align="center">
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {attribute.min} ~ {attribute.max}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    步长 {typeof attribute.step === "number" && attribute.step > 0 ? attribute.step : 1}
                                  </Text>
                                </Flex>
                              </div>
                            ) : null}
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {typeof attribute.min === "number" && typeof attribute.max === "number"
                                ? "点击输入框可展开滑块，选定数值后会自动收起。"
                                : "设置最小值和最大值后，可在此处用滑块快速选择默认值。"}
                            </Text>
                          </Flex>
                        ) : isListMode ? (
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
                            value={
                              attribute.type === "multi-enum"
                                ? normalizeMultiEnumDefaultValue(attribute.defaultValue)
                                : normalizeDefaultValueForType(attribute.type, attribute.defaultValue)
                            }
                            onChange={(value) => {
                              const nextValue = attribute.type === "multi-enum"
                                ? (Array.isArray(value) ? value : [])
                                : value;
                              onUpdate("defaultValue", nextValue);
                              form.setFieldValue("defaultValue", nextValue);
                            }}
                            onClear={() => {
                              const nextValue = attribute.type === "multi-enum" ? [] : undefined;
                              onUpdate("defaultValue", nextValue);
                              form.setFieldValue("defaultValue", nextValue);
                            }}
                          >
                            {enumOptions.map((opt) => (
                              <Option
                                key={opt.id}
                                value={opt.value}
                                label={opt.value}
                              >
                                <Space>
                                  {opt.image && (
                                    <Image
                                      src={opt.image}
                                      alt={opt.value}
                                      preview={false}
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
                                    {opt.value}
                                  </span>
                                </Space>
                              </Option>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            placeholder="-"
                            size="middle"
                            value={
                              attribute.defaultValue === undefined || attribute.defaultValue === null
                                ? undefined
                                : String(attribute.defaultValue)
                            }
                            onChange={(event) => {
                              const nextValue = event.target.value || undefined;
                              onUpdate("defaultValue", nextValue);
                              form.setFieldValue("defaultValue", nextValue);
                            }}
                          />
                        )}
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
    // Helper to update specific fields
    const updateAttribute = (updates: Partial<AttributeItem>) => {
      Object.entries(updates).forEach(([key, value]) => {
        onUpdate(key, value);
      });
      form.setFieldsValue(updates);
    };

    const renderCommonHelper = (
      title: string,
      children: React.ReactNode,
      extra?: React.ReactNode,
    ) => (
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
    // if (attribute.type === "string") {
    //   return renderCommonHelper(
    //     "文本规则 (Text Rules)",
    //     <Form layout="vertical" size="small">
    //       <Row gutter={16}>
    //         <Col span={12}>
    //           <Form.Item label="最小长度 (Min Length)">
    //             <InputNumber
    //               style={{ width: "100%" }}
    //               min={0}
    //               value={attribute.minLength}
    //               onChange={(v) =>
    //                 updateAttribute({ minLength: v || undefined })
    //               }
    //             />
    //           </Form.Item>
    //         </Col>
    //         <Col span={12}>
    //           <Form.Item label="最大长度 (Max Length)">
    //             <InputNumber
    //               style={{ width: "100%" }}
    //               min={0}
    //               value={attribute.maxLength}
    //               onChange={(v) =>
    //                 updateAttribute({ maxLength: v || undefined })
    //               }
    //             />
    //           </Form.Item>
    //         </Col>
    //       </Row>
    //       <Form.Item label="正则表达式 (Regex Pattern)">
    //         <Input
    //           prefix="/"
    //           placeholder="e.g. ^[a-z]+$"
    //           value={attribute.pattern}
    //           onChange={(e) => updateAttribute({ pattern: e.target.value })}
    //         />
    //       </Form.Item>
    //     </Form>,
    //     <Button
    //       size="small"
    //       type="link"
    //       onClick={() => handleTypeChange("enum")}
    //     >
    //       转为枚举 (Convert to Enum)
    //     </Button>
    //   );
    // }

    // 2. Number: Numeric Rules
    if (attribute.type === "number") {
      return renderCommonHelper(
        "数值规则 (Numeric Rules)",
        <Form layout="vertical" size="middle">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="最小值 (Min Value)">
                <InputNumber
                  style={{ width: "100%" }}
                  value={attribute.min}
                  onChange={(value) => updateAttribute({ min: value ?? undefined })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="最大值 (Max Value)">
                <InputNumber
                  style={{ width: "100%" }}
                  value={attribute.max}
                  onChange={(value) => updateAttribute({ max: value ?? undefined })}
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
                  onChange={(value) => updateAttribute({ step: value ?? undefined })}
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
                  onChange={(value) =>
                    updateAttribute({ precision: value ?? undefined })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>,
      );
    }

    // 3. Boolean: Display Config
    if (attribute.type === "boolean") {
      return renderCommonHelper(
        "布尔配置 (Boolean Configuration)",
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
      );
    }

    if (attribute.type === "string" || attribute.type === "date") {
      return renderCommonHelper(
        "类型配置 (Type Configuration)",
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="当前数据类型暂无额外配置"
        />,
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
          gridRef.current.api.setFocusedCell(lastIndex, "value");
        }
      }, 100);
    };

    const handleContextMenu = (params: CellContextMenuEvent<EnumOptionItem>) => {
      if (!(params.event instanceof MouseEvent)) {
        return;
      }

      params.event.preventDefault();
      setContextMenu({
        open: true,
        x: params.event.clientX,
        y: params.event.clientY,
        record: params.data ?? null,
      });
    };

    const contextMenuItems: MenuProps["items"] = [
      {
        key: "add",
        label: "新增行 (Add Row)",
        icon: <PlusOutlined />,
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
        <FloatingContextMenu
          open={contextMenu.open}
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onMenuClick={({ key, domEvent }) => {
            domEvent.stopPropagation();
            if (key === "add") {
              handleAddRow();
            }
            if (key === "delete" && contextMenu.record) {
              setEnumOptions(
                enumOptions.filter((item) => item.id !== contextMenu.record?.id),
              );
            }
            setContextMenu((prev) => ({ ...prev, open: false }));
          }}
          onClose={() => {
            setContextMenu((prev) => ({ ...prev, open: false }));
          }}
        />
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
