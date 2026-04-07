"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Flex,
  Pagination,
  Progress,
  Result,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleFilled,
  CloseOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  FileExcelOutlined,
  InfoCircleFilled,
  UploadOutlined,
  WarningFilled,
} from "@ant-design/icons";
import type {
  WorkbookImportDryRunResponseDto,
  WorkbookImportEntityProgressDto,
  WorkbookImportJobStatusDto,
  WorkbookImportLogEventDto,
  WorkbookImportResolvedAction,
} from "@/services/workbookImport";
import {
  CODE_MODE_OPTIONS,
  DUPLICATE_POLICY_OPTIONS,
  type WorkbookImportFormState,
  type WorkbookImportPreviewEntityFilter,
  type WorkbookImportPreviewRow,
} from "./workbookImportUi";

const { Text, Title } = Typography;

type ThemeToken = ReturnType<typeof theme.useToken>["token"];

interface ResizableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width?: number;
  minWidth?: number;
  onResize?: (width: number) => void;
}

const ResizableHeaderCell: React.FC<ResizableHeaderCellProps> = ({
  width,
  minWidth = 80,
  onResize,
  children,
  style,
  ...restProps
}) => {
  const startXRef = useRef(0);
  const startWidthRef = useRef(typeof width === "number" ? width : 0);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    startXRef.current = event.clientX;
    startWidthRef.current = typeof width === "number" ? width : 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(
        minWidth,
        startWidthRef.current + (moveEvent.clientX - startXRef.current),
      );
      onResize?.(nextWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <th {...restProps} style={{ ...style, width, position: "relative" }}>
      {children}
      {typeof width === "number" && onResize ? (
        <div
          className="workbook-import-resize-handle"
          onMouseDown={handleMouseDown}
        />
      ) : null}
    </th>
  );
};

export type RuntimeJobKind = "dryRun" | "import";

export interface RuntimeJobState {
  jobId: string | null;
  status: WorkbookImportJobStatusDto | null;
  logs: WorkbookImportLogEventDto[];
  lastLogCursor: string | null;
  sseConnected: boolean;
}

const ACTION_TAG_COLORS: Record<WorkbookImportResolvedAction, string> = {
  CREATE: "success",
  UPDATE: "processing",
  SKIP: "default",
  CONFLICT: "error",
};

const ENTITY_LABELS: Record<WorkbookImportPreviewRow["entityType"], string> = {
  CATEGORY: "分类",
  ATTRIBUTE: "属性",
  ENUM_OPTION: "枚举值",
};

export interface PreviewEntityIssueStat {
  errorRows: number;
  warningRows: number;
}

export type PreviewEntityIssueStats = Record<
  WorkbookImportPreviewEntityFilter,
  PreviewEntityIssueStat
>;

export const createEmptyPreviewEntityIssueStats = (): PreviewEntityIssueStats => ({
  CATEGORY: { errorRows: 0, warningRows: 0 },
  ATTRIBUTE: { errorRows: 0, warningRows: 0 },
  ENUM_OPTION: { errorRows: 0, warningRows: 0 },
});

const countIssueRows = (
  items:
    | WorkbookImportDryRunResponseDto["preview"]["categories"]
    | WorkbookImportDryRunResponseDto["preview"]["attributes"]
    | WorkbookImportDryRunResponseDto["preview"]["enumOptions"],
): PreviewEntityIssueStat => {
  return items.reduce<PreviewEntityIssueStat>(
    (summary, item) => {
      const hasError = item.issues.some((issue) => issue.level === "ERROR");
      const hasWarning = item.issues.some((issue) => issue.level === "WARNING");

      if (hasError) {
        summary.errorRows += 1;
      } else if (hasWarning) {
        summary.warningRows += 1;
      }

      return summary;
    },
    { errorRows: 0, warningRows: 0 },
  );
};

export const getPreviewEntityIssueStats = (
  dryRunResult: WorkbookImportDryRunResponseDto | null,
): PreviewEntityIssueStats => {
  if (!dryRunResult) {
    return createEmptyPreviewEntityIssueStats();
  }

  return {
    CATEGORY: countIssueRows(dryRunResult.preview.categories),
    ATTRIBUTE: countIssueRows(dryRunResult.preview.attributes),
    ENUM_OPTION: countIssueRows(dryRunResult.preview.enumOptions),
  };
};

const resolveEntityTypeKey = (
  value?: string | null,
): WorkbookImportPreviewRow["entityType"] | null => {
  if (!value) {
    return null;
  }

  switch (value.toUpperCase()) {
    case "CATEGORY":
    case "CATEGORIES":
    case "VALIDATING_CATEGORIES":
      return "CATEGORY";
    case "ATTRIBUTE":
    case "ATTRIBUTES":
    case "VALIDATING_ATTRIBUTES":
      return "ATTRIBUTE";
    case "ENUM_OPTION":
    case "ENUM_OPTIONS":
    case "VALIDATING_ENUMS":
      return "ENUM_OPTION";
    default:
      return null;
  }
};

