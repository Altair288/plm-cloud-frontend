import type {
  CodeRuleDetailDto,
  CodeRuleJsonDto,
  CodeRuleSaveRequestDto,
  CodeRuleSegmentDto,
  CodeRuleSetDetailDto,
  CodeRuleSetSaveRequestDto,
  CodeRuleSetSummaryDto,
  CodeRuleSubRuleDto,
  CodeRuleTargetTypeDto,
} from '@/models/codeRule';
import type {
  CodeRule,
  CodeRuleBackendMeta,
  CodeSegment,
  SubRuleConfig,
  SubRuleKey,
} from './types';
import { createDefaultSubRules } from './types';

const CATEGORY_BUSINESS_OBJECT_SUFFIX = '分类';
const DEFAULT_RULE_REGEX = '^[A-Z][A-Z0-9_-]{0,63}$';
const DEFAULT_RULE_MAX_LENGTH = 64;

const SUB_RULE_TO_TARGET_TYPE: Record<SubRuleKey, CodeRuleTargetTypeDto> = {
  category: 'category',
  attribute: 'attribute',
  enum: 'lov',
};

const TARGET_SLOT_TO_SUB_RULE: Record<'CATEGORY' | 'ATTRIBUTE' | 'LOV', SubRuleKey> = {
  CATEGORY: 'category',
  ATTRIBUTE: 'attribute',
  LOV: 'enum',
};

const API_DATE_TO_EDITOR_DATE: Record<string, string> = {
  yyyy: 'YYYY',
  yyyyMM: 'YYYYMM',
  yyyyMMdd: 'YYYYMMDD',
  yy: 'YY',
  yyMM: 'YYMM',
  yyMMdd: 'YYMMDD',
};

const EDITOR_DATE_TO_API_DATE: Record<string, string> = {
  YYYY: 'yyyy',
  YYYYMM: 'yyyyMM',
  YYYYMMDD: 'yyyyMMdd',
  YY: 'yy',
  YYMM: 'yyMM',
  YYMMDD: 'yyMMdd',
};

const normalizeStatus = (status?: string): CodeRule['status'] => {
  if (status === 'ACTIVE' || status === 'ARCHIVED' || status === 'DRAFT') {
    return status;
  }
  return 'DRAFT';
};

const formatBusinessObjectLabel = (businessDomain: string) => {
  const normalized = String(businessDomain || '').trim();
  if (!normalized) {
    return `未命名${CATEGORY_BUSINESS_OBJECT_SUFFIX}`;
  }

  return normalized.endsWith(CATEGORY_BUSINESS_OBJECT_SUFFIX)
    ? normalized
    : `${normalized}${CATEGORY_BUSINESS_OBJECT_SUFFIX}`;
};

const mapSegmentDtoToEditor = (segment: CodeRuleSegmentDto): CodeSegment => {
  switch (segment.type) {
    case 'STRING':
      return {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'STRING',
        value: segment.value ?? '',
      };
    case 'DATE':
      return {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'DATE',
        dateFormat: API_DATE_TO_EDITOR_DATE[segment.format || ''] || segment.format || 'YYYYMM',
      };
    case 'VARIABLE':
      return {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'VARIABLE',
        variableKey: segment.variableKey ?? 'PARENT_CODE',
      };
    case 'SEQUENCE':
      return {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'SEQUENCE',
        length: segment.length ?? 4,
        startValue: segment.startValue ?? 1,
        step: segment.step ?? 1,
        resetRule: segment.resetRule ?? 'YEARLY',
      };
  }
};

const mapSegmentEditorToDto = (
  segment: CodeSegment,
  targetType: CodeRuleTargetTypeDto,
  isChildSegment: boolean,
): CodeRuleSegmentDto => {
  switch (segment.type) {
    case 'STRING':
      return { type: 'STRING', value: segment.value ?? '' };
    case 'DATE':
      return {
        type: 'DATE',
        format: EDITOR_DATE_TO_API_DATE[segment.dateFormat || ''] || segment.dateFormat,
      };
    case 'VARIABLE':
      return { type: 'VARIABLE', variableKey: segment.variableKey };
    case 'SEQUENCE': {
      const scopeKey = segment.resetRule === 'PER_PARENT'
        ? isChildSegment
          ? 'PARENT_CODE'
          : targetType === 'attribute'
            ? 'CATEGORY_CODE'
            : targetType === 'lov'
              ? 'ATTRIBUTE_CODE'
              : 'PARENT_CODE'
        : undefined;

      return {
        type: 'SEQUENCE',
        length: segment.length ?? 4,
        startValue: segment.startValue ?? 1,
        step: segment.step ?? 1,
        resetRule: segment.resetRule ?? 'NEVER',
        scopeKey,
      };
    }
  }
};

