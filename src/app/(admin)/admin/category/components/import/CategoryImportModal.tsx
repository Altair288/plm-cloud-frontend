'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Flex, Typography, Button, Steps, Table, Upload, Switch, Select, Tag,
  Alert, Progress, Result, Descriptions, Tooltip, App, theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UploadOutlined,
  FileExcelOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  WarningFilled,
  InfoCircleFilled,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import DraggableModal from '@/components/DraggableModal';
import type {
  ImportStep,
  StepStatus,
  ImportRow,
  ImportConfig,
  DryRunResult,
  ImportResult,
  CodeStrategy,
  ValidationSeverity,
} from './types';
import {
  IMPORT_STEPS,
  DEFAULT_IMPORT_CONFIG,
  MOCK_PARSED_ROWS,
  MOCK_PARSED_ROWS_WITH_CODE,
  MOCK_DRY_RUN_RESULT,
  MOCK_IMPORT_RESULT,
} from './types';

const { Text, Title } = Typography;

const MODAL_BODY_HEIGHT = 'calc(100vh - 260px)';

interface CategoryImportModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  defaultBusinessDomain?: string;
}

// ===== Step 图标 =====
const STEP_ICONS = [
  <FileExcelOutlined key="upload" />,
  <SettingOutlined key="config" />,
  <SafetyCertificateOutlined key="dryrun" />,
  <ImportOutlined key="exec" />,
];

// ===== 验证严重度配色 =====
const SEVERITY_CONFIG: Record<ValidationSeverity, { color: string; icon: React.ReactNode }> = {
  success: { color: 'success', icon: <CheckCircleFilled /> },
  warning: { color: 'warning', icon: <WarningFilled /> },
  error: { color: 'error', icon: <CloseCircleFilled /> },
};

