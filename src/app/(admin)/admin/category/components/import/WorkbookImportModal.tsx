'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Empty,
  Flex,
  Pagination,
  Progress,
  Result,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  CloseOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  FileExcelOutlined,
  ImportOutlined,
  InfoCircleFilled,
  PlayCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UploadOutlined,
  WarningFilled,
} from '@ant-design/icons';
import DraggableModal from '@/components/DraggableModal';
import { workbookImportApi } from '@/services/workbookImport';
import type {
  WorkbookImportDryRunResponseDto,
  WorkbookImportEntityProgressDto,
  WorkbookImportJobStatusDto,
  WorkbookImportLogEventDto,
  WorkbookImportResolvedAction,
} from '@/services/workbookImport';
import type { WorkbookImportPreviewRow } from './workbookImportUi';
import {
  CODE_MODE_OPTIONS,
  DEFAULT_WORKBOOK_IMPORT_FORM,
  DUPLICATE_POLICY_OPTIONS,
  getPreviewRowCount,
  IMPORT_STEPS,
  mapDryRunPreviewRowsPage,
  type ImportStep,
  type WorkbookImportPreviewEntityFilter,
  type StepStatus,
} from './workbookImportUi';

const { Text, Title } = Typography;

const MODAL_BODY_HEIGHT = 'calc(100vh - 260px)';
const LOG_POLL_INTERVAL = 3000;
const PREVIEW_PAGE_SIZE = 100;
const TASK_PANEL_WIDTH = 800;
const ISSUE_PAGE_SIZE = 20;

type RuntimeJobKind = 'dryRun' | 'import';

interface WorkbookImportModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  defaultBusinessDomain?: string;
}

interface RuntimeJobState {
  jobId: string | null;
  status: WorkbookImportJobStatusDto | null;
  logs: WorkbookImportLogEventDto[];
  lastLogCursor: string | null;
  sseConnected: boolean;
}

interface RuntimeJobTracker {
  eventSource: EventSource | null;
  pollTimer: number | null;
  lastLogCursor: string | null;
  seenLogKeys: Set<string>;
}

const STEP_ICONS = [
  <FileExcelOutlined key="upload" />,
  <SettingOutlined key="config" />,
  <SafetyCertificateOutlined key="dryrun" />,
  <ImportOutlined key="exec" />,
];

const ACTION_TAG_COLORS: Record<WorkbookImportResolvedAction, string> = {
  CREATE: 'success',
  UPDATE: 'processing',
  SKIP: 'default',
  CONFLICT: 'error',
};

const ENTITY_LABELS: Record<WorkbookImportPreviewRow['entityType'], string> = {
  CATEGORY: '分类',
  ATTRIBUTE: '属性',
  ENUM_OPTION: '枚举值',
};

const STAGE_LABELS: Record<string, string> = {
  PARSING: '解析工作簿',
  PRELOADING: '预加载现有数据',
  VALIDATING_CATEGORIES: '校验分类',
  VALIDATING_ATTRIBUTES: '校验属性',
  VALIDATING_ENUMS: '校验枚举值',
  BUILDING_PREVIEW: '构建预览',
  PREPARING: '准备阶段',
  CATEGORIES: '分类导入',
  ATTRIBUTES: '属性导入',
  ENUM_OPTIONS: '枚举值导入',
  FINALIZING: '收尾阶段',
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: '已入队',
  PARSING: '解析中',
  PRELOADING: '预加载中',
  VALIDATING_CATEGORIES: '分类校验中',
  VALIDATING_ATTRIBUTES: '属性校验中',
  VALIDATING_ENUMS: '枚举值校验中',
  BUILDING_PREVIEW: '构建预览中',
  PREPARING: '准备中',
  IMPORTING_CATEGORIES: '正在导入分类',
  IMPORTING_ATTRIBUTES: '正在导入属性',
  IMPORTING_ENUM_OPTIONS: '正在导入枚举值',
  FINALIZING: '正在收尾',
  COMPLETED: '已完成',
  FAILED: '失败',
};

const createEmptyRuntimeState = (): RuntimeJobState => ({
  jobId: null,
  status: null,
  logs: [],
  lastLogCursor: null,
  sseConnected: false,
});

const createRuntimeTracker = (): RuntimeJobTracker => ({
  eventSource: null,
  pollTimer: null,
  lastLogCursor: null,
  seenLogKeys: new Set<string>(),
});

const levelIcon = (level: 'ERROR' | 'WARNING' | null, token: ReturnType<typeof theme.useToken>['token']) => {
  if (level === 'ERROR') {
    return <CloseCircleFilled style={{ color: token.colorError }} />;
  }
  if (level === 'WARNING') {
    return <WarningFilled style={{ color: token.colorWarning }} />;
  }
  return <CheckCircleFilled style={{ color: token.colorSuccess }} />;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
};

const sumProgressField = (
  progress: WorkbookImportJobStatusDto['progress'] | undefined,
  field: keyof WorkbookImportEntityProgressDto,
): number => {
  if (!progress) {
    return 0;
  }

  return [progress.categories, progress.attributes, progress.enumOptions].reduce((total, item) => {
    return total + (item?.[field] ?? 0);
  }, 0);
};

const isTerminalStatus = (status: string | null | undefined): boolean => {
  return status === 'COMPLETED' || status === 'FAILED';
};

const getErrorMessage = (error: any, fallback: string): string => {
  return error?.message || error?.error || fallback;
};

const getLastLogMessage = (logs: WorkbookImportLogEventDto[]): string | null => {
  if (!logs.length) {
    return null;
  }

  return logs[logs.length - 1]?.message || null;
};