const formatEntityLabel = (
  value?: string | null,
  fallback?: string | null,
): string => {
  const entityTypeKey =
    resolveEntityTypeKey(value) ?? resolveEntityTypeKey(fallback);

  if (entityTypeKey) {
    return ENTITY_LABELS[entityTypeKey];
  }

  return value || fallback || "—";
};

const resolveDryRunPreviewBusinessDomain = (
  dryRunResult: WorkbookImportDryRunResponseDto | null,
): string | null => {
  if (!dryRunResult) {
    return null;
  }

  const domains = [
    ...dryRunResult.preview.categories.map((item) => item.businessDomain),
    ...dryRunResult.preview.attributes.map((item) => item.businessDomain),
  ].filter((value): value is string => Boolean(value && value.trim()));

  const uniqueDomains = Array.from(new Set(domains));

  if (uniqueDomains.length === 1) {
    return uniqueDomains[0];
  }

  if (uniqueDomains.length > 1) {
    return "多业务域";
  }

  return null;
};

export const STAGE_LABELS: Record<string, string> = {
  PARSING: "解析工作簿",
  PRELOADING: "预加载现有数据",
  VALIDATING_CATEGORIES: "校验分类",
  VALIDATING_ATTRIBUTES: "校验属性",
  VALIDATING_ENUMS: "校验枚举值",
  BUILDING_PREVIEW: "构建预览",
  PREPARING: "准备阶段",
  CATEGORIES: "分类导入",
  ATTRIBUTES: "属性导入",
  ENUM_OPTIONS: "枚举值导入",
  FINALIZING: "收尾阶段",
};

export const STATUS_LABELS: Record<string, string> = {
  QUEUED: "已入队",
  PARSING: "解析中",
  PRELOADING: "预加载中",
  VALIDATING_CATEGORIES: "分类校验中",
  VALIDATING_ATTRIBUTES: "属性校验中",
  VALIDATING_ENUMS: "枚举值校验中",
  BUILDING_PREVIEW: "构建预览中",
  PREPARING: "准备中",
  IMPORTING_CATEGORIES: "正在导入分类",
  IMPORTING_ATTRIBUTES: "正在导入属性",
  IMPORTING_ENUM_OPTIONS: "正在导入枚举值",
  FINALIZING: "正在收尾",
  COMPLETED: "已完成",
  FAILED: "失败",
};

const levelIcon = (level: "ERROR" | "WARNING" | null, token: ThemeToken) => {
  if (level === "ERROR") {
    return <CloseCircleFilled style={{ color: token.colorError }} />;
  }
  if (level === "WARNING") {
    return <WarningFilled style={{ color: token.colorWarning }} />;
  }
  return <CheckCircleFilled style={{ color: token.colorSuccess }} />;
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
};

const isTerminalStatus = (status: string | null | undefined): boolean => {
  return status === "COMPLETED" || status === "FAILED";
};

