import type {
  WorkbookImportCodeMode,
  WorkbookImportDryRunOptionsDto,
  WorkbookImportDryRunResponseDto,
  WorkbookImportDuplicatePolicy,
  WorkbookImportIssueDto,
  WorkbookImportIssueLevel,
  WorkbookImportResolvedAction,
} from '@/models/workbookImport';

export type ImportStep = 0 | 1 | 2 | 3;
export type StepStatus = 'wait' | 'process' | 'finish' | 'error';

export const IMPORT_STEPS = [
  { title: '上传工作簿' },
  { title: '导入配置' },
  { title: '预检验证' },
  { title: '执行导入' },
] as const;

export interface WorkbookImportFormState {
  operator: string;
  atomic: boolean;
  options: WorkbookImportDryRunOptionsDto;
}

export const DEFAULT_WORKBOOK_IMPORT_FORM: WorkbookImportFormState = {
  operator: 'admin',
  atomic: true,
  options: {
    codingOptions: {
      categoryCodeMode: 'EXCEL_MANUAL',
      attributeCodeMode: 'EXCEL_MANUAL',
      enumOptionCodeMode: 'EXCEL_MANUAL',
    },
    duplicateOptions: {
      categoryDuplicatePolicy: 'FAIL_ON_DUPLICATE',
      attributeDuplicatePolicy: 'FAIL_ON_DUPLICATE',
      enumOptionDuplicatePolicy: 'FAIL_ON_DUPLICATE',
    },
  },
};

export const CODE_MODE_OPTIONS: Array<{ label: string; value: WorkbookImportCodeMode }> = [
  { label: 'Excel 手动编码', value: 'EXCEL_MANUAL' },
  { label: '系统规则自动编码', value: 'SYSTEM_RULE_AUTO' },
];

export const DUPLICATE_POLICY_OPTIONS: Array<{ label: string; value: WorkbookImportDuplicatePolicy }> = [
  { label: '发现重复直接失败', value: 'FAIL_ON_DUPLICATE' },
  { label: '保留系统现有数据', value: 'KEEP_EXISTING' },
  { label: '覆盖系统现有数据', value: 'OVERWRITE_EXISTING' },
];

export interface WorkbookImportPreviewRow {
  key: string;
  entityType: 'CATEGORY' | 'ATTRIBUTE' | 'ENUM_OPTION';
  sheetName: string | null;
  rowNumber: number | null;
  businessDomain: string | null;
  name: string;
  excelReferenceCode: string | null;
  sourceCode: string | null;
  finalCode: string | null;
  relation: string | null;
  extra: string | null;
  action: WorkbookImportResolvedAction | null;
  issueLevel: WorkbookImportIssueLevel | null;
  issueCount: number;
  issueMessages: string[];
}

export type WorkbookImportPreviewEntityFilter = 'CATEGORY' | 'ATTRIBUTE' | 'ENUM_OPTION';

const resolveIssueLevel = (issues: WorkbookImportIssueDto[]): WorkbookImportIssueLevel | null => {
  if (issues.some((issue) => issue.level === 'ERROR')) {
    return 'ERROR';
  }
  if (issues.some((issue) => issue.level === 'WARNING')) {
    return 'WARNING';
  }
  return null;
};

const collectIssueMessages = (issues: WorkbookImportIssueDto[]): string[] => {
  return issues.map((issue) => {
    const location = issue.columnName ? `${issue.columnName}: ` : '';
    const suggestion = issue.expectedRule ? `（建议：${issue.expectedRule}）` : '';
    return `${location}${issue.message}${suggestion}`;
  });
};

const mapCategoryPreviewRow = (
  item: WorkbookImportDryRunResponseDto['preview']['categories'][number],
): WorkbookImportPreviewRow => ({
    key: `category-${item.rowNumber}-${item.resolvedFinalCode ?? item.categoryCode ?? item.categoryName}`,
    entityType: 'CATEGORY',
    sheetName: item.sheetName,
    rowNumber: item.rowNumber,
    businessDomain: item.businessDomain,
    name: item.categoryName,
    excelReferenceCode: item.excelReferenceCode,
    sourceCode: item.categoryCode,
    finalCode: item.resolvedFinalCode,
    relation: item.parentCode || item.parentPath,
    extra: item.resolvedFinalPath || item.categoryPath,
    action: item.resolvedAction,
    issueLevel: resolveIssueLevel(item.issues),
    issueCount: item.issues.length,
    issueMessages: collectIssueMessages(item.issues),
  });

