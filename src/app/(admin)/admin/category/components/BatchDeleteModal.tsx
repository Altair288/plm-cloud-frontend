'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Alert,
  Switch,
  Checkbox,
  Tag,
  Typography,
  Space,
  Skeleton,
  Result,
  Spin,
  Button,
  theme,
  App,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  metaCategoryApi,
  type MetaCategoryBatchDeleteResponseDto,
} from '@/services/metaCategory';

const { Text } = Typography;

// ─── Types ───────────────────────────────────────────────────────

type DeletePhase = 'idle' | 'dryrun' | 'impact' | 'executing' | 'result';

export interface DeleteTargetNode {
  key: React.Key;
  name?: string;
  code?: string;
  level?: number;
  status?: string;
}

export interface BatchDeleteModalProps {
  open: boolean;
  nodes: DeleteTargetNode[];
  onClose: () => void;
  onDeleted: (deletedIds: string[]) => void;
}

// ─── Constants ───────────────────────────────────────────────────

const CATEGORY_HAS_CHILDREN = 'CATEGORY_HAS_CHILDREN';
const CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND';

// ─── Detail list item ───────────────────────────────────────────

interface DetailItem {
  id: string;
  name: string;
  code: string;
  level?: number;
  isLocal: boolean;
  dryRunSuccess: boolean;
  errorCode: string | null;
  message: string | null;
  wouldDeleteCount: number;
}