export const createPreviewColumns = (
  token: ThemeToken,
): ColumnsType<WorkbookImportPreviewRow> => {
  return [
    {
      title: "行",
      dataIndex: "rowNumber",
      width: 84,
      align: "center",
      render: (_, record) => {
        if (!record.rowNumber) {
          return <Text type="secondary">—</Text>;
        }

        return (
          <Tooltip
            title={
              record.issueMessages.length
                ? record.issueMessages.join("\n")
                : "该行无问题"
            }
          >
            <Space size={4}>
              {levelIcon(record.issueLevel, token)}
              <Text>{record.rowNumber}</Text>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: "实体",
      dataIndex: "entityType",
      width: 88,
      render: (value: WorkbookImportPreviewRow["entityType"]) => (
        <Tag style={{ marginInlineEnd: 0 }}>{ENTITY_LABELS[value]}</Tag>
      ),
    },
    {
      title: "名称",
      dataIndex: "name",
      width: 220,
      ellipsis: true,
      render: (value: string, record) => (
        <Flex vertical gap={2}>
          <Text strong>{value}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.businessDomain || record.sheetName || "—"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Excel 识别编码",
      dataIndex: "excelReferenceCode",
      width: 170,
      ellipsis: true,
      render: (value: string | null) =>
        value ? <Text code>{value}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Excel 原始编码",
      dataIndex: "sourceCode",
      width: 170,
      ellipsis: true,
      render: (value: string | null) =>
        value ? <Text code>{value}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "系统内编码（预览）",
      dataIndex: "finalCode",
      width: 180,
      ellipsis: true,
      render: (value: string | null) =>
        value ? <Text code>{value}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "关联父级编码",
      dataIndex: "relation",
      width: 180,
      ellipsis: true,
      render: (value: string | null, record) => (
        <Flex vertical gap={2}>
          <Text type={value ? undefined : "secondary"}>{value || "—"}</Text>
          {record.extra ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.extra}
            </Text>
          ) : null}
        </Flex>
      ),
    },
    {
      title: "动作",
      dataIndex: "action",
      width: 110,
      align: "center",
      render: (value: WorkbookImportResolvedAction | null) => {
        if (!value) {
          return <Text type="secondary">—</Text>;
        }
        return <Tag color={ACTION_TAG_COLORS[value]}>{value}</Tag>;
      },
    },
    {
      title: "问题",
      dataIndex: "issueCount",
      width: 90,
      align: "center",
      render: (value: number, record) => {
        if (!value) {
          return <Tag color="success">0</Tag>;
        }

        return (
          <Tooltip title={record.issueMessages.join("\n")}>
            <Tag color={record.issueLevel === "ERROR" ? "error" : "warning"}>
              {value}
            </Tag>
          </Tooltip>
        );
      },
    },
  ];
};

export const createLogColumns = (): ColumnsType<WorkbookImportLogEventDto> => {
  return [
    {
      title: "时间",
      dataIndex: "timestamp",
      width: 160,
      render: (value: string | null) => (
        <Text style={{ fontSize: 12 }}>{formatDateTime(value)}</Text>
      ),
    },
    {
      title: "级别",
      dataIndex: "level",
      width: 82,
      align: "center",
      render: (value: string | null) => {
        if (!value) {
          return <Text type="secondary">—</Text>;
        }
        const color =
          value === "ERROR"
            ? "error"
            : value === "WARN" || value === "WARNING"
              ? "warning"
              : "default";
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: "阶段",
      dataIndex: "stage",
      width: 140,
      render: (value: string | null) => (
        <Text>{value ? STAGE_LABELS[value] || value : "—"}</Text>
      ),
    },
    {
      title: "定位",
      dataIndex: "rowNumber",
      width: 130,
      render: (_: number | null, record) => {
        if (!record.sheetName && !record.rowNumber) {
          return <Text type="secondary">—</Text>;
        }

        return (
          <Text style={{ fontSize: 12 }}>
            {[
              record.sheetName,
              record.rowNumber ? `第 ${record.rowNumber} 行` : null,
            ]
              .filter(Boolean)
              .join(" / ")}
          </Text>
        );
      },
    },
    {
      title: "消息",
      dataIndex: "message",
      width: 420,
      ellipsis: true,
      render: (value: string, record) => {
        const detailText =
          record.details && Object.keys(record.details).length
            ? JSON.stringify(record.details)
            : "";
        const content = detailText ? `${value}\n${detailText}` : value;
        return (
          <Tooltip title={content}>
            <Flex vertical gap={2}>
              <Text>{value}</Text>
              {record.code ? (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.code}
                </Text>
              ) : null}
            </Flex>
          </Tooltip>
        );
      },
    },
  ];
};

interface WorkbookImportUploadStepProps {
  token: ThemeToken;
  uploadedFile: File | null;
  onFileUpload: (file: File) => boolean;
  onRemoveFile: () => void;
  defaultBusinessDomain?: string;
}

export const WorkbookImportUploadStep: React.FC<
  WorkbookImportUploadStepProps
> = ({
  token,
  uploadedFile,
  onFileUpload,
  onRemoveFile,
  defaultBusinessDomain,
}) => {
  return (
    <Flex vertical gap={16} style={{ height: "100%", minHeight: 0 }}>
      {!uploadedFile ? (
        <Upload.Dragger
          accept=".xlsx,.xls"
          beforeUpload={onFileUpload}
          showUploadList={false}
          style={{ padding: "32px 0" }}
        >
          <Flex vertical align="center" gap={8}>
            <UploadOutlined
              style={{ fontSize: 36, color: token.colorPrimary }}
            />
            <Text strong>点击或拖拽工作簿到此处上传</Text>
          </Flex>
        </Upload.Dragger>
      ) : (
        <Flex
          align="center"
          justify="space-between"
          style={{
            padding: "12px 16px",
            background: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Flex align="center" gap={10}>
            <FileExcelOutlined style={{ fontSize: 20, color: "#217346" }} />
            <Flex vertical gap={0}>
              <Text strong style={{ fontSize: 13 }}>
                {uploadedFile.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </Text>
            </Flex>
          </Flex>
          <Button
            type="text"
            size="middle"
            danger
            icon={<DeleteOutlined />}
            onClick={onRemoveFile}
          >
            移除
          </Button>
        </Flex>
      )}

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleFilled />}
        message="工作簿导入说明"
        description="页面主链路会先创建异步 dry-run 任务，再通过 SSE 与日志接口跟踪进度；自动编码模式下，预检展示的最终编码仅用于预览，不应被前端缓存为最终主键。"
        style={{ borderRadius: token.borderRadiusLG }}
      />

      {defaultBusinessDomain ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningFilled />}
          message={`当前分类树业务域：${defaultBusinessDomain}`}
          description="工作簿实际导入仍以 Excel 中的数据为准，请确认模板中的业务域与当前操作上下文一致。"
          style={{ borderRadius: token.borderRadiusLG }}
        />
      ) : null}

      <Flex
        vertical
        align="center"
        justify="center"
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: token.borderRadiusLG,
          border: `1px dashed ${token.colorBorder}`,
          background: token.colorBgContainer,
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            uploadedFile
              ? "文件已选择，继续下一步配置导入策略"
              : "请先上传工作簿"
          }
        />
      </Flex>
    </Flex>
  );
};

