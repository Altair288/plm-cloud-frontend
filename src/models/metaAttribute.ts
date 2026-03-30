export interface MetaAttributeDefListItemDto {
  key: string;
  lovKey: string | null;
  categoryCode: string; // UNSPSC 分类 codeKey
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT'; // 根据实际情况推断状态枚举
  latestVersionNo: number;
  displayName: string;
  attributeField?: string | null;
  dataType: 'string' | 'number' | 'bool' | 'enum' | 'multi-enum' | 'date'; // 根据常规推断
  unit: string | null;
  hasLov: boolean;
  createdAt: string;
  // Extended fields for richer list view
  required?: boolean;
  unique?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  searchable?: boolean;
}

export interface MetaAttributeVersionSummaryDto {
  versionNo: number;
  hash: string;
  latest: boolean;
  createdAt: string;
}

/**
 * 属性最新版本详情
 */
export interface MetaAttributeLatestVersionDto {
  versionNo: number;
  displayName: string;
  attributeField?: string | null;
  description: string | null;
  dataType: 'string' | 'number' | 'bool' | 'enum' | 'multi-enum' | 'date';
  unit: string | null;
  defaultValue: string | null;
  required: boolean;
  unique: boolean;
  hidden: boolean;
  readOnly: boolean;
  searchable: boolean;
  lovKey: string | null;
  createdBy: string;
  createdAt: string;
  
  // Extended value configurations
  minValue?: number;
  maxValue?: number;
  step?: number;
  precision?: number;
  trueLabel?: string;
  falseLabel?: string;
}

export interface MetaAttributeDefDetailDto {
  key: string;
  categoryCode: string;
  status: string;
  createdBy: string;
  createdAt: string;
  modifiedBy: string;
  modifiedAt: string;
  latestVersion: MetaAttributeLatestVersionDto;
  lovKey: string | null;
  hasLov: boolean;
  versions: MetaAttributeVersionSummaryDto[];
  lovValues: any[] | null; // 根据实际 LOV 值结构定义，暂时用 any
}

export interface MetaAttributeUpsertRequestDto {
  key?: string; // 更新时通常不需要传key在body中，但创建时可能需要，或者path参数
  generationMode?: 'AUTO' | 'MANUAL';
  freezeKey?: boolean;
  displayName: string;
  attributeField?: string;
  description?: string;
  dataType: 'string' | 'number' | 'bool' | 'enum' | 'multi-enum' | 'date';
  unit?: string;
  defaultValue?: string;
  required?: boolean;
  unique?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  searchable?: boolean;
  lovKey?: string;
  lovGenerationMode?: 'AUTO' | 'MANUAL';
  freezeLovKey?: boolean;
  
  // Extended value configurations
  minValue?: number;
  maxValue?: number;
  step?: number;
  precision?: number;
  trueLabel?: string;
  falseLabel?: string;
  lovValues?: {
    code?: string;
    name?: string;
    label?: string;
  }[];
}

export interface CreateAttributeCodePreviewRequestDto {
  manualKey?: string;
  dataType?: 'string' | 'number' | 'bool' | 'enum' | 'multi-enum' | 'date';
  count?: number;
  lovValues?: {
    code?: string;
    name?: string;
    label?: string;
  }[];
}

export interface CreateAttributeCodePreviewResponseDto {
  businessDomain: string;
  categoryCode: string;
  attributeRuleCode: string;
  generationMode: 'AUTO' | 'MANUAL';
  allowManualOverride: boolean;
  suggestedCode: string | null;
  examples: string[];
  warnings: string[];
  resolvedContext: Record<string, string> | null;
  resolvedSequenceScope: string | null;
  resolvedPeriodKey: string | null;
  previewStale: boolean;
  lovRuleCode: string | null;
  allowLovValueManualOverride: boolean | null;
  lovWarnings: string[];
  lovResolvedContext: Record<string, string> | null;
  lovResolvedSequenceScope: string | null;
  lovResolvedPeriodKey: string | null;
  lovValuePreviews: {
    index: number;
    manualCode: string | null;
    name: string | null;
    label: string | null;
    suggestedCode: string | null;
  }[];
}

export interface AttributeImportSummaryDto {
  totalRows: number;
  attributeGroupCount: number;
  createdAttributeDefs: number;
  createdAttributeVersions: number;
  createdLovDefs: number;
  createdLovVersions: number;
  skippedUnchanged: number;
  errorCount: number;
  errors: string[];
}