const mapAttributePreviewRow = (
  item: WorkbookImportDryRunResponseDto['preview']['attributes'][number],
): WorkbookImportPreviewRow => ({
    key: `attribute-${item.rowNumber}-${item.resolvedFinalCode ?? item.attributeKey ?? item.attributeName}`,
    entityType: 'ATTRIBUTE',
    sheetName: item.sheetName,
    rowNumber: item.rowNumber,
    businessDomain: item.businessDomain,
    name: item.attributeName,
    excelReferenceCode: item.excelReferenceCode,
    sourceCode: item.attributeKey,
    finalCode: item.resolvedFinalCode,
    relation: item.categoryCode,
    extra: item.attributeField ? `${item.attributeField}${item.dataType ? ` · ${item.dataType}` : ''}` : item.dataType,
    action: item.resolvedAction,
    issueLevel: resolveIssueLevel(item.issues),
    issueCount: item.issues.length,
    issueMessages: collectIssueMessages(item.issues),
  });

const mapEnumPreviewRow = (
  item: WorkbookImportDryRunResponseDto['preview']['enumOptions'][number],
): WorkbookImportPreviewRow => ({
    key: `enum-${item.rowNumber}-${item.resolvedFinalCode ?? item.optionCode ?? item.optionName}`,
    entityType: 'ENUM_OPTION',
    sheetName: item.sheetName,
    rowNumber: item.rowNumber,
    businessDomain: null,
    name: item.optionName,
    excelReferenceCode: item.excelReferenceCode,
    sourceCode: item.optionCode,
    finalCode: item.resolvedFinalCode,
    relation: [item.categoryCode, item.attributeKey].filter(Boolean).join(' / ') || null,
    extra: item.displayLabel,
    action: item.resolvedAction,
    issueLevel: resolveIssueLevel(item.issues),
    issueCount: item.issues.length,
    issueMessages: collectIssueMessages(item.issues),
  });

export const getPreviewRowCount = (
  dryRunResult: WorkbookImportDryRunResponseDto | null,
  entityType: WorkbookImportPreviewEntityFilter,
): number => {
  if (!dryRunResult) {
    return 0;
  }

  switch (entityType) {
    case 'CATEGORY':
      return dryRunResult.preview.categories.length;
    case 'ATTRIBUTE':
      return dryRunResult.preview.attributes.length;
    case 'ENUM_OPTION':
      return dryRunResult.preview.enumOptions.length;
    default:
      return 0;
  }
};

export const mapDryRunPreviewRowsPage = (
  dryRunResult: WorkbookImportDryRunResponseDto | null,
  entityType: WorkbookImportPreviewEntityFilter,
  page: number,
  pageSize: number,
): WorkbookImportPreviewRow[] => {
  if (!dryRunResult) {
    return [];
  }

  const safePage = Math.max(page, 1);
  const safePageSize = Math.max(pageSize, 1);
  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;

  switch (entityType) {
    case 'CATEGORY':
      return dryRunResult.preview.categories.slice(start, end).map(mapCategoryPreviewRow);
    case 'ATTRIBUTE':
      return dryRunResult.preview.attributes.slice(start, end).map(mapAttributePreviewRow);
    case 'ENUM_OPTION':
      return dryRunResult.preview.enumOptions.slice(start, end).map(mapEnumPreviewRow);
    default:
      return [];
  }
};

export const mapDryRunPreviewRows = (
  dryRunResult: WorkbookImportDryRunResponseDto | null,
): WorkbookImportPreviewRow[] => {
  if (!dryRunResult) {
    return [];
  }

  const categoryRows: WorkbookImportPreviewRow[] = dryRunResult.preview.categories.map(mapCategoryPreviewRow);
  const attributeRows: WorkbookImportPreviewRow[] = dryRunResult.preview.attributes.map(mapAttributePreviewRow);
  const enumRows: WorkbookImportPreviewRow[] = dryRunResult.preview.enumOptions.map(mapEnumPreviewRow);

  return [...categoryRows, ...attributeRows, ...enumRows].sort((left, right) => {
    const leftRow = left.rowNumber ?? 0;
    const rightRow = right.rowNumber ?? 0;
    if (leftRow !== rightRow) {
      return leftRow - rightRow;
    }
    return left.entityType.localeCompare(right.entityType);
  });
};