const WorkbookImportModal: React.FC<WorkbookImportModalProps> = ({
  open,
  onCancel,
  onSuccess,
  defaultBusinessDomain,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();

  const [currentStep, setCurrentStep] = useState<ImportStep>(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(['process', 'wait', 'wait', 'wait']);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formState, setFormState] = useState(DEFAULT_WORKBOOK_IMPORT_FORM);
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<WorkbookImportDryRunResponseDto | null>(null);
  const [dryRunRuntime, setDryRunRuntime] = useState<RuntimeJobState>(() => createEmptyRuntimeState());
  const [importRuntime, setImportRuntime] = useState<RuntimeJobState>(() => createEmptyRuntimeState());
  const [importing, setImporting] = useState(false);
  const [previewEntityType, setPreviewEntityType] = useState<WorkbookImportPreviewEntityFilter>('CATEGORY');
  const [previewPage, setPreviewPage] = useState(1);
  const [issuePage, setIssuePage] = useState(1);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskDrawerKind, setTaskDrawerKind] = useState<RuntimeJobKind>('dryRun');

  const runtimeTrackersRef = useRef<Record<RuntimeJobKind, RuntimeJobTracker>>({
    dryRun: createRuntimeTracker(),
    import: createRuntimeTracker(),
  });
  const dryRunResultRequestRef = useRef<string | null>(null);
  const dryRunFailureNoticeRef = useRef<string | null>(null);

  const previewRows = useMemo(() => {
    return mapDryRunPreviewRowsPage(dryRunResult, previewEntityType, previewPage, PREVIEW_PAGE_SIZE);
  }, [dryRunResult, previewEntityType, previewPage]);

  const previewTotal = useMemo(() => {
    return getPreviewRowCount(dryRunResult, previewEntityType);
  }, [dryRunResult, previewEntityType]);

  const pagedIssues = useMemo(() => {
    if (!dryRunResult) {
      return [];
    }

    const start = (issuePage - 1) * ISSUE_PAGE_SIZE;
    return dryRunResult.issues.slice(start, start + ISSUE_PAGE_SIZE);
  }, [dryRunResult, issuePage]);

  const markStep = useCallback((step: number, status: StepStatus) => {
    setStepStatuses((prev) => {
      const next = [...prev];
      next[step] = status;
      return next;
    });
  }, []);

  const updateRuntimeState = useCallback((kind: RuntimeJobKind, updater: React.SetStateAction<RuntimeJobState>) => {
    const setter = kind === 'dryRun' ? setDryRunRuntime : setImportRuntime;
    setter(updater);
  }, []);

  const setRuntimeCursor = useCallback((kind: RuntimeJobKind, cursor: string | null) => {
    runtimeTrackersRef.current[kind].lastLogCursor = cursor;
    updateRuntimeState(kind, (prev) => {
      if (prev.lastLogCursor === cursor) {
        return prev;
      }
      return { ...prev, lastLogCursor: cursor };
    });
  }, [updateRuntimeState]);

  const stopRuntimeTracking = useCallback((kind: RuntimeJobKind) => {
    const tracker = runtimeTrackersRef.current[kind];

    if (tracker.eventSource) {
      tracker.eventSource.close();
      tracker.eventSource = null;
    }

    if (tracker.pollTimer !== null) {
      window.clearInterval(tracker.pollTimer);
      tracker.pollTimer = null;
    }

    updateRuntimeState(kind, (prev) => {
      if (!prev.sseConnected) {
        return prev;
      }
      return { ...prev, sseConnected: false };
    });
  }, [updateRuntimeState]);

  const clearRuntimeState = useCallback((kind: RuntimeJobKind) => {
    stopRuntimeTracking(kind);

    const tracker = runtimeTrackersRef.current[kind];
    tracker.lastLogCursor = null;
    tracker.seenLogKeys.clear();

    updateRuntimeState(kind, createEmptyRuntimeState());

    if (kind === 'dryRun') {
      setDryRunning(false);
    } else {
      setImporting(false);
    }
  }, [stopRuntimeTracking, updateRuntimeState]);

  const clearAllRuntimeState = useCallback(() => {
    clearRuntimeState('dryRun');
    clearRuntimeState('import');
  }, [clearRuntimeState]);

  const resetAll = useCallback(() => {
    clearAllRuntimeState();
    dryRunResultRequestRef.current = null;
    dryRunFailureNoticeRef.current = null;
    setCurrentStep(0);
    setStepStatuses(['process', 'wait', 'wait', 'wait']);
    setUploadedFile(null);
    setFormState(DEFAULT_WORKBOOK_IMPORT_FORM);
    setDryRunResult(null);
    setPreviewEntityType('CATEGORY');
    setPreviewPage(1);
    setIssuePage(1);
    setTaskDrawerOpen(false);
    setTaskDrawerKind('dryRun');
  }, [clearAllRuntimeState]);

  const handleCancel = useCallback(() => {
    resetAll();
    onCancel();
  }, [onCancel, resetAll]);

  const mergeRuntimeLogs = useCallback((kind: RuntimeJobKind, incoming: WorkbookImportLogEventDto[] = []) => {
    if (!incoming.length) {
      return;
    }

    updateRuntimeState(kind, (prev) => {
      const tracker = runtimeTrackersRef.current[kind];
      const nextLogs = [...prev.logs];
      let changed = false;
      let nextCursor = prev.lastLogCursor ?? tracker.lastLogCursor;

      for (const item of incoming) {
        const key = item.cursor ?? String(item.sequence ?? `${item.timestamp ?? ''}-${item.message}`);
        if (tracker.seenLogKeys.has(key)) {
          continue;
        }
        tracker.seenLogKeys.add(key);
        nextLogs.push(item);
        changed = true;
        if (item.cursor) {
          nextCursor = item.cursor;
          tracker.lastLogCursor = item.cursor;
        }
      }

      if (!changed && nextCursor === prev.lastLogCursor) {
        return prev;
      }

      nextLogs.sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0));
      return {
        ...prev,
        logs: nextLogs.slice(-300),
        lastLogCursor: nextCursor,
      };
    });
  }, [updateRuntimeState]);

  const finalizeRuntimeSnapshot = useCallback((kind: RuntimeJobKind, snapshot: WorkbookImportJobStatusDto) => {
    const terminal = isTerminalStatus(snapshot.status);

    if (kind === 'dryRun') {
      setDryRunning(!terminal);
      if (snapshot.status === 'FAILED') {
        markStep(2, 'error');
      }
    } else {
      setImporting(!terminal);
      if (terminal) {
        markStep(3, snapshot.status === 'FAILED' ? 'error' : 'finish');
      }
    }

    if (terminal) {
      stopRuntimeTracking(kind);
    }
  }, [markStep, stopRuntimeTracking]);

  const syncRuntimeSnapshot = useCallback((kind: RuntimeJobKind, snapshot: WorkbookImportJobStatusDto) => {
    updateRuntimeState(kind, (prev) => ({
      ...prev,
      status: snapshot,
      lastLogCursor: snapshot.latestLogCursor ?? prev.lastLogCursor,
    }));

    if (snapshot.latestLogCursor) {
      runtimeTrackersRef.current[kind].lastLogCursor = snapshot.latestLogCursor;
    }

    mergeRuntimeLogs(kind, snapshot.latestLogs ?? []);
    finalizeRuntimeSnapshot(kind, snapshot);
  }, [finalizeRuntimeSnapshot, mergeRuntimeLogs, updateRuntimeState]);

  const refreshRuntimeSnapshot = useCallback(async (kind: RuntimeJobKind, activeJobId: string) => {
    const snapshot = kind === 'dryRun'
      ? await workbookImportApi.getDryRunJobStatus(activeJobId)
      : await workbookImportApi.getImportJobStatus(activeJobId);
    syncRuntimeSnapshot(kind, snapshot);
    return snapshot;
  }, [syncRuntimeSnapshot]);

  const pullRuntimeLogs = useCallback(async (kind: RuntimeJobKind, activeJobId: string) => {
    const cursor = runtimeTrackersRef.current[kind].lastLogCursor ?? undefined;
    const page = kind === 'dryRun'
      ? await workbookImportApi.listDryRunJobLogs(activeJobId, { cursor, limit: 100 })
      : await workbookImportApi.listImportJobLogs(activeJobId, { cursor, limit: 100 });

    mergeRuntimeLogs(kind, page.items ?? []);
    if (page.nextCursor) {
      setRuntimeCursor(kind, page.nextCursor);
    }
    return page;
  }, [mergeRuntimeLogs, setRuntimeCursor]);

  const startRuntimeTracking = useCallback((kind: RuntimeJobKind, activeJobId: string) => {
    const tracker = runtimeTrackersRef.current[kind];
    let disposed = false;
    const streamUrl = kind === 'dryRun'
      ? workbookImportApi.getDryRunJobStreamUrl(activeJobId)
      : workbookImportApi.getImportJobStreamUrl(activeJobId);
    const stream = new EventSource(streamUrl);
    tracker.eventSource = stream;

    const handleProgress = (event: Event) => {
      if (disposed) {
        return;
      }

      try {
        const snapshot = JSON.parse((event as MessageEvent<string>).data) as WorkbookImportJobStatusDto;
        syncRuntimeSnapshot(kind, snapshot);
      } catch {
        void refreshRuntimeSnapshot(kind, activeJobId);
      }
    };

    const handleLog = (event: Event) => {
      if (disposed) {
        return;
      }

      try {
        const logEvent = JSON.parse((event as MessageEvent<string>).data) as WorkbookImportLogEventDto;
        mergeRuntimeLogs(kind, [logEvent]);
      } catch {
        void pullRuntimeLogs(kind, activeJobId);
      }
    };

    stream.onopen = () => {
      if (!disposed) {
        updateRuntimeState(kind, (prev) => prev.sseConnected ? prev : { ...prev, sseConnected: true });
      }
    };

    stream.onerror = () => {
      if (!disposed) {
        updateRuntimeState(kind, (prev) => prev.sseConnected ? { ...prev, sseConnected: false } : prev);
        void refreshRuntimeSnapshot(kind, activeJobId);
        void pullRuntimeLogs(kind, activeJobId);
      }
    };

    stream.addEventListener('progress', handleProgress);
    stream.addEventListener('log', handleLog);
    stream.addEventListener('completed', () => {
      void refreshRuntimeSnapshot(kind, activeJobId);
      void pullRuntimeLogs(kind, activeJobId);
    });
    stream.addEventListener('failed', () => {
      void refreshRuntimeSnapshot(kind, activeJobId);
      void pullRuntimeLogs(kind, activeJobId);
    });
    stream.addEventListener('stage-changed', () => {
      void refreshRuntimeSnapshot(kind, activeJobId);
    });

    void refreshRuntimeSnapshot(kind, activeJobId);
    void pullRuntimeLogs(kind, activeJobId);

    tracker.pollTimer = window.setInterval(() => {
      void refreshRuntimeSnapshot(kind, activeJobId);
      void pullRuntimeLogs(kind, activeJobId);
    }, LOG_POLL_INTERVAL);

    return () => {
      disposed = true;

      if (tracker.eventSource === stream) {
        stream.close();
        tracker.eventSource = null;
      }

      if (tracker.pollTimer !== null) {
        window.clearInterval(tracker.pollTimer);
        tracker.pollTimer = null;
      }

      updateRuntimeState(kind, (prev) => prev.sseConnected ? { ...prev, sseConnected: false } : prev);
    };
  }, [mergeRuntimeLogs, pullRuntimeLogs, refreshRuntimeSnapshot, syncRuntimeSnapshot, updateRuntimeState]);

  const invalidateDryRun = useCallback(() => {
    dryRunResultRequestRef.current = null;
    dryRunFailureNoticeRef.current = null;
    setDryRunResult(null);
    setPreviewPage(1);
    setIssuePage(1);
    markStep(2, 'wait');
    markStep(3, 'wait');
    clearAllRuntimeState();
  }, [clearAllRuntimeState, markStep]);

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    invalidateDryRun();
    message.success(`已选择工作簿：${file.name}`);
    return false;
  }, [invalidateDryRun, message]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    invalidateDryRun();
  }, [invalidateDryRun]);

  const updateCodingOption = useCallback((field: 'categoryCodeMode' | 'attributeCodeMode' | 'enumOptionCodeMode', value: string) => {
    invalidateDryRun();
    setFormState((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        codingOptions: {
          ...prev.options.codingOptions,
          [field]: value,
        },
      },
    }));
  }, [invalidateDryRun]);

  const updateDuplicateOption = useCallback((field: 'categoryDuplicatePolicy' | 'attributeDuplicatePolicy' | 'enumOptionDuplicatePolicy', value: string) => {
    invalidateDryRun();
    setFormState((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        duplicateOptions: {
          ...prev.options.duplicateOptions,
          [field]: value,
        },
      },
    }));
  }, [invalidateDryRun]);

  const goNext = useCallback(() => {
    const next = (currentStep + 1) as ImportStep;
    if (next > 3) {
      return;
    }

    markStep(currentStep, 'finish');
    markStep(next, 'process');
    setCurrentStep(next);
  }, [currentStep, markStep]);

  const goPrev = useCallback(() => {
    const prev = (currentStep - 1) as ImportStep;
    if (prev < 0) {
      return;
    }

    markStep(currentStep, 'wait');
    markStep(prev, 'process');
    setCurrentStep(prev);
  }, [currentStep, markStep]);

  const runDryRun = useCallback(async () => {
    if (!uploadedFile) {
      message.warning('请先选择工作簿文件');
      return;
    }

    dryRunResultRequestRef.current = null;
    dryRunFailureNoticeRef.current = null;
    setDryRunning(true);
    setDryRunResult(null);
    clearAllRuntimeState();
    markStep(2, 'process');
    markStep(3, 'wait');

    try {
      const response = await workbookImportApi.startDryRunJob(uploadedFile, formState.options, formState.operator || 'admin');
      setDryRunRuntime({
        ...createEmptyRuntimeState(),
        jobId: response.jobId,
      });
      message.success('预检任务已创建');
    } catch (error: any) {
      setDryRunning(false);
      markStep(2, 'error');
      message.error(getErrorMessage(error, '启动预检任务失败'));
    }
  }, [clearAllRuntimeState, formState.operator, formState.options, markStep, message, uploadedFile]);

  const handleConfirmImport = useCallback(async () => {
    if (!dryRunResult?.importSessionId || !dryRunResult.summary.canImport) {
      message.warning('当前预检结果不允许正式导入');
      return;
    }

    clearRuntimeState('import');
    markStep(2, 'finish');
    markStep(3, 'process');
    setCurrentStep(3);
    setImporting(true);

    try {
      const response = await workbookImportApi.startImport({
        dryRunJobId: dryRunRuntime.jobId ?? undefined,
        importSessionId: dryRunRuntime.jobId ? undefined : dryRunResult.importSessionId,
        operator: formState.operator || 'admin',
        atomic: formState.atomic,
        executionMode: formState.atomic ? 'STAGING_ATOMIC' : undefined,
      });

      setImportRuntime({
        ...createEmptyRuntimeState(),
        jobId: response.jobId,
      });
      message.success('导入任务已启动');
    } catch (error: any) {
      setImporting(false);
      setCurrentStep(2);
      markStep(2, 'process');
      markStep(3, 'wait');
      message.error(getErrorMessage(error, '启动导入任务失败'));
    }
  }, [clearRuntimeState, dryRunResult, dryRunRuntime.jobId, formState.atomic, formState.operator, markStep, message]);

  useEffect(() => {
    if (!open || !dryRunRuntime.jobId) {
      return undefined;
    }

    return startRuntimeTracking('dryRun', dryRunRuntime.jobId);
  }, [dryRunRuntime.jobId, open, startRuntimeTracking]);

  useEffect(() => {
    if (!open || !importRuntime.jobId) {
      return undefined;
    }

    return startRuntimeTracking('import', importRuntime.jobId);
  }, [importRuntime.jobId, open, startRuntimeTracking]);

  useEffect(() => {
    const activeJobId = dryRunRuntime.jobId;
    if (!activeJobId || dryRunRuntime.status?.status !== 'COMPLETED' || dryRunResultRequestRef.current === activeJobId) {
      return undefined;
    }

    dryRunResultRequestRef.current = activeJobId;
    let cancelled = false;

    const loadResult = async () => {
      try {
        const result = await workbookImportApi.getDryRunResult(activeJobId);
        if (cancelled) {
          return;
        }
        setDryRunResult(result);
        setPreviewPage(1);
        setIssuePage(1);
        markStep(2, result.summary.canImport ? 'process' : 'error');
        message.success('预检完成');
      } catch (error: any) {
        if (cancelled) {
          return;
        }
        markStep(2, 'error');
        message.error(getErrorMessage(error, '加载预检结果失败'));
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [dryRunRuntime.jobId, dryRunRuntime.status?.status, markStep, message]);

  useEffect(() => {
    const activeJobId = dryRunRuntime.jobId;
    if (!activeJobId || dryRunRuntime.status?.status !== 'FAILED' || dryRunFailureNoticeRef.current === activeJobId) {
      return;
    }

    dryRunFailureNoticeRef.current = activeJobId;
    message.error(getLastLogMessage(dryRunRuntime.logs) || '预检失败');
  }, [dryRunRuntime.jobId, dryRunRuntime.logs, dryRunRuntime.status?.status, message]);

  useEffect(() => {
    setPreviewPage(1);
  }, [previewEntityType]);

  useEffect(() => {
    if (!open) {
      resetAll();
    }
  }, [open, resetAll]);

  useEffect(() => {
    return () => {
      stopRuntimeTracking('dryRun');
      stopRuntimeTracking('import');
    };
  }, [stopRuntimeTracking]);

  const previewColumns: ColumnsType<WorkbookImportPreviewRow> = useMemo(() => {
    return [
      {
        title: '行',
        dataIndex: 'rowNumber',
        width: 84,
        align: 'center',
        render: (_, record) => {
          if (!record.rowNumber) {
            return <Text type="secondary">—</Text>;
          }

          return (
            <Tooltip title={record.issueMessages.length ? record.issueMessages.join('\n') : '该行无问题'}>
              <Space size={4}>
                {levelIcon(record.issueLevel, token)}
                <Text>{record.rowNumber}</Text>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: '实体',
        dataIndex: 'entityType',
        width: 88,
        render: (value: WorkbookImportPreviewRow['entityType']) => (
          <Tag style={{ marginInlineEnd: 0 }}>{ENTITY_LABELS[value]}</Tag>
        ),
      },
      {
        title: '名称',
        dataIndex: 'name',
        width: 220,
        ellipsis: true,
        render: (value: string, record) => (
          <Flex vertical gap={2}>
            <Text strong>{value}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.businessDomain || record.sheetName || '—'}
            </Text>
          </Flex>
        ),
      },
      {
        title: 'Excel 引用编码',
        dataIndex: 'excelReferenceCode',
        width: 170,
        ellipsis: true,
        render: (value: string | null) => value ? <Text code>{value}</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: '原始编码',
        dataIndex: 'sourceCode',
        width: 170,
        ellipsis: true,
        render: (value: string | null) => value ? <Text code>{value}</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: '预览最终编码',
        dataIndex: 'finalCode',
        width: 180,
        ellipsis: true,
        render: (value: string | null) => value ? <Text code>{value}</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: '关联信息',
        dataIndex: 'relation',
        width: 180,
        ellipsis: true,
        render: (value: string | null, record) => (
          <Flex vertical gap={2}>
            <Text type={value ? undefined : 'secondary'}>{value || '—'}</Text>
            {record.extra ? <Text type="secondary" style={{ fontSize: 11 }}>{record.extra}</Text> : null}
          </Flex>
        ),
      },
      {
        title: '动作',
        dataIndex: 'action',
        width: 110,
        align: 'center',
        render: (value: WorkbookImportResolvedAction | null) => {
          if (!value) {
            return <Text type="secondary">—</Text>;
          }
          return <Tag color={ACTION_TAG_COLORS[value]}>{value}</Tag>;
        },
      },
      {
        title: '问题',
        dataIndex: 'issueCount',
        width: 90,
        align: 'center',
        render: (value: number, record) => {
          if (!value) {
            return <Tag color="success">0</Tag>;
          }

          return (
            <Tooltip title={record.issueMessages.join('\n')}>
              <Tag color={record.issueLevel === 'ERROR' ? 'error' : 'warning'}>{value}</Tag>
            </Tooltip>
          );
        },
      },
    ];
  }, [token]);

  const logColumns: ColumnsType<WorkbookImportLogEventDto> = useMemo(() => {
    return [
      {
        title: '时间',
        dataIndex: 'timestamp',
        width: 160,
        render: (value: string | null) => <Text style={{ fontSize: 12 }}>{formatDateTime(value)}</Text>,
      },
      {
        title: '级别',
        dataIndex: 'level',
        width: 82,
        align: 'center',
        render: (value: string | null) => {
          if (!value) {
            return <Text type="secondary">—</Text>;
          }
          const color = value === 'ERROR' ? 'error' : value === 'WARN' || value === 'WARNING' ? 'warning' : 'default';
          return <Tag color={color}>{value}</Tag>;
        },
      },
      {
        title: '阶段',
        dataIndex: 'stage',
        width: 140,
        render: (value: string | null) => <Text>{value ? (STAGE_LABELS[value] || value) : '—'}</Text>,
      },
      {
        title: '定位',
        dataIndex: 'rowNumber',
        width: 130,
        render: (_: number | null, record) => {
          if (!record.sheetName && !record.rowNumber) {
            return <Text type="secondary">—</Text>;
          }

          return (
            <Text style={{ fontSize: 12 }}>
              {[record.sheetName, record.rowNumber ? `第 ${record.rowNumber} 行` : null].filter(Boolean).join(' / ')}
            </Text>
          );
        },
      },
      {
        title: '消息',
        dataIndex: 'message',
        ellipsis: true,
        render: (value: string, record) => {
          const detailText = record.details && Object.keys(record.details).length
            ? JSON.stringify(record.details)
            : '';
          const content = detailText ? `${value}\n${detailText}` : value;
          return (
            <Tooltip title={content}>
              <Flex vertical gap={2}>
                <Text>{value}</Text>
                {record.code ? <Text type="secondary" style={{ fontSize: 11 }}>{record.code}</Text> : null}
              </Flex>
            </Tooltip>
          );
        },
      },
    ];
  }, []);

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0:
        return !!uploadedFile;
      case 1:
        return true;
      case 2:
        return !!dryRunResult?.summary.canImport;
      default:
        return false;
    }
  }, [currentStep, dryRunResult?.summary.canImport, uploadedFile]);

  const aggregateProgress = useMemo(() => {
    return {
      total: sumProgressField(importRuntime.status?.progress, 'total'),
      processed: sumProgressField(importRuntime.status?.progress, 'processed'),
      created: sumProgressField(importRuntime.status?.progress, 'created'),
      updated: sumProgressField(importRuntime.status?.progress, 'updated'),
      skipped: sumProgressField(importRuntime.status?.progress, 'skipped'),
      failed: sumProgressField(importRuntime.status?.progress, 'failed'),
    };
  }, [importRuntime.status?.progress]);

  const executionFinished = isTerminalStatus(importRuntime.status?.status);
  const importSucceeded = importRuntime.status?.status === 'COMPLETED';

  const renderChangeCard = (title: string, counters: WorkbookImportDryRunResponseDto['changeSummary']['categories']) => (
    <Flex
      vertical
      gap={10}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      }}
    >
      <Flex align="center" justify="space-between" gap={12}>
        <Text strong>{title}</Text>
        <Tag>{counters.create + counters.update + counters.skip + counters.conflict} 项</Tag>
      </Flex>
      <Flex wrap="wrap" gap={8}>
        <Tag color="success">新增 {counters.create}</Tag>
        <Tag color="processing">更新 {counters.update}</Tag>
        <Tag>跳过 {counters.skip}</Tag>
        <Tag color={counters.conflict > 0 ? 'error' : 'default'}>冲突 {counters.conflict}</Tag>
      </Flex>
    </Flex>
  );

  const renderProgressCard = (title: string, progress?: WorkbookImportEntityProgressDto) => {
    const item = progress ?? { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
    return (
      <Flex
        vertical
        gap={4}
        style={{
          flex: 1,
          minWidth: 180,
          padding: '12px 14px',
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Text strong>{title}</Text>
        <Text style={{ fontSize: 12 }}>总数 {item.total}</Text>
        <Text style={{ fontSize: 12 }}>已处理 {item.processed}</Text>
        <Text style={{ fontSize: 12 }}>创建 {item.created}</Text>
        <Text style={{ fontSize: 12 }}>更新 {item.updated}</Text>
        <Text style={{ fontSize: 12 }}>跳过 {item.skipped}</Text>
        <Text style={{ fontSize: 12, color: item.failed > 0 ? token.colorError : token.colorText }}>{`失败 ${item.failed}`}</Text>
      </Flex>
    );
  };

  const toggleTaskDrawer = useCallback((kind: RuntimeJobKind) => {
    if (taskDrawerOpen && taskDrawerKind === kind) {
      setTaskDrawerOpen(false);
      return;
    }

    setTaskDrawerKind(kind);
    setTaskDrawerOpen(true);
  }, [taskDrawerKind, taskDrawerOpen]);

  const closeTaskDrawer = useCallback(() => {
    setTaskDrawerOpen(false);
  }, []);

  const renderRuntimeOverview = (
    kind: RuntimeJobKind,
    status: WorkbookImportJobStatusDto,
    runtimeState: RuntimeJobState,
  ) => {
    const finished = isTerminalStatus(status.status);
    const progressStatus = finished ? (status.status === 'COMPLETED' ? 'success' : 'exception') : 'active';

    return (
      <Flex
        vertical
        gap={14}
        style={{
          padding: '16px 18px',
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Flex align="center" justify="space-between" gap={12} wrap="wrap">
          <Flex vertical gap={4}>
            <Text strong style={{ fontSize: 14 }}>
              {STATUS_LABELS[status.status] || status.status}
              {' · '}
              {STAGE_LABELS[status.currentStage] || status.currentStage}
            </Text>
          </Flex>
          <Button size="middle" onClick={() => toggleTaskDrawer(kind)}>
            {taskDrawerOpen && taskDrawerKind === kind ? '收起任务详情' : '查看任务详情'}
          </Button>
        </Flex>

        <Progress percent={status.overallPercent ?? 0} status={progressStatus} />

        <Flex wrap="wrap" gap={12}>
          <Tag color="blue">阶段进度 {status.stagePercent ?? 0}%</Tag>
          <Tag color="default">已处理 {status.processedRows ?? 0} / {status.totalRows ?? 0}</Tag>
          <Tag color="default">当前实体 {status.currentEntityType || '—'}</Tag>
          <Tag color="default">业务域 {status.currentBusinessDomain || '—'}</Tag>
        </Flex>
      </Flex>
    );
  };

  const renderTaskDrawerContent = () => {
    const runtimeState = taskDrawerKind === 'dryRun' ? dryRunRuntime : importRuntime;
    const status = runtimeState.status;

    if (!status) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="当前没有可展示的任务详情"
        />
      );
    }

    const finished = isTerminalStatus(status.status);
    const progressStatus = finished ? (status.status === 'COMPLETED' ? 'success' : 'exception') : 'active';

    return (
      <Flex vertical gap={16}>
        <Descriptions
          size="small"
          bordered
          column={2}
          style={{ borderRadius: token.borderRadiusLG, overflow: 'hidden' }}
        >
          <Descriptions.Item label="任务类型">{taskDrawerKind === 'dryRun' ? '预检任务' : '导入任务'}</Descriptions.Item>
          <Descriptions.Item label="任务状态">{STATUS_LABELS[status.status] || status.status}</Descriptions.Item>
          <Descriptions.Item label="当前阶段">{STAGE_LABELS[status.currentStage] || status.currentStage}</Descriptions.Item>
          <Descriptions.Item label="执行模式">{status.executionMode || '—'}</Descriptions.Item>
          <Descriptions.Item label="整体进度">{status.overallPercent ?? 0}%</Descriptions.Item>
          <Descriptions.Item label="阶段进度">{status.stagePercent ?? 0}%</Descriptions.Item>
          <Descriptions.Item label="总行数">{status.totalRows ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="已处理行数">{status.processedRows ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="会话 ID">{status.importSessionId || dryRunResult?.importSessionId || '—'}</Descriptions.Item>
          <Descriptions.Item label="最新日志游标">{status.latestLogCursor || runtimeState.lastLogCursor || '—'}</Descriptions.Item>
          <Descriptions.Item label="当前实体">{status.currentEntityType || '—'}</Descriptions.Item>
          <Descriptions.Item label="当前业务域">{status.currentBusinessDomain || '—'}</Descriptions.Item>
          <Descriptions.Item label="更新时间" span={2}>{formatDateTime(status.updatedAt)}</Descriptions.Item>
        </Descriptions>

        <Progress percent={status.overallPercent ?? 0} status={progressStatus} />

        <Flex wrap="wrap" gap={12}>
          {renderProgressCard('分类进度', status.progress.categories)}
          {renderProgressCard('属性进度', status.progress.attributes)}
          {renderProgressCard('枚举值进度', status.progress.enumOptions)}
        </Flex>

        <Flex vertical gap={8}>
          <Text strong style={{ fontSize: 13 }}>任务日志</Text>
          <div
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Table<WorkbookImportLogEventDto>
              dataSource={runtimeState.logs}
              columns={logColumns}
              rowKey={(record) => record.cursor ?? String(record.sequence ?? `${record.timestamp ?? ''}-${record.message}`)}
              className="workbook-import-log-table"
              size="small"
              pagination={false}
              tableLayout="fixed"
              style={{ borderRadius: token.borderRadiusLG, overflow: 'hidden' }}
              locale={{ emptyText: '当前还没有任务日志' }}
            />
          </div>
        </Flex>
      </Flex>
    );
  };

  const renderTaskSidePanel = () => {
    if (currentStep < 2) {
      return null;
    }

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          pointerEvents: taskDrawerOpen ? 'auto' : 'none',
        }}
      >
        <div
          onClick={closeTaskDrawer}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'transparent',
            opacity: taskDrawerOpen ? 1 : 0,
            transition: 'opacity 0.18s ease',
          }}
        />
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: TASK_PANEL_WIDTH,
            borderLeft: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
            boxShadow: `-12px 0 24px ${token.colorFillSecondary}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
            transform: taskDrawerOpen ? 'translateX(0)' : `translateX(${TASK_PANEL_WIDTH}px)`,
            opacity: taskDrawerOpen ? 1 : 0,
            transition: 'transform 0.18s ease, opacity 0.18s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              background: token.colorBgElevated,
            }}
          >
            <Flex vertical gap={2}>
              <Text strong>{taskDrawerKind === 'dryRun' ? '预检任务详情' : '导入任务详情'}</Text>
            </Flex>
            <Button
              size="middle"
              type="text"
              aria-label="关闭任务详情"
              icon={<CloseOutlined />}
              onClick={closeTaskDrawer}
            />
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 16 }}>
            {renderTaskDrawerContent()}
          </div>
        </div>
      </div>
    );
  };

  const renderStep0 = () => (
    <Flex vertical gap={16} style={{ height: '100%', minHeight: 0 }}>
      {!uploadedFile ? (
        <Upload.Dragger
          accept=".xlsx,.xls"
          beforeUpload={handleFileUpload}
          showUploadList={false}
          style={{ padding: '32px 0' }}
        >
          <Flex vertical align="center" gap={8}>
            <UploadOutlined style={{ fontSize: 36, color: token.colorPrimary }} />
            <Text strong>点击或拖拽工作簿到此处上传</Text>
          </Flex>
        </Upload.Dragger>
      ) : (
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
          <Flex align="center" gap={10}>
            <FileExcelOutlined style={{ fontSize: 20, color: '#217346' }} />
            <Flex vertical gap={0}>
              <Text strong style={{ fontSize: 13 }}>{uploadedFile.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </Text>
            </Flex>
          </Flex>
          <Button type="text" size="middle" danger icon={<DeleteOutlined />} onClick={handleRemoveFile}>
            移除
          </Button>
        </Flex>
      )}

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleFilled />}
        message="工作簿导入说明"
        description="页面主链路会先创建异步 dry-run 任务，再通过 SSE 与日志接口跟踪进度；自动编码模式下，预检展示的最终编码仅用于预览，不应被前端缓存为最终主键。"
        style={{ borderRadius: token.borderRadiusLG }}
      />

      {defaultBusinessDomain ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningFilled />}
          message={`当前分类树业务域：${defaultBusinessDomain}`}
          description="工作簿实际导入仍以 Excel 中的数据为准，请确认模板中的业务域与当前操作上下文一致。"
          style={{ borderRadius: token.borderRadiusLG }}
        />
      ) : null}

      <Flex
        vertical
        align="center"
        justify="center"
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: token.borderRadiusLG,
          border: `1px dashed ${token.colorBorder}`,
          background: token.colorBgContainer,
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={uploadedFile ? '文件已选择，继续下一步配置导入策略' : '请先上传工作簿'}
        />
      </Flex>
    </Flex>
  );

  const renderStep1 = () => (
    <Flex vertical gap={16}>
      <Title level={5} style={{ margin: 0 }}>编码模式</Title>
      <Flex vertical gap={12}>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>分类编码</Text>
          <Select
            value={formState.options.codingOptions.categoryCodeMode}
            options={CODE_MODE_OPTIONS}
            onChange={(value) => updateCodingOption('categoryCodeMode', value)}
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>属性编码</Text>
          <Select
            value={formState.options.codingOptions.attributeCodeMode}
            options={CODE_MODE_OPTIONS}
            onChange={(value) => updateCodingOption('attributeCodeMode', value)}
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>枚举值编码</Text>
          <Select
            value={formState.options.codingOptions.enumOptionCodeMode}
            options={CODE_MODE_OPTIONS}
            onChange={(value) => updateCodingOption('enumOptionCodeMode', value)}
            style={{ width: 220 }}
          />
        </Flex>
      </Flex>

      <Title level={5} style={{ margin: 0 }}>重复数据处理</Title>
      <Flex vertical gap={12}>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>分类重复</Text>
          <Select
            value={formState.options.duplicateOptions.categoryDuplicatePolicy}
            options={DUPLICATE_POLICY_OPTIONS}
            onChange={(value) => updateDuplicateOption('categoryDuplicatePolicy', value)}
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>属性重复</Text>
          <Select
            value={formState.options.duplicateOptions.attributeDuplicatePolicy}
            options={DUPLICATE_POLICY_OPTIONS}
            onChange={(value) => updateDuplicateOption('attributeDuplicatePolicy', value)}
            style={{ width: 220 }}
          />
        </Flex>
        <Flex align="center" justify="space-between" style={{ gap: 16 }}>
          <Text strong style={{ minWidth: 88 }}>枚举值重复</Text>
          <Select
            value={formState.options.duplicateOptions.enumOptionDuplicatePolicy}
            options={DUPLICATE_POLICY_OPTIONS}
            onChange={(value) => updateDuplicateOption('enumOptionDuplicatePolicy', value)}
            style={{ width: 220 }}
          />
        </Flex>
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
          <Text strong style={{ fontSize: 13 }}>原子执行</Text>
        </Flex>
        <Switch
          checked={formState.atomic}
          onChange={(value) => {
            invalidateDryRun();
            setFormState((prev) => ({ ...prev, atomic: value }));
          }}
        />
      </Flex>

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleFilled />}
        message="提交格式要求"
        description="dry-run 会以 multipart/form-data 提交，其中 options 作为单独的 JSON part 上传；正式导入优先基于 dryRunJobId 启动，页面恢复场景才退化为 importSessionId。"
        style={{ borderRadius: token.borderRadiusLG }}
      />
    </Flex>
  );

  const renderStep2 = () => {
    const dryRunStatus = dryRunRuntime.status;
    const dryRunFinished = isTerminalStatus(dryRunStatus?.status);
    const dryRunSucceeded = dryRunStatus?.status === 'COMPLETED';
    const summaryPanelStyle = {
      padding: '14px 16px',
      borderRadius: token.borderRadiusLG,
      border: `1px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer,
    } as const;

    return (
      <Flex vertical gap={16}>
        {!dryRunStatus && !dryRunResult && !dryRunning ? (
          <Flex vertical align="center" gap={16} style={{ padding: '40px 0' }}>
            <SafetyCertificateOutlined style={{ fontSize: 40, color: token.colorTextQuaternary }} />
            <Button size="middle" type="primary" icon={<PlayCircleOutlined />} onClick={runDryRun}>
              开始预检
            </Button>
          </Flex>
        ) : null}

        {dryRunning && !dryRunStatus ? (
          <Flex vertical align="center" gap={12} style={{ padding: '40px 0' }}>
            <Progress type="circle" percent={0} status="active" size={64} />
            <Text>正在创建 dry-run 任务...</Text>
          </Flex>
        ) : null}

        {dryRunStatus && !dryRunResult ? (
          <Flex vertical gap={16}>
            <Alert
              type={dryRunFinished ? (dryRunSucceeded ? 'success' : 'error') : 'info'}
              showIcon
              message={`${STATUS_LABELS[dryRunStatus.status] || dryRunStatus.status} · ${STAGE_LABELS[dryRunStatus.currentStage] || dryRunStatus.currentStage}`}
              description={`SSE ${dryRunRuntime.sseConnected ? '已连接' : '未连接，当前依赖轮询补齐状态与日志'} · dryRunJobId: ${dryRunStatus.jobId}`}
              style={{ borderRadius: token.borderRadiusLG }}
            />
            {renderRuntimeOverview('dryRun', dryRunStatus, dryRunRuntime)}

            {dryRunSucceeded && !dryRunResult ? (
              <Alert
                type="info"
                showIcon
                message="dry-run 已完成，正在读取完整预览结果"
                description="终态事件只用于通知，页面还会补拉最终状态与日志，再读取 /result 返回完整预检快照。"
                style={{ borderRadius: token.borderRadiusLG }}
              />
            ) : null}
          </Flex>
        ) : null}

        {dryRunResult ? (
          <Flex vertical gap={16}>
            <div
              style={{
                ...summaryPanelStyle,
                background: dryRunResult.summary.canImport
                  ? (dryRunResult.summary.warningCount > 0 ? token.colorWarningBg : token.colorSuccessBg)
                  : token.colorErrorBg,
                borderColor: dryRunResult.summary.canImport
                  ? (dryRunResult.summary.warningCount > 0 ? token.colorWarningBorder : token.colorSuccessBorder)
                  : token.colorErrorBorder,
              }}
            >
              <Flex align="flex-start" justify="space-between" gap={16} wrap="wrap">
                <Flex vertical gap={8} style={{ flex: 1, minWidth: 320 }}>
                  <Flex align="center" gap={10}>
                    {dryRunResult.summary.canImport
                      ? <CheckCircleFilled style={{ color: dryRunResult.summary.warningCount > 0 ? token.colorWarning : token.colorSuccess, fontSize: 18 }} />
                      : <CloseCircleFilled style={{ color: token.colorError, fontSize: 18 }} />}
                    <Text strong style={{ fontSize: 15 }}>
                      {dryRunResult.summary.canImport ? '预检结果可用' : '预检结果存在阻塞问题'}
                    </Text>
                  </Flex>
                  <Flex wrap="wrap" gap={8}>
                    <Tag color="error">错误 {dryRunResult.summary.errorCount}</Tag>
                    <Tag color="warning">警告 {dryRunResult.summary.warningCount}</Tag>
                    <Tag color="blue">分类 {dryRunResult.summary.categoryRowCount}</Tag>
                    <Tag color="cyan">属性 {dryRunResult.summary.attributeRowCount}</Tag>
                    <Tag color="geekblue">枚举值 {dryRunResult.summary.enumRowCount}</Tag>
                    <Tag color={dryRunResult.summary.canImport ? 'success' : 'error'}>
                      {dryRunResult.summary.canImport ? '允许导入' : '禁止导入'}
                    </Tag>
                  </Flex>
                </Flex>

                <Flex vertical align="flex-end" gap={8} style={{ marginLeft: 'auto' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>会话 ID：{dryRunResult.importSessionId}</Text>
                  <Space wrap>
                    <Button size="middle" onClick={() => toggleTaskDrawer('dryRun')} disabled={!dryRunStatus}>
                      {taskDrawerOpen && taskDrawerKind === 'dryRun' ? '收起任务详情' : '查看任务详情'}
                    </Button>
                    <Button size="middle" icon={<ReloadOutlined />} onClick={runDryRun} disabled={dryRunning}>
                      重新预检
                    </Button>
                  </Space>
                </Flex>
              </Flex>
            </div>

            <div style={summaryPanelStyle}>
              <Flex align="center" justify="space-between" gap={12} wrap="wrap" style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 14 }}>预览明细</Text>
                <Select<WorkbookImportPreviewEntityFilter>
                  size="middle"
                  value={previewEntityType}
                  onChange={setPreviewEntityType}
                  style={{ width: 200 }}
                  options={[
                    { label: `分类 (${dryRunResult.preview.categories.length})`, value: 'CATEGORY' },
                    { label: `属性 (${dryRunResult.preview.attributes.length})`, value: 'ATTRIBUTE' },
                    { label: `枚举值 (${dryRunResult.preview.enumOptions.length})`, value: 'ENUM_OPTION' },
                  ]}
                />
              </Flex>
              <Table<WorkbookImportPreviewRow>
                dataSource={previewRows}
                columns={previewColumns}
                rowKey="key"
                className="workbook-import-preview-table"
                size="small"
                pagination={{
                  current: previewPage,
                  pageSize: PREVIEW_PAGE_SIZE,
                  total: previewTotal,
                  size: 'default',
                  position: ['bottomRight'],
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (page) => setPreviewPage(page),
                }}
                scroll={{ y: 420 }}
                tableLayout="fixed"
                style={{ borderRadius: token.borderRadiusLG, overflow: 'hidden' }}
                locale={{ emptyText: '当前会话没有可展示的预览数据' }}
              />
            </div>

            {/*
            <Flex gap={16} wrap="wrap" align="stretch">
              <div style={{ ...summaryPanelStyle, flex: '1 1 520px', minWidth: 420 }}>
                <Flex align="center" justify="space-between" gap={12} wrap="wrap" style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 13 }}>全局问题</Text>
                  {dryRunResult.issues.length > 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>共 {dryRunResult.issues.length} 条</Text>
                  ) : null}
                </Flex>

                {dryRunResult.issues.length > 0 ? (
                  <Flex vertical gap={10}>
                    <div
                      className="category-import-preview-scroll"
                      style={{
                        maxHeight: 240,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: 4,
                      }}
                    >
                      <Flex vertical gap={6}>
                        {pagedIssues.map((issue, index) => (
                          <Flex
                            key={`${issue.errorCode ?? issue.message}-${(issuePage - 1) * ISSUE_PAGE_SIZE + index}`}
                            align="center"
                            gap={8}
                            style={{
                              padding: '6px 12px',
                              background: issue.level === 'ERROR' ? token.colorErrorBg : token.colorWarningBg,
                              borderRadius: token.borderRadiusLG,
                              border: `1px solid ${issue.level === 'ERROR' ? token.colorErrorBorder : token.colorWarningBorder}`,
                            }}
                          >
                            {issue.level === 'ERROR'
                              ? <CloseCircleFilled style={{ color: token.colorError }} />
                              : <WarningFilled style={{ color: token.colorWarning }} />}
                            <Text style={{ fontSize: 12 }}>
                              {issue.sheetName ? `${issue.sheetName} ` : ''}
                              {issue.rowNumber ? `第 ${issue.rowNumber} 行 ` : ''}
                              {issue.message}
                            </Text>
                          </Flex>
                        ))}
                      </Flex>
                    </div>
                    <Pagination
                      size="default"
                      align="end"
                      current={issuePage}
                      pageSize={ISSUE_PAGE_SIZE}
                      total={dryRunResult.issues.length}
                      showSizeChanger={false}
                      showTotal={(total) => `共 ${total} 条问题`}
                      onChange={(page) => setIssuePage(page)}
                    />
                  </Flex>
                ) : (
                  <Alert
                    type="success"
                    showIcon
                    message="当前没有全局问题"
                    style={{ borderRadius: token.borderRadiusLG }}
                  />
                )}
              </div>

              <Flex vertical gap={12} style={{ flex: '0 1 340px', minWidth: 300 }}>
                <div style={summaryPanelStyle}>
                  <Text strong style={{ fontSize: 13 }}>结果摘要</Text>
                  <Flex wrap="wrap" gap={16} style={{ marginTop: 12 }}>
                    <Flex vertical gap={2} style={{ minWidth: 88 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>识别模板</Text>
                      <Text strong>{dryRunResult.template.recognized ? '是' : '否'}</Text>
                    </Flex>
                    <Flex vertical gap={2} style={{ minWidth: 88 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>错误数</Text>
                      <Text strong style={{ color: token.colorError }}>{dryRunResult.summary.errorCount}</Text>
                    </Flex>
                    <Flex vertical gap={2} style={{ minWidth: 88 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>警告数</Text>
                      <Text strong style={{ color: token.colorWarning }}>{dryRunResult.summary.warningCount}</Text>
                    </Flex>
                    <Flex vertical gap={2} style={{ minWidth: 88 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>正式导入</Text>
                      <Text strong style={{ color: dryRunResult.summary.canImport ? token.colorSuccess : token.colorError }}>
                        {dryRunResult.summary.canImport ? '允许' : '不允许'}
                      </Text>
                    </Flex>
                  </Flex>
                  <Flex vertical gap={8} style={{ marginTop: 14 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Sheet 列表</Text>
                    <Space wrap>
                      {dryRunResult.template.sheetNames.map((sheetName) => (
                        <Tag key={sheetName}>{sheetName}</Tag>
                      ))}
                    </Space>
                  </Flex>
                </div>

                <div style={summaryPanelStyle}>
                  <Text strong style={{ fontSize: 13 }}>变更摘要</Text>
                  <Flex vertical gap={10} style={{ marginTop: 12 }}>
                    {renderChangeCard('分类变更', dryRunResult.changeSummary.categories)}
                    {renderChangeCard('属性变更', dryRunResult.changeSummary.attributes)}
                    {renderChangeCard('枚举值变更', dryRunResult.changeSummary.enumOptions)}
                  </Flex>
                </div>
              </Flex>
            </Flex>
            */}
          </Flex>
        ) : null}
      </Flex>
    );
  };

  const renderExecutionResult = () => {
    if (!importRuntime.status || !executionFinished) {
      return null;
    }

    const resultStatus = importRuntime.status.status === 'FAILED'
      ? 'error'
      : aggregateProgress.failed > 0
        ? 'warning'
        : 'success';

    return (
      <Result
        status={resultStatus}
        title={importRuntime.status.status === 'FAILED' ? '导入失败' : aggregateProgress.failed > 0 ? '导入完成（部分失败）' : '导入完成'}
        subTitle={
          <Flex vertical align="center" gap={4}>
            <Text>
              总计 <Text strong>{aggregateProgress.total}</Text> 条，
              已处理 <Text strong>{aggregateProgress.processed}</Text> 条，
              创建 <Text strong style={{ color: token.colorSuccess }}>{aggregateProgress.created}</Text> 条，
              更新 <Text strong>{aggregateProgress.updated}</Text> 条，
              跳过 <Text strong>{aggregateProgress.skipped}</Text> 条，
              失败 <Text strong style={{ color: token.colorError }}>{aggregateProgress.failed}</Text> 条
            </Text>
          </Flex>
        }
        style={{ padding: '8px 0 0' }}
      />
    );
  };

  const renderStep3 = () => {
    const importStatus = importRuntime.status;

    return (
      <Flex vertical gap={16}>
        {importing && !importStatus ? (
          <Flex vertical align="center" gap={16} style={{ padding: '40px 0' }}>
            <ImportOutlined style={{ fontSize: 40, color: token.colorTextQuaternary }} />
            <Text type="secondary">正在创建导入任务...</Text>
          </Flex>
        ) : null}

        {importStatus ? (
          <Flex vertical gap={16}>
            <Alert
              type={executionFinished ? (importSucceeded ? 'success' : 'error') : 'info'}
              showIcon
              message={`${STATUS_LABELS[importStatus.status] || importStatus.status} · ${STAGE_LABELS[importStatus.currentStage] || importStatus.currentStage}`}
              description={`SSE ${importRuntime.sseConnected ? '已连接' : '未连接，当前依赖轮询补齐状态与日志'} · importJobId: ${importStatus.jobId}`}
              style={{ borderRadius: token.borderRadiusLG }}
            />
            {renderRuntimeOverview('import', importStatus, importRuntime)}

            {renderExecutionResult()}
          </Flex>
        ) : null}
      </Flex>
    );
  };

  const renderFooter = () => (
    <Flex align="center" style={{ width: '100%' }}>
      {currentStep > 0 && currentStep < 3 && !dryRunning && !importing ? (
        <Button size="middle" icon={<ArrowLeftOutlined />} onClick={goPrev}>
          上一步
        </Button>
      ) : null}

      <Flex gap={8} justify="flex-end" style={{ marginLeft: 'auto' }}>
        {currentStep === 3 ? (
          <Button
            size="middle"
            type="primary"
            disabled={!executionFinished}
            onClick={() => {
              if (!executionFinished) {
                return;
              }

              if (importSucceeded) {
                onSuccess?.();
              }
              handleCancel();
            }}
          >
            {importSucceeded ? '完成' : '关闭'}
          </Button>
        ) : (
          <>
            <Button size="middle" onClick={handleCancel} disabled={dryRunning || importing}>
              取消
            </Button>
            <Button
              size="middle"
              type="primary"
              icon={currentStep === 2 ? <ImportOutlined /> : <ArrowRightOutlined />}
              onClick={currentStep === 2 ? handleConfirmImport : goNext}
              disabled={!canGoNext || dryRunning}
            >
              {currentStep === 2 ? '确认导入' : '下一步'}
            </Button>
          </>
        )}
      </Flex>
    </Flex>
  );

  return (
    <DraggableModal
      open={open}
      title="导入元数据工作簿"
      width="80%"
      footer={renderFooter()}
      onCancel={handleCancel}
      maskClosable={false}
      keyboard={false}
      closable={!(importing || dryRunning)}
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
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 20 }}
        items={IMPORT_STEPS.map((step, index) => ({
          title: step.title,
          status: stepStatuses[index],
          icon: STEP_ICONS[index],
        }))}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: currentStep === 0 || currentStep === 2 || currentStep === 3 ? 'hidden' : 'auto' }}>
        <div
          style={{
            position: 'relative',
            height: '100%',
            minHeight: 0,
          }}
        >
          <div
            className="workbook-import-scroll"
            style={{
              height: '100%',
              minHeight: 0,
              overflowY: currentStep === 2 || currentStep === 3 ? 'auto' : 'hidden',
              overflowX: 'hidden',
              paddingRight: taskDrawerOpen && currentStep >= 2 ? 12 : 0,
              paddingBottom: 12,
            }}
          >
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>
          {renderTaskSidePanel()}
        </div>
      </div>

      <style jsx global>{`
        .workbook-import-scroll,
        .workbook-import-preview-table .ant-table-body,
        .workbook-import-log-table .ant-table-body {
          scrollbar-width: thin;
          scrollbar-color: ${token.colorBorder} transparent;
        }

        .workbook-import-scroll::-webkit-scrollbar,
        .workbook-import-preview-table .ant-table-body::-webkit-scrollbar,
        .workbook-import-log-table .ant-table-body::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .workbook-import-scroll::-webkit-scrollbar-track,
        .workbook-import-preview-table .ant-table-body::-webkit-scrollbar-track,
        .workbook-import-log-table .ant-table-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .workbook-import-scroll::-webkit-scrollbar-thumb,
        .workbook-import-preview-table .ant-table-body::-webkit-scrollbar-thumb,
        .workbook-import-log-table .ant-table-body::-webkit-scrollbar-thumb {
          background: ${token.colorBorder};
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }

        .workbook-import-scroll::-webkit-scrollbar-thumb:hover,
        .workbook-import-preview-table .ant-table-body::-webkit-scrollbar-thumb:hover,
        .workbook-import-log-table .ant-table-body::-webkit-scrollbar-thumb:hover {
          background: ${token.colorTextQuaternary};
          border: 3px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </DraggableModal>
  );
};

export default WorkbookImportModal;