'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Splitter, theme, Flex, Empty, App, Spin } from 'antd';
import { useDictionary } from '@/contexts/DictionaryContext';
import {
  CATEGORY_BUSINESS_DOMAIN_DICT_CODE,
  getCategoryBusinessDomainConfigs,
  getCategoryBusinessDomainLabel,
} from '@/features/category/businessDomains';
import { codeRuleApi } from '@/services/codeRule';
import type { CodeRule } from './components/types';
import CodeRuleList from './components/CodeRuleList';
import CodeRuleWorkspace from './components/CodeRuleWorkspace';
import CreateCodeRuleSetModal from './components/CreateCodeRuleSetModal';
import {
  buildRuleSaveRequestsFromEditor,
  buildRuleSetSaveRequestFromEditor,
  createDraftRuleSetEditor,
  getNonDraftRuleCodes,
  mapRuleSetDetailToEditor,
  mapRuleSetSummaryToEditor,
} from './components/mappers';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const message = Reflect.get(error, 'message');
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    const msg = Reflect.get(error, 'msg');
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
  }
  return fallback;
};

export default function CodeSettingPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { ensureBatch, getEntries } = useDictionary();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rules, setRules] = useState<CodeRule[]>([]);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const businessDomainEntries = getEntries(CATEGORY_BUSINESS_DOMAIN_DICT_CODE);
  const messageRef = useRef(message);
  const businessDomainEntriesRef = useRef(businessDomainEntries);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    businessDomainEntriesRef.current = businessDomainEntries;
  }, [businessDomainEntries]);
  const availableBusinessDomains = useMemo(() => {
    const existingDomains = new Set(rules.map((rule) => String(rule.businessDomain || rule.code).trim().toUpperCase()));
    return getCategoryBusinessDomainConfigs(businessDomainEntries)
      .filter((item) => !existingDomains.has(item.code))
      .map((item) => ({ value: item.code, label: item.label }));
  }, [businessDomainEntries, rules]);

  const activeRule = useMemo(() => rules.find(r => r.id === activeRuleId), [rules, activeRuleId]);
  const activeBusinessDomain = useMemo(() => {
    if (!activeRuleId || !activeRule || activeRule.isNew) {
      return null;
    }

    return activeRule.businessDomain || activeRule.ruleSetMeta?.businessDomain || activeRule.code || activeRuleId;
  }, [activeRule, activeRuleId]);
  const activeRuleSaveDisabledReason = useMemo(() => {
    if (!activeRule?.ruleMetadata) {
      return undefined;
    }

    const lockedRuleCodes = getNonDraftRuleCodes(activeRule);
    if (lockedRuleCodes.length === 0) {
      return undefined;
    }

    return `当前规则集绑定的规则不是草稿状态（${lockedRuleCodes.join('、')}），后端仅允许编辑 DRAFT 规则。`;
  }, [activeRule]);
  const activeRulePublishDisabledReason = useMemo(() => {
    if (!activeRule) {
      return undefined;
    }
    if (activeRule.isNew) {
      return '请先保存新建规则集，再执行发布。';
    }
    if (activeRule.status === 'ACTIVE') {
      return '当前规则集已处于启用状态。';
    }
    if (activeRule.status === 'ARCHIVED') {
      return '归档规则集不允许再次发布。';
    }
    return undefined;
  }, [activeRule]);

  const decorateBusinessObject = useCallback((rule: CodeRule): CodeRule => ({
    ...rule,
    businessObject: getCategoryBusinessDomainLabel(
      businessDomainEntriesRef.current,
      rule.businessDomain || rule.ruleSetMeta?.businessDomain || rule.code,
      rule.businessObject,
    ),
  }), []);

  const showErrorMessage = useCallback((error: unknown, fallback: string) => {
    messageRef.current.error(getErrorMessage(error, fallback));
  }, []);

  const hydrateRuleSetDetail = useCallback(async (businessDomain: string) => {
    const detail = await codeRuleApi.getRuleSetDetail(businessDomain);
    const categoryRulePromise = detail.rules.CATEGORY?.latestRuleJson?.subRules
      ? Promise.resolve(detail.rules.CATEGORY)
      : codeRuleApi.getRuleDetail(detail.categoryRuleCode);
    const attributeRulePromise = detail.rules.ATTRIBUTE?.latestRuleJson?.subRules
      ? Promise.resolve(detail.rules.ATTRIBUTE)
      : codeRuleApi.getRuleDetail(detail.attributeRuleCode);
    const lovRulePromise = detail.rules.LOV?.latestRuleJson?.subRules
      ? Promise.resolve(detail.rules.LOV)
      : codeRuleApi.getRuleDetail(detail.lovRuleCode);

    const [categoryRule, attributeRule, lovRule] = await Promise.all([
      categoryRulePromise,
      attributeRulePromise,
      lovRulePromise,
    ]);

    return {
      ...detail,
      rules: {
        CATEGORY: categoryRule,
        ATTRIBUTE: attributeRule,
        LOV: lovRule,
      },
    };
  }, []);

  const loadRuleSets = useCallback(async () => {
    setListLoading(true);
    try {
      const summaries = await codeRuleApi.listRuleSets();
      const mappedRules = summaries.map((summary) => decorateBusinessObject(mapRuleSetSummaryToEditor(summary)));
      setRules(mappedRules);
      setActiveRuleId((prev) => {
        if (prev && mappedRules.some((rule) => rule.id === prev)) {
          return prev;
        }
        return mappedRules[0]?.id || null;
      });
    } catch (error) {
      showErrorMessage(error, '加载编码规则集失败');
    } finally {
      setListLoading(false);
    }
  }, [decorateBusinessObject, showErrorMessage]);

  useEffect(() => {
    void ensureBatch([CATEGORY_BUSINESS_DOMAIN_DICT_CODE]);
  }, [ensureBatch]);

  useEffect(() => {
    setRules((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      let changed = false;
      const nextRules = prev.map((rule) => {
        const decoratedRule = decorateBusinessObject(rule);
        if (decoratedRule.businessObject !== rule.businessObject) {
          changed = true;
          return decoratedRule;
        }
        return rule;
      });

      return changed ? nextRules : prev;
    });
  }, [businessDomainEntries, decorateBusinessObject]);

  useEffect(() => {
    void loadRuleSets();
  }, [loadRuleSets]);

  useEffect(() => {
    if (!activeBusinessDomain) {
      return;
    }

    let cancelled = false;

    const loadRuleSetDetail = async () => {
      setDetailLoading(true);
      try {
        const detail = await hydrateRuleSetDetail(activeBusinessDomain);
        if (cancelled) {
          return;
        }

        const mappedDetail = decorateBusinessObject(mapRuleSetDetailToEditor(detail));
        setRules((prev) => {
          const exists = prev.some((rule) => rule.id === mappedDetail.id);
          if (!exists) {
            return [mappedDetail, ...prev];
          }
          return prev.map((rule) => (rule.id === mappedDetail.id ? mappedDetail : rule));
        });
      } catch (error) {
        if (!cancelled) {
          showErrorMessage(error, '加载编码规则详情失败');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadRuleSetDetail();

    return () => {
      cancelled = true;
    };
  }, [activeBusinessDomain, decorateBusinessObject, hydrateRuleSetDetail, showErrorMessage]);

  const handleSaveRule = useCallback(async (updatedRule: CodeRule) => {
    const ruleRequests = buildRuleSaveRequestsFromEditor(updatedRule);
    const ruleSetRequest = buildRuleSetSaveRequestFromEditor(updatedRule);

    if (!ruleSetRequest || ruleRequests.length !== 3) {
      message.error('当前规则集缺少后端元数据，无法保存。');
      throw new Error('missing rule metadata');
    }

    setSaving(true);
    try {
      if (updatedRule.isNew) {
        for (const request of ruleRequests) {
          await codeRuleApi.createRule(request);
        }
        await codeRuleApi.createRuleSet(ruleSetRequest);
      } else {
        await Promise.all(ruleRequests.map((request) => codeRuleApi.updateRule(request.ruleCode, request)));
        await codeRuleApi.updateRuleSet(ruleSetRequest.businessDomain, ruleSetRequest);
      }

      const refreshedDetail = await hydrateRuleSetDetail(ruleSetRequest.businessDomain);
      const mappedRule = decorateBusinessObject(mapRuleSetDetailToEditor(refreshedDetail));

      setRules((prev) => {
        const nextRules = prev.filter((rule) => rule.id !== updatedRule.id);
        return [mappedRule, ...nextRules];
      });
      setActiveRuleId(mappedRule.id);
      message.success(updatedRule.isNew ? '规则集创建成功' : '编码规则保存成功');
    } catch (error) {
      const errorMessage = getErrorMessage(error, updatedRule.isNew ? '创建规则集失败' : '保存编码规则失败');
      message.error(errorMessage);
      throw error instanceof Error ? error : new Error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [decorateBusinessObject, hydrateRuleSetDetail, message]);

  const handleAddRuleSet = useCallback(() => {
    if (!availableBusinessDomains.length) {
      message.warning('没有可用于新建规则集的业务领域，或当前业务领域已全部配置。');
      return;
    }
    setCreateModalOpen(true);
  }, [availableBusinessDomains.length, message]);

  const handleCreateRuleSet = useCallback(async (values: { businessDomain: string; name: string; remark?: string }) => {
    setCreating(true);
    try {
      const matched = availableBusinessDomains.find((item) => item.value === values.businessDomain);
      const draftRule = createDraftRuleSetEditor({
        businessDomain: values.businessDomain,
        businessDomainLabel: matched?.label || values.businessDomain,
        name: values.name,
        remark: values.remark,
      });

      setRules((prev) => [decorateBusinessObject(draftRule), ...prev]);
      setActiveRuleId(draftRule.id);
      setCreateModalOpen(false);
      message.success('已创建本地规则集草稿，请补充配置后保存。');
    } finally {
      setCreating(false);
    }
  }, [availableBusinessDomains, decorateBusinessObject, message]);

  const handlePublishRule = useCallback(async (rule: CodeRule) => {
    if (rule.isNew) {
      message.warning('请先保存新建规则集，再执行发布。');
      return;
    }
    const businessDomain = rule.ruleSetMeta?.businessDomain || rule.businessDomain || rule.code;
    if (!businessDomain) {
      message.error('缺少业务域编码，无法发布规则集。');
      return;
    }

    setPublishing(true);
    try {
      await codeRuleApi.publishRuleSet(businessDomain);
      const refreshedDetail = await hydrateRuleSetDetail(businessDomain);
      const mappedRule = decorateBusinessObject(mapRuleSetDetailToEditor(refreshedDetail));
      setRules((prev) => prev.map((item) => (item.id === businessDomain ? mappedRule : item)));
      setActiveRuleId(businessDomain);
      message.success('规则集发布成功');
    } catch (error) {
      message.error(getErrorMessage(error, '规则集发布失败'));
      throw error instanceof Error ? error : new Error('publish failed');
    } finally {
      setPublishing(false);
    }
  }, [decorateBusinessObject, hydrateRuleSetDetail, message]);

  const handleBatchDeleteRuleSets = useCallback((ids: React.Key[]) => {
    if (!ids.length) {
      return;
    }

    message.info(`已恢复批量选择入口，但规则集删除接口尚未接入；当前选中了 ${ids.length} 个业务领域规则集。`);
  }, [message]);

  return (
    <div style={{
      height: "calc(100vh - 163px)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      overflow: "hidden",
    }}>
      <Splitter
        onCollapse={(collapsed) => setLeftCollapsed(collapsed[0] ?? false)}
        style={{
          flex: 1,
          minHeight: 0,
          background: "var(--ant-color-bg-container, #fff)",
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <Splitter.Panel
          defaultSize={450}
          min={350}
          max={550}
          collapsible={{ end: true, showCollapsibleIcon: leftCollapsed ? true : "auto" }}
        >
          <CodeRuleList
            rules={rules}
            loading={listLoading}
            allowMutations
            activeId={activeRuleId}
            onSelect={setActiveRuleId}
            onRefresh={loadRuleSets}
            onAdd={handleAddRuleSet}
            onBatchDelete={handleBatchDeleteRuleSets}
          />
        </Splitter.Panel>

        <Splitter.Panel>
          <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
            {detailLoading && !activeRule?.ruleMetadata ? (
              <Flex justify="center" align="center" style={{ height: "100%", background: token.colorBgLayout }}>
                <Spin tip="正在加载规则详情..." />
              </Flex>
            ) : activeRule?.ruleMetadata ? (
              <CodeRuleWorkspace
                rule={activeRule}
                saving={saving}
                publishing={publishing}
                saveDisabledReason={activeRuleSaveDisabledReason}
                publishDisabledReason={activeRulePublishDisabledReason}
                onSave={handleSaveRule}
                onPublish={handlePublishRule}
              />
            ) : (
              <Flex justify="center" align="center" style={{ height: "100%", background: token.colorBgLayout }}>
                <Empty description={listLoading ? '正在加载编码规则集' : '请在左侧选择一个规则进行设计'} />
              </Flex>
            )}
          </div>
        </Splitter.Panel>
      </Splitter>
      <CreateCodeRuleSetModal
        open={createModalOpen}
        loading={creating}
        businessDomainOptions={availableBusinessDomains}
        initialBusinessDomain={availableBusinessDomains[0]?.value}
        onCancel={() => setCreateModalOpen(false)}
        onSubmit={handleCreateRuleSet}
      />
    </div>
  );
}
