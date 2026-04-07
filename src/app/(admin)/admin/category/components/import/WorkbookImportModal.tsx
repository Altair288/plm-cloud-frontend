'use client';

import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Flex,
  Progress,
  Steps,
  Typography,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  FileExcelOutlined,
  ImportOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import DraggableModal from '@/components/DraggableModal';
import { workbookImportApi } from '@/services/workbookImport';
import type {
  WorkbookImportDryRunResponseDto,
  WorkbookImportEntityProgressDto,
  WorkbookImportJobStatusDto,
  WorkbookImportLogEventDto,
} from '@/services/workbookImport';
import {
  DEFAULT_WORKBOOK_IMPORT_FORM,
  getPreviewRowCount,
  IMPORT_STEPS,
  mapDryRunPreviewRowsPage,
  type ImportStep,
  type WorkbookImportPreviewEntityFilter,
  type StepStatus,
} from './workbookImportUi';
import {
  createLogColumns,
  createPreviewColumns,
  createEmptyPreviewEntityIssueStats,
  getPreviewEntityIssueStats,
  RuntimeJobState,
  STAGE_LABELS,
  STATUS_LABELS,
  type PreviewEntityIssueStats,
  type RuntimeJobKind,
  WorkbookImportConfigStep,
  WorkbookImportDryRunResultPanel,
  WorkbookImportExecutionResult,
  WorkbookImportRuntimeOverview,
  WorkbookImportTaskSidePanel,
  WorkbookImportUploadStep,
} from './WorkbookImportModalSections';

const { Text } = Typography;

const MODAL_BODY_HEIGHT = 'calc(100vh - 260px)';
const LOG_POLL_INTERVAL = 3000;
const SSE_RECONNECT_DELAY = 3000;
const PREVIEW_PAGE_SIZE = 100;
const TASK_PANEL_WIDTH = 800;

interface WorkbookImportModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  defaultBusinessDomain?: string;
}

interface RuntimeJobTracker {
  eventSource: EventSource | null;
  pollTimer: number | null;
  reconnectTimer: number | null;
  lastLogCursor: string | null;
  seenLogKeys: Set<string>;
}