const toEditorSubRule = (subRule?: CodeRuleSubRuleDto): SubRuleConfig => ({
  separator: subRule?.separator ?? '-',
  segments: (subRule?.segments ?? []).map(mapSegmentDtoToEditor),
  childSegments: subRule?.childSegments?.map(mapSegmentDtoToEditor),
});

const createRuleMetadata = (detail?: CodeRuleDetailDto): CodeRuleBackendMeta | undefined => {
  if (!detail) {
    return undefined;
  }

  return {
    ruleCode: detail.ruleCode,
    name: detail.name,
    targetType: detail.targetType,
    scopeType: detail.scopeType,
    scopeValue: detail.scopeValue,
    pattern: detail.pattern,
    allowManualOverride: detail.allowManualOverride,
    regexPattern: detail.regexPattern,
    maxLength: detail.maxLength,
    latestVersionNo: detail.latestVersionNo,
    supportedVariableKeys: detail.supportedVariableKeys,
    supportsHierarchy: detail.supportsHierarchy,
    supportsScopedSequence: detail.supportsScopedSequence,
    status: normalizeStatus(detail.status),
    active: detail.active,
  };
};

const buildPatternFromSegments = (segments: CodeSegment[], separator: string) => segments
  .map((segment) => {
    switch (segment.type) {
      case 'STRING':
        return segment.value || '';
      case 'DATE':
        return `{${EDITOR_DATE_TO_API_DATE[segment.dateFormat || ''] || segment.dateFormat || 'DATE'}}`;
      case 'VARIABLE':
        return `{${segment.variableKey || 'VAR'}}`;
      case 'SEQUENCE':
        return '{SEQ}';
    }
  })
  .filter(Boolean)
  .join(separator);

const buildRuleJsonFromEditor = (
  rule: CodeRule,
  subRuleKey: SubRuleKey,
  metadata?: CodeRuleBackendMeta,
): CodeRuleJsonDto => {
  const sourceSubRule = rule.subRules?.[subRuleKey] ?? createDefaultSubRules()[subRuleKey];
  const targetType = SUB_RULE_TO_TARGET_TYPE[subRuleKey];

  const apiSubRule: CodeRuleSubRuleDto = {
    separator: sourceSubRule.separator,
    segments: sourceSubRule.segments.map((segment) => mapSegmentEditorToDto(segment, targetType, false)),
    allowedVariableKeys: metadata?.supportedVariableKeys,
  };

  if (subRuleKey === 'category' && rule.inheritParentPrefix) {
    apiSubRule.childSegments = (sourceSubRule.childSegments ?? [])
      .map((segment) => mapSegmentEditorToDto(segment, targetType, true));
  }

  return {
    pattern: buildPatternFromSegments(sourceSubRule.segments, sourceSubRule.separator),
    hierarchyMode: subRuleKey === 'category' && rule.inheritParentPrefix ? 'APPEND_CHILD_SUFFIX' : 'NONE',
    subRules: {
      [subRuleKey]: apiSubRule,
    },
    validation: {
      maxLength: metadata?.maxLength ?? undefined,
      regex: metadata?.regexPattern ?? undefined,
      allowManualOverride: metadata?.allowManualOverride ?? false,
    },
  };
};

const buildDefaultRuleCode = (prefix: 'CATEGORY' | 'ATTRIBUTE' | 'LOV', businessDomain: string) => {
  return `${prefix}_${String(businessDomain || '').trim().toUpperCase()}`;
};