interface WorkbookImportConfigStepProps {
  token: ThemeToken;
  formState: WorkbookImportFormState;
  onUpdateCodingOption: (
    field: "categoryCodeMode" | "attributeCodeMode" | "enumOptionCodeMode",
    value: string,
  ) => void;
  onUpdateDuplicateOption: (
    field:
      | "categoryDuplicatePolicy"
      | "attributeDuplicatePolicy"
      | "enumOptionDuplicatePolicy",
    value: string,
  ) => void;
  onAtomicChange: (value: boolean) => void;
}

export const WorkbookImportConfigStep: React.FC<
  WorkbookImportConfigStepProps
> = ({
  token,
  formState,
  onUpdateCodingOption,
  onUpdateDuplicateOption,
  onAtomicChange,
}) => {
  return (
    <Flex vertical gap={16}>
      <Title level={5} style={{ margin: 0 }}>
        编码模式
      </Title>
      <Flex vertical gap={12}>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>
            分类编码
          </Text>
          <Select
            value={formState.options.codingOptions.categoryCodeMode}
            options={CODE_MODE_OPTIONS}
            onChange={(value) =>
              onUpdateCodingOption("categoryCodeMode", value)
            }
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>
            属性编码
          </Text>
          <Select
            value={formState.options.codingOptions.attributeCodeMode}
            options={CODE_MODE_OPTIONS}
            onChange={(value) =>
              onUpdateCodingOption("attributeCodeMode", value)
            }
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>
            枚举值编码
          </Text>
          <Select
            value={formState.options.codingOptions.enumOptionCodeMode}
            options={CODE_MODE_OPTIONS}
            onChange={(value) =>
              onUpdateCodingOption("enumOptionCodeMode", value)
            }
            style={{ width: 220 }}
          />
        </Flex>
      </Flex>

      <Title level={5} style={{ margin: 0 }}>
        重复数据处理
      </Title>
      <Flex vertical gap={12}>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>
            分类重复
          </Text>
          <Select
            value={formState.options.duplicateOptions.categoryDuplicatePolicy}
            options={DUPLICATE_POLICY_OPTIONS}
            onChange={(value) =>
              onUpdateDuplicateOption("categoryDuplicatePolicy", value)
            }
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>
            属性重复
          </Text>
          <Select
            value={formState.options.duplicateOptions.attributeDuplicatePolicy}
            options={DUPLICATE_POLICY_OPTIONS}
            onChange={(value) =>
              onUpdateDuplicateOption("attributeDuplicatePolicy", value)
            }
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>
            枚举值重复
          </Text>
          <Select
            value={formState.options.duplicateOptions.enumOptionDuplicatePolicy}
            options={DUPLICATE_POLICY_OPTIONS}
            onChange={(value) =>
              onUpdateDuplicateOption("enumOptionDuplicatePolicy", value)
            }
            style={{ width: 220 }}
          />
        </Flex>
      </Flex>

      <Flex
        align="center"
        justify="space-between"
        style={{
          padding: "12px 16px",
          background: token.colorFillAlter,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 13 }}>
            原子执行
          </Text>
        </Flex>
        <Switch checked={formState.atomic} onChange={onAtomicChange} />
      </Flex>

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleFilled />}
        message="提交格式要求"
        description="dry-run 会以 multipart/form-data 提交，其中 options 作为单独的 JSON part 上传；正式导入优先基于 dryRunJobId 启动，页面恢复场景才退化为 importSessionId。"
        style={{ borderRadius: token.borderRadiusLG }}
      />
    </Flex>
  );
};

interface WorkbookImportRuntimeOverviewProps {
  token: ThemeToken;
  kind: RuntimeJobKind;
  status: WorkbookImportJobStatusDto;
  runtimeState: RuntimeJobState;
  taskDrawerOpen: boolean;
  taskDrawerKind: RuntimeJobKind;
  onToggleTaskDrawer: (kind: RuntimeJobKind) => void;
}

export const WorkbookImportRuntimeOverview: React.FC<
  WorkbookImportRuntimeOverviewProps
> = ({
  token,
  kind,
  status,
  runtimeState,
  taskDrawerOpen,
  taskDrawerKind,
  onToggleTaskDrawer,
}) => {
  const finished = isTerminalStatus(status.status);
  const progressStatus = finished
    ? status.status === "COMPLETED"
      ? "success"
      : "exception"
    : "active";
  const currentEntityLabel = formatEntityLabel(
    status.currentEntityType,
    status.currentStage,
  );

  return (
    <Flex
      vertical
      gap={14}
      style={{
        padding: "16px 18px",
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      }}
    >
      <Flex align="center" justify="space-between" gap={12} wrap="wrap">
        <Flex vertical gap={4}>
          <Text strong style={{ fontSize: 14 }}>
            {STATUS_LABELS[status.status] || status.status}
            {" · "}
            {STAGE_LABELS[status.currentStage] || status.currentStage}
          </Text>
        </Flex>
        <Button size="middle" onClick={() => onToggleTaskDrawer(kind)}>
          {taskDrawerOpen && taskDrawerKind === kind
            ? "收起任务详情"
            : "查看任务详情"}
        </Button>
      </Flex>

      <Progress percent={status.overallPercent ?? 0} status={progressStatus} />

      <Flex wrap="wrap" gap={12}>
        <Tag color="blue">阶段进度 {status.stagePercent ?? 0}%</Tag>
        <Tag color="default">
          已处理 {status.processedRows ?? 0} / {status.totalRows ?? 0}
        </Tag>
        <Tag color="default">当前实体 {currentEntityLabel}</Tag>
        <Tag color="default">业务域 {status.currentBusinessDomain || "—"}</Tag>
      </Flex>
    </Flex>
  );
};

