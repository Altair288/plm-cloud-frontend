// ================= 编码片段类型 =================
export type SegmentType = 'STRING' | 'DATE' | 'VARIABLE' | 'SEQUENCE';

export interface CodeSegment {
  id: string;
  type: SegmentType;
  // STRING
  value?: string;
  // DATE
  dateFormat?: string;
  // VARIABLE — 引用宿主或父级对象属性
  variableKey?: string;
  // SEQUENCE
  length?: number;
  startValue?: number;
  step?: number;
  resetRule?: 'NEVER' | 'DAILY' | 'MONTHLY' | 'YEARLY' | 'PER_PARENT';
}

// ================= 编码规则 =================
export type RuleStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

// 子规则：分类业务对象下的多套编码配置
export type SubRuleKey = 'category' | 'attribute' | 'enum';

export interface SubRuleConfig {
  separator: string;
  segments: CodeSegment[];          // 根节点编码段
  childSegments?: CodeSegment[];    // 子级派生编码段（启用层级继承时）
}

export interface CodeRule {
  id: string;
  name: string;
  code: string;
  businessObject: string;        // 业务对象（物料分类、产品、BOM 等）
  description?: string;
  separator: string;             // 默认段间分隔符
  status: RuleStatus;
  // 行为控制
  validateFormat: boolean;       // 校验编码格式
  updateOnModify: boolean;       // 修改时更新编码
  showOnCreate: boolean;         // 新增显示
  allowManualEdit: boolean;      // 允许手动修改
  // 层级继承
  inheritParentPrefix: boolean;  // 父级前缀继承
  segments: CodeSegment[];       // 非分类对象的编码段
  // 分类对象专用：多套编码配置
  subRules?: Record<SubRuleKey, SubRuleConfig>;
}

// ================= 选项常量 =================
export const SEGMENT_TYPE_OPTIONS: Array<{ value: SegmentType; label: string }> = [
  { value: 'STRING', label: '固定字符' },
  { value: 'DATE', label: '日期段' },
  { value: 'VARIABLE', label: '动态变量' },
  { value: 'SEQUENCE', label: '流水号' },
];

export const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY', label: 'YYYY（年）' },
  { value: 'YYYYMM', label: 'YYYYMM（年月）' },
  { value: 'YYYYMMDD', label: 'YYYYMMDD（年月日）' },
  { value: 'YY', label: 'YY（短年）' },
  { value: 'YYMM', label: 'YYMM（短年月）' },
  { value: 'YYMMDD', label: 'YYMMDD（短年月日）' },
];

export const RESET_RULE_OPTIONS = [
  { value: 'NEVER', label: '不重置' },
  { value: 'DAILY', label: '按日重置' },
  { value: 'MONTHLY', label: '按月重置' },
  { value: 'YEARLY', label: '按年重置' },
  { value: 'PER_PARENT', label: '按父级重置' },
];

export const VARIABLE_KEY_OPTIONS = [
  { value: 'PARENT_CODE', label: '父级编码' },
  { value: 'CATEGORY_CODE', label: '分类编码' },
  { value: 'ATTRIBUTE_CODE', label: '属性编码' },
];

export const SEPARATOR_OPTIONS = [
  { value: '-', label: '- （短横线）' },
  { value: '_', label: '_ （下划线）' },
  { value: '.', label: '. （点号）' },
  { value: '/', label: '/ （斜杠）' },
  { value: '\\', label: '\\ （反斜杠）' },
  { value: '', label: '无分隔符' },
];

export const STATUS_OPTIONS: Array<{ value: RuleStatus; label: string }> = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ACTIVE', label: '启用' },
  { value: 'INACTIVE', label: '停用' },
];

export const BUSINESS_OBJECT_OPTIONS = [
  '物料分类', '产品分类', 'BOM分类', '工艺分类',
  '文档分类', '测试分类',
];

