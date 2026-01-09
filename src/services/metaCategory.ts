import request from './request';

// --- DTOs matching backend ---

export interface MetaCategoryBrowseNodeDto {
  key: string;
  code: string;
  title: string;
  hasChildren: boolean;
  depth: number;
  fullPathName?: string;
}

export interface MetaCategoryClassGroupDto {
  clazz: MetaCategoryBrowseNodeDto;
  commodities: MetaCategoryBrowseNodeDto[];
}

export interface MetaCategorySearchHitDto {
  key: string;
  code: string;
  title: string;
  depth: number;
  fullPathName?: string;
}

const BASE = '/api/meta/categories/unspsc';

export const metaCategoryApi = {
  // Tabs: A-J
  listUnspscSegments(): Promise<MetaCategoryBrowseNodeDto[]> {
    return request.get(`${BASE}/segments`);
  },

  // Left list: children under selected segment key (A-J)
  listUnspscFamilies(segmentCodeKey: string): Promise<MetaCategoryBrowseNodeDto[]> {
    return request.get(`${BASE}/segments/${encodeURIComponent(segmentCodeKey)}/families`);
  },

  // Right content: class groups under selected family codeKey
  listUnspscClassesWithCommodities(familyCodeKey: string): Promise<MetaCategoryClassGroupDto[]> {
    return request.get(`${BASE}/families/${encodeURIComponent(familyCodeKey)}/classes-with-commodities`);
  },

  // Search: optional scope
  searchUnspsc(params: { q: string; scopeCodeKey?: string; limit?: number }): Promise<MetaCategorySearchHitDto[]> {
    return request.get(`${BASE}/search`, { params });
  },
};
