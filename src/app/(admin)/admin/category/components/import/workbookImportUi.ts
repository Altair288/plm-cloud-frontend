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

const ISSUE_FIELD_LABELS: Record<string, string> = {
  Attribute_Field: '属性字段名',
  attributeField: '属性字段名',
  Attribute_Key: '属性编码',
  attributeKey: '属性编码',
  Attribute_Name: '属性名称',
  attributeName: '属性名称',
  Business_Domain: '业务域',
  businessDomain: '业务域',
  Category_Code: '分类编码',
  categoryCode: '分类编码',
  Category_Name: '分类名称',
  categoryName: '分类名称',
  Category_Path: '分类路径',
  categoryPath: '分类路径',
  Data_Type: '数据类型',
  dataType: '数据类型',
  displayLabel: '显示名称',
  excelReferenceCode: 'Excel 参考编码',
  file: '文件',
  importSessionId: '导入会话',
  key: '编码',
  Option_Code: '枚举值编码',
  optionCode: '枚举值编码',
  Option_Name: '枚举值名称',
  optionName: '枚举值名称',
  Parent_Code: '父级分类编码',
  parentCode: '父级分类编码',
  Parent_Path: '父级分类路径',
  parentPath: '父级分类路径',
  resolvedFinalCode: '最终编码',
  resolvedFinalPath: '最终路径',
  rowNumber: '行号',
  sheetName: '工作表',
  unique: '是否唯一',
  Unique: '是否唯一',
};

const ISSUE_TEXT_REPLACEMENTS = Object.entries(ISSUE_FIELD_LABELS).sort(
  (left, right) => right[0].length - left[0].length,
);

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const translateIssueText = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  return ISSUE_TEXT_REPLACEMENTS.reduce((current, [source, target]) => {
    return current.replace(new RegExp(escapeRegExp(source), 'g'), target);
  }, value.trim());
};

const formatIssueColumnName = (columnName: string | null | undefined): string | null => {
  const translated = translateIssueText(columnName);
  return translated || null;
};

const formatIssueSuggestion = (expectedRule: string | null | undefined): string | null => {
  const translated = translateIssueText(expectedRule).replace(/^建议\s*/u, '').trim();
  return translated || null;
};

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
    const fieldLabel = formatIssueColumnName(issue.columnName);
    const message = translateIssueText(issue.message) || '存在问题';
    const rawValue = issue.rawValue?.trim();
    const suggestion = formatIssueSuggestion(issue.expectedRule);

    let result = fieldLabel ? `${fieldLabel}：${message}` : message;

    if (rawValue) {
      result += `；当前值：${rawValue}`;
    }

    if (suggestion) {
      result += `；处理建议：${suggestion}`;
    }

    return result;
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
      return dryRunResult.previewPage?.totalElements ?? dryRunResult.summary.categoryRowCount;
    case 'ATTRIBUTE':
      return dryRunResult.previewPage?.totalElements ?? dryRunResult.summary.attributeRowCount;
    case 'ENUM_OPTION':
      return dryRunResult.previewPage?.totalElements ?? dryRunResult.summary.enumRowCount;
    default:
      return 0;
  }
};

export const mapDryRunPreviewRowsPage = (
  dryRunResult: WorkbookImportDryRunResponseDto | null,
  entityType: WorkbookImportPreviewEntityFilter,
  _page: number,
  _pageSize: number,
): WorkbookImportPreviewRow[] => {
  if (!dryRunResult) {
    return [];
  }

  switch (entityType) {
    case 'CATEGORY':
      return dryRunResult.preview.categories.map(mapCategoryPreviewRow);
    case 'ATTRIBUTE':
      return dryRunResult.preview.attributes.map(mapAttributePreviewRow);
    case 'ENUM_OPTION':
      return dryRunResult.preview.enumOptions.map(mapEnumPreviewRow);
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