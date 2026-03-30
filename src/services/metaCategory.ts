import request from './request';
import type {
  CreateCategoryCodePreviewRequestDto,
  CreateCategoryCodePreviewResponseDto,
  CreateCategoryRequestDto,
  DeleteCategoryResponseDto,
  MetaCategoryBatchDeleteRequestDto,
  MetaCategoryBatchDeleteResponseDto,
  MetaCategoryBatchTransferRequestDto,
  MetaCategoryBatchTransferResponseDto,
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
    return request.post(`${CATEGORY_BASE}/batch-transfer`, data);
  },

  batchTransferCategoriesWithTopology(
    data: MetaCategoryBatchTransferTopologyRequestDto,
  ): Promise<MetaCategoryBatchTransferTopologyResponseDto> {
    return request.post(`${CATEGORY_BASE}/batch-transfer/topology`, data);
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
