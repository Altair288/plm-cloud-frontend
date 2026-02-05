import request from './request';
import type {
  MetaAttributeDefListItemDto,
  MetaAttributeDefDetailDto,
  MetaAttributeVersionSummaryDto,
  MetaAttributeUpsertRequestDto,
  AttributeImportSummaryDto
} from '@/models/metaAttribute';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface AttributeListParams {
  categoryCode?: string;
  keyword?: string;
  dataType?: string;
  required?: boolean;
  unique?: boolean;
  searchable?: boolean;
  page?: number;
  size?: number;
}

export const metaAttributeApi = {
  /**
   * 元数据属性列表（分页）
   * GET /api/meta/attribute-defs
   */
  listAttributes: (params: AttributeListParams): Promise<PageResponse<MetaAttributeDefListItemDto>> => {
    return request.get('/api/meta/attribute-defs', { params });
  },

  /**
   * 元数据属性详情（最新版本 + 版本摘要）
   * GET /api/meta/attribute-defs/{attrKey}
   */
  getAttributeDetail: (attrKey: string, includeValues: boolean = false): Promise<MetaAttributeDefDetailDto> => {
    return request.get(`/api/meta/attribute-defs/${attrKey}`, {
      params: { includeValues }
    });
  },

  /**
   * 元数据属性版本摘要列表
   * GET /api/meta/attribute-defs/{attrKey}/versions
   */
  getAttributeVersions: (attrKey: string): Promise<MetaAttributeVersionSummaryDto[]> => {
    return request.get(`/api/meta/attribute-defs/${attrKey}/versions`);
  },

  /**
   * 创建元数据属性
   * POST /api/meta/attribute-defs
   */
  createAttribute: (
    categoryCode: string,
    data: MetaAttributeUpsertRequestDto,
    createdBy?: string
  ): Promise<MetaAttributeDefDetailDto> => {
    return request.post('/api/meta/attribute-defs', data, {
      params: { categoryCode, createdBy }
    });
  },

  /**
   * 更新元数据属性
   * PUT /api/meta/attribute-defs/{attrKey}
   */
  updateAttribute: (
    attrKey: string,
    categoryCode: string,
    data: MetaAttributeUpsertRequestDto,
    createdBy?: string
  ): Promise<MetaAttributeDefDetailDto> => {
    return request.put(`/api/meta/attribute-defs/${attrKey}`, data, {
      params: { categoryCode, createdBy }
    });
  },

  /**
   * 导入元数据属性（Excel）
   * POST /api/meta/attributes/import
   */
  importAttributes: (file: File, createdBy: string = 'system'): Promise<AttributeImportSummaryDto> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return request.post('/api/meta/attributes/import', formData, {
      params: { createdBy },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 删除元数据属性（软删）
   * DELETE /api/meta/attribute-defs/{attrKey}
   */
  deleteAttribute: (attrKey: string, categoryCode: string, createdBy?: string): Promise<void> => {
    return request.delete(`/api/meta/attribute-defs/${attrKey}`, {
      params: { categoryCode, createdBy }
    });
  }
};