// ─── Component ──────────────────────────────────────────────────

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  open,
  nodes,
  onClose,
  onDeleted,
}) => {
  const { token } = theme.useToken();
  const { message: messageApi } = App.useApp();

  const [phase, setPhase] = useState<DeletePhase>('idle');
  const [dryRunResponse, setDryRunResponse] = useState<MetaCategoryBatchDeleteResponseDto | null>(null);
  const [executeResponse, setExecuteResponse] = useState<MetaCategoryBatchDeleteResponseDto | null>(null);
  const [cascadeEnabled, setCascadeEnabled] = useState(false);
  const [cascadeConfirmed, setCascadeConfirmed] = useState(false);
  const [atomicEnabled, setAtomicEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const recheckSeq = useRef(0);

  // ─── Separate local / remote nodes ────────────────────────────

  const { localNodes, remoteIds, nodeMap } = useMemo(() => {
    const local: DeleteTargetNode[] = [];
    const ids: string[] = [];
    const map = new Map<string, DeleteTargetNode>();

    nodes.forEach((n) => {
      const id = String(n.key);
      map.set(id, n);
      if (id.startsWith('local_')) {
        local.push(n);
      } else {
        ids.push(id);
      }
    });

    return { localNodes: local, remoteIds: ids, nodeMap: map };
  }, [nodes]);

  // ─── Reset / auto-trigger dryRun ──────────────────────────────

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setDryRunResponse(null);
      setExecuteResponse(null);
      setCascadeEnabled(false);
      setCascadeConfirmed(false);
      setAtomicEnabled(false);
      setError(null);
      setRechecking(false);
      recheckSeq.current = 0;
      return;
    }

    if (nodes.length === 0) return;

    // All local → skip dryRun
    if (remoteIds.length === 0) {
      setPhase('impact');
      return;
    }

    setPhase('dryrun');
    metaCategoryApi
      .batchDeleteCategories({
        ids: remoteIds,
        cascade: false,
        confirm: false,
        atomic: false,
        dryRun: true,
        operator: 'admin',
      })
      .then((response) => {
        setDryRunResponse(response);
        setPhase('impact');
      })
      .catch((err) => {
        setError(err?.message || '预检失败');
        setPhase('impact');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─── Derived impact data ──────────────────────────────────────

  const { detailItems, hasCascadeRequired, cascadeRequiredCount } = useMemo(() => {
    const items: DetailItem[] = [];
    let cascadeCount = 0;

    localNodes.forEach((n) => {
      items.push({
        id: String(n.key),
        name: n.name || '未命名',
        code: n.code || '-',
        level: n.level,
        isLocal: true,
        dryRunSuccess: true,
        errorCode: null,
        message: null,
        wouldDeleteCount: 1,
      });
    });

    dryRunResponse?.results.forEach((result) => {
      const node = nodeMap.get(result.id);
      items.push({
        id: result.id,
        name: node?.name || result.id,
        code: node?.code || '-',
        level: node?.level,
        isLocal: false,
        dryRunSuccess: result.success,
        errorCode: result.code || null,
        message: result.message || null,
        wouldDeleteCount: result.wouldDeleteCount ?? (result.success ? 1 : 0),
      });
      if (result.code === CATEGORY_HAS_CHILDREN) cascadeCount++;
    });

    return {
      detailItems: items,
      hasCascadeRequired: cascadeCount > 0,
      cascadeRequiredCount: cascadeCount,
    };
  }, [localNodes, dryRunResponse, nodeMap]);

  const totalWouldDelete =
    dryRunResponse?.totalWouldDeleteCount ??
    detailItems.reduce((sum, i) => sum + i.wouldDeleteCount, 0);

  // anomalies only (exclude cascade-needed items)
  const anomalyCount = Math.max(
    0,
    (dryRunResponse?.failureCount ?? 0) - cascadeRequiredCount,
  );

  // ─── Cascade toggle → re-dryRun ──────────────────────────────

  const handleCascadeToggle = (checked: boolean) => {
    setCascadeEnabled(checked);
    setCascadeConfirmed(false);
    if (remoteIds.length === 0) return;

    const seq = ++recheckSeq.current;
    setRechecking(true);

    metaCategoryApi
      .batchDeleteCategories({
        ids: remoteIds,
        cascade: checked,
        confirm: checked,
        atomic: false,
        dryRun: true,
        operator: 'admin',
      })
      .then((response) => {
        if (recheckSeq.current !== seq) return;
        setDryRunResponse(response);
      })
      .catch((err) => {
        if (recheckSeq.current !== seq) return;
        messageApi.error(err?.message || '重新评估失败');
      })
      .finally(() => {
        if (recheckSeq.current === seq) setRechecking(false);
      });
  };

  // ─── Execute delete ───────────────────────────────────────────

  const handleExecute = async () => {
    setPhase('executing');
    setError(null);

    try {
      if (remoteIds.length === 0) {
        // Only local nodes
        setExecuteResponse({
          total: localNodes.length,
          successCount: localNodes.length,
          failureCount: 0,
          deletedCount: localNodes.length,
          totalWouldDeleteCount: localNodes.length,
          atomic: false,
          dryRun: false,
          results: localNodes.map((n) => ({
            id: String(n.key),
            success: true,
            deletedCount: 1,
          })),
        });
      } else {
        const response = await metaCategoryApi.batchDeleteCategories({
          ids: remoteIds,
          cascade: cascadeEnabled,
          confirm: cascadeEnabled && cascadeConfirmed,
          atomic: atomicEnabled,
          dryRun: false,
          operator: 'admin',
        });
        setExecuteResponse(response);
      }
      setPhase('result');
    } catch (err: any) {
      setError(err?.message || '删除执行失败');
      setPhase('result');
    }
  };

  // ─── Finish & report ──────────────────────────────────────────

  const handleFinish = () => {
    const deletedIds: string[] = [];
    localNodes.forEach((n) => deletedIds.push(String(n.key)));
    executeResponse?.results.forEach((r) => {
      if (r.success) deletedIds.push(r.id);
    });
    if (deletedIds.length > 0) onDeleted(deletedIds);
    onClose();
  };

  // ─── Derived flags ────────────────────────────────────────────

  const canExecute =
    phase === 'impact' &&
    !error &&
    !rechecking &&
    (!hasCascadeRequired || !cascadeEnabled || (cascadeEnabled && cascadeConfirmed));

  const isSingleDelete = nodes.length === 1;
  const modalTitle = isSingleDelete
    ? '删除分类'
    : `批量删除分类（${nodes.length} 项）`;

  const renderSummaryBar = (
    items: Array<{
      key: string;
      label: string;
      value: React.ReactNode;
      icon: React.ReactNode;
      valueColor?: string;
    }>,
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 14px',
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorFillQuaternary,
        flexWrap: 'wrap',
      }}
    >
      <Space size={20} wrap split={<span style={{ color: token.colorBorder }}>|</span>}>
        {items.map((item) => (
          <Space key={item.key} size={8} align="center">
            {item.icon}
            <Text type="secondary">{item.label}</Text>
            <Text strong style={{ fontSize: 16, color: item.valueColor || token.colorText }}>
              {item.value}
            </Text>
          </Space>
        ))}
      </Space>
    </div>
  );

  // ─── Column definitions ───────────────────────────────────────

  const impactColumns: ProColumns<DetailItem>[] = [
    {
      title: '分类编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      ellipsis: true,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, item) => {
        if (item.dryRunSuccess) return <Tag color="success">待删除</Tag>;
        if (item.errorCode === CATEGORY_HAS_CHILDREN)
          return <Tag color="warning">需级联</Tag>;
        if (item.errorCode === CATEGORY_NOT_FOUND)
          return <Tag color="default">已不存在</Tag>;
        return <Tag color="error">异常</Tag>;
      },
    },
    {
      title: '预计影响',
      key: 'wouldDeleteCount',
      width: 100,
      render: (_, item) =>
        item.wouldDeleteCount > 0 ? item.wouldDeleteCount : '-',
    },
  ];

  const resultColumns: ProColumns<DetailItem>[] = [
    {
      title: '分类编码',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      ellipsis: true,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, item) => {
        if (item.isLocal) return <Tag color="success">已删除</Tag>;
        const r = executeResponse?.results.find((x) => x.id === item.id);
        if (!r) return <Tag color="default">未处理</Tag>;
        if (r.success) return <Tag color="success">已删除</Tag>;
        if (r.code === CATEGORY_HAS_CHILDREN)
          return <Tag color="warning">需级联</Tag>;
        if (r.code === CATEGORY_NOT_FOUND)
          return <Tag color="default">已不存在</Tag>;
        return <Tag color="error">失败</Tag>;
      },
    },
    {
      title: '删除数',
      key: 'deletedCount',
      width: 80,
      render: (_, item) => {
        if (item.isLocal) return 1;
        const r = executeResponse?.results.find((x) => x.id === item.id);
        return r?.deletedCount ?? '-';
      },
    },
    {
      title: '原因',
      key: 'message',
      ellipsis: true,
      render: (_, item) => {
        if (item.isLocal) return '-';
        const r = executeResponse?.results.find((x) => x.id === item.id);
        if (!r || r.success) return '-';
        return (
          <Text type="danger" ellipsis={{ tooltip: true }}>
            {r.message || r.code || '未知错误'}
          </Text>
        );
      },
    },
  ];

  // ─── Phase renderers ──────────────────────────────────────────

  const renderDryRunPhase = () => (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Space orientation="vertical" size={16} align="center">
        <Skeleton active paragraph={{ rows: 3 }} />
        <Text type="secondary">正在评估删除影响...</Text>
      </Space>
    </div>
  );

  const renderImpactPhase = () => {
    if (error) {
      return <Result status="error" title="预检失败" subTitle={error} />;
    }

    return (
      <Spin spinning={rechecking} tip="重新评估中...">
        <ProTable<DetailItem>
          rowKey="id"
          search={false}
          options={false}
          pagination={
            detailItems.length > 10
              ? { pageSize: 10, size: 'small' }
              : false
          }
          scroll={detailItems.length > 6 ? { y: 240 } : undefined}
          cardBordered={false}
          columns={impactColumns}
          dataSource={detailItems}
          headerTitle={<Text strong>删除影响预检</Text>}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          tableExtraRender={() => (
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              {renderSummaryBar([
                {
                  key: 'pending',
                  label: '待删项',
                  value: nodes.length,
                  icon: <DeleteOutlined style={{ color: token.colorPrimary }} />,
                  valueColor: token.colorText,
                },
                {
                  key: 'impact',
                  label: '预计总销毁',
                  value: totalWouldDelete,
                  icon: (
                    <ExclamationCircleOutlined
                      style={{ color: totalWouldDelete > nodes.length ? '#d48806' : token.colorTextTertiary }}
                    />
                  ),
                  valueColor: totalWouldDelete > nodes.length ? '#d48806' : token.colorText,
                },
                {
                  key: 'anomaly',
                  label: '异常项',
                  value: anomalyCount,
                  icon: (
                    <WarningOutlined
                      style={{ color: anomalyCount > 0 ? token.colorError : token.colorTextTertiary }}
                    />
                  ),
                  valueColor: anomalyCount > 0 ? token.colorError : token.colorText,
                },
              ])}

              {hasCascadeRequired && !cascadeEnabled && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  message={
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                      <Text strong>
                        {cascadeRequiredCount === 1
                          ? '1 个分类包含子节点'
                          : `${cascadeRequiredCount} 个分类包含子节点`}
                      </Text>
                      <Space size={12} align="center">
                        <Text>开启级联删除</Text>
                        <Switch
                          size="small"
                          checked={cascadeEnabled}
                          onChange={handleCascadeToggle}
                        />
                      </Space>
                    </Space>
                  }
                  style={{ borderRadius: token.borderRadiusLG }}
                />
              )}

              {cascadeEnabled && (
                <Alert
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  message={
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text strong type="danger">
                          级联删除已开启 - 将同步删除所有子分类
                        </Text>
                        <Switch
                          size="small"
                          checked={cascadeEnabled}
                          onChange={handleCascadeToggle}
                        />
                      </div>
                      <Checkbox
                        checked={cascadeConfirmed}
                        onChange={(e) => setCascadeConfirmed(e.target.checked)}
                      >
                        <Text type="danger">
                          我已知晓此操作将同步删除所有子分类
                        </Text>
                      </Checkbox>
                    </Space>
                  }
                  style={{ borderRadius: token.borderRadiusLG }}
                />
              )}

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                }}
              >
                <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    高级配置
                  </Text>
                  <Checkbox
                    checked={atomicEnabled}
                    onChange={(e) => setAtomicEnabled(e.target.checked)}
                  >
                    失败时回滚整批操作（原子模式）
                  </Checkbox>
                  <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
                    开启后，若其中一项删除失败，所有已删项将恢复。
                  </Text>
                </Space>
              </div>
            </Space>
          )}
        />
      </Spin>
    );
  };

  const renderExecutingPhase = () => (
    <div style={{ padding: '60px 0', textAlign: 'center' }}>
      <Spin size="large" />
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">正在执行删除操作...</Text>
      </div>
    </div>
  );

  const renderResultPhase = () => {
    if (error && !executeResponse) {
      return <Result status="error" title="删除执行失败" subTitle={error} />;
    }

    const successCount =
      (executeResponse?.successCount ?? 0) + localNodes.length;
    const failCount = executeResponse?.failureCount ?? 0;
    const totalDeleted =
      (executeResponse?.deletedCount ?? 0) + localNodes.length;
    const isAllSuccess = failCount === 0;
    const isPartialSuccess = successCount > 0 && failCount > 0;

    return (
      <ProTable<DetailItem>
        rowKey="id"
        search={false}
        options={false}
        pagination={
          detailItems.length > 8
            ? { pageSize: 8, size: 'small' }
            : false
        }
        scroll={detailItems.length > 6 ? { y: 200 } : undefined}
        cardBordered={false}
        columns={resultColumns}
        dataSource={failCount > 0 ? detailItems : []}
        headerTitle={<Text strong>删除执行结果</Text>}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        tableExtraRender={() => (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            {renderSummaryBar([
              {
                key: 'success',
                label: '成功',
                value: successCount,
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                valueColor: '#52c41a',
              },
              {
                key: 'failed',
                label: '失败',
                value: failCount,
                icon: (
                  <ExclamationCircleOutlined
                    style={{ color: failCount > 0 ? token.colorError : token.colorTextTertiary }}
                  />
                ),
                valueColor: failCount > 0 ? token.colorError : token.colorText,
              },
              {
                key: 'deleted',
                label: '总计删除',
                value: totalDeleted,
                icon: <DeleteOutlined style={{ color: token.colorPrimary }} />,
                valueColor: token.colorText,
              },
            ])}

            <Result
              status={
                isAllSuccess ? 'success' : isPartialSuccess ? 'warning' : 'error'
              }
              icon={
                isAllSuccess ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                )
              }
              title={
                isAllSuccess
                  ? '删除完成'
                  : isPartialSuccess
                    ? '部分删除成功'
                    : '删除失败'
              }
              subTitle={
                isAllSuccess
                  ? '所有目标项均已完成删除处理。'
                  : isPartialSuccess
                    ? '部分目标项删除成功，失败项可在下方查看详细原因。'
                    : '本次删除未成功完成，请根据失败原因调整后重试。'
              }
              style={{ padding: '8px 0 0' }}
            />
          </Space>
        )}
      />
    );
  };

  // ─── Footer ───────────────────────────────────────────────────

  const footerButtons = () => {
    if (phase === 'dryrun' || phase === 'executing') {
      return [
        <Button key="cancel" disabled>
          取消
        </Button>,
      ];
    }

    if (phase === 'impact') {
      return [
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="execute"
          type="primary"
          danger
          disabled={!canExecute}
          onClick={handleExecute}
        >
          确认删除
        </Button>,
      ];
    }

    if (phase === 'result') {
      return [
        <Button key="close" type="primary" onClick={handleFinish}>
          完成
        </Button>,
      ];
    }

    return undefined;
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <Modal
      title={
        <Space>
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
          <span>{modalTitle}</span>
        </Space>
      }
      open={open}
      width={700}
      onCancel={phase === 'result' ? handleFinish : onClose}
      footer={footerButtons()}
      maskClosable={false}
      keyboard={false}
      destroyOnHidden
    >
      {phase === 'dryrun' && renderDryRunPhase()}
      {phase === 'impact' && renderImpactPhase()}
      {phase === 'executing' && renderExecutingPhase()}
      {phase === 'result' && renderResultPhase()}
    </Modal>
  );
};

export default BatchDeleteModal;
