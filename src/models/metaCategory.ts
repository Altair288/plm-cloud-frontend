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

export interface MetaCategoryTreeNodeDto extends MetaCategoryNodeDto {
  children?: MetaCategoryTreeNodeDto[];
}

export interface MetaCategorySubtreeRequestDto {
  parentId: string;
  includeRoot?: boolean;
  maxDepth?: number;
  status?: string;
  mode?: 'FLAT' | 'TREE';
  nodeLimit?: number;
}

export interface MetaCategorySubtreeResponseDto<TNode = MetaCategoryNodeDto> {
  parentId: string;
  mode: 'FLAT' | 'TREE';
  totalNodes: number;
  truncated: boolean;
  depthReached?: number;
  message?: string | null;
  data: TNode | TNode[];
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
  code?: string;
  generationMode?: 'AUTO' | 'MANUAL';
  freezeCode?: boolean;
  name: string;
  businessDomain: string;
  parentId?: string | null;
  status: 'CREATED' | 'EFFECTIVE' | 'INVALID';
  description?: string;
  sort?: number;
}

export interface CreateCategoryCodePreviewRequestDto {
  businessDomain: string;
  parentId?: string | null;
  manualCode?: string | null;
  count?: number;
}

export interface CreateCategoryCodePreviewResponseDto {
  businessDomain: string;
  ruleCode: string;
  generationMode: 'AUTO' | 'MANUAL';
  allowManualOverride: boolean;
  suggestedCode?: string | null;
  examples: string[];
  warnings: string[];
  resolvedContext: Record<string, string>;
  resolvedSequenceScope?: string | null;
  resolvedPeriodKey?: string | null;
  previewStale: boolean;
}

export interface UpdateCategoryRequestDto {
  name?: string;
  businessDomain?: string;
  parentId?: string | null;
  status?: 'CREATED' | 'EFFECTIVE' | 'INVALID';
  description?: string;
  sort?: number;
}

export interface PatchCategoryRequestDto {
  name?: string;
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

export interface DeleteCategoryResponseDto {
  id: string;
  cascade: boolean;
  deletedCount: number;
}

export interface MetaCategoryBatchDeleteRequestDto {
  ids: string[];
  cascade?: boolean;
  confirm?: boolean;
  atomic?: boolean;
  dryRun?: boolean;
  operator?: string | null;
}

export interface MetaCategoryBatchDeleteResultDto {
  id: string;
  success: boolean;
  deletedCount: number;
  wouldDeleteCount?: number | null;
  code?: string | null;
  message?: string | null;
}

export interface MetaCategoryBatchDeleteResponseDto {
  total: number;
  successCount: number;
  failureCount: number;
  deletedCount: number;
  totalWouldDeleteCount: number;
  atomic: boolean;
  dryRun: boolean;
  results: MetaCategoryBatchDeleteResultDto[];
}

export type MetaCategoryBatchTransferAction = 'MOVE' | 'COPY';

export interface MetaCategoryBatchTransferCopyOptionsDto {
  versionPolicy?: 'CURRENT_ONLY';
  codePolicy?: 'AUTO_SUFFIX';
  /**
   * Name copy policy.
   * Current default is 'AUTO_SUFFIX'; 'KEEP' only succeeds when the original name is reusable.
   */
  namePolicy?: string;
  defaultStatus?: 'DRAFT';
}

export interface MetaCategoryBatchTransferOperationDto {
  clientOperationId?: string;
  sourceNodeId: string;
  targetParentId?: string | null;
}

export interface MetaCategoryBatchTransferRequestDto {
  businessDomain: string;
  action: MetaCategoryBatchTransferAction;
  targetParentId?: string | null;
  dryRun?: boolean;
  atomic?: boolean;
  operator?: string | null;
  copyOptions?: MetaCategoryBatchTransferCopyOptionsDto | null;
  operations: MetaCategoryBatchTransferOperationDto[];
}

export interface MetaCategoryBatchTransferSourceMappingDto {
  sourceNodeId: string;
  createdNodeId?: string | null;
  copiedFromCategoryId?: string | null;
}

export interface MetaCategoryBatchTransferCodeMappingDto {
  oldCode: string;
  newCode: string;
}

export interface MetaCategoryBatchTransferResultDto {
  clientOperationId?: string | null;
  sourceNodeId: string;
  normalizedSourceNodeId?: string | null;
  targetParentId?: string | null;
  action: MetaCategoryBatchTransferAction;
  success: boolean;
  affectedNodeCount: number;
  movedIds?: string[] | null;
  createdRootId?: string | null;
  createdIds?: string[] | null;
  copiedFromCategoryId?: string | null;
  sourceMappings?: MetaCategoryBatchTransferSourceMappingDto[] | null;
  codeMappings?: MetaCategoryBatchTransferCodeMappingDto[] | null;
  code?: string | null;
  message?: string | null;
  warning?: string[] | null;
}

export interface MetaCategoryBatchTransferResponseDto {
  total: number;
  successCount: number;
  failureCount: number;
  normalizedCount: number;
  movedCount: number;
  copiedCount: number;
  atomic: boolean;
  dryRun: boolean;
  warnings?: string[] | null;
  results: MetaCategoryBatchTransferResultDto[];
}

export type MetaCategoryBatchTransferTopologyAction = 'MOVE';
export type MetaCategoryBatchTransferTopologyPlanningMode = 'TOPOLOGY_AWARE';
export type MetaCategoryBatchTransferTopologyOrderingStrategy = 'CLIENT_ORDER';

export interface MetaCategoryBatchTransferTopologyOperationDto {
  operationId: string;
  sourceNodeId: string;
  targetParentId?: string | null;
  dependsOnOperationIds?: string[];
  allowDescendantFirstSplit?: boolean;
  expectedSourceParentId?: string | null;
}

export interface MetaCategoryBatchTransferTopologyRequestDto {
  businessDomain: string;
  action: MetaCategoryBatchTransferTopologyAction;
  dryRun?: boolean;
  atomic?: true;
  operator?: string | null;
  planningMode?: MetaCategoryBatchTransferTopologyPlanningMode;
  orderingStrategy?: MetaCategoryBatchTransferTopologyOrderingStrategy;
  strictDependencyValidation?: boolean;
  operations: MetaCategoryBatchTransferTopologyOperationDto[];
}

export interface MetaCategoryBatchTransferTopologyFinalParentMappingDto {
  sourceNodeId: string;
  finalParentId?: string | null;
  dependsOnResolved?: string[] | null;
}

export interface MetaCategoryBatchTransferTopologyResultDto {
  operationId: string;
  sourceNodeId: string;
  targetParentId?: string | null;
  effectiveSourceParentIdBefore?: string | null;
  effectiveTargetParentId?: string | null;
  success: boolean;
  code?: string | null;
  message?: string | null;
}

export interface MetaCategoryBatchTransferTopologyResponseDto {
  total: number;
  successCount: number;
  failureCount: number;
  atomic: boolean;
  dryRun: boolean;
  planningMode?: MetaCategoryBatchTransferTopologyPlanningMode | string;
  resolvedOrder?: string[] | null;
  planningWarnings?: string[] | null;
  finalParentMappings?: MetaCategoryBatchTransferTopologyFinalParentMappingDto[] | null;
  results: MetaCategoryBatchTransferTopologyResultDto[];
}
