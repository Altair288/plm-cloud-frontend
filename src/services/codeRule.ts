import request from './request';
import type {
  CodeRuleDetailDto,
  CodeRulePreviewRequestDto,
  CodeRulePreviewResponseDto,
  CodeRuleSaveRequestDto,
  CodeRuleSetDetailDto,
  CodeRuleSetSaveRequestDto,
  CodeRuleSetSummaryDto,
  CodeRuleSummaryDto,
} from '@/models/codeRule';

const CODE_RULE_BASE = '/api/meta/code-rules';
const CODE_RULE_SET_BASE = '/api/meta/code-rule-sets';

export const codeRuleApi = {
  /**
   * 编码规则列表
   * GET /api/meta/code-rules
   */
  listRules: (params?: {
    businessDomain?: string;
    targetType?: string;
    status?: string;
  }): Promise<CodeRuleSummaryDto[]> => {
    return request.get(CODE_RULE_BASE, { params });
  },

  /**
   * 编码规则详情
   * GET /api/meta/code-rules/{ruleCode}
   */
  getRuleDetail: (ruleCode: string): Promise<CodeRuleDetailDto> => {
    return request.get(`${CODE_RULE_BASE}/${encodeURIComponent(ruleCode)}`);
  },

  /**
   * 创建编码规则
   * POST /api/meta/code-rules
   */
  createRule: (data: CodeRuleSaveRequestDto, operator?: string): Promise<CodeRuleDetailDto> => {
    return request.post(CODE_RULE_BASE, data, {
      params: operator ? { operator } : undefined,
    });
  },

  /**
   * 更新编码规则
   * PUT /api/meta/code-rules/{ruleCode}
   */
  updateRule: (ruleCode: string, data: CodeRuleSaveRequestDto, operator?: string): Promise<CodeRuleDetailDto> => {
    return request.put(`${CODE_RULE_BASE}/${encodeURIComponent(ruleCode)}`, data, {
      params: operator ? { operator } : undefined,
    });
  },

  /**
   * 发布编码规则
   * POST /api/meta/code-rules/{ruleCode}:publish
   */
  publishRule: (ruleCode: string, operator?: string): Promise<CodeRuleDetailDto> => {
    return request.post(`${CODE_RULE_BASE}/${encodeURIComponent(ruleCode)}:publish`, undefined, {
      params: operator ? { operator } : undefined,
    });
  },

  /**
   * 编码规则预览
   * POST /api/meta/code-rules/{ruleCode}:preview
   */
  previewRule: (ruleCode: string, data: CodeRulePreviewRequestDto): Promise<CodeRulePreviewResponseDto> => {
    return request.post(`${CODE_RULE_BASE}/${encodeURIComponent(ruleCode)}:preview`, data);
  },

  /**
   * 规则集列表
   * GET /api/meta/code-rule-sets
   */
  listRuleSets: (): Promise<CodeRuleSetSummaryDto[]> => {
    return request.get(CODE_RULE_SET_BASE);
  },

  /**
   * 规则集详情
   * GET /api/meta/code-rule-sets/{businessDomain}
   */
  getRuleSetDetail: (businessDomain: string): Promise<CodeRuleSetDetailDto> => {
    return request.get(`${CODE_RULE_SET_BASE}/${encodeURIComponent(businessDomain)}`);
  },

  /**
   * 创建规则集
   * POST /api/meta/code-rule-sets
   */
  createRuleSet: (data: CodeRuleSetSaveRequestDto, operator?: string): Promise<CodeRuleSetDetailDto> => {
    return request.post(CODE_RULE_SET_BASE, data, {
      params: operator ? { operator } : undefined,
    });
  },

  /**
   * 更新规则集
   * PUT /api/meta/code-rule-sets/{businessDomain}
   */
  updateRuleSet: (
    businessDomain: string,
    data: CodeRuleSetSaveRequestDto,
    operator?: string,
  ): Promise<CodeRuleSetDetailDto> => {
    return request.put(`${CODE_RULE_SET_BASE}/${encodeURIComponent(businessDomain)}`, data, {
      params: operator ? { operator } : undefined,
    });
  },

  /**
   * 发布规则集
   * POST /api/meta/code-rule-sets/{businessDomain}:publish
   */
  publishRuleSet: (businessDomain: string, operator?: string): Promise<CodeRuleSetDetailDto> => {
    return request.post(`${CODE_RULE_SET_BASE}/${encodeURIComponent(businessDomain)}:publish`, undefined, {
      params: operator ? { operator } : undefined,
    });
  },
};