const createDefaultRuleMetadata = (
  businessDomain: string,
  label: string,
): Required<CodeRule['ruleMetadata']> => ({
  category: {
    ruleCode: buildDefaultRuleCode('CATEGORY', businessDomain),
    name: `${label}分类编码规则`,
    targetType: 'category',
    scopeType: 'GLOBAL',
    scopeValue: null,
    pattern: '{BUSINESS_DOMAIN}-{SEQ}',
    allowManualOverride: true,
    regexPattern: DEFAULT_RULE_REGEX,
    maxLength: DEFAULT_RULE_MAX_LENGTH,
    supportedVariableKeys: ['BUSINESS_DOMAIN', 'PARENT_CODE'],
    supportsHierarchy: true,
    supportsScopedSequence: true,
    status: 'DRAFT',
    active: false,
  },
  attribute: {
    ruleCode: buildDefaultRuleCode('ATTRIBUTE', businessDomain),
    name: `${label}属性编码规则`,
    targetType: 'attribute',
    scopeType: 'GLOBAL',
    scopeValue: null,
    pattern: 'ATTR-{CATEGORY_CODE}-{SEQ}',
    allowManualOverride: true,
    regexPattern: DEFAULT_RULE_REGEX,
    maxLength: DEFAULT_RULE_MAX_LENGTH,
    supportedVariableKeys: ['BUSINESS_DOMAIN', 'CATEGORY_CODE'],
    supportsHierarchy: false,
    supportsScopedSequence: true,
    status: 'DRAFT',
    active: false,
  },
  enum: {
    ruleCode: buildDefaultRuleCode('LOV', businessDomain),
    name: `${label}枚举值编码规则`,
    targetType: 'lov',
    scopeType: 'GLOBAL',
    scopeValue: null,
    pattern: 'ENUM-{ATTRIBUTE_CODE}-{SEQ}',
    allowManualOverride: true,
    regexPattern: DEFAULT_RULE_REGEX,
    maxLength: DEFAULT_RULE_MAX_LENGTH,
    supportedVariableKeys: ['BUSINESS_DOMAIN', 'CATEGORY_CODE', 'ATTRIBUTE_CODE'],
    supportsHierarchy: false,
    supportsScopedSequence: true,
    status: 'DRAFT',
    active: false,
  },
});