const STEP_ICONS = [
  <FileExcelOutlined key="upload" />,
  <SettingOutlined key="config" />,
  <SafetyCertificateOutlined key="dryrun" />,
  <ImportOutlined key="exec" />,
];

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
  reconnectTimer: null,
  lastLogCursor: null,
  seenLogKeys: new Set<string>(),
});

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dryRunRuntime, setDryRunRuntime] = useState<RuntimeJobState>(() => createEmptyRuntimeState());
  const [importRuntime, setImportRuntime] = useState<RuntimeJobState>(() => createEmptyRuntimeState());
  const [importing, setImporting] = useState(false);
  const [previewEntityType, setPreviewEntityType] = useState<WorkbookImportPreviewEntityFilter>('CATEGORY');
  const [previewPage, setPreviewPage] = useState(1);
  const [previewEntityIssueStats, setPreviewEntityIssueStats] = useState<PreviewEntityIssueStats>(() => createEmptyPreviewEntityIssueStats());
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskDrawerKind, setTaskDrawerKind] = useState<RuntimeJobKind>('dryRun');
  const [previewTableScrollY, setPreviewTableScrollY] = useState(320);

  const runtimeTrackersRef = useRef<Record<RuntimeJobKind, RuntimeJobTracker>>({
    dryRun: createRuntimeTracker(),
    import: createRuntimeTracker(),
  });
  const runtimeStateRef = useRef<Record<RuntimeJobKind, RuntimeJobState>>({
    dryRun: createEmptyRuntimeState(),
    import: createEmptyRuntimeState(),
  });
  const dryRunResultRequestRef = useRef<string | null>(null);
  const dryRunLoadedJobIdRef = useRef<string | null>(null);
  const dryRunIssueStatsLoadedJobIdRef = useRef<string | null>(null);
  const dryRunFailureNoticeRef = useRef<string | null>(null);
  const previewResultCacheRef = useRef<Record<string, WorkbookImportDryRunResponseDto>>({});
  const dryRunResultLayoutRef = useRef<HTMLDivElement | null>(null);
  const dryRunSummaryRef = useRef<HTMLDivElement | null>(null);
  const previewPanelRef = useRef<HTMLDivElement | null>(null);
  const previewToolbarRef = useRef<HTMLDivElement | null>(null);
  const previewPagerRef = useRef<HTMLDivElement | null>(null);

  const previewRows = useMemo(() => {
    return mapDryRunPreviewRowsPage(dryRunResult, previewEntityType, previewPage, PREVIEW_PAGE_SIZE);
  }, [dryRunResult, previewEntityType, previewPage]);

  runtimeStateRef.current.dryRun = dryRunRuntime;
  runtimeStateRef.current.import = importRuntime;

  const previewTotal = useMemo(() => {
    return getPreviewRowCount(dryRunResult, previewEntityType);
  }, [dryRunResult, previewEntityType]);

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

    if (tracker.reconnectTimer !== null) {
      window.clearTimeout(tracker.reconnectTimer);
      tracker.reconnectTimer = null;
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
    previewResultCacheRef.current = {};
    dryRunIssueStatsLoadedJobIdRef.current = null;
    dryRunFailureNoticeRef.current = null;
    setCurrentStep(0);
    setStepStatuses(['process', 'wait', 'wait', 'wait']);
    setUploadedFile(null);
    setFormState(DEFAULT_WORKBOOK_IMPORT_FORM);
    setDryRunResult(null);
    setPreviewLoading(false);
    setPreviewEntityType('CATEGORY');
    setPreviewPage(1);
    setPreviewEntityIssueStats(createEmptyPreviewEntityIssueStats());
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
    const runtimeState = runtimeStateRef.current[kind];
    const hasLocalLogs = runtimeState.logs.length > 0;
    const hasSnapshotLogs = (runtimeState.status?.latestLogs?.length ?? 0) > 0;
    const cursor = !hasLocalLogs && !hasSnapshotLogs
      ? undefined
      : runtimeTrackersRef.current[kind].lastLogCursor ?? undefined;
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

    const scheduleReconnect = () => {
      if (disposed || tracker.reconnectTimer !== null) {
        return;
      }

      tracker.reconnectTimer = window.setTimeout(() => {
        tracker.reconnectTimer = null;
        if (disposed || tracker.eventSource) {
          return;
        }
        openStream();
      }, SSE_RECONNECT_DELAY);
    };

    const openStream = () => {
      if (disposed || tracker.eventSource) {
        return;
      }

      const stream = new EventSource(streamUrl, { withCredentials: true });
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
        if (disposed) {
          return;
        }

        if (tracker.reconnectTimer !== null) {
          window.clearTimeout(tracker.reconnectTimer);
          tracker.reconnectTimer = null;
        }

        updateRuntimeState(kind, (prev) => prev.sseConnected ? prev : { ...prev, sseConnected: true });
      };

      stream.onerror = () => {
        if (disposed) {
          return;
        }

        if (tracker.eventSource === stream) {
          stream.close();
          tracker.eventSource = null;
        }

        updateRuntimeState(kind, (prev) => prev.sseConnected ? { ...prev, sseConnected: false } : prev);

        void (async () => {
          try {
            const snapshot = await refreshRuntimeSnapshot(kind, activeJobId);
            await pullRuntimeLogs(kind, activeJobId);
            if (!disposed && !isTerminalStatus(snapshot.status)) {
              scheduleReconnect();
            }
          } catch {
            if (!disposed) {
              scheduleReconnect();
            }
          }
        })();
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
    };

    openStream();

    void refreshRuntimeSnapshot(kind, activeJobId);
    void pullRuntimeLogs(kind, activeJobId);

    if (tracker.pollTimer === null) {
      tracker.pollTimer = window.setInterval(() => {
        void refreshRuntimeSnapshot(kind, activeJobId);
        void pullRuntimeLogs(kind, activeJobId);
      }, LOG_POLL_INTERVAL);
    }

    return () => {
      disposed = true;

      if (tracker.eventSource) {
        tracker.eventSource.close();
        tracker.eventSource = null;
      }

      if (tracker.pollTimer !== null) {
        window.clearInterval(tracker.pollTimer);
        tracker.pollTimer = null;
      }

      if (tracker.reconnectTimer !== null) {
        window.clearTimeout(tracker.reconnectTimer);
        tracker.reconnectTimer = null;
      }

      updateRuntimeState(kind, (prev) => prev.sseConnected ? { ...prev, sseConnected: false } : prev);
    };
  }, [mergeRuntimeLogs, pullRuntimeLogs, refreshRuntimeSnapshot, syncRuntimeSnapshot, updateRuntimeState]);

  const invalidateDryRun = useCallback(() => {
    dryRunResultRequestRef.current = null;
    previewResultCacheRef.current = {};
    dryRunFailureNoticeRef.current = null;
    dryRunIssueStatsLoadedJobIdRef.current = null;
    setDryRunResult(null);
    setPreviewLoading(false);
    setPreviewPage(1);
    setPreviewEntityIssueStats(createEmptyPreviewEntityIssueStats());
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
    dryRunLoadedJobIdRef.current = null;
    dryRunIssueStatsLoadedJobIdRef.current = null;
    dryRunFailureNoticeRef.current = null;
    previewResultCacheRef.current = {};
    setDryRunning(true);
    setDryRunResult(null);
    setPreviewLoading(false);
    setPreviewEntityIssueStats(createEmptyPreviewEntityIssueStats());
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
    if (!open || !dryRunRuntime.jobId || isTerminalStatus(dryRunRuntime.status?.status)) {
      return undefined;
    }

    return startRuntimeTracking('dryRun', dryRunRuntime.jobId);
  }, [dryRunRuntime.jobId, open, startRuntimeTracking]);

  useEffect(() => {
    if (!open || !importRuntime.jobId || isTerminalStatus(importRuntime.status?.status)) {
      return undefined;
    }

    return startRuntimeTracking('import', importRuntime.jobId);
  }, [importRuntime.jobId, open, startRuntimeTracking]);

  useEffect(() => {
    const activeJobId = dryRunRuntime.jobId;
    if (!activeJobId || dryRunRuntime.status?.status !== 'COMPLETED') {
      return undefined;
    }

    const requestKey = `${activeJobId}:${previewEntityType}:${previewPage}`;
    dryRunResultRequestRef.current = requestKey;
    let cancelled = false;

    const loadResult = async () => {
      const cachedResult = previewResultCacheRef.current[requestKey];
      if (cachedResult) {
        startTransition(() => {
          setDryRunResult(cachedResult);
        });
        markStep(2, cachedResult.summary.canImport ? 'process' : 'error');
        return;
      }

      setPreviewLoading(true);
      try {
        const result = await workbookImportApi.getDryRunResultPage(activeJobId, {
          entityType: previewEntityType,
          page: Math.max(previewPage - 1, 0),
          size: PREVIEW_PAGE_SIZE,
        });
        if (cancelled || dryRunResultRequestRef.current !== requestKey) {
          return;
        }
        previewResultCacheRef.current[requestKey] = result;
        startTransition(() => {
          setDryRunResult(result);
        });
        markStep(2, result.summary.canImport ? 'process' : 'error');
        if (dryRunLoadedJobIdRef.current !== activeJobId) {
          dryRunLoadedJobIdRef.current = activeJobId;
          message.success('预检完成');
        }
      } catch (error: any) {
        if (cancelled || dryRunResultRequestRef.current !== requestKey) {
          return;
        }
        markStep(2, 'error');
        message.error(getErrorMessage(error, '加载预检结果失败'));
      } finally {
        if (!cancelled && dryRunResultRequestRef.current === requestKey) {
          setPreviewLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [dryRunRuntime.jobId, dryRunRuntime.status?.status, markStep, message, previewEntityType, previewPage]);

  useEffect(() => {
    const activeJobId = dryRunRuntime.jobId;
    if (!activeJobId || dryRunRuntime.status?.status !== 'FAILED' || dryRunFailureNoticeRef.current === activeJobId) {
      return;
    }

    dryRunFailureNoticeRef.current = activeJobId;
    message.error(getLastLogMessage(dryRunRuntime.logs) || '预检失败');
  }, [dryRunRuntime.jobId, dryRunRuntime.logs, dryRunRuntime.status?.status, message]);

  useEffect(() => {
    const activeJobId = dryRunRuntime.jobId;
    if (!activeJobId || dryRunRuntime.status?.status !== 'COMPLETED' || dryRunIssueStatsLoadedJobIdRef.current === activeJobId) {
      return;
    }

    let cancelled = false;

    const loadIssueStats = async () => {
      try {
        const fullResult = await workbookImportApi.getDryRunResult(activeJobId);
        if (cancelled) {
          return;
        }
        dryRunIssueStatsLoadedJobIdRef.current = activeJobId;
        setPreviewEntityIssueStats(getPreviewEntityIssueStats(fullResult));
      } catch {
        if (!cancelled) {
          setPreviewEntityIssueStats(createEmptyPreviewEntityIssueStats());
        }
      }
    };

    void loadIssueStats();

    return () => {
      cancelled = true;
    };
  }, [dryRunRuntime.jobId, dryRunRuntime.status?.status]);

  useEffect(() => {
    if (!open || currentStep !== 2 || !uploadedFile || dryRunning || dryRunResult || dryRunRuntime.jobId || dryRunRuntime.status) {
      return;
    }

    void runDryRun();
  }, [currentStep, dryRunResult, dryRunRuntime.jobId, dryRunRuntime.status, dryRunning, open, runDryRun, uploadedFile]);

  useEffect(() => {
    setPreviewPage(1);
  }, [previewEntityType]);

  useEffect(() => {
    if (!open || currentStep !== 2 || !dryRunResult) {
      return undefined;
    }

    const computePreviewTableHeight = () => {
      const layout = dryRunResultLayoutRef.current;
      const summary = dryRunSummaryRef.current;
      const panel = previewPanelRef.current;
      const toolbar = previewToolbarRef.current;
      if (!layout || !panel || !toolbar) {
        return;
      }

      const header = layout.querySelector('.workbook-import-preview-table .ant-table-header') as HTMLElement | null;
      const toolbarHeight = toolbar.offsetHeight;
      const toolbarStyle = window.getComputedStyle(toolbar);
      const toolbarMarginBottom = Number.parseFloat(toolbarStyle.marginBottom || '0') || 0;
      const headerHeight = header?.offsetHeight ?? 55;
      const paginationHeight = previewPagerRef.current?.offsetHeight ?? 44;
      const panelStyle = window.getComputedStyle(panel);
      const panelPaddingTop = Number.parseFloat(panelStyle.paddingTop || '0') || 0;
      const panelPaddingBottom = Number.parseFloat(panelStyle.paddingBottom || '0') || 0;
      const nextHeight = panel.clientHeight
        - panelPaddingTop
        - panelPaddingBottom
        - toolbarHeight
        - toolbarMarginBottom
        - headerHeight
        - paginationHeight;

      setPreviewTableScrollY((prev) => {
        const normalized = Math.max(180, nextHeight);
        return Math.abs(prev - normalized) <= 1 ? prev : normalized;
      });
    };

    const frameId = window.requestAnimationFrame(computePreviewTableHeight);
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(computePreviewTableHeight);
    });

    if (dryRunResultLayoutRef.current) {
      resizeObserver.observe(dryRunResultLayoutRef.current);
    }
    if (dryRunSummaryRef.current) {
      resizeObserver.observe(dryRunSummaryRef.current);
    }
    if (previewToolbarRef.current) {
      resizeObserver.observe(previewToolbarRef.current);
    }
    if (previewPagerRef.current) {
      resizeObserver.observe(previewPagerRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [currentStep, dryRunResult, open]);

  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const tableBody = panel.querySelector('.workbook-import-preview-table .ant-table-body') as HTMLElement | null;
      if (tableBody) {
        tableBody.scrollTop = 0;
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [dryRunResult?.previewEntityType, dryRunResult?.previewPage?.number, previewEntityType, previewPage]);

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

  const previewColumns = useMemo(() => createPreviewColumns(token), [token]);

  const logColumns = useMemo(() => createLogColumns(), []);

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
  const renderStep0 = () => (
    <WorkbookImportUploadStep
      token={token}
      uploadedFile={uploadedFile}
      onFileUpload={handleFileUpload}
      onRemoveFile={handleRemoveFile}
      defaultBusinessDomain={defaultBusinessDomain}
    />
  );

  const renderStep1 = () => (
    <WorkbookImportConfigStep
      token={token}
      formState={formState}
      onUpdateCodingOption={updateCodingOption}
      onUpdateDuplicateOption={updateDuplicateOption}
      onAtomicChange={(value) => {
        invalidateDryRun();
        setFormState((prev) => ({ ...prev, atomic: value }));
      }}
    />
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
      <Flex vertical gap={16} style={{ height: '100%', minHeight: 0 }}>
        {!dryRunStatus && !dryRunResult && !dryRunning ? (
          <Flex vertical align="center" gap={16} style={{ padding: '40px 0' }}>
            <SafetyCertificateOutlined style={{ fontSize: 40, color: token.colorTextQuaternary }} />
            <Text strong>正在自动启动预检...</Text>
            <Text type="secondary">进入当前步骤后系统会自动创建预检任务，无需再次点击开始。</Text>
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
            <WorkbookImportRuntimeOverview
              token={token}
              kind="dryRun"
              status={dryRunStatus}
              runtimeState={dryRunRuntime}
              taskDrawerOpen={taskDrawerOpen}
              taskDrawerKind={taskDrawerKind}
              onToggleTaskDrawer={toggleTaskDrawer}
            />

            {dryRunSucceeded && !dryRunResult ? (
              <Alert
                type="info"
                showIcon
                title="dry-run 已完成，正在读取预览分页结果"
                description="页面只会拉取当前实体的当前页预览数据，切换实体或页码时再增量请求。"
                style={{ borderRadius: token.borderRadiusLG }}
              />
            ) : null}
          </Flex>
        ) : null}

        {dryRunResult ? (
          <WorkbookImportDryRunResultPanel
            token={token}
            dryRunResult={dryRunResult}
            dryRunStatus={dryRunStatus}
            taskDrawerOpen={taskDrawerOpen}
            taskDrawerKind={taskDrawerKind}
            previewEntityType={previewEntityType}
            previewRows={previewRows}
            previewColumns={previewColumns}
            previewTableScrollY={previewTableScrollY}
            previewPage={previewPage}
            previewTotal={previewTotal}
            previewEntityIssueStats={previewEntityIssueStats}
            onPreviewEntityTypeChange={setPreviewEntityType}
            onPreviewPageChange={setPreviewPage}
            onRunDryRun={runDryRun}
            onToggleTaskDrawer={toggleTaskDrawer}
            dryRunResultLayoutRef={dryRunResultLayoutRef}
            dryRunSummaryRef={dryRunSummaryRef}
            previewPanelRef={previewPanelRef}
            previewToolbarRef={previewToolbarRef}
            previewPagerRef={previewPagerRef}
          />
        ) : null}
      </Flex>
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
            <WorkbookImportRuntimeOverview
              token={token}
              kind="import"
              status={importStatus}
              runtimeState={importRuntime}
              taskDrawerOpen={taskDrawerOpen}
              taskDrawerKind={taskDrawerKind}
              onToggleTaskDrawer={toggleTaskDrawer}
            />

            <WorkbookImportExecutionResult
              token={token}
              importStatus={importRuntime.status}
              executionFinished={executionFinished}
              aggregateProgress={aggregateProgress}
            />
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
              overflowY: currentStep === 3 ? 'auto' : 'hidden',
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
          <WorkbookImportTaskSidePanel
            token={token}
            currentStep={currentStep}
            taskDrawerOpen={taskDrawerOpen}
            taskDrawerKind={taskDrawerKind}
            taskPanelWidth={TASK_PANEL_WIDTH}
            dryRunRuntime={dryRunRuntime}
            importRuntime={importRuntime}
            dryRunResult={dryRunResult}
            logColumns={logColumns}
            onClose={closeTaskDrawer}
          />
        </div>
      </div>

      <style jsx global>{`
        .workbook-import-scroll,
        .workbook-import-preview-table .ant-table-body,
        .workbook-import-log-table .ant-table-body {
          scrollbar-width: thin;
          scrollbar-color: ${token.colorBorder} transparent;
        }

        .workbook-import-preview-table,
        .workbook-import-preview-table .ant-spin-nested-loading,
        .workbook-import-preview-table .ant-spin-container,
        .workbook-import-log-table,
        .workbook-import-log-table .ant-spin-nested-loading,
        .workbook-import-log-table .ant-spin-container {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .workbook-import-preview-table .ant-table,
        .workbook-import-log-table .ant-table {
          flex: 1;
          min-height: 0;
        }

        .workbook-import-log-table .ant-table-container,
        .workbook-import-log-table .ant-table-content {
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100%;
        }

        .workbook-import-log-table .ant-table-body {
          flex: 1;
          min-height: 0;
          overflow: auto !important;
        }

        .workbook-import-resize-handle {
          position: absolute;
          top: 0;
          right: -5px;
          width: 10px;
          height: 100%;
          cursor: col-resize;
          z-index: 2;
        }

        .workbook-import-resize-handle::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 4px;
          transform: translateY(-50%);
          width: 2px;
          height: 18px;
          border-radius: 999px;
          background: ${token.colorBorderSecondary};
          transition: background 0.2s ease;
        }

        .workbook-import-resize-handle:hover::after {
          background: ${token.colorPrimary};
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