interface WorkbookImportDryRunResultPanelProps {
  token: ThemeToken;
  dryRunResult: WorkbookImportDryRunResponseDto;
  dryRunStatus: WorkbookImportJobStatusDto | null;
  taskDrawerOpen: boolean;
  taskDrawerKind: RuntimeJobKind;
  previewEntityType: WorkbookImportPreviewEntityFilter;
  previewRows: WorkbookImportPreviewRow[];
  previewColumns: ColumnsType<WorkbookImportPreviewRow>;
  previewTableScrollY: number;
  previewPage: number;
  previewTotal: number;
  previewEntityIssueStats: PreviewEntityIssueStats;
  onPreviewEntityTypeChange: (value: WorkbookImportPreviewEntityFilter) => void;
  onPreviewPageChange: (page: number) => void;
  onRunDryRun: () => void;
  onToggleTaskDrawer: (kind: RuntimeJobKind) => void;
  dryRunResultLayoutRef: React.RefObject<HTMLDivElement | null>;
  dryRunSummaryRef: React.RefObject<HTMLDivElement | null>;
  previewPanelRef: React.RefObject<HTMLDivElement | null>;
  previewToolbarRef: React.RefObject<HTMLDivElement | null>;
  previewPagerRef: React.RefObject<HTMLDivElement | null>;
}

export const WorkbookImportDryRunResultPanel: React.FC<
  WorkbookImportDryRunResultPanelProps