const createDefaultSubRulesForRuleSet = (): Record<SubRuleKey, SubRuleConfig> => ({
  category: {
    separator: '-',
    segments: [
      { id: `seg_${Date.now()}_cat_var`, type: 'VARIABLE', variableKey: 'BUSINESS_DOMAIN' },
      { id: `seg_${Date.now()}_cat_seq`, type: 'SEQUENCE', length: 4, startValue: 1, step: 1, resetRule: 'NEVER' },
    ],
    childSegments: [],
  },
  attribute: {
    separator: '-',
    segments: [
      { id: `seg_${Date.now()}_attr_str`, type: 'STRING', value: 'ATTR' },
      { id: `seg_${Date.now()}_attr_var`, type: 'VARIABLE', variableKey: 'CATEGORY_CODE' },
      { id: `seg_${Date.now()}_attr_seq`, type: 'SEQUENCE', length: 6, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
    ],
  },
  enum: {
    separator: '-',
    segments: [
      { id: `seg_${Date.now()}_lov_str`, type: 'STRING', value: 'ENUM' },
      { id: `seg_${Date.now()}_lov_var`, type: 'VARIABLE', variableKey: 'ATTRIBUTE_CODE' },
      { id: `seg_${Date.now()}_lov_seq`, type: 'SEQUENCE', length: 2, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
    ],
  },
});

export const mapRuleSetSummaryToEditor = (summary: CodeRuleSetSummaryDto): CodeRule => ({
  id: summary.businessDomain,
  name: summary.name,
  code: summary.businessDomain,
  businessDomain: summary.businessDomain,
  isNew: false,
  businessObject: formatBusinessObjectLabel(summary.businessDomain),
  description: summary.remark || '',
  separator: '-',
  status: normalizeStatus(summary.status),
  validateFormat: false,
  updateOnModify: false,
  showOnCreate: true,
  allowManualEdit: false,
  inheritParentPrefix: false,
  segments: [],
  subRules: createDefaultSubRules(),
  ruleSetMeta: {
    businessDomain: summary.businessDomain,
    remark: summary.remark || '',
    active: summary.active,
    categoryRuleCode: summary.categoryRuleCode,
    attributeRuleCode: summary.attributeRuleCode,
    lovRuleCode: summary.lovRuleCode,
  },
});

export const mapRuleSetDetailToEditor = (detail: CodeRuleSetDetailDto): CodeRule => {
  const categoryRule = detail.rules.CATEGORY;
  const attributeRule = detail.rules.ATTRIBUTE;
  const lovRule = detail.rules.LOV;

  const categorySubRule = toEditorSubRule(categoryRule?.latestRuleJson?.subRules?.category);
  const attributeSubRule = toEditorSubRule(attributeRule?.latestRuleJson?.subRules?.attribute);
  const enumSubRule = toEditorSubRule(lovRule?.latestRuleJson?.subRules?.enum);
  const separator = categorySubRule.separator || attributeSubRule.separator || enumSubRule.separator || '-';

  return {
    id: detail.businessDomain,
    name: detail.name,
    code: detail.businessDomain,
    businessDomain: detail.businessDomain,
    isNew: false,
    businessObject: formatBusinessObjectLabel(detail.businessDomain),
    description: detail.remark || '',
    separator,
    status: normalizeStatus(detail.status),
    validateFormat: false,
    updateOnModify: false,
    showOnCreate: true,
    allowManualEdit: Boolean(categoryRule?.allowManualOverride),
    inheritParentPrefix: categoryRule?.latestRuleJson?.hierarchyMode === 'APPEND_CHILD_SUFFIX',
    segments: [],
    subRules: {
      category: { ...categorySubRule, separator },
      attribute: { ...attributeSubRule, separator },
      enum: { ...enumSubRule, separator },
    },
    ruleSetMeta: {
      businessDomain: detail.businessDomain,
      remark: detail.remark || '',
      active: detail.active,
      categoryRuleCode: detail.categoryRuleCode,
      attributeRuleCode: detail.attributeRuleCode,
      lovRuleCode: detail.lovRuleCode,
    },
    ruleMetadata: {
      category: createRuleMetadata(categoryRule),
      attribute: createRuleMetadata(attributeRule),
      enum: createRuleMetadata(lovRule),
    },
  };
};

export const buildRuleSaveRequestsFromEditor = (rule: CodeRule): CodeRuleSaveRequestDto[] => {
  const businessDomain = rule.businessDomain || rule.ruleSetMeta?.businessDomain || rule.code;
  const ruleMetadata = rule.ruleMetadata;
  if (!businessDomain || !ruleMetadata?.category || !ruleMetadata.attribute || !ruleMetadata.enum) {
    return [];
  }

  return (Object.entries(ruleMetadata) as Array<[SubRuleKey, CodeRuleBackendMeta | undefined]>)
    .filter((entry): entry is [SubRuleKey, CodeRuleBackendMeta] => Boolean(entry[1]))
    .map(([subRuleKey, metadata]) => ({
      businessDomain,
      ruleCode: metadata.ruleCode,
      name: metadata.name,
      targetType: metadata.targetType,
      scopeType: metadata.scopeType ?? 'GLOBAL',
      scopeValue: metadata.scopeValue ?? null,
      pattern: buildPatternFromSegments(
        rule.subRules?.[subRuleKey]?.segments ?? [],
        rule.subRules?.[subRuleKey]?.separator ?? rule.separator,
      ),
      allowManualOverride: metadata.allowManualOverride ?? false,
      regexPattern: metadata.regexPattern ?? null,
      maxLength: metadata.maxLength ?? null,
      ruleJson: buildRuleJsonFromEditor(rule, subRuleKey, metadata),
    }));
};

export const buildRuleSetSaveRequestFromEditor = (rule: CodeRule): CodeRuleSetSaveRequestDto | null => {
  const meta = rule.ruleSetMeta;
  if (!meta) {
    return null;
  }

  return {
    businessDomain: meta.businessDomain,
    name: rule.name,
    remark: rule.description || '',
    categoryRuleCode: meta.categoryRuleCode,
    attributeRuleCode: meta.attributeRuleCode,
    lovRuleCode: meta.lovRuleCode,
  };
};

export const createDraftRuleSetEditor = (params: {
  businessDomain: string;
  businessDomainLabel: string;
  name: string;
  remark?: string;
}): CodeRule => {
  const businessDomain = String(params.businessDomain || '').trim().toUpperCase();
  const ruleMetadata = createDefaultRuleMetadata(businessDomain, params.businessDomainLabel);

  return {
    id: `draft_${businessDomain}`,
    name: params.name,
    code: businessDomain,
    businessDomain,
    isNew: true,
    businessObject: params.businessDomainLabel,
    description: params.remark || '',
    separator: '-',
    status: 'DRAFT',
    validateFormat: false,
    updateOnModify: false,
    showOnCreate: true,
    allowManualEdit: true,
    inheritParentPrefix: false,
    segments: [],
    subRules: createDefaultSubRulesForRuleSet(),
    ruleSetMeta: {
      businessDomain,
      remark: params.remark || '',
      active: false,
      categoryRuleCode: ruleMetadata.category.ruleCode,
      attributeRuleCode: ruleMetadata.attribute.ruleCode,
      lovRuleCode: ruleMetadata.enum.ruleCode,
    },
    ruleMetadata,
  };
};

export const getNonDraftRuleCodes = (rule: CodeRule): string[] => {
  return (Object.entries(rule.ruleMetadata || {}) as Array<[SubRuleKey, CodeRuleBackendMeta | undefined]>)
    .filter(([, metadata]) => metadata && metadata.status !== 'DRAFT')
    .map(([, metadata]) => metadata!.ruleCode);
};

export const getRuleSetSubRuleKeyByTargetSlot = (slot: 'CATEGORY' | 'ATTRIBUTE' | 'LOV') => TARGET_SLOT_TO_SUB_RULE[slot];