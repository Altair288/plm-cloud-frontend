import request from './request';
import { readPersistedAuthSnapshot } from '@/utils/authStorage';
import type {
  CreateCategoryCodePreviewRequestDto,
  CreateCategoryCodePreviewResponseDto,
  CreateCategoryRequestDto,
  DeleteCategoryResponseDto,
  MetaCategoryBatchDeleteRequestDto,
  MetaCategoryBatchDeleteResponseDto,
  MetaCategoryBatchTransferRequestDto,
  MetaCategoryBatchTransferResponseDto,
  MetaCategoryBatchTransferStreamFailedEventDto,
  MetaCategoryBatchTransferStreamStartedEventDto,
  MetaCategoryBatchTransferTopologyRequestDto,
  MetaCategoryBatchTransferTopologyResponseDto,
  MetaCategoryChildrenBatchRequestDto,
  MetaCategoryDetailDto,
  MetaCategoryNodeDto,
  MetaCategorySearchItemDto,
  MetaCategorySubtreeRequestDto,
  MetaCategorySubtreeResponseDto,
  MetaCategoryTreeNodeDto,
  MetaCategoryVersionCompareDto,
  PageResponse,
  PatchCategoryRequestDto,
  UpdateCategoryRequestDto,
} from '@/models/metaCategory';

export type {
  CreateCategoryCodePreviewRequestDto,
  CreateCategoryCodePreviewResponseDto,
  CreateCategoryRequestDto,
  DeleteCategoryResponseDto,
  MetaCategoryBatchDeleteRequestDto,
  MetaCategoryBatchDeleteResponseDto,
  MetaCategoryBatchTransferRequestDto,
  MetaCategoryBatchTransferResponseDto,
  MetaCategoryBatchTransferStreamFailedEventDto,
  MetaCategoryBatchTransferStreamStartedEventDto,
  MetaCategoryBatchTransferTopologyRequestDto,
  MetaCategoryBatchTransferTopologyResponseDto,
  MetaCategoryChildrenBatchRequestDto,
  MetaCategoryDetailDto,
  MetaCategoryNodeDto,
  MetaCategorySearchItemDto,
  MetaCategorySubtreeRequestDto,
  MetaCategorySubtreeResponseDto,
  MetaCategoryTreeNodeDto,
  MetaCategoryVersionCompareDto,
  PageResponse,
  PatchCategoryRequestDto,
  UpdateCategoryRequestDto,
} from '@/models/metaCategory';

const CATEGORY_BASE = '/api/meta/categories';
const CATEGORY_BATCH_TRANSFER_TIMEOUT = 120000;
const SSE_CONTENT_TYPE = 'text/event-stream';

type BatchTransferStreamResponse =
  | MetaCategoryBatchTransferResponseDto
  | MetaCategoryBatchTransferTopologyResponseDto;

interface BatchTransferStreamOptions {
  onStarted?: (event: MetaCategoryBatchTransferStreamStartedEventDto) => void;
}

const buildBatchTransferStreamHeaders = () => {
  const headers = new Headers({
    Accept: SSE_CONTENT_TYPE,
    'Content-Type': 'application/json',
  });
  const authSnapshot = readPersistedAuthSnapshot();

  if (
    authSnapshot.platformAuth.platformTokenName &&
    authSnapshot.platformAuth.platformToken
  ) {
    headers.set(
      authSnapshot.platformAuth.platformTokenName,
      authSnapshot.platformAuth.platformToken,
    );
  }

  if (
    authSnapshot.workspaceSession.workspaceTokenName &&
    authSnapshot.workspaceSession.workspaceToken
  ) {
    headers.set(
      authSnapshot.workspaceSession.workspaceTokenName,
      authSnapshot.workspaceSession.workspaceToken,
    );
  }

  return headers;
};

