export type CodeRuleTargetTypeDto = 'category' | 'attribute' | 'lov';
export type CodeRuleStatusDto = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type CodeRuleHierarchyModeDto = 'NONE' | 'APPEND_CHILD_SUFFIX';
export type CodeRuleResetRuleDto = 'NEVER' | 'DAILY' | 'MONTHLY' | 'YEARLY' | 'PER_PARENT';
export type CodeRuleVariableKeyDto = 'BUSINESS_DOMAIN' | 'PARENT_CODE' | 'CATEGORY_CODE' | 'ATTRIBUTE_CODE' | string;

export interface CodeRuleStringSegmentDto {
  type: 'STRING';
  value?: string;
}

export interface CodeRuleDateSegmentDto {
  type: 'DATE';
  format?: string;
}

export interface CodeRuleVariableSegmentDto {
  type: 'VARIABLE';
  variableKey?: CodeRuleVariableKeyDto;
}

export interface CodeRuleSequenceSegmentDto {
  type: 'SEQUENCE';
  length?: number;
  startValue?: number;
  step?: number;
  resetRule?: CodeRuleResetRuleDto;
  scopeKey?: string;
}

export type CodeRuleSegmentDto =
  | CodeRuleStringSegmentDto
  | CodeRuleDateSegmentDto
  | CodeRuleVariableSegmentDto
  | CodeRuleSequenceSegmentDto;

export interface CodeRuleValidationDto {
  maxLength?: number;
  regex?: string;
  allowManualOverride?: boolean;
}

export interface CodeRuleSubRuleDto {
  separator?: string;
  segments: CodeRuleSegmentDto[];
  childSegments?: CodeRuleSegmentDto[];
  allowedVariableKeys?: string[];
}

export interface CodeRuleJsonDto {
  pattern?: string;
  hierarchyMode?: CodeRuleHierarchyModeDto;
  subRules: Partial<Record<'category' | 'attribute' | 'enum', CodeRuleSubRuleDto>>;
  validation?: CodeRuleValidationDto;
}

export interface CodeRuleSummaryDto {
  businessDomain: string;
  ruleCode: string;
  name: string;
  targetType: CodeRuleTargetTypeDto;
  scopeType?: string | null;
  scopeValue?: string | null;
  pattern?: string | null;
  status: CodeRuleStatusDto;
  active: boolean;
  allowManualOverride?: boolean;
  regexPattern?: string | null;
  maxLength?: number | null;
  latestVersionNo?: number;
  supportsHierarchy?: boolean;
  supportsScopedSequence?: boolean;
  supportedVariableKeys?: string[];
  latestRuleJson?: CodeRuleJsonDto;
}

export interface CodeRuleDetailDto extends CodeRuleSummaryDto {}

export interface CodeRuleSaveRequestDto {
  businessDomain: string;
  ruleCode: string;
  name: string;
  targetType: CodeRuleTargetTypeDto;
  scopeType?: string | null;
  scopeValue?: string | null;
  pattern: string;
  allowManualOverride?: boolean;
  regexPattern?: string | null;
  maxLength?: number | null;
  ruleJson: CodeRuleJsonDto;
}

export interface CodeRulePreviewRequestDto {
  context?: Record<string, string>;
  manualCode?: string | null;
  count?: number;
}

export interface CodeRulePreviewResponseDto {
  ruleCode: string;
  ruleVersion: number;
  pattern: string;
  examples: string[];
  warnings: string[];
  resolvedContext: Record<string, string>;
  resolvedSequenceScope?: string | null;
  resolvedPeriodKey?: string | null;
}

export interface CodeRuleSetSummaryDto {
  businessDomain: string;
  name: string;
  status: CodeRuleStatusDto;
  active: boolean;
  remark?: string | null;
  categoryRuleCode: string;
  attributeRuleCode: string;
  lovRuleCode: string;
}

export interface CodeRuleSetDetailDto extends CodeRuleSetSummaryDto {
  rules: Partial<Record<'CATEGORY' | 'ATTRIBUTE' | 'LOV', CodeRuleDetailDto>>;
}

export interface CodeRuleSetSaveRequestDto {
  businessDomain: string;
  name: string;
  remark?: string | null;
  categoryRuleCode: string;
  attributeRuleCode: string;
  lovRuleCode: string;
}