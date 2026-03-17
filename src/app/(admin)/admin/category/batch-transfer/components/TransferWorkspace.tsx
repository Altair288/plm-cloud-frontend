'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { App, Col, Row, Spin, theme } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type {
  MetaCategoryBatchTransferRequestDto,
  MetaCategoryBatchTransferResponseDto,
  MetaCategoryNodeDto,
  MetaCategoryTreeNodeDto,
} from '@/models/metaCategory';
import { metaCategoryApi } from '@/services/metaCategory';
import ActionFooter from './ActionFooter';
import DraggableSourceTree from './DraggableSourceTree';
import DropTargetTree from './DropTargetTree';
import { DRAG_OVERLAY_Z_INDEX, dndTreeGlobalStyles } from './dnd-tree-styles';
import {
  getTransferNodeOverlayActionStyle,
  getTransferNodeOverlayCardStyle,
  getTransferNodeOverlayConnectorStyle,
  getTransferNodeOverlayIconStyle,
  getTransferNodeOverlayShellStyle,
  getTransferNodeOverlayTargetStyle,
  getTransferNodeOverlayTitleStyle,
} from './transferNodeStyles';

const TARGET_ROOT_PAGE_SIZE = 200;
const DEFAULT_LIST_STATUS = 'ALL';
const ROOT_DROP_TARGET_KEY = '__ROOT_DROP_TARGET__';
const ROOT_DROP_TARGET_TITLE = '根分类';
const ROOT_DROP_TARGET_DROPPABLE_ID = `tgt-${ROOT_DROP_TARGET_KEY}`;
const DEFAULT_COPY_OPTIONS = {
  versionPolicy: 'CURRENT_ONLY' as const,
  codePolicy: 'AUTO_SUFFIX' as const,
  namePolicy: 'KEEP' as const,
  defaultStatus: 'DRAFT' as const,
};

export interface TransferTreeNode {
  key: string;
  title: string;
  isLeaf?: boolean;
  children?: TransferTreeNode[];
  isContextOnly?: boolean;
  isVirtual?: boolean;
  isPendingPlacement?: boolean;
  isPreviewRoot?: boolean;
  dataRef?: MetaCategoryNodeDto;
}

interface PendingOperation {
  sourceNode: TransferTreeNode;
  targetKey: React.Key | null;
  id: string;
}

export interface TransferWorkspaceProps {
  businessDomain: string;
  initialAction?: 'move' | 'copy';
  sourceNodesData?: TransferTreeNode[];
  externalLoading?: boolean;
  onComplete?: (response?: MetaCategoryBatchTransferResponseDto) => void;
  onCancelWorkspace?: () => void;
}

const formatTransferNodeTitle = (
  code?: string | null,
  name?: string | null,
  fallback?: string,
) => {
  if (code && name) {
    return `${code} - ${name}`;
  }
  return fallback || name || code || '-';
};

const mapCategoryNodeToTransferNode = (
  node: MetaCategoryNodeDto | MetaCategoryTreeNodeDto,
): TransferTreeNode => ({
  key: node.id,
  title: formatTransferNodeTitle(node.code, node.name, node.name),
  isLeaf: node.leaf ?? !node.hasChildren,
  dataRef: {
    id: node.id,
    businessDomain: node.businessDomain,
    code: node.code,
    name: node.name,
    level: node.level,
    parentId: node.parentId,
    path: node.path,
    hasChildren: node.hasChildren,
    leaf: node.leaf,
    status: node.status,
    sort: node.sort,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  },
  children:
    'children' in node && node.children
      ? node.children.map(mapCategoryNodeToTransferNode)
      : undefined,
});

const updateTransferNode = (
  nodes: TransferTreeNode[],
  key: React.Key,
  updater: (node: TransferTreeNode) => TransferTreeNode,
): TransferTreeNode[] => {
  return nodes.map((node) => {
    if (node.key === key) {
      return updater(node);
    }
    if (node.children?.length) {
      return {
        ...node,
        children: updateTransferNode(node.children, key, updater),
      };
    }
    return node;
  });
};