const parseSseEventBlock = (block: string) => {
  const lines = block.split(/\r?\n/);
  let event = 'message';
  const dataLines: string[] = [];

  lines.forEach((line) => {
    if (!line || line.startsWith(':')) {
      return;
    }

    const separatorIndex = line.indexOf(':');
    const field = (separatorIndex >= 0 ? line.slice(0, separatorIndex) : line).trim();
    let value = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : '';
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    if (field === 'event' && value) {
      event = value;
      return;
    }

    if (field === 'data') {
      dataLines.push(value);
    }
  });

  return {
    event,
    data: dataLines.join('\n'),
  };
};

const extractSseBlocks = (buffer: string) => {
  const blocks: string[] = [];
  let nextBuffer = buffer;

  while (true) {
    const match = nextBuffer.match(/\r?\n\r?\n/);
    if (!match || match.index == null) {
      break;
    }

    blocks.push(nextBuffer.slice(0, match.index));
    nextBuffer = nextBuffer.slice(match.index + match[0].length);
  }

  return { blocks, nextBuffer };
};

const readStructuredErrorResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return {
        message: `${response.status} ${response.statusText}`,
      };
    }
  }

  const text = await response.text();
  return {
    message: text || `${response.status} ${response.statusText}`,
  };
};

const executeBatchTransferStreamRequest = async <TResponse extends BatchTransferStreamResponse>(
  path: string,
  data: MetaCategoryBatchTransferRequestDto | MetaCategoryBatchTransferTopologyRequestDto,
  options?: BatchTransferStreamOptions,
): Promise<TResponse> => {
  const response = await fetch(path, {
    method: 'POST',
    headers: buildBatchTransferStreamHeaders(),
    body: JSON.stringify(data),
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw await readStructuredErrorResponse(response);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (!contentType.includes(SSE_CONTENT_TYPE)) {
    return await response.json() as TResponse;
  }

  if (!response.body) {
    throw {
      message: '批量转移流已建立，但未返回可读数据。',
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const { blocks, nextBuffer } = extractSseBlocks(buffer);
    buffer = nextBuffer;

    for (const block of blocks) {
      if (!block.trim()) {
        continue;
      }

      const parsed = parseSseEventBlock(block);
      if (!parsed.data) {
        continue;
      }

      if (parsed.event === 'started') {
        options?.onStarted?.(
          JSON.parse(parsed.data) as MetaCategoryBatchTransferStreamStartedEventDto,
        );
        continue;
      }

      if (parsed.event === 'completed') {
        return JSON.parse(parsed.data) as TResponse;
      }

      if (parsed.event === 'failed') {
        throw JSON.parse(parsed.data) as MetaCategoryBatchTransferStreamFailedEventDto;
      }
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseEventBlock(buffer);
    if (parsed.data) {
      if (parsed.event === 'completed') {
        return JSON.parse(parsed.data) as TResponse;
      }

      if (parsed.event === 'failed') {
        throw JSON.parse(parsed.data) as MetaCategoryBatchTransferStreamFailedEventDto;
      }
    }
  }

  throw {
    message: '批量转移流已结束，但未收到 completed 或 failed 事件。',
  };
};

export const metaCategoryApi = {
  listNodes(params: {
    businessDomain: string;
    parentId?: string;
    level?: number;
    keyword?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<MetaCategoryNodeDto>> {
    return request.get(`${CATEGORY_BASE}/nodes`, { params });
  },

  getNodePath(id: string, businessDomain: string): Promise<MetaCategoryNodeDto[]> {
    return request.get(`${CATEGORY_BASE}/nodes/${encodeURIComponent(id)}/path`, {
      params: { businessDomain },
    });
  },

  search(params: {
    businessDomain: string;
    keyword: string;
    scopeNodeId?: string;
    maxDepth?: number;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<MetaCategorySearchItemDto>> {
    return request.get(`${CATEGORY_BASE}/search`, { params });
  },

  listChildrenBatch(data: MetaCategoryChildrenBatchRequestDto): Promise<Record<string, MetaCategoryNodeDto[]>> {
    return request.post(`${CATEGORY_BASE}/nodes:children-batch`, data);
  },

  getCategorySubtree(
    data: MetaCategorySubtreeRequestDto,
  ): Promise<MetaCategorySubtreeResponseDto<MetaCategoryTreeNodeDto>> {
    return request.post(`${CATEGORY_BASE}/nodes/subtree`, data);
  },

  createCategory(
    data: CreateCategoryRequestDto,
    options?: { operator?: string },
  ): Promise<MetaCategoryDetailDto> {
    return request.post(`${CATEGORY_BASE}`, data, {
      params: {
        operator: options?.operator || 'admin',
      },
    });
  },

  previewCreateCode(
    data: CreateCategoryCodePreviewRequestDto,
  ): Promise<CreateCategoryCodePreviewResponseDto> {
    return request.post(`${CATEGORY_BASE}/code-preview`, data);
  },

  getCategoryDetail(id: string): Promise<MetaCategoryDetailDto> {
    return request.get(`${CATEGORY_BASE}/${encodeURIComponent(id)}`);
  },

  updateCategory(
    id: string,
    data: UpdateCategoryRequestDto,
    options?: { operator?: string },
  ): Promise<MetaCategoryDetailDto> {
    return request.put(`${CATEGORY_BASE}/${encodeURIComponent(id)}`, data, {
      params: {
        operator: options?.operator || 'admin',
      },
    });
  },

  patchCategory(
    id: string,
    data: PatchCategoryRequestDto,
    options?: { operator?: string },
  ): Promise<MetaCategoryDetailDto> {
    return request.patch(`${CATEGORY_BASE}/${encodeURIComponent(id)}`, data, {
      params: {
        operator: options?.operator || 'admin',
      },
    });
  },

  deleteCategory(
    id: string,
    options?: { cascade?: boolean; confirm?: boolean; operator?: string },
  ): Promise<DeleteCategoryResponseDto> {
    return request.delete(`${CATEGORY_BASE}/${encodeURIComponent(id)}`, {
      params: {
        cascade: options?.cascade ?? false,
        confirm: options?.confirm ?? false,
        operator: options?.operator || 'admin',
      },
    });
  },

  batchDeleteCategories(
    data: MetaCategoryBatchDeleteRequestDto,
  ): Promise<MetaCategoryBatchDeleteResponseDto> {
    return request.post(`${CATEGORY_BASE}/batch-delete`, data);
  },

  batchTransferCategories(
    data: MetaCategoryBatchTransferRequestDto,
  ): Promise<MetaCategoryBatchTransferResponseDto> {
    return request.post(`${CATEGORY_BASE}/batch-transfer`, data, {
      timeout: CATEGORY_BATCH_TRANSFER_TIMEOUT,
    });
  },

  batchTransferCategoriesWithTopology(
    data: MetaCategoryBatchTransferTopologyRequestDto,
  ): Promise<MetaCategoryBatchTransferTopologyResponseDto> {
    return request.post(`${CATEGORY_BASE}/batch-transfer/topology`, data, {
      timeout: CATEGORY_BATCH_TRANSFER_TIMEOUT,
    });
  },

  batchTransferCategoriesStream(
    data: MetaCategoryBatchTransferRequestDto,
    options?: BatchTransferStreamOptions,
  ): Promise<MetaCategoryBatchTransferResponseDto> {
    return executeBatchTransferStreamRequest<MetaCategoryBatchTransferResponseDto>(
      `${CATEGORY_BASE}/batch-transfer`,
      data,
      options,
    );
  },

  batchTransferCategoriesWithTopologyStream(
    data: MetaCategoryBatchTransferTopologyRequestDto,
    options?: BatchTransferStreamOptions,
  ): Promise<MetaCategoryBatchTransferTopologyResponseDto> {
    return executeBatchTransferStreamRequest<MetaCategoryBatchTransferTopologyResponseDto>(
      `${CATEGORY_BASE}/batch-transfer/topology`,
      data,
      options,
    );
  },

  compareCategoryVersions(
    id: string,
    baseVersionId: string,
    targetVersionId: string,
  ): Promise<MetaCategoryVersionCompareDto> {
    return request.get(`${CATEGORY_BASE}/${encodeURIComponent(id)}/versions/compare`, {
      params: {
        baseVersionId,
        targetVersionId,
      },
    });
  }
};
