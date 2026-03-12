import request from './request';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface MetaCategoryNodeDto {
  id: string;
  businessDomain: string;
  code: string;
  name: string;
  level?: number;
  parentId?: string | null;
  path?: string | null;
  hasChildren: boolean;
  leaf?: boolean;
  status?: string;
  sort?: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface MetaCategorySearchItemDto {
  node: MetaCategoryNodeDto;
  path?: string | null;
  pathNodes?: MetaCategoryNodeDto[];
}

export interface MetaCategoryChildrenBatchRequestDto {
  businessDomain: string;
  parentIds: string[];
  status?: string;
}

export interface CreateCategoryRequestDto {
  code: string;
  name: string;
  businessDomain: string;
  parentId?: string | null;
  status: 'CREATED' | 'EFFECTIVE' | 'INVALID';
  description?: string;
  sort?: number;
}

export interface UpdateCategoryRequestDto {
  name?: string;
  businessDomain?: string;
  parentId?: string | null;
  status?: 'CREATED' | 'EFFECTIVE' | 'INVALID';
  description?: string;
  sort?: number;
}

export interface MetaCategoryVersionDto {
  versionNo: number;
  versionDate: string;
  name: string;
  description?: string;
  updatedBy?: string;
}

export interface MetaCategoryVersionHistoryDto {
  versionId?: string;
  versionNo: number;
  versionDate: string;
  name: string;
  description?: string;
  updatedBy?: string;
  latest?: boolean;
}

export interface MetaCategoryVersionSnapshotDto {
  versionId: string;
  versionNo: number;
  versionDate: string;
  name?: string;
  description?: string;
  updatedBy?: string;
}

export interface MetaCategoryVersionCompareDiffDto {
  sameVersion?: boolean;
  nameChanged?: boolean;
  descriptionChanged?: boolean;
  structureChanged?: boolean;
  structureChangedPaths?: string[];
  changedFields?: string[];
}

export interface MetaCategoryVersionCompareDto {
  categoryId: string;
  categoryCode: string;
  businessDomain: string;
  baseVersion: MetaCategoryVersionSnapshotDto;
  targetVersion: MetaCategoryVersionSnapshotDto;
  diff: MetaCategoryVersionCompareDiffDto;
}

export interface MetaCategoryDetailDto {
  id: string;
  code: string;
  businessDomain: string;
  status: string;
  parentId?: string | null;
  parentCode?: string;
  parentName?: string;
  rootId?: string;
  rootCode?: string;
  rootName?: string;
  path?: string;
  level?: number;
  depth?: number;
  sort?: number;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
  version?: number;
  latestVersion?: MetaCategoryVersionDto;
  historyVersions?: MetaCategoryVersionHistoryDto[];
}

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