const CategoryImportModal: React.FC<CategoryImportModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();

  // ===== 流程状态 =====
  const [currentStep, setCurrentStep] = useState<ImportStep>(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(['process', 'wait', 'wait', 'wait']);

  // ===== Step 0: 文件上传 =====
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);

  // ===== Step 1: 配置 =====
  const [config, setConfig] = useState<ImportConfig>(DEFAULT_IMPORT_CONFIG);

  // ===== Step 2: Dry-Run 结果 =====
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);

  // ===== Step 3: 执行结果 =====
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ===== 重置 =====
  const resetAll = useCallback(() => {
    setCurrentStep(0);
    setStepStatuses(['process', 'wait', 'wait', 'wait']);
    setUploadedFile(null);
    setParsedRows([]);
    setConfig(DEFAULT_IMPORT_CONFIG);
    setDryRunning(false);
    setDryRunResult(null);
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const handleCancel = useCallback(() => {
    resetAll();
    onCancel();
  }, [resetAll, onCancel]);

  // ===== 步骤状态更新 =====
  const markStep = useCallback((step: number, status: StepStatus) => {
    setStepStatuses(prev => {
      const next = [...prev];
      next[step] = status;
      return next;
    });
  }, []);

  // ===== Step 0: 模拟文件解析 =====
  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    // Mock: 模拟文件解析延迟
    setTimeout(() => {
      setParsedRows(MOCK_PARSED_ROWS);
      message.success(`已解析 ${MOCK_PARSED_ROWS.length} 条数据`);
    }, 600);
    return false; // 阻止 antd 自动上传
  }, [message]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setParsedRows([]);
  }, []);

  // ===== 前进/后退 =====
  const goNext = useCallback(() => {
    const next = (currentStep + 1) as ImportStep;
    if (next > 3) return;
    markStep(currentStep, 'finish');
    markStep(next, 'process');
    setCurrentStep(next);
  }, [currentStep, markStep]);

  const goPrev = useCallback(() => {
    const prev = (currentStep - 1) as ImportStep;
    if (prev < 0) return;
    markStep(currentStep, 'wait');
    markStep(prev, 'process');
    setCurrentStep(prev);

    // 回退到配置步骤时清空 dry-run 结果
    if (prev <= 1) {
      setDryRunResult(null);
    }
  }, [currentStep, markStep]);

  // ===== Step 2: Mock Dry-Run =====
  const runDryRun = useCallback(() => {
    setDryRunning(true);
    setDryRunResult(null);
    setTimeout(() => {
      const result = { ...MOCK_DRY_RUN_RESULT };
      // 根据配置策略调整预览行
      if (config.codeStrategy === 'EXCEL') {
        const rowsWithCode = MOCK_PARSED_ROWS_WITH_CODE;
        setParsedRows(rowsWithCode);
      }
      setDryRunResult(result);
      setDryRunning(false);
      if (result.errorRows > 0) {
        markStep(2, 'error');
      }
    }, 1500);
  }, [config.codeStrategy, markStep]);

  // ===== Step 3: Mock Import =====
  const runImport = useCallback(() => {
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const total = parsedRows.length;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setImportProgress(Math.round((current / total) * 100));
      if (current >= total) {
        clearInterval(timer);
        setImporting(false);
        setImportResult(MOCK_IMPORT_RESULT);
        markStep(3, MOCK_IMPORT_RESULT.success ? 'finish' : 'error');
      }
    }, 200);
  }, [parsedRows.length, markStep]);

  const handleConfirmImport = useCallback(() => {
    markStep(2, 'finish');
    markStep(3, 'process');
    setCurrentStep(3);
    runImport();
  }, [markStep, runImport]);

  // ===== 展示数据行（dry-run 后带生成编码） =====
  const displayRows = useMemo(() => {
    if (!dryRunResult?.generatedCodes) return parsedRows;
    const codeMap = new Map(dryRunResult.generatedCodes.map(c => [c.rowIndex, c.generatedCode]));
    return parsedRows.map(row => ({
      ...row,
      code: codeMap.get(row.rowIndex) ?? row.code,
    }));
  }, [parsedRows, dryRunResult]);

  // ===== 预览表格列定义 =====
  const previewColumns: ColumnsType<ImportRow> = useMemo(() => {
    const issueMap = new Map<number, { severity: ValidationSeverity; message: string }[]>();
    if (dryRunResult) {
      for (const issue of dryRunResult.issues) {
        const list = issueMap.get(issue.rowIndex) ?? [];
        list.push({ severity: issue.severity, message: issue.message });
        issueMap.set(issue.rowIndex, list);
      }
    }

    return [
      {
        title: '#',
        dataIndex: 'rowIndex',
        width: 48,
        align: 'center' as const,
        render: (idx: number) => {
          const issues = issueMap.get(idx);
          if (!issues) return <Text type="secondary">{idx}</Text>;
          const worst = issues.some(i => i.severity === 'error') ? 'error'
            : issues.some(i => i.severity === 'warning') ? 'warning' : 'success';
          return (
            <Tooltip title={issues.map(i => i.message).join('\n')}>
              <span style={{ color: token[worst === 'error' ? 'colorError' : worst === 'warning' ? 'colorWarning' : 'colorSuccess'] }}>
                {SEVERITY_CONFIG[worst].icon} {idx}
              </span>
            </Tooltip>
          );
        },
      },
      {
        title: '编码',
        dataIndex: 'code',
        width: 140,
        render: (code: string, record: ImportRow) => {
          if (!code) return <Text type="secondary" italic>（系统生成）</Text>;
          const gen = dryRunResult?.generatedCodes?.find(c => c.rowIndex === record.rowIndex);
          if (gen && gen.originalCode && gen.originalCode !== gen.generatedCode) {
            return (
              <Tooltip title={`原始: ${gen.originalCode} → 生成: ${gen.generatedCode}`}>
                <Text code style={{ fontSize: 12 }}>{code}</Text>
              </Tooltip>
            );
          }
          return <Text code style={{ fontSize: 12 }}>{code}</Text>;
        },
      },
      {
        title: '名称',
        dataIndex: 'name',
        ellipsis: true,
      },
      {
        title: '父级编码',
        dataIndex: 'parentCode',
        width: 120,
        render: (v: string) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: '层级',
        dataIndex: 'level',
        width: 56,
        align: 'center' as const,
        render: (v: number) => <Tag style={{ margin: 0 }}>L{v}</Tag>,
      },
      {
        title: '描述',
        dataIndex: 'description',
        ellipsis: true,
        render: (v: string) => v || <Text type="secondary">—</Text>,
      },
    ];
  }, [dryRunResult, token]);

  // ===== 各步骤内容渲染 =====
  const renderStep0 = () => (
    <Flex vertical gap={16} style={{ height: '100%', minHeight: 0 }}>
      {!uploadedFile ? (
        <Upload.Dragger
          accept=".xlsx,.xls,.csv"
          beforeUpload={handleFileUpload}
          showUploadList={false}
          style={{ padding: '32px 0' }}
        >
          <Flex vertical align="center" gap={8}>
            <UploadOutlined style={{ fontSize: 36, color: token.colorPrimary }} />
            <Text strong>点击或拖拽文件到此处上传</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>支持 .xlsx, .xls, .csv 格式</Text>
          </Flex>
        </Upload.Dragger>
      ) : (
        <Flex
          align="center"
          justify="space-between"
          style={{
            padding: '10px 16px',
            background: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Flex align="center" gap={10}>
            <FileExcelOutlined style={{ fontSize: 20, color: '#217346' }} />
            <Flex vertical gap={0}>
              <Text strong style={{ fontSize: 13 }}>{uploadedFile.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {(uploadedFile.size / 1024).toFixed(1)} KB · 已解析 {parsedRows.length} 条
              </Text>
            </Flex>
          </Flex>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={handleRemoveFile}
          >
            移除
          </Button>
        </Flex>
      )}

      {parsedRows.length > 0 && (
        <div
          className="category-import-preview-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Table<ImportRow>
            dataSource={parsedRows}
            columns={previewColumns}
            rowKey="rowIndex"
            size="small"
            pagination={false}
            tableLayout="fixed"
            sticky={false}
            style={{ borderRadius: token.borderRadiusLG, overflow: 'hidden' }}
          />
        </div>
      )}
    </Flex>
  );

  const renderStep1 = () => (
    <Flex vertical gap={16}>
      <Flex vertical gap={12}>
        <Flex align="center" justify="space-between"
          style={{
            padding: '12px 16px',
            background: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Flex vertical gap={2}>
            <Text strong style={{ fontSize: 13 }}>编码策略</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {config.codeStrategy === 'EXCEL'
                ? '使用 Excel 中手动填写的编码值'
                : '由系统编码规则自动生成编码'}
            </Text>
          </Flex>
          <Select
            size="middle"
            value={config.codeStrategy}
            onChange={(v: CodeStrategy) => setConfig(prev => ({ ...prev, codeStrategy: v }))}
            options={[
              { value: 'SYSTEM', label: '系统编码规则' },
              { value: 'EXCEL', label: 'Excel 手动编码' },
            ]}
            style={{ width: 160 }}
          />
        </Flex>

        {config.codeStrategy === 'EXCEL' && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleFilled />}
            title="Excel 编码优先"
            description="系统将优先使用 Excel 中填写的编码值，空编码行仍由系统编码规则自动生成。"
            style={{ borderRadius: token.borderRadiusLG }}
          />
        )}

        <Flex
          align="center"
          justify="space-between"
          style={{
            padding: '12px 16px',
            background: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Flex vertical gap={2}>
            <Text strong style={{ fontSize: 13 }}>跳过重复编码</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>遇到系统中已存在的编码时自动跳过该行</Text>
          </Flex>
          <Switch
            checked={config.skipDuplicateCode}
            onChange={(v) => setConfig(prev => ({ ...prev, skipDuplicateCode: v }))}
          />
        </Flex>

        <Flex
          align="center"
          justify="space-between"
          style={{
            padding: '12px 16px',
            background: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Flex vertical gap={2}>
            <Text strong style={{ fontSize: 13 }}>更新已有分类</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>当编码匹配到已有分类时，用 Excel 数据覆盖更新</Text>
          </Flex>
          <Switch
            checked={config.updateExisting}
            onChange={(v) => setConfig(prev => ({ ...prev, updateExisting: v }))}
          />
        </Flex>
      </Flex>

      {/* 文件概要 */}
      <Flex
        align="center"
        gap={10}
        style={{
          padding: '8px 16px',
          background: token.colorInfoBg,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorInfoBorder}`,
        }}
      >
        <InfoCircleFilled style={{ color: token.colorPrimary }} />
        <Text style={{ fontSize: 12 }}>
          文件: <Text strong>{uploadedFile?.name}</Text> · 共 <Text strong>{parsedRows.length}</Text> 条数据待处理
        </Text>
      </Flex>
    </Flex>
  );

  const renderStep2 = () => (
    <Flex vertical gap={16} style={{ height: '100%', minHeight: 0 }}>
      {!dryRunResult && !dryRunning && (
        <Flex vertical align="center" gap={16} style={{ padding: '40px 0' }}>
          <SafetyCertificateOutlined style={{ fontSize: 40, color: token.colorTextQuaternary }} />
          <Text type="secondary">点击开始预检验证，系统将模拟导入过程并报告问题</Text>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={runDryRun}
          >
            开始预检
          </Button>
        </Flex>
      )}

      {dryRunning && (
        <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
          <Progress type="circle" percent={75} status="active" size={64} />
          <Text>正在执行预检验证...</Text>
        </Flex>
      )}

      {dryRunResult && (
        <Flex vertical gap={16} style={{ flex: 1, minHeight: 0 }}>
          {/* 统计概要 */}
          <Descriptions
            size="small"
            bordered
            column={4}
            style={{ borderRadius: token.borderRadiusLG, overflow: 'hidden' }}
          >
            <Descriptions.Item label="总行数">
              <Text strong>{dryRunResult.totalRows}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="有效">
              <Text strong style={{ color: token.colorSuccess }}>{dryRunResult.validRows}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="警告">
              <Text strong style={{ color: token.colorWarning }}>{dryRunResult.warningRows}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="错误">
              <Text strong style={{ color: token.colorError }}>{dryRunResult.errorRows}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="新增分类">
              <Text strong>{dryRunResult.newCategories}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="更新分类">
              <Text strong>{dryRunResult.updateCategories}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="跳过行数">
              <Text strong>{dryRunResult.skippedRows}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {dryRunResult.errorRows > 0
                ? <Tag color="error">有错误</Tag>
                : dryRunResult.warningRows > 0
                  ? <Tag color="warning">有警告</Tag>
                  : <Tag color="success">全部通过</Tag>
              }
            </Descriptions.Item>
          </Descriptions>

          {/* 问题列表 */}
          {dryRunResult.issues.length > 0 && (
            <Flex vertical gap={6}>
              <Text strong style={{ fontSize: 13 }}>验证问题</Text>
              {dryRunResult.issues.map((issue, idx) => (
                <Flex
                  key={idx}
                  align="center"
                  gap={8}
                  style={{
                    padding: '6px 12px',
                    background: issue.severity === 'error' ? token.colorErrorBg
                      : issue.severity === 'warning' ? token.colorWarningBg
                      : token.colorSuccessBg,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${
                      issue.severity === 'error' ? token.colorErrorBorder
                        : issue.severity === 'warning' ? token.colorWarningBorder
                        : token.colorSuccessBorder
                    }`,
                  }}
                >
                  <span style={{
                    color: issue.severity === 'error' ? token.colorError
                      : issue.severity === 'warning' ? token.colorWarning
                      : token.colorSuccess,
                  }}>
                    {SEVERITY_CONFIG[issue.severity].icon}
                  </span>
                  <Text style={{ fontSize: 12 }}>
                    行 {issue.rowIndex} · <Text type="secondary">{issue.field}</Text>: {issue.message}
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}

          {/* 数据预览（带系统生成编码） */}
          <Flex vertical gap={6} style={{ flex: 1, minHeight: 0 }}>
            <Text strong style={{ fontSize: 13 }}>数据预览</Text>
            <div
              className="category-import-preview-scroll"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              <Table<ImportRow>
                dataSource={displayRows}
                columns={previewColumns}
                rowKey="rowIndex"
                size="small"
                pagination={false}
                tableLayout="fixed"
                sticky={false}
                style={{ borderRadius: token.borderRadiusLG, overflow: 'hidden' }}
              />
            </div>
          </Flex>

          {/* 重新预检按钮 */}
          <Flex justify="center">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={runDryRun}
            >
              重新预检
            </Button>
          </Flex>
        </Flex>
      )}
    </Flex>
  );

  const renderStep3 = () => (
    <Flex vertical gap={16}>
      {importing && (
        <Flex vertical align="center" gap={16} style={{ padding: '40px 0' }}>
          <Progress
            percent={importProgress}
            status="active"
            style={{ maxWidth: 400 }}
          />
          <Text>
            正在导入 {Math.round(importProgress / 100 * parsedRows.length)}/{parsedRows.length}...
          </Text>
        </Flex>
      )}

      {!importing && !importResult && (
        <Flex vertical align="center" gap={16} style={{ padding: '40px 0' }}>
          <ImportOutlined style={{ fontSize: 40, color: token.colorTextQuaternary }} />
          <Text type="secondary">正在准备导入任务...</Text>
        </Flex>
      )}

      {importResult && (
        <Result
          status={importResult.success ? 'success' : 'warning'}
          title={importResult.success ? '导入完成' : '导入完成（部分失败）'}
          subTitle={
            <Flex vertical align="center" gap={4}>
              <Text>
                共处理 <Text strong>{importResult.totalProcessed}</Text> 条，
                成功 <Text strong style={{ color: token.colorSuccess }}>{importResult.created}</Text> 条，
                更新 <Text strong>{importResult.updated}</Text> 条，
                跳过 <Text strong>{importResult.skipped}</Text> 条，
                失败 <Text strong style={{ color: token.colorError }}>{importResult.failed}</Text> 条
              </Text>
            </Flex>
          }
          style={{ padding: '24px 0' }}
        >
          {importResult.errors.length > 0 && (
            <Flex vertical gap={4}>
              {importResult.errors.map((err, idx) => (
                <Flex
                  key={idx}
                  align="center"
                  gap={8}
                  style={{
                    padding: '6px 12px',
                    background: token.colorErrorBg,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorErrorBorder}`,
                  }}
                >
                  <CloseCircleFilled style={{ color: token.colorError }} />
                  <Text style={{ fontSize: 12 }}>行 {err.rowIndex}: {err.message}</Text>
                </Flex>
              ))}
            </Flex>
          )}
        </Result>
      )}
    </Flex>
  );

  // ===== 底部按钮 =====
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0: return parsedRows.length > 0;
      case 1: return true;
      case 2: return !!dryRunResult;
      default: return false;
    }
  }, [currentStep, parsedRows.length, dryRunResult]);

  const isExecutionStep = currentStep === 3;
  const isFinished = isExecutionStep && !!importResult;

  const renderFooter = () => (
    <Flex align="center" style={{ width: '100%' }}>
      {currentStep > 0 && currentStep < 3 && !importing && (
        <Button icon={<ArrowLeftOutlined />} onClick={goPrev}>
          上一步
        </Button>
      )}
      <Flex gap={8} justify="flex-end" style={{ marginLeft: 'auto' }}>
        {isExecutionStep ? (
          <Button
            type="primary"
            disabled={!isFinished}
            onClick={() => {
              if (!isFinished) {
                return;
              }
              onSuccess?.();
              handleCancel();
            }}
          >
            完成
          </Button>
        ) : (
          <>
            <Button onClick={handleCancel} disabled={importing}>
              取消
            </Button>
            {currentStep < 3 && (
              <Button
                type="primary"
                icon={currentStep === 2 ? <ImportOutlined /> : <ArrowRightOutlined />}
                onClick={currentStep === 2 ? handleConfirmImport : goNext}
                disabled={!canGoNext}
              >
                {currentStep === 2 ? '确认导入' : '下一步'}
              </Button>
            )}
          </>
        )}
      </Flex>
    </Flex>
  );

  return (
    <DraggableModal
      open={open}
      title="导入分类"
      width="80%"
      footer={renderFooter()}
      onCancel={handleCancel}
      maskClosable={false}
      keyboard={false}
      styles={{
        body: {
          height: MODAL_BODY_HEIGHT,
          minHeight: MODAL_BODY_HEIGHT,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Steps 导航条 */}
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 20 }}
        items={IMPORT_STEPS.map((step, idx) => ({
          title: step.title,
          status: stepStatuses[idx],
          icon: STEP_ICONS[idx],
        }))}
      />

      {/* 步骤内容 */}
      <div style={{ flex: 1, minHeight: 0, overflow: currentStep === 0 || currentStep === 2 ? 'hidden' : 'auto' }}>
        {currentStep === 0 && renderStep0()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      <style jsx global>{`
        .category-import-preview-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${token.colorBorder} transparent;
        }

        .category-import-preview-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .category-import-preview-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .category-import-preview-scroll::-webkit-scrollbar-thumb {
          background: ${token.colorBorder};
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }

        .category-import-preview-scroll::-webkit-scrollbar-thumb:hover {
          background: ${token.colorTextQuaternary};
          border: 3px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </DraggableModal>
  );
};

export default CategoryImportModal;