> = ({
  token,
  dryRunResult,
  dryRunStatus,
  taskDrawerOpen,
  taskDrawerKind,
  previewEntityType,
  previewRows,
  previewColumns,
  previewTableScrollY,
  previewPage,
  previewTotal,
  previewEntityIssueStats,
  onPreviewEntityTypeChange,
  onPreviewPageChange,
  onRunDryRun,
  onToggleTaskDrawer,
  dryRunResultLayoutRef,
  dryRunSummaryRef,
  previewPanelRef,
  previewToolbarRef,
  previewPagerRef,
}) => {
  const summaryPanelStyle = {
    padding: "14px 16px",
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  } as const;
  const previewCategoryCount = dryRunResult.summary.categoryRowCount;
  const previewAttributeCount = dryRunResult.summary.attributeRowCount;
  const previewEnumCount = dryRunResult.summary.enumRowCount;

  const renderEntityOptionLabel = (
    entityType: WorkbookImportPreviewEntityFilter,
    label: string,
    count: number,
  ) => {
    const issueStat = previewEntityIssueStats[entityType];
    const hasErrors = issueStat.errorRows > 0;
    const hasWarnings = issueStat.warningRows > 0;
    const issueText = hasErrors
      ? `错误 ${issueStat.errorRows}`
      : hasWarnings
        ? `警告 ${issueStat.warningRows}`
        : null;
    const issueColor = hasErrors ? token.colorError : token.colorWarning;
    const issueBackground = hasErrors ? token.colorErrorBg : token.colorWarningBg;
    const issueBorder = hasErrors ? token.colorErrorBorder : token.colorWarningBorder;

    return (
      <Flex align="center" justify="space-between" gap={12} style={{ width: "100%" }}>
        <Text>{`${label} (${count})`}</Text>
        {issueText ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "1px 8px",
              borderRadius: 999,
              border: `1px solid ${issueBorder}`,
              background: issueBackground,
              color: issueColor,
              fontSize: 12,
              lineHeight: "18px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: issueColor,
                flexShrink: 0,
              }}
            />
            {issueText}
          </span>
        ) : null}
      </Flex>
    );
  };

  return (
    <Flex
      ref={dryRunResultLayoutRef}
      vertical
      gap={16}
      style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
    >
      <div
        ref={dryRunSummaryRef}
        style={{
          ...summaryPanelStyle,
          background: dryRunResult.summary.canImport
            ? dryRunResult.summary.warningCount > 0
              ? token.colorWarningBg
              : token.colorSuccessBg
            : token.colorErrorBg,
          borderColor: dryRunResult.summary.canImport
            ? dryRunResult.summary.warningCount > 0
              ? token.colorWarningBorder
              : token.colorSuccessBorder
            : token.colorErrorBorder,
        }}
      >
        <Flex align="flex-start" justify="space-between" gap={16} wrap="wrap">
          <Flex vertical gap={8} style={{ flex: 1, minWidth: 320 }}>
            <Flex align="center" gap={10}>
              {dryRunResult.summary.canImport ? (
                <CheckCircleFilled
                  style={{
                    color:
                      dryRunResult.summary.warningCount > 0
                        ? token.colorWarning
                        : token.colorSuccess,
                    fontSize: 18,
                  }}
                />
              ) : (
                <CloseCircleFilled
                  style={{ color: token.colorError, fontSize: 18 }}
                />
              )}
              <Text strong style={{ fontSize: 15 }}>
                {dryRunResult.summary.canImport
                  ? "预检结果可用"
                  : "预检结果存在阻塞问题"}
              </Text>
            </Flex>
            <Flex wrap="wrap" gap={8}>
              <Tag color="error">错误 {dryRunResult.summary.errorCount}</Tag>
              <Tag color="warning">
                警告 {dryRunResult.summary.warningCount}
              </Tag>
              <Tag color="blue">
                分类 {dryRunResult.summary.categoryRowCount}
              </Tag>
              <Tag color="cyan">
                属性 {dryRunResult.summary.attributeRowCount}
              </Tag>
              <Tag color="geekblue">
                枚举值 {dryRunResult.summary.enumRowCount}
              </Tag>
              <Tag color={dryRunResult.summary.canImport ? "success" : "error"}>
                {dryRunResult.summary.canImport ? "允许导入" : "禁止导入"}
              </Tag>
            </Flex>
          </Flex>

          <Flex
            vertical
            align="flex-end"
            gap={8}
            style={{ marginLeft: "auto" }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              会话 ID：{dryRunResult.importSessionId}
            </Text>
            <Space wrap>
              <Button
                size="middle"
                onClick={() => onToggleTaskDrawer("dryRun")}
                disabled={!dryRunStatus}
              >
                {taskDrawerOpen && taskDrawerKind === "dryRun"
                  ? "收起任务详情"
                  : "查看任务详情"}
              </Button>
              <Button size="middle" onClick={onRunDryRun}>
                重新预检
              </Button>
            </Space>
          </Flex>
        </Flex>
      </div>

      <div
        ref={previewPanelRef}
        style={{
          ...summaryPanelStyle,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Flex
          ref={previewToolbarRef}
          align="center"
          justify="space-between"
          gap={12}
          wrap="wrap"
          style={{ marginBottom: 12 }}
        >
          <Text strong style={{ fontSize: 14 }}>
            预览明细
          </Text>
          <Select<WorkbookImportPreviewEntityFilter>
            size="middle"
            value={previewEntityType}
            onChange={onPreviewEntityTypeChange}
            style={{ width: 260 }}
            options={[
              {
                label: renderEntityOptionLabel(
                  "CATEGORY",
                  "分类",
                  previewCategoryCount,
                ),
                value: "CATEGORY",
              },
              {
                label: renderEntityOptionLabel(
                  "ATTRIBUTE",
                  "属性",
                  previewAttributeCount,
                ),
                value: "ATTRIBUTE",
              },
              {
                label: renderEntityOptionLabel(
                  "ENUM_OPTION",
                  "枚举值",
                  previewEnumCount,
                ),
                value: "ENUM_OPTION",
              },
            ]}
          />
        </Flex>
        <Table<WorkbookImportPreviewRow>
          dataSource={previewRows}
          columns={previewColumns}
          rowKey="key"
          className="workbook-import-preview-table"
          size="small"
          pagination={false}
          scroll={{ y: previewTableScrollY }}
          tableLayout="fixed"
          style={{
            borderRadius: token.borderRadiusLG,
            overflow: "hidden",
            flex: 1,
            minHeight: 0,
          }}
          locale={{ emptyText: "当前会话没有可展示的预览数据" }}
        />
        <div
          ref={previewPagerRef}
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingTop: 12,
            marginTop: 0,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            flexShrink: 0,
          }}
        >
          <Pagination
            current={previewPage}
            pageSize={100}
            total={previewTotal}
            size="default"
            showSizeChanger={false}
            showTotal={(total) => `共 ${total} 条`}
            onChange={onPreviewPageChange}
          />
        </div>
      </div>
    </Flex>
  );
};

