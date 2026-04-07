import { API_BASE_URL } from '@/config';
import request from './request';
import type {
  WorkbookImportDryRunOptionsDto,
  WorkbookImportDryRunResultPageQueryParams,
  WorkbookImportDryRunResponseDto,
  WorkbookImportDryRunStartResponseDto,
  WorkbookImportJobStatusDto,
  WorkbookImportLogPageDto,
  WorkbookImportStartRequestDto,
  WorkbookImportStartResponseDto,
} from '@/models/workbookImport';

export type {
  WorkbookImportDryRunOptionsDto,
  WorkbookImportDryRunResultPageQueryParams,
  WorkbookImportDryRunResponseDto,
  WorkbookImportDryRunStartResponseDto,
  WorkbookImportEntityProgressDto,
  WorkbookImportExecutionMode,
  WorkbookImportIssueDto,
  WorkbookImportJobStatusDto,
  WorkbookImportJobType,
  WorkbookImportJobStatusValue,
  WorkbookImportLogEventDto,
  WorkbookImportLogPageDto,
  WorkbookImportResolvedAction,
  WorkbookImportStage,
  WorkbookImportStartRequestDto,
  WorkbookImportStartResponseDto,
} from '@/models/workbookImport';

const WORKBOOK_IMPORT_BASE = '/api/meta/imports/workbook';
const WORKBOOK_DRY_RUN_TIMEOUT = 30000;

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

type WorkbookImportLogQueryParams = {
  cursor?: string;
  limit?: number;
  level?: string;
  stage?: string;
  sheetName?: string;
  rowNumber?: number;
};

const createMultipartFormData = (
  file: File,
  options: WorkbookImportDryRunOptionsDto,
): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('options', new Blob([JSON.stringify(options)], { type: 'application/json' }));
  return formData;
};

const buildWorkbookStreamUrl = (path: string): string => {
  if (typeof window !== 'undefined') {
    return path;
  }

  const baseUrl = normalizeBaseUrl(API_BASE_URL);
  return baseUrl ? `${baseUrl}${path}` : path;
};

export const workbookImportApi = {
  dryRun(
    file: File,
    options: WorkbookImportDryRunOptionsDto,
    operator: string = 'admin',
  ): Promise<WorkbookImportDryRunResponseDto> {
    const formData = createMultipartFormData(file, options);

    return request.post(`${WORKBOOK_IMPORT_BASE}/dry-run`, formData, {
      params: { operator },
      timeout: WORKBOOK_DRY_RUN_TIMEOUT,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  startDryRunJob(
    file: File,
    options: WorkbookImportDryRunOptionsDto,
    operator: string = 'admin',
  ): Promise<WorkbookImportDryRunStartResponseDto> {
    const formData = createMultipartFormData(file, options);

    return request.post(`${WORKBOOK_IMPORT_BASE}/dry-run-jobs`, formData, {
      params: { operator },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getSession(importSessionId: string): Promise<WorkbookImportDryRunResponseDto> {
    return request.get(`${WORKBOOK_IMPORT_BASE}/sessions/${encodeURIComponent(importSessionId)}`);
  },

  getDryRunJobStatus(jobId: string): Promise<WorkbookImportJobStatusDto> {
    return request.get(`${WORKBOOK_IMPORT_BASE}/dry-run-jobs/${encodeURIComponent(jobId)}`);
  },

  getDryRunResult(jobId: string): Promise<WorkbookImportDryRunResponseDto> {
    return request.get(`${WORKBOOK_IMPORT_BASE}/dry-run-jobs/${encodeURIComponent(jobId)}/result`);
  },

  getDryRunResultPage(
    jobId: string,
    params: WorkbookImportDryRunResultPageQueryParams,
  ): Promise<WorkbookImportDryRunResponseDto> {
    return request.get(`${WORKBOOK_IMPORT_BASE}/dry-run-jobs/${encodeURIComponent(jobId)}/result`, { params });
  },

  listDryRunJobLogs(
    jobId: string,
    params?: WorkbookImportLogQueryParams,
  ): Promise<WorkbookImportLogPageDto> {
    return request.get(`${WORKBOOK_IMPORT_BASE}/dry-run-jobs/${encodeURIComponent(jobId)}/logs`, { params });
  },

  getDryRunJobStreamUrl(jobId: string): string {
    const path = `${WORKBOOK_IMPORT_BASE}/dry-run-jobs/${encodeURIComponent(jobId)}/stream`;
    return buildWorkbookStreamUrl(path);
  },

  startImport(data: WorkbookImportStartRequestDto): Promise<WorkbookImportStartResponseDto> {
    return request.post(`${WORKBOOK_IMPORT_BASE}/import-jobs`, data);
  },

  getImportJobStatus(jobId: string): Promise<WorkbookImportJobStatusDto> {
    return request.get(`${WORKBOOK_IMPORT_BASE}/jobs/${encodeURIComponent(jobId)}`);
  },

  listImportJobLogs(
    jobId: string,
    params?: WorkbookImportLogQueryParams,
  ): Promise<WorkbookImportLogPageDto> {
    return request.get(`${WORKBOOK_IMPORT_BASE}/jobs/${encodeURIComponent(jobId)}/logs`, { params });
  },

  getImportJobStreamUrl(jobId: string): string {
    const path = `${WORKBOOK_IMPORT_BASE}/jobs/${encodeURIComponent(jobId)}/stream`;
    return buildWorkbookStreamUrl(path);
  },

  getJobStatus(jobId: string): Promise<WorkbookImportJobStatusDto> {
    return workbookImportApi.getImportJobStatus(jobId);
  },

  listJobLogs(jobId: string, params?: WorkbookImportLogQueryParams): Promise<WorkbookImportLogPageDto> {
    return workbookImportApi.listImportJobLogs(jobId, params);
  },

  getJobStreamUrl(jobId: string): string {
    return workbookImportApi.getImportJobStreamUrl(jobId);
  },
};