/** 分类业务对象下的 Tab 页签配置 */
export const SUB_RULE_TABS: Array<{ key: SubRuleKey; label: string }> = [
  { key: 'category', label: '分类编码' },
  { key: 'attribute', label: '属性编码' },
  { key: 'enum', label: '枚举值编码' },
];

/** 判断业务对象是否为分类类型 */
export const isCategoryObject = (businessObject: string): boolean =>
  businessObject.endsWith('分类');

/** 创建默认子规则 */
export const createDefaultSubRules = (): Record<SubRuleKey, SubRuleConfig> => ({
  category: { separator: '-', segments: [], childSegments: [] },
  attribute: { separator: '-', segments: [] },
  enum: { separator: '-', segments: [] },
});

// ================= 列表相关常量 =================
export type ColumnKey = 'name' | 'code' | 'businessObject';
export type ColumnShareMap = Record<ColumnKey, number>;

export const COLUMN_KEYS: ColumnKey[] = ['name', 'code', 'businessObject'];

export const MIN_COLUMN_SHARE: ColumnShareMap = {
  name: 28,
  code: 24,
  businessObject: 24,
};

export const DEFAULT_COLUMN_SHARES: ColumnShareMap = {
  name: 42,
  code: 29,
  businessObject: 29,
};

export const CHECKBOX_COL_WIDTH = 48;