interface WorkbookImportExecutionResultProps {
  token: ThemeToken;
  importStatus: WorkbookImportJobStatusDto | null;
  executionFinished: boolean;
  aggregateProgress: {
    total: number;
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

export const WorkbookImportExecutionResult: React.FC<
  WorkbookImportExecutionResultProps
> = ({ token, importStatus, executionFinished, aggregateProgress }) => {
  if (!importStatus || !executionFinished) {
    return null;
  }

  const resultStatus =
    importStatus.status === "FAILED"
      ? "error"
      : aggregateProgress.failed > 0
        ? "warning"
        : "success";

  return (
    <Result
      status={resultStatus}
      title={
        importStatus.status === "FAILED"
          ? "导入失败"
          : aggregateProgress.failed > 0
            ? "导入完成（部分失败）"
            : "导入完成"
      }
      subTitle={
        <Flex vertical align="center" gap={4}>
          <Text>
            总计 <Text strong>{aggregateProgress.total}</Text> 条， 已处理{" "}
            <Text strong>{aggregateProgress.processed}</Text> 条， 创建{" "}
            <Text strong style={{ color: token.colorSuccess }}>
              {aggregateProgress.created}
            </Text>{" "}
            条， 更新 <Text strong>{aggregateProgress.updated}</Text> 条， 跳过{" "}
            <Text strong>{aggregateProgress.skipped}</Text> 条， 失败{" "}
            <Text strong style={{ color: token.colorError }}>
              {aggregateProgress.failed}
            </Text>{" "}
            条
          </Text>
        </Flex>
      }
      style={{ padding: "8px 0 0" }}
    />
  );
};

interface WorkbookImportTaskSidePanelProps {
  token: ThemeToken;
  currentStep: number;
  taskDrawerOpen: boolean;
  taskDrawerKind: RuntimeJobKind;
  taskPanelWidth: number;
  dryRunRuntime: RuntimeJobState;
  importRuntime: RuntimeJobState;
  dryRunResult: WorkbookImportDryRunResponseDto | null;
  logColumns: ColumnsType<WorkbookImportLogEventDto>;
  onClose: () => void;
}

const WorkbookImportProgressCard: React.FC<{
  token: ThemeToken;
  title: string;
  progress?: WorkbookImportEntityProgressDto;
  style?: React.CSSProperties;
}> = ({ token, title, progress, style }) => {
  const item = progress ?? {
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  return (
    <Flex
      vertical
      gap={10}
      style={{
        padding: "12px 14px",
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        minWidth: 0,
        ...style,
      }}
    >
      <Text strong>{title}</Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "6px 12px",
        }}
      >
        <Text style={{ fontSize: 12 }}>总数 {item.total}</Text>
        <Text style={{ fontSize: 12 }}>已处理 {item.processed}</Text>
        <Text style={{ fontSize: 12 }}>创建 {item.created}</Text>
        <Text style={{ fontSize: 12 }}>更新 {item.updated}</Text>
        <Text style={{ fontSize: 12 }}>跳过 {item.skipped}</Text>
        <Text
          style={{
            fontSize: 12,
            color: item.failed > 0 ? token.colorError : token.colorText,
          }}
        >{`失败 ${item.failed}`}</Text>
      </div>
    </Flex>
  );
};

export const WorkbookImportTaskSidePanel: React.FC<
  WorkbookImportTaskSidePanelProps
> = ({
  token,
  currentStep,
  taskDrawerOpen,
  taskDrawerKind,
  taskPanelWidth,
  dryRunRuntime,
  importRuntime,
  dryRunResult,
  logColumns,
  onClose,
}) => {
  const [logTableScrollY, setLogTableScrollY] = useState(260);
  const [logColumnWidths, setLogColumnWidths] = useState<
    Record<string, number>
  >(() => ({
    timestamp: 160,
    level: 82,
    stage: 140,
    rowNumber: 130,
    message: 420,
  }));
  const logSectionRef = useRef<HTMLDivElement | null>(null);
  const logTitleRef = useRef<HTMLDivElement | null>(null);

  const runtimeState =
    taskDrawerKind === "dryRun" ? dryRunRuntime : importRuntime;
  const status = runtimeState.status;
  const displayEntityLabel = formatEntityLabel(
    status?.currentEntityType,
    taskDrawerKind === "dryRun"
      ? dryRunResult?.previewEntityType
      : status?.currentStage,
  );
  const displayBusinessDomain =
    status?.currentBusinessDomain ||
    (taskDrawerKind === "dryRun"
      ? resolveDryRunPreviewBusinessDomain(dryRunResult)
      : null) ||
    "—";

  const handleLogColumnResize = useCallback(
    (columnKey: string, width: number) => {
      setLogColumnWidths((prev) => {
        if (prev[columnKey] === width) {
          return prev;
        }
        return { ...prev, [columnKey]: width };
      });
    },
    [],
  );

  const resizableLogColumns = useMemo<
    ColumnsType<WorkbookImportLogEventDto>
  >(() => {
    return logColumns.map((column, index) => {
      const columnDataIndex =
        "dataIndex" in column
          ? Array.isArray(column.dataIndex)
            ? column.dataIndex.join(".")
            : column.dataIndex
          : undefined;
      const columnKey = String(column.key ?? columnDataIndex ?? index);
      const width =
        logColumnWidths[columnKey] ??
        (typeof column.width === "number" ? column.width : undefined);
      const minWidth =
        columnKey === "message" ? 260 : columnKey === "timestamp" ? 140 : 90;

      return {
        ...column,
        width,
        onHeaderCell: () => ({
          width,
          minWidth,
          onResize: (nextWidth: number) =>
            handleLogColumnResize(columnKey, nextWidth),
        }),
      };
    });
  }, [handleLogColumnResize, logColumnWidths, logColumns]);

  const logTableScrollX = useMemo(() => {
    return resizableLogColumns.reduce((total, column) => {
      return total + (typeof column.width === "number" ? column.width : 160);
    }, 0);
  }, [resizableLogColumns]);

  useEffect(() => {
    if (currentStep < 2 || !taskDrawerOpen || !status) {
      return undefined;
    }

    const computeLogTableHeight = () => {
      const section = logSectionRef.current;
      const title = logTitleRef.current;
      if (!section || !title) {
        return;
      }

      const titleStyle = window.getComputedStyle(title);
      const titleMarginBottom =
        Number.parseFloat(titleStyle.marginBottom || "0") || 0;
      const header = section.querySelector(
        ".workbook-import-log-table .ant-table-header",
      ) as HTMLElement | null;
      const headerHeight = header?.offsetHeight ?? 55;
      const sectionStyle = window.getComputedStyle(section);
      const sectionPaddingTop =
        Number.parseFloat(sectionStyle.paddingTop || "0") || 0;
      const sectionPaddingBottom =
        Number.parseFloat(sectionStyle.paddingBottom || "0") || 0;
      const nextHeight =
        section.clientHeight -
        sectionPaddingTop -
        sectionPaddingBottom -
        title.offsetHeight -
        titleMarginBottom -
        headerHeight;

      setLogTableScrollY((prev) => {
        const normalized = Math.max(180, nextHeight);
        return Math.abs(prev - normalized) <= 1 ? prev : normalized;
      });
    };

    const frameId = window.requestAnimationFrame(computeLogTableHeight);
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(computeLogTableHeight);
    });

    if (logSectionRef.current) {
      resizeObserver.observe(logSectionRef.current);
    }
    if (logTitleRef.current) {
      resizeObserver.observe(logTitleRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [currentStep, runtimeState.logs.length, status, taskDrawerOpen]);

  if (currentStep < 2) {
    return null;
  }

  const content = !status ? (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="当前没有可展示的任务详情"
    />
  ) : (
    (() => {
      const finished = isTerminalStatus(status.status);
      const progressStatus = finished
        ? status.status === "COMPLETED"
          ? "success"
          : "exception"
        : "active";

      return (
        <Flex vertical gap={16} style={{ height: "100%", minHeight: 0 }}>
          <Descriptions
            size="small"
            bordered
            column={2}
            style={{ borderRadius: token.borderRadiusLG, overflow: "hidden" }}
          >
            <Descriptions.Item label="任务类型">
              {taskDrawerKind === "dryRun" ? "预检任务" : "导入任务"}
            </Descriptions.Item>
            <Descriptions.Item label="任务状态">
              {STATUS_LABELS[status.status] || status.status}
            </Descriptions.Item>
            <Descriptions.Item label="当前阶段">
              {STAGE_LABELS[status.currentStage] || status.currentStage}
            </Descriptions.Item>
            <Descriptions.Item label="执行模式">
              {status.executionMode || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="整体进度">
              {status.overallPercent ?? 0}%
            </Descriptions.Item>
            <Descriptions.Item label="阶段进度">
              {status.stagePercent ?? 0}%
            </Descriptions.Item>
            <Descriptions.Item label="总行数">
              {status.totalRows ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="已处理行数">
              {status.processedRows ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="会话 ID">
              {status.importSessionId || dryRunResult?.importSessionId || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="最新日志游标">
              {status.latestLogCursor || runtimeState.lastLogCursor || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="当前实体">
              {displayEntityLabel}
            </Descriptions.Item>
            <Descriptions.Item label="当前业务域">
              {displayBusinessDomain}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>
              {formatDateTime(status.updatedAt)}
            </Descriptions.Item>
          </Descriptions>

          <Progress
            percent={status.overallPercent ?? 0}
            status={progressStatus}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <WorkbookImportProgressCard
              token={token}
              title="分类进度"
              progress={status.progress.categories}
            />
            <WorkbookImportProgressCard
              token={token}
              title="属性进度"
              progress={status.progress.attributes}
            />
            <WorkbookImportProgressCard
              token={token}
              title="枚举值进度"
              progress={status.progress.enumOptions}
            />
          </div>

          <div
            ref={logSectionRef}
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div ref={logTitleRef} style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>
                任务日志
              </Text>
            </div>
            <Table<WorkbookImportLogEventDto>
              dataSource={runtimeState.logs}
              columns={resizableLogColumns}
              rowKey={(record) =>
                record.cursor ??
                String(
                  record.sequence ??
                    `${record.timestamp ?? ""}-${record.message}`,
                )
              }
              className="workbook-import-log-table"
              components={{ header: { cell: ResizableHeaderCell } }}
              size="small"
              pagination={false}
              scroll={{ y: logTableScrollY, x: logTableScrollX }}
              tableLayout="fixed"
              style={{
                borderRadius: token.borderRadiusLG,
                overflow: "hidden",
                flex: 1,
                minHeight: 0,
              }}
              locale={{ emptyText: "当前还没有任务日志" }}
            />
          </div>
        </Flex>
      );
    })()
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: taskDrawerOpen ? "auto" : "none",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          opacity: taskDrawerOpen ? 1 : 0,
          transition: "opacity 0.18s ease",
        }}
      />
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: taskPanelWidth,
          borderLeft: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          boxShadow: `-12px 0 24px ${token.colorFillSecondary}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 1,
          transform: taskDrawerOpen
            ? "translateX(0)"
            : `translateX(${taskPanelWidth}px)`,
          opacity: taskDrawerOpen ? 1 : 0,
          transition: "transform 0.18s ease, opacity 0.18s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgElevated,
          }}
        >
          <Flex vertical gap={2}>
            <Text strong>
              {taskDrawerKind === "dryRun" ? "预检任务详情" : "导入任务详情"}
            </Text>
          </Flex>
          <Button
            size="middle"
            type="text"
            aria-label="关闭任务详情"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            padding: 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};
