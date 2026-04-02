export type WorkbookImportCodeMode = 'EXCEL_MANUAL' | 'SYSTEM_RULE_AUTO';

export type WorkbookImportDuplicatePolicy =
  | 'OVERWRITE_EXISTING'
  | 'KEEP_EXISTING'
  | 'FAIL_ON_DUPLICATE';

export type WorkbookImportJobType = 'DRY_RUN' | 'IMPORT';

export type WorkbookImportExecutionMode = 'GLOBAL_TX' | 'STAGE_TX' | 'STAGING_ATOMIC';

export type WorkbookImportJobStatusValue =
  | 'QUEUED'
  | 'PARSING'
  | 'PRELOADING'
  | 'VALIDATING_CATEGORIES'
  | 'VALIDATING_ATTRIBUTES'
  | 'VALIDATING_ENUMS'
  | 'BUILDING_PREVIEW'
  | 'PREPARING'
  | 'IMPORTING_CATEGORIES'
  | 'IMPORTING_ATTRIBUTES'
  | 'IMPORTING_ENUM_OPTIONS'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'FAILED';

export type WorkbookImportStage =
  | 'PARSING'
  | 'PRELOADING'
  | 'VALIDATING_CATEGORIES'
  | 'VALIDATING_ATTRIBUTES'
  | 'VALIDATING_ENUMS'
  | 'BUILDING_PREVIEW'
  | 'PREPARING'
  | 'CATEGORIES'
  | 'ATTRIBUTES'
  | 'ENUM_OPTIONS'
  | 'FINALIZING';

export type WorkbookImportResolvedAction = 'CREATE' | 'UPDATE' | 'SKIP' | 'CONFLICT';

export type WorkbookImportIssueLevel = 'ERROR' | 'WARNING';

export interface WorkbookImportDryRunOptionsDto {
  codingOptions: {
    categoryCodeMode: WorkbookImportCodeMode;
    attributeCodeMode: WorkbookImportCodeMode;
    enumOptionCodeMode: WorkbookImportCodeMode;
  };
  duplicateOptions: {
    categoryDuplicatePolicy: WorkbookImportDuplicatePolicy;
    attributeDuplicatePolicy: WorkbookImportDuplicatePolicy;
    enumOptionDuplicatePolicy: WorkbookImportDuplicatePolicy;
  };
}

export interface WorkbookImportIssueDto {
  level: WorkbookImportIssueLevel;
  sheetName: string | null;
  rowNumber: number | null;
  columnName: string | null;
  errorCode: string | null;
  message: string;
  rawValue: string | null;
  expectedRule: string | null;
}

export interface WorkbookImportDryRunStartResponseDto {
  jobId: string;
  status: WorkbookImportJobStatusValue;
  currentStage: WorkbookImportStage;
  createdAt: string;
}

export interface WorkbookImportDryRunResponseDto {
  importSessionId: string;
  template: {
    recognized: boolean;
    templateVersion: string | null;
    sheetNames: string[];
  };
  summary: {
    categoryRowCount: number;
    attributeRowCount: number;
    enumRowCount: number;
    errorCount: number;
    warningCount: number;
    canImport: boolean;
  };
  changeSummary: {
    categories: WorkbookImportChangeCounterDto;
    attributes: WorkbookImportChangeCounterDto;
    enumOptions: WorkbookImportChangeCounterDto;
  };
  resolvedImportOptions: WorkbookImportDryRunOptionsDto;
  preview: {
    categories: WorkbookImportCategoryPreviewItemDto[];
    attributes: WorkbookImportAttributePreviewItemDto[];
    enumOptions: WorkbookImportEnumOptionPreviewItemDto[];
  };
  issues: WorkbookImportIssueDto[];
  createdAt: string;
}

export interface WorkbookImportChangeCounterDto {
  create: number;
  update: number;
  skip: number;
  conflict: number;
}

export interface WorkbookImportCategoryPreviewItemDto {
  sheetName: string;
  rowNumber: number;
  businessDomain: string | null;
  excelReferenceCode: string | null;
  categoryCode: string | null;
  categoryPath: string | null;
  resolvedFinalCode: string | null;
  resolvedFinalPath: string | null;
  codeMode: WorkbookImportCodeMode;
  categoryName: string;
  parentPath: string | null;
  parentCode: string | null;
  resolvedAction: WorkbookImportResolvedAction;
  issues: WorkbookImportIssueDto[];
}

export interface WorkbookImportAttributePreviewItemDto {
  sheetName: string;
  rowNumber: number;
  businessDomain: string | null;
  categoryCode: string | null;
  excelReferenceCode: string | null;
  attributeKey: string | null;
  resolvedFinalCode: string | null;
  codeMode: WorkbookImportCodeMode;
  attributeName: string;
  attributeField: string | null;
  dataType: string | null;
  resolvedAction: WorkbookImportResolvedAction;
  issues: WorkbookImportIssueDto[];
}

export interface WorkbookImportEnumOptionPreviewItemDto {
  sheetName: string;
  rowNumber: number;
  categoryCode: string | null;
  attributeKey: string | null;
  excelReferenceCode: string | null;
  optionCode: string | null;
  resolvedFinalCode: string | null;
  codeMode: WorkbookImportCodeMode;
  optionName: string;
  displayLabel: string | null;
  resolvedAction: WorkbookImportResolvedAction;
  issues: WorkbookImportIssueDto[];
}

export interface WorkbookImportStartRequestDto {
  importSessionId?: string;
  dryRunJobId?: string;
  operator?: string;
  atomic?: boolean;
  executionMode?: WorkbookImportExecutionMode;
  overwriteMode?: string | null;
}

export interface WorkbookImportStartResponseDto {
  jobId: string;
  importSessionId: string;
  status: WorkbookImportJobStatusValue;
  atomic: boolean;
  executionMode?: WorkbookImportExecutionMode | null;
  createdAt: string;
}

export interface WorkbookImportJobStatusDto {
  jobId: string;
  jobType: WorkbookImportJobType;
  importSessionId: string | null;
  status: WorkbookImportJobStatusValue;
  currentStage: WorkbookImportStage;
  executionMode: WorkbookImportExecutionMode | null;
  totalRows: number | null;
  processedRows: number | null;
  overallPercent: number;
  stagePercent: number;
  startedAt: string | null;
  updatedAt: string | null;
  currentEntityType: string | null;
  currentBusinessDomain: string | null;
  progress: {
    categories: WorkbookImportEntityProgressDto;
    attributes: WorkbookImportEntityProgressDto;
    enumOptions: WorkbookImportEntityProgressDto;
  };
  latestLogCursor: string | null;
  latestLogs: WorkbookImportLogEventDto[];
}

export interface WorkbookImportEntityProgressDto {
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface WorkbookImportLogEventDto {
  cursor: string | null;
  sequence: number | null;
  timestamp: string | null;
  level: string | null;
  stage: WorkbookImportStage | null;
  eventType: string | null;
  sheetName: string | null;
  rowNumber: number | null;
  entityType: string | null;
  entityKey: string | null;
  action: string | null;
  code: string | null;
  message: string;
  details: Record<string, unknown> | null;
}

export interface WorkbookImportLogPageDto {
  jobId: string;
  nextCursor: string | null;
  items: WorkbookImportLogEventDto[];
}