// ================= 辅助函数 =================
export const createDefaultSegment = (type: SegmentType): CodeSegment => {
  const id = `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  switch (type) {
    case 'STRING':
      return { id, type, value: '' };
    case 'DATE':
      return { id, type, dateFormat: 'YYYYMM' };
    case 'VARIABLE':
      return { id, type, variableKey: 'PARENT_CODE' };
    case 'SEQUENCE':
      return { id, type, length: 4, startValue: 1, step: 1, resetRule: 'YEARLY' };
  }
};

export const createDefaultRule = (): CodeRule => ({
  id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: '新编码规则',
  code: '',
  businessObject: '',
  description: '',
  separator: '-',
  status: 'DRAFT',
  validateFormat: false,
  updateOnModify: false,
  showOnCreate: true,
  allowManualEdit: false,
  inheritParentPrefix: false,
  segments: [],
  subRules: createDefaultSubRules(),
});

export const generateSegmentPreview = (segment: CodeSegment): string => {
  switch (segment.type) {
    case 'STRING':
      return segment.value || '';
    case 'DATE': {
      const now = new Date();
      const y = now.getFullYear().toString();
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const d = now.getDate().toString().padStart(2, '0');
      switch (segment.dateFormat) {
        case 'YYYY': return y;
        case 'YYYYMM': return `${y}${m}`;
        case 'YYYYMMDD': return `${y}${m}${d}`;
        case 'YY': return y.slice(2);
        case 'YYMM': return `${y.slice(2)}${m}`;
        case 'YYMMDD': return `${y.slice(2)}${m}${d}`;
        default: return segment.dateFormat || '';
      }
    }
    case 'VARIABLE':
      return `{${VARIABLE_KEY_OPTIONS.find(o => o.value === segment.variableKey)?.label || '变量'}}`;
    case 'SEQUENCE':
      return '0'.repeat(Math.max(0, (segment.length || 4) - 1)) + '1';
  }
};

export const generateCodePreview = (rule: CodeRule): string => {
  if (rule.segments.length === 0) return '（无编码段）';
  return rule.segments
    .map(s => generateSegmentPreview(s))
    .join(rule.separator);
};

/** 根据子规则生成预览 */
export const generateSubRulePreview = (config: SubRuleConfig): string => {
  if (config.segments.length === 0) return '（无编码段）';
  return config.segments
    .map(s => generateSegmentPreview(s))
    .join(config.separator);
};

/** 生成子级派生编码预览。开启层级派生后，父级编码会自动作为前缀拼接。 */
export const generateChildPreview = (
  rootPreview: string,
  config: SubRuleConfig,
): string => {
  const childSegs = config.childSegments;
  if (!childSegs || childSegs.length === 0) return '（未配置子级规则）';
  const derivedSuffixSegments = childSegs.filter(
    (segment) => !(segment.type === 'VARIABLE' && segment.variableKey === 'PARENT_CODE'),
  );

  if (derivedSuffixSegments.length === 0) {
    return rootPreview;
  }

  const childSuffixPreview = derivedSuffixSegments
    .map((segment) => generateSegmentPreview(segment))
    .join(config.separator);

  return [rootPreview, childSuffixPreview].filter(Boolean).join(config.separator);
};

export const getSegmentTypeLabel = (type: SegmentType): string => {
  return SEGMENT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
};

/** 列分配：拖拽调整列宽时的百分比分配算法 */
export const distributeDeltaAcrossColumns = (
  currentShares: ColumnShareMap,
  targetKey: ColumnKey,
  requestedShare: number,
): ColumnShareMap => {
  const otherKeys = COLUMN_KEYS.filter((key) => key !== targetKey);
  const minTargetShare = MIN_COLUMN_SHARE[targetKey];
  const maxTargetShare = 100 - otherKeys.reduce((sum, key) => sum + MIN_COLUMN_SHARE[key], 0);
  const clampedTargetShare = Math.min(maxTargetShare, Math.max(minTargetShare, requestedShare));
  const delta = clampedTargetShare - currentShares[targetKey];

  if (Math.abs(delta) < 0.01) {
    return currentShares;
  }

  const nextShares = { ...currentShares };
  nextShares[targetKey] = clampedTargetShare;

  if (delta > 0) {
    let remainingDelta = delta;
    const totalShrinkCapacity = otherKeys.reduce(
      (sum, key) => sum + Math.max(0, currentShares[key] - MIN_COLUMN_SHARE[key]),
      0,
    );

    for (const key of otherKeys) {
      const shrinkCapacity = Math.max(0, currentShares[key] - MIN_COLUMN_SHARE[key]);
      const allocatedDelta = totalShrinkCapacity > 0
        ? (delta * shrinkCapacity) / totalShrinkCapacity
        : delta / otherKeys.length;
      const actualDelta = Math.min(shrinkCapacity, allocatedDelta, remainingDelta);
      nextShares[key] = currentShares[key] - actualDelta;
      remainingDelta -= actualDelta;
    }

    for (const key of otherKeys) {
      if (remainingDelta <= 0.01) break;
      const shrinkCapacity = Math.max(0, nextShares[key] - MIN_COLUMN_SHARE[key]);
      const actualDelta = Math.min(shrinkCapacity, remainingDelta);
      nextShares[key] -= actualDelta;
      remainingDelta -= actualDelta;
    }
  } else {
    const growDelta = Math.abs(delta);
    const totalGrowBase = otherKeys.reduce((sum, key) => sum + currentShares[key], 0);
    let distributed = 0;

    for (const key of otherKeys) {
      const actualDelta = totalGrowBase > 0
        ? (growDelta * currentShares[key]) / totalGrowBase
        : growDelta / otherKeys.length;
      nextShares[key] = currentShares[key] + actualDelta;
      distributed += actualDelta;
    }

    const remainder = growDelta - distributed;
    if (Math.abs(remainder) > 0.01) {
      nextShares[otherKeys[otherKeys.length - 1]] += remainder;
    }
  }

  const totalShare = COLUMN_KEYS.reduce((sum, key) => sum + nextShares[key], 0);
  if (Math.abs(totalShare - 100) > 0.01) {
    nextShares.businessObject += 100 - totalShare;
  }

  return nextShares;
};

// ================= Mock 数据 =================
export const mockRules: CodeRule[] = [
  {
    id: 'rule_1',
    name: '物料编码规则',
    code: 'MATERIAL_CODE',
    businessObject: '物料分类',
    description: '用于所有标准物料的自动编号',
    separator: '-',
    status: 'ACTIVE',
    validateFormat: true,
    updateOnModify: false,
    showOnCreate: true,
    allowManualEdit: false,
    inheritParentPrefix: true,
    segments: [],
    subRules: {
      category: {
        separator: '-',
        segments: [
          { id: 'mc1', type: 'STRING', value: 'MAT' },
          { id: 'mc2', type: 'SEQUENCE', length: 3, startValue: 1, step: 1, resetRule: 'NEVER' },
        ],
        childSegments: [
          { id: 'mc_c2', type: 'SEQUENCE', length: 3, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
        ],
      },
      attribute: {
        separator: '-',
        segments: [
          { id: 'ma1', type: 'VARIABLE', variableKey: 'CATEGORY_CODE' },
          { id: 'ma2', type: 'STRING', value: 'ATTR' },
          { id: 'ma3', type: 'SEQUENCE', length: 3, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
        ],
      },
      enum: {
        separator: '-',
        segments: [
          { id: 'me1', type: 'VARIABLE', variableKey: 'ATTRIBUTE_CODE' },
          { id: 'me2', type: 'SEQUENCE', length: 2, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
        ],
      },
    },
  },
  {
    id: 'rule_2',
    name: '文档编码规则',
    code: 'DOC_CODE',
    businessObject: '文档分类',
    description: '研发设计图纸编码规则',
    separator: '-',
    status: 'ACTIVE',
    validateFormat: false,
    updateOnModify: false,
    showOnCreate: true,
    allowManualEdit: false,
    inheritParentPrefix: false,
    segments: [],
    subRules: {
      category: {
        separator: '-',
        segments: [
          { id: 'dc1', type: 'STRING', value: 'DOC' },
          { id: 'dc2', type: 'SEQUENCE', length: 4, startValue: 1, step: 1, resetRule: 'NEVER' },
        ],
      },
      attribute: { separator: '-', segments: [] },
      enum: { separator: '-', segments: [] },
    },
  },
  {
    id: 'rule_3',
    name: '产品编码规则',
    code: 'PRODUCT_CODE',
    businessObject: '产品分类',
    description: '产品基础编码',
    separator: '-',
    status: 'DRAFT',
    validateFormat: true,
    updateOnModify: true,
    showOnCreate: true,
    allowManualEdit: true,
    inheritParentPrefix: true,
    segments: [],
    subRules: {
      category: {
        separator: '-',
        segments: [
          { id: 'pc1', type: 'STRING', value: 'PRD' },
          { id: 'pc3', type: 'SEQUENCE', length: 3, startValue: 1, step: 1, resetRule: 'NEVER' },
        ],
        childSegments: [
          { id: 'pc_c2', type: 'SEQUENCE', length: 2, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
        ],
      },
      attribute: {
        separator: '-',
        segments: [
          { id: 'pa1', type: 'VARIABLE', variableKey: 'CATEGORY_CODE' },
          { id: 'pa2', type: 'STRING', value: 'A' },
          { id: 'pa3', type: 'SEQUENCE', length: 3, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
        ],
      },
      enum: {
        separator: '',
        segments: [
          { id: 'pe1', type: 'VARIABLE', variableKey: 'ATTRIBUTE_CODE' },
          { id: 'pe2', type: 'SEQUENCE', length: 2, startValue: 1, step: 1, resetRule: 'PER_PARENT' },
        ],
      },
    },
  },
  {
    id: 'rule_4',
    name: 'BOM编码规则',
    code: 'BOM_CODE',
    businessObject: 'BOM分类',
    description: 'BOM清单自动编码',
    separator: '',
    status: 'INACTIVE',
    validateFormat: false,
    updateOnModify: false,
    showOnCreate: false,
    allowManualEdit: true,
    inheritParentPrefix: false,
    segments: [],
    subRules: {
      category: {
        separator: '',
        segments: [
          { id: 'bc1', type: 'STRING', value: 'BOM' },
          { id: 'bc2', type: 'SEQUENCE', length: 8, startValue: 1, step: 1, resetRule: 'NEVER' },
        ],
      },
      attribute: { separator: '-', segments: [] },
      enum: { separator: '-', segments: [] },
    },
  },
];