const findTransferNode = (
  nodes: TransferTreeNode[],
  key: React.Key,
): TransferTreeNode | null => {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    if (node.children?.length) {
      const found = findTransferNode(node.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const collectInitialSourceExpandedKeys = (nodes: TransferTreeNode[]): React.Key[] => {
  const expandedKeys: React.Key[] = [];

  const visit = (items: TransferTreeNode[], depth: number) => {
    items.forEach((item) => {
      if (!item.children?.length) {
        return;
      }

      const shouldExpand = depth === 0 || Boolean(item.isContextOnly);
      if (shouldExpand) {
        expandedKeys.push(item.key);
      }

      if (item.isContextOnly) {
        visit(item.children, depth + 1);
      }
    });
  };

  visit(nodes, 0);
  return expandedKeys;
};

const getErrorMessage = (error: any, fallback: string) => {
  return error?.message || error?.error || fallback;
};

const rectContainsPoint = (
  rect: { top: number; right: number; bottom: number; left: number },
  point: { x: number; y: number },
) => {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
};

const rectIntersects = (
  rect: { top: number; right: number; bottom: number; left: number },
  viewport: { top: number; right: number; bottom: number; left: number },
) => {
  return !(
    rect.right <= viewport.left ||
    rect.left >= viewport.right ||
    rect.bottom <= viewport.top ||
    rect.top >= viewport.bottom
  );
};

const isRootCategoryNode = (node?: TransferTreeNode | null) => {
  if (!node?.dataRef) {
    return false;
  }

  return node.dataRef.level === 1 || node.dataRef.parentId == null;
};

export default function TransferWorkspace({
  businessDomain,
  initialAction,
  sourceNodesData,
  externalLoading = false,
  onComplete,
}: TransferWorkspaceProps) {
  const { token } = theme.useToken();
  const { message: messageApi, modal } = App.useApp();
  const workspaceLayoutStyles = useMemo(
    () => `
      .transfer-workspace-spin.ant-spin-nested-loading {
        height: 100%;
      }
      .transfer-workspace-spin .ant-spin-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }
      .transfer-workspace-pane {
        display: flex;
        flex-direction: column;
        flex: 1 1 0;
        height: 0;
        min-height: 0;
        overflow: auto;
        padding: 24px;
      }
    `,
    [],
  );

  const [isClientMounted, setIsClientMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'move' | 'copy' | null>(null);
  const [activeDragNode, setActiveDragNode] = useState<TransferTreeNode | null>(null);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [hoveredTargetKey, setHoveredTargetKey] = useState<React.Key | null>(null);
  const [hoveredTargetTitle, setHoveredTargetTitle] = useState<string>('目标分类');
  const [sourceData, setSourceData] = useState<TransferTreeNode[]>([]);
  const [targetData, setTargetData] = useState<TransferTreeNode[]>([]);
  const [sourceExpandedKeys, setSourceExpandedKeys] = useState<React.Key[]>([]);
  const [targetExpandedKeys, setTargetExpandedKeys] = useState<React.Key[]>([]);
  const [targetLoadedKeys, setTargetLoadedKeys] = useState<React.Key[]>([]);
  const targetScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const rootDropTargetRef = useRef<HTMLDivElement | null>(null);

  const overlayActionLabel = useMemo(() => {
    const action = pendingAction || initialAction || 'move';
    return action === 'copy' ? '复制' : '移动';
  }, [initialAction, pendingAction]);

  const rootDropDisabled = useMemo(() => {
    return isRootCategoryNode(activeDragNode);
  }, [activeDragNode]);

  const collisionDetectionStrategy = useMemo<CollisionDetection>(() => {
    return (args) => {
      const collisions = pointerWithin(args);
      const pointer = args.pointerCoordinates;
      const rootElementRect = rootDropTargetRef.current?.getBoundingClientRect();
      const rootRect = args.droppableRects.get(ROOT_DROP_TARGET_DROPPABLE_ID);

      if (pointer && rootElementRect && rectContainsPoint(rootElementRect, pointer)) {
        if (rootDropDisabled) {
          return [];
        }

        const rootCollision = collisions.find(
          (collision) => collision.id === ROOT_DROP_TARGET_DROPPABLE_ID,
        );

        return rootCollision ? [rootCollision] : [];
      }

      const viewportRect = targetScrollViewportRef.current?.getBoundingClientRect();
      const visibleCollisions = viewportRect
        ? collisions.filter((collision) => {
            const collisionRect = args.droppableRects.get(collision.id);
            return collisionRect ? rectIntersects(collisionRect, viewportRect) : false;
          })
        : collisions;

      if (rootDropDisabled) {
        return visibleCollisions.filter((collision) => collision.id !== ROOT_DROP_TARGET_DROPPABLE_ID);
      }

      const rootCollision = visibleCollisions.find(
        (collision) => collision.id === ROOT_DROP_TARGET_DROPPABLE_ID,
      );

      if (rootCollision) {
        return [
          rootCollision,
          ...visibleCollisions.filter((collision) => collision.id !== ROOT_DROP_TARGET_DROPPABLE_ID),
        ];
      }

      return visibleCollisions;
    };
  }, [rootDropDisabled]);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    const nextSourceData = sourceNodesData || [];
    const nextExpandedKeys = collectInitialSourceExpandedKeys(nextSourceData);

    setSourceData(nextSourceData);
    setSourceExpandedKeys(nextExpandedKeys);
  }, [sourceNodesData]);

  useEffect(() => {
    let cancelled = false;

    const loadTargetRoots = async () => {
      if (!businessDomain) {
        setTargetData([]);
        setTargetExpandedKeys([]);
        setTargetLoadedKeys([]);
        return;
      }

      setLoading(true);
      try {
        const page = await metaCategoryApi.listNodes({
          businessDomain,
          level: 1,
          status: DEFAULT_LIST_STATUS,
          page: 0,
          size: TARGET_ROOT_PAGE_SIZE,
        });

        if (cancelled) {
          return;
        }

        setTargetData((Array.isArray(page.content) ? page.content : []).map(mapCategoryNodeToTransferNode));
        setTargetExpandedKeys([]);
        setTargetLoadedKeys([]);
      } catch (error: any) {
        if (!cancelled) {
          setTargetData([]);
          messageApi.error(getErrorMessage(error, '加载目标分类失败'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTargetRoots();

    return () => {
      cancelled = true;
    };
  }, [businessDomain, messageApi]);

  const disabledKeys = useMemo(() => {
    if (!activeDragNode) return [];

    const collectKeys = (node: TransferTreeNode): React.Key[] => {
      const keys: React.Key[] = [node.key];
      if (node.children?.length) {
        node.children.forEach((child) => keys.push(...collectKeys(child)));
      }
      return keys;
    };

    return collectKeys(activeDragNode);
  }, [activeDragNode]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleLoadTargetChildren = async (node: TransferTreeNode): Promise<void> => {
    if (node.isLeaf || targetLoadedKeys.includes(node.key)) {
      return;
    }

    const page = await metaCategoryApi.listNodes({
      businessDomain,
      parentId: String(node.key),
      status: DEFAULT_LIST_STATUS,
      page: 0,
      size: TARGET_ROOT_PAGE_SIZE,
    });

    const childNodes = (Array.isArray(page.content) ? page.content : []).map(mapCategoryNodeToTransferNode);
    setTargetData((origin) =>
      updateTransferNode(origin, node.key, (targetNode) => ({
        ...targetNode,
        isLeaf: childNodes.length === 0,
        children: childNodes,
      })),
    );
    setTargetLoadedKeys((keys) => (keys.includes(node.key) ? keys : [...keys, node.key]));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const nodeData = event.active.data.current as TransferTreeNode | undefined;
    if (!nodeData) return;

    setHoveredTargetKey(null);
    setHoveredTargetTitle('目标分类');
    setActiveDragNode(nodeData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overNode = event.over?.data.current as TransferTreeNode | undefined;
    if (!overNode) {
      setHoveredTargetKey(null);
      setHoveredTargetTitle('目标分类');
      return;
    }

    if (
      (overNode.key === ROOT_DROP_TARGET_KEY && rootDropDisabled) ||
      (overNode.key !== ROOT_DROP_TARGET_KEY && disabledKeys.includes(overNode.key))
    ) {
      setHoveredTargetKey(null);
      setHoveredTargetTitle('目标分类');
      return;
    }

    setHoveredTargetKey(overNode.key);
    setHoveredTargetTitle(overNode.key === ROOT_DROP_TARGET_KEY ? ROOT_DROP_TARGET_TITLE : overNode.title || '目标分类');
  };

  useEffect(() => {
    if (
      !hoveredTargetKey ||
      hoveredTargetKey === ROOT_DROP_TARGET_KEY ||
      disabledKeys.includes(hoveredTargetKey)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      const hoveredNode = findTransferNode(targetData, hoveredTargetKey);
      if (hoveredNode && !hoveredNode.isLeaf && !targetLoadedKeys.includes(hoveredTargetKey)) {
        void handleLoadTargetChildren(hoveredNode).catch(() => {
          // 自动展开场景下的懒加载失败，保留已有结构即可。
        });
      }
      setTargetExpandedKeys((prev) => Array.from(new Set([...prev, hoveredTargetKey])));
    }, 400);

    return () => clearTimeout(timer);
  }, [hoveredTargetKey, disabledKeys, targetData, targetLoadedKeys]);

  const handleDragEnd = (event: DragEndEvent) => {
    const overNode = event.over?.data.current as TransferTreeNode | undefined;
    setHoveredTargetKey(null);
    setHoveredTargetTitle('目标分类');

    const draggedNode = activeDragNode;
    setActiveDragNode(null);

    if (
      !overNode ||
      !draggedNode ||
      (overNode.key === ROOT_DROP_TARGET_KEY && rootDropDisabled) ||
      (overNode.key !== ROOT_DROP_TARGET_KEY && disabledKeys.includes(overNode.key))
    ) {
      return;
    }

    const resolvedTargetKey = overNode.key === ROOT_DROP_TARGET_KEY ? null : overNode.key;
    const nextOperation: PendingOperation = {
      sourceNode: draggedNode,
      targetKey: resolvedTargetKey,
      id: `OP_${Date.now()}_${draggedNode.key}`,
    };
    const resolvedAction = pendingAction || initialAction || 'move';

    setPendingOperations((prev) => {
      if (resolvedAction === 'move') {
        const next = prev.filter((item) => item.sourceNode.key !== draggedNode.key);
        return [...next, nextOperation];
      }
      return [...prev, nextOperation];
    });
    if (resolvedTargetKey) {
      setTargetExpandedKeys((prev) => Array.from(new Set([...prev, resolvedTargetKey])));
    }

    if (!pendingAction) {
      setPendingAction(initialAction || 'move');
    }
  };

  const buildBatchTransferRequest = (
    actionType: 'move' | 'copy',
    dryRun: boolean,
  ): MetaCategoryBatchTransferRequestDto => {
    return {
      businessDomain,
      action: actionType.toUpperCase() as 'MOVE' | 'COPY',
      dryRun,
      atomic: false,
      operator: 'admin',
      copyOptions: actionType === 'copy' ? DEFAULT_COPY_OPTIONS : undefined,
      operations: pendingOperations.map((operation) => ({
        clientOperationId: operation.id,
        sourceNodeId: String(operation.sourceNode.key),
        targetParentId: operation.targetKey == null ? null : String(operation.targetKey),
      })),
    };
  };

  const executeBatchTransfer = async (actionType: 'move' | 'copy') => {
    setLoading(true);
    try {
      const response = await metaCategoryApi.batchTransferCategories(
        buildBatchTransferRequest(actionType, false),
      );

      const actionLabel = actionType === 'copy' ? '复制' : '移动';
      if (response.failureCount > 0 && response.successCount > 0) {
        messageApi.warning(
          `${actionLabel}完成，成功 ${response.successCount} 项，失败 ${response.failureCount} 项`,
        );
      } else if (response.failureCount > 0) {
        messageApi.error(`${actionLabel}失败，共 ${response.failureCount} 项失败`);
      } else {
        messageApi.success(`${actionLabel}成功，共处理 ${response.successCount} 项`);
      }

      if (response.successCount > 0 || response.normalizedCount > 0) {
        setPendingOperations([]);
        setPendingAction(null);
        onComplete?.(response);
      }
    } catch (error: any) {
      messageApi.error(getErrorMessage(error, `${actionType === 'copy' ? '复制' : '移动'}失败`));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (actionType: 'move' | 'copy') => {
    if (!pendingOperations.length) {
      return;
    }

    setLoading(true);
    try {
      const dryRunResponse = await metaCategoryApi.batchTransferCategories(
        buildBatchTransferRequest(actionType, true),
      );
      const actionLabel = actionType === 'copy' ? '复制' : '移动';
      const failedResults = dryRunResponse.results.filter((result) => !result.success);
      const normalizedResults = dryRunResponse.results.filter(
        (result) => result.code === 'SOURCE_OVERLAP_NORMALIZED',
      );

      if (failedResults.length > 0 || dryRunResponse.successCount === 0) {
        modal.error({
          title: `${actionLabel}预检未通过`,
          width: 560,
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {failedResults.slice(0, 5).map((result) => (
                <div key={result.clientOperationId || result.sourceNodeId}>
                  {result.message || result.code || `源节点 ${result.sourceNodeId} 预检失败`}
                </div>
              ))}
              {failedResults.length === 0 && <div>预检未通过，请检查拖拽目标是否有效。</div>}
            </div>
          ),
        });
        return;
      }

      modal.confirm({
        title: `确认${actionLabel}`,
        okText: `确认${actionLabel}`,
        cancelText: '取消',
        width: 560,
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>预检通过，共 {dryRunResponse.total} 项操作。</div>
            <div>预计成功 {dryRunResponse.successCount} 项。</div>
            {normalizedResults.length > 0 && (
              <div>存在 {normalizedResults.length} 项父子重叠操作，将由祖先节点自动归一化。</div>
            )}
            {(dryRunResponse.warnings?.length || 0) > 0 &&
              dryRunResponse.warnings?.map((warning) => <div key={warning}>{warning}</div>)}
          </div>
        ),
        onOk: async () => {
          await executeBatchTransfer(actionType);
        },
      });
    } catch (error: any) {
      messageApi.error(getErrorMessage(error, '批量转移预检失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingAction(null);
    setPendingOperations([]);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displaySourceData = useMemo(() => {
    if (pendingAction === 'move' && pendingOperations.length > 0) {
      const keysToHide = new Set(pendingOperations.map((operation) => operation.sourceNode.key));
      const hideNodes = (nodes: TransferTreeNode[]): TransferTreeNode[] => {
        return nodes
          .filter((node) => !keysToHide.has(node.key))
          .map((node) => ({
            ...node,
            children: node.children ? hideNodes(node.children) : undefined,
          }));
      };
      return hideNodes(sourceData);
    }
    return sourceData;
  }, [sourceData, pendingAction, pendingOperations]);

  const displayTargetData = useMemo(() => {
    let currentData = [...targetData];

    pendingOperations.forEach((operation) => {
      const createVirtualNodes = (
        node: TransferTreeNode,
        isRoot: boolean,
        isRootPlacement: boolean,
      ): TransferTreeNode => ({
        ...node,
        key: isRoot ? `VIRTUAL_PENDING_${operation.id}` : `VIRTUAL_PENDING_${operation.id}_${node.key}`,
        title: node.title,
        isVirtual: true,
        isPendingPlacement: isRoot && isRootPlacement,
        isPreviewRoot: isRoot,
        children: node.children?.map((child) => createVirtualNodes(child, false, false)),
      });

      const virtualNode = createVirtualNodes(operation.sourceNode, true, operation.targetKey == null);
      const insertNode = (nodes: TransferTreeNode[], targetKey: React.Key): TransferTreeNode[] => {
        return nodes.map((node) => {
          if (node.key === targetKey) {
            return {
              ...node,
              children: [...(node.children || []), virtualNode],
            };
          }
          if (node.children?.length) {
            return {
              ...node,
              children: insertNode(node.children, targetKey),
            };
          }
          return node;
        });
      };

      currentData = operation.targetKey == null ? [...currentData, virtualNode] : insertNode(currentData, operation.targetKey);
    });

    return currentData;
  }, [targetData, pendingOperations]);

  const spinning = loading || externalLoading;

  return (
    <Spin spinning={spinning} tip="正在处理中，请稍候..." size="large" wrapperClassName="transfer-workspace-spin">
      <style dangerouslySetInnerHTML={{ __html: workspaceLayoutStyles }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          background: token.colorBgContainer,
          borderRadius: 12,
          boxShadow: token.boxShadowTertiary,
          overflow: 'hidden',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: dndTreeGlobalStyles }} />
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          autoScroll={false}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <Row style={{ flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }} gutter={0}>
            <Col
              span={12}
              style={{
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${token.colorSplit}` }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>已选源分类</div>
                <div style={{ fontSize: 12, color: token.colorTextDescription, marginTop: 4 }}>
                  基于专用子树接口加载完整源分类结构
                </div>
              </div>
              <div className="transfer-workspace-pane">
                {displaySourceData.length > 0 ? (
                  <DraggableSourceTree
                    treeData={displaySourceData}
                    expandedKeys={sourceExpandedKeys}
                    onExpand={setSourceExpandedKeys}
                  />
                ) : (
                  <div style={{ color: token.colorTextDisabled, textAlign: 'center', marginTop: 40 }}>
                    (暂无源分类数据)
                  </div>
                )}
              </div>
            </Col>

            <Col
              span={12}
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${token.colorSplit}` }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>目标位置</div>
                <div style={{ fontSize: 12, color: token.colorTextDescription, marginTop: 4 }}>
                  使用原有节点懒加载接口，拖拽悬停可自动展开
                </div>
              </div>
              <div className="transfer-workspace-pane">
                <DropTargetTree
                  treeData={displayTargetData}
                  expandedKeys={targetExpandedKeys}
                  onExpand={setTargetExpandedKeys}
                  loadData={handleLoadTargetChildren}
                  disabledKeys={disabledKeys}
                  pendingDropKeys={pendingOperations
                    .map((operation) => operation.targetKey)
                    .filter((key): key is React.Key => key != null)}
                  rootPendingCount={pendingOperations.filter((operation) => operation.targetKey == null).length}
                  hoveredTargetKey={hoveredTargetKey}
                  rootDropTargetKey={ROOT_DROP_TARGET_KEY}
                  rootDropTargetTitle={ROOT_DROP_TARGET_TITLE}
                  rootDropDisabled={rootDropDisabled}
                  scrollViewportRef={targetScrollViewportRef}
                  rootDropTargetRef={rootDropTargetRef}
                />
              </div>
            </Col>
          </Row>

          {isClientMounted
            ? createPortal(
                <DragOverlay
                  zIndex={DRAG_OVERLAY_Z_INDEX}
                  dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
                  }}
                >
                  {activeDragNode ? (
                    <div style={getTransferNodeOverlayShellStyle(token)}>
                      <div style={getTransferNodeOverlayCardStyle(token)}>
                        <div style={getTransferNodeOverlayActionStyle(token)}>{overlayActionLabel}</div>
                        <div style={getTransferNodeOverlayIconStyle(token)}>
                          <FolderOutlined style={{ fontSize: 12 }} />
                        </div>
                        <div style={getTransferNodeOverlayTitleStyle(token)}>{activeDragNode.title}</div>
                        <div style={getTransferNodeOverlayConnectorStyle(token)}>至</div>
                        <div style={getTransferNodeOverlayTargetStyle(token)}>{hoveredTargetTitle}</div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body,
              )
            : null}
        </DndContext>

        <ActionFooter
          pendingAction={pendingAction}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={spinning}
        />
      </div>
    </Spin>
  );
}
