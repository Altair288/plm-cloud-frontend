"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { App, Col, Row, Spin, theme } from "antd";
import { FolderOutlined } from "@ant-design/icons";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type {
  MetaCategoryBatchTransferRequestDto,
  MetaCategoryBatchTransferResponseDto,
  MetaCategoryBatchTransferTopologyRequestDto,
  MetaCategoryBatchTransferTopologyResponseDto,
  MetaCategoryNodeDto,
  MetaCategoryTreeNodeDto,
} from "@/models/metaCategory";
import { metaCategoryApi } from "@/services/metaCategory";
import ActionFooter from "./ActionFooter";
import BatchTransferDryRunPanel, {
  type DryRunTimelineItem,
} from "./BatchTransferDryRunPanel";
import DraggableSourceTree from "./DraggableSourceTree";
import DropTargetTree from "./DropTargetTree";
import { DRAG_OVERLAY_Z_INDEX, dndTreeGlobalStyles } from "./dnd-tree-styles";
import {
  getTransferNodeOverlayActionStyle,
  getTransferNodeOverlayCardStyle,
  getTransferNodeOverlayConnectorStyle,
  getTransferNodeOverlayIconStyle,
  getTransferNodeOverlayShellStyle,
  getTransferNodeOverlayTargetStyle,
  getTransferNodeOverlayTitleStyle,
} from "./transferNodeStyles";

const TARGET_ROOT_PAGE_SIZE = 200;
const DEFAULT_LIST_STATUS = "ALL";
const HOVER_TARGET_COMMIT_DELAY = 140; // ms，基于经验值调整，旨在平衡响应速度和避免过度频繁更新悬停目标导致的视觉干扰
const ROOT_DROP_TARGET_KEY = "__ROOT_DROP_TARGET__";
const ROOT_DROP_TARGET_TITLE = "根分类";
const ROOT_DROP_TARGET_DROPPABLE_ID = `tgt-${ROOT_DROP_TARGET_KEY}`;
const DEFAULT_COPY_OPTIONS = {
  versionPolicy: "CURRENT_ONLY" as const,
  codePolicy: "AUTO_SUFFIX" as const,
  namePolicy: "KEEP" as const,
  defaultStatus: "DRAFT" as const,
};
const DEFAULT_DRAG_OVERLAY_DROP_ANIMATION = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};
const DRY_RUN_MODAL_WIDTH = "40vw";
const DRY_RUN_MODAL_HEIGHT = "48vh";
const DRY_RUN_MODAL_CLASS = "batch-transfer-dry-run-modal";

export interface TransferTreeNode {
  key: string;
  title: string;
  isLeaf?: boolean;
  children?: TransferTreeNode[];
  isContextOnly?: boolean;
  isVirtual?: boolean;
  isPendingPlacement?: boolean;
  isPreviewRoot?: boolean;
  isPreviewNode?: boolean;
  isMovedSource?: boolean;
  dataRef?: MetaCategoryNodeDto;
}

interface PendingOperation {
  sourceNode: TransferTreeNode;
  targetKey: React.Key | null;
  id: string;
}

interface PreparedMoveOperation {
  operation: PendingOperation;
  sourceNodeId: string;
  targetParentId: string | null;
  dependsOnOperationIds: string[];
  originalParentId: string | null;
}

interface WorkspaceSnapshot {
  pendingAction: "move" | "copy" | null;
  pendingOperations: PendingOperation[];
  virtualRelationMap: Record<string, VirtualRelationEntry>;
  targetExpandedKeys: React.Key[];
}

const createEmptyWorkspaceSnapshot = (): WorkspaceSnapshot => ({
  pendingAction: null,
  pendingOperations: [],
  virtualRelationMap: {},
  targetExpandedKeys: [],
});

const cloneWorkspaceSnapshot = (
  snapshot: WorkspaceSnapshot,
): WorkspaceSnapshot => ({
  pendingAction: snapshot.pendingAction,
  pendingOperations: [...snapshot.pendingOperations],
  virtualRelationMap: { ...snapshot.virtualRelationMap },
  targetExpandedKeys: [...snapshot.targetExpandedKeys],
});

interface VirtualRelationEntry {
  currentParentId: string | null;
  isVirtual: boolean;
}

export interface TransferWorkspaceProps {
  businessDomain: string;
  initialAction?: "move" | "copy";
  sourceNodesData?: TransferTreeNode[];
  externalLoading?: boolean;
  onComplete?: (
    response?:
      | MetaCategoryBatchTransferResponseDto
      | MetaCategoryBatchTransferTopologyResponseDto,
  ) => void;
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
  return fallback || name || code || "-";
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
    "children" in node && node.children
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

const collectInitialSourceExpandedKeys = (
  nodes: TransferTreeNode[],
): React.Key[] => {
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
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
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

const collectNodeMap = (
  nodes: TransferTreeNode[],
  nodeMap: Map<string, TransferTreeNode> = new Map(),
): Map<string, TransferTreeNode> => {
  nodes.forEach((node) => {
    nodeMap.set(String(node.key), node);
    if (node.children?.length) {
      collectNodeMap(node.children, nodeMap);
    }
  });

  return nodeMap;
};

const cloneTransferTreeNode = (node: TransferTreeNode): TransferTreeNode => ({
  ...node,
  isVirtual: false,
  isPendingPlacement: false,
  isPreviewRoot: false,
  children: node.children?.map(cloneTransferTreeNode),
});

const insertNodeIntoTree = (
  nodes: TransferTreeNode[],
  targetParentKey: React.Key | null,
  nodeToInsert: TransferTreeNode,
): TransferTreeNode[] => {
  if (targetParentKey == null) {
    return [...nodes, nodeToInsert];
  }

  const visit = (
    items: TransferTreeNode[],
  ): { nextItems: TransferTreeNode[]; inserted: boolean } => {
    let inserted = false;

    const nextItems = items.map((item) => {
      if (item.key === targetParentKey) {
        inserted = true;
        return {
          ...item,
          isLeaf: false,
          children: [...(item.children || []), nodeToInsert],
        };
      }

      if (item.children?.length) {
        const result = visit(item.children);
        if (result.inserted) {
          inserted = true;
          return {
            ...item,
            children: result.nextItems,
          };
        }
      }

      return item;
    });

    return { nextItems, inserted };
  };

  const result = visit(nodes);
  return result.inserted ? result.nextItems : nodes;
};

const markMovedPreviewNode = (
  node: TransferTreeNode,
  isRootPlacement: boolean,
): TransferTreeNode => ({
  ...node,
  isVirtual: true,
  isPreviewNode: true,
  isPreviewRoot: true,
  isPendingPlacement: isRootPlacement,
  children: node.children?.map((child) => ({
    ...markMovedPreviewNode(child, false),
    isPreviewRoot: false,
  })),
});

const annotateMovedSourceNodes = (
  nodes: TransferTreeNode[],
  movedSourceKeySet: Set<string>,
): TransferTreeNode[] => {
  return nodes.map((node) => ({
    ...node,
    isMovedSource: movedSourceKeySet.has(String(node.key)),
    children: node.children
      ? annotateMovedSourceNodes(node.children, movedSourceKeySet)
      : undefined,
  }));
};

const collectSubtreeKeys = (
  node: TransferTreeNode,
  keySet: Set<string> = new Set(),
): Set<string> => {
  keySet.add(String(node.key));
  node.children?.forEach((child) => collectSubtreeKeys(child, keySet));
  return keySet;
};

const pruneNestedPendingNodes = (
  node: TransferTreeNode,
  rootSourceKey: string,
  pendingSourceKeySet: Set<string>,
): TransferTreeNode | null => {
  const nodeKey = String(node.key);
  if (nodeKey !== rootSourceKey && pendingSourceKeySet.has(nodeKey)) {
    return null;
  }

  return {
    ...node,
    children: node.children
      ?.map((child) =>
        pruneNestedPendingNodes(child, rootSourceKey, pendingSourceKeySet),
      )
      .filter((child): child is TransferTreeNode => child != null),
  };
};

const removeNodesFromTree = (
  nodes: TransferTreeNode[],
  removedNodeKeySet: Set<string>,
): TransferTreeNode[] => {
  return nodes.flatMap((node) => {
    if (removedNodeKeySet.has(String(node.key))) {
      return [];
    }

    return [
      {
        ...node,
        children: node.children
          ? removeNodesFromTree(node.children, removedNodeKeySet)
          : undefined,
      },
    ];
  });
};

const preparePreviewMoveOperations = (
  operations: PendingOperation[],
  virtualRelationMap: Record<string, VirtualRelationEntry>,
): PendingOperation[] => {
  const subtreeKeysByOperationId = new Map<string, Set<string>>();
  const dependencyMap = new Map<string, Set<string>>();
  const indexByOperationId = new Map<string, number>();
  const targetParentIdByOperationId = new Map<string, string | null>();

  operations.forEach((operation, index) => {
    subtreeKeysByOperationId.set(
      operation.id,
      collectSubtreeKeys(operation.sourceNode),
    );
    dependencyMap.set(operation.id, new Set());
    indexByOperationId.set(operation.id, index);
    targetParentIdByOperationId.set(
      operation.id,
      virtualRelationMap[String(operation.sourceNode.key)]?.currentParentId ??
        (operation.targetKey == null ? null : String(operation.targetKey)),
    );
  });

  operations.forEach((operation) => {
    const currentParentId =
      targetParentIdByOperationId.get(operation.id) ?? null;

    if (currentParentId) {
      operations.forEach((candidateOperation) => {
        if (candidateOperation.id === operation.id) {
          return;
        }

        if (
          subtreeKeysByOperationId
            .get(candidateOperation.id)
            ?.has(currentParentId)
        ) {
          dependencyMap.get(operation.id)?.add(candidateOperation.id);
        }
      });
    }
  });

  const indegreeMap = new Map<string, number>();
  dependencyMap.forEach((dependencyIds, operationId) => {
    indegreeMap.set(operationId, dependencyIds.size);
  });

  const resolvedIds = new Set<string>();
  const orderedOperations: PendingOperation[] = [];

  while (resolvedIds.size < operations.length) {
    const nextOperation = operations
      .filter(
        (operation) =>
          !resolvedIds.has(operation.id) &&
          (indegreeMap.get(operation.id) || 0) === 0,
      )
      .sort(
        (left, right) =>
          (indexByOperationId.get(left.id) || 0) -
          (indexByOperationId.get(right.id) || 0),
      )[0];

    if (!nextOperation) {
      return operations;
    }

    orderedOperations.push(nextOperation);
    resolvedIds.add(nextOperation.id);

    dependencyMap.forEach((dependencyIds, operationId) => {
      if (
        !resolvedIds.has(operationId) &&
        dependencyIds.has(nextOperation.id)
      ) {
        indegreeMap.set(
          operationId,
          Math.max(0, (indegreeMap.get(operationId) || 0) - 1),
        );
      }
    });
  }

  return orderedOperations;
};

const prepareTopologyMoveOperations = (
  operations: PendingOperation[],
  virtualRelationMap: Record<string, VirtualRelationEntry>,
): PreparedMoveOperation[] => {
  const operationById = new Map<string, PendingOperation>();
  const subtreeKeysByOperationId = new Map<string, Set<string>>();
  const dependencyMap = new Map<string, Set<string>>();
  const indexByOperationId = new Map<string, number>();
  const targetParentIdByOperationId = new Map<string, string | null>();

  operations.forEach((operation, index) => {
    operationById.set(operation.id, operation);
    subtreeKeysByOperationId.set(
      operation.id,
      collectSubtreeKeys(operation.sourceNode),
    );
    dependencyMap.set(operation.id, new Set());
    indexByOperationId.set(operation.id, index);
    targetParentIdByOperationId.set(
      operation.id,
      virtualRelationMap[String(operation.sourceNode.key)]?.currentParentId ??
        (operation.targetKey == null ? null : String(operation.targetKey)),
    );
  });

  operations.forEach((operation) => {
    const currentOperationSubtreeKeys = subtreeKeysByOperationId.get(
      operation.id,
    );
    if (!currentOperationSubtreeKeys) {
      return;
    }

    subtreeKeysByOperationId.forEach((otherSubtreeKeys, otherOperationId) => {
      if (otherOperationId === operation.id) {
        return;
      }

      const otherOperation = operationById.get(otherOperationId);
      if (!otherOperation) {
        return;
      }

      if (
        currentOperationSubtreeKeys.has(
          String(otherOperation.sourceNode.key),
        ) &&
        !otherSubtreeKeys.has(String(operation.sourceNode.key))
      ) {
        dependencyMap.get(operation.id)?.add(otherOperationId);
      }
    });
  });

  const indegreeMap = new Map<string, number>();
  dependencyMap.forEach((dependencyIds, operationId) => {
    indegreeMap.set(operationId, dependencyIds.size);
  });

  const resolvedIds = new Set<string>();
  const orderedOperations: PreparedMoveOperation[] = [];

  while (resolvedIds.size < operations.length) {
    const nextOperation = operations
      .filter(
        (operation) =>
          !resolvedIds.has(operation.id) &&
          (indegreeMap.get(operation.id) || 0) === 0,
      )
      .sort(
        (left, right) =>
          (indexByOperationId.get(left.id) || 0) -
          (indexByOperationId.get(right.id) || 0),
      )[0];

    if (!nextOperation) {
      throw new Error(
        "当前批量移动存在无法解析的操作依赖，请调整拖拽顺序后重试",
      );
    }

    orderedOperations.push({
      operation: nextOperation,
      sourceNodeId: String(nextOperation.sourceNode.key),
      targetParentId: targetParentIdByOperationId.get(nextOperation.id) ?? null,
      dependsOnOperationIds: Array.from(
        dependencyMap.get(nextOperation.id) || [],
      ),
      originalParentId: nextOperation.sourceNode.dataRef?.parentId ?? null,
    });
    resolvedIds.add(nextOperation.id);

    dependencyMap.forEach((dependencyIds, operationId) => {
      if (
        !resolvedIds.has(operationId) &&
        dependencyIds.has(nextOperation.id)
      ) {
        indegreeMap.set(
          operationId,
          Math.max(0, (indegreeMap.get(operationId) || 0) - 1),
        );
      }
    });
  }

  return orderedOperations;
};

const isTopologyTransferResponse = (
  response:
    | MetaCategoryBatchTransferResponseDto
    | MetaCategoryBatchTransferTopologyResponseDto,
): response is MetaCategoryBatchTransferTopologyResponseDto => {
  return (
    "resolvedOrder" in response ||
    "planningWarnings" in response ||
    "finalParentMappings" in response
  );
};

const collectFailedTransferMessages = (
  response:
    | MetaCategoryBatchTransferResponseDto
    | MetaCategoryBatchTransferTopologyResponseDto,
): string[] => {
  return response.results
    .filter((result) => !result.success)
    .map((result) => {
      const operationId =
        "operationId" in result
          ? result.operationId
          : result.clientOperationId || result.sourceNodeId;
      const code = result.code || "UNKNOWN_ERROR";
      const message = result.message || "未提供失败原因";
      return `${operationId}: ${code} - ${message}`;
    });
};

const hasAtomicRollbackFailure = (
  response:
    | MetaCategoryBatchTransferResponseDto
    | MetaCategoryBatchTransferTopologyResponseDto,
): boolean => {
  return response.results.some(
    (result) =>
      result.code === "ATOMIC_ROLLBACK" || result.code === "ATOMIC_ABORTED",
  );
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
      .${DRY_RUN_MODAL_CLASS} .ant-modal-confirm-body {
        display: block;
      }
      .${DRY_RUN_MODAL_CLASS} .ant-modal-confirm-paragraph {
        max-width: none;
        width: 100%;
      }
      .${DRY_RUN_MODAL_CLASS} .ant-modal-confirm-content {
        max-width: none;
        width: 100%;
        margin-top: 12px;
      }
    `,
    [],
  );

  const [isClientMounted, setIsClientMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"move" | "copy" | null>(
    null,
  );
  const [activeDragNode, setActiveDragNode] = useState<TransferTreeNode | null>(
    null,
  );
  const [pendingOperations, setPendingOperations] = useState<
    PendingOperation[]
  >([]);
  const [liveHoveredTargetKey, setLiveHoveredTargetKey] =
    useState<React.Key | null>(null);
  const [hoveredTargetKey, setHoveredTargetKey] = useState<React.Key | null>(
    null,
  );
  const [hoveredTargetTitle, setHoveredTargetTitle] =
    useState<string>("目标分类");
  const [hoveredMovedSourceKey, setHoveredMovedSourceKey] =
    useState<React.Key | null>(null);
  const [sourceData, setSourceData] = useState<TransferTreeNode[]>([]);
  const [targetData, setTargetData] = useState<TransferTreeNode[]>([]);
  const [sourceExpandedKeys, setSourceExpandedKeys] = useState<React.Key[]>([]);
  const [targetExpandedKeys, setTargetExpandedKeys] = useState<React.Key[]>([]);
  const [targetLoadedKeys, setTargetLoadedKeys] = useState<React.Key[]>([]);
  const [virtualRelationMap, setVirtualRelationMap] = useState<
    Record<string, VirtualRelationEntry>
  >({});
    const [workspaceHistory, setWorkspaceHistory] = useState<WorkspaceSnapshot[]>([
      createEmptyWorkspaceSnapshot(),
    ]);
    const [workspaceHistoryIndex, setWorkspaceHistoryIndex] = useState(0);
  const [
    shouldAnimateDragOverlayDropBack,
    setShouldAnimateDragOverlayDropBack,
  ] = useState(true);
  const targetScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const rootDropTargetRef = useRef<HTMLDivElement | null>(null);
  const hoverTargetCommitTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingHoverTargetRef = useRef<{
    key: React.Key | null;
    title: string;
  }>({
    key: null,
    title: "目标分类",
  });

  const overlayActionLabel = useMemo(() => {
    const action = pendingAction || initialAction || "move";
    return action === "copy" ? "复制" : "移动";
  }, [initialAction, pendingAction]);

  const currentActionType = useMemo<"move" | "copy">(() => {
    return pendingAction || initialAction || "move";
  }, [initialAction, pendingAction]);

  const rootDropDisabled = useMemo(() => {
    return currentActionType === "move" && isRootCategoryNode(activeDragNode);
  }, [activeDragNode, currentActionType]);

  const canUndo = workspaceHistoryIndex > 0;
  const canRedo = workspaceHistoryIndex < workspaceHistory.length - 1;

  const applyWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => {
    const nextSnapshot = cloneWorkspaceSnapshot(snapshot);
    setPendingAction(nextSnapshot.pendingAction);
    setPendingOperations(nextSnapshot.pendingOperations);
    setVirtualRelationMap(nextSnapshot.virtualRelationMap);
    setTargetExpandedKeys(nextSnapshot.targetExpandedKeys);
    setHoveredMovedSourceKey(null);
  };

  const pushWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => {
    const nextSnapshot = cloneWorkspaceSnapshot(snapshot);
    setWorkspaceHistory((prev) => {
      const trimmedHistory = prev.slice(0, workspaceHistoryIndex + 1);
      return [...trimmedHistory, nextSnapshot];
    });
    setWorkspaceHistoryIndex((prev) => prev + 1);
  };

  const resetWorkspaceSnapshots = () => {
    const emptySnapshot = createEmptyWorkspaceSnapshot();
    setWorkspaceHistory([emptySnapshot]);
    setWorkspaceHistoryIndex(0);
    applyWorkspaceSnapshot(emptySnapshot);
  };

  const transferNodeLookup = useMemo(() => {
    const lookup = collectNodeMap(targetData);
    collectNodeMap(sourceData, lookup);
    pendingOperations.forEach((operation) => {
      collectNodeMap([operation.sourceNode], lookup);
    });
    return lookup;
  }, [targetData, sourceData, pendingOperations]);

  const collisionDetectionStrategy = useMemo<CollisionDetection>(() => {
    return (args) => {
      const collisions = pointerWithin(args);
      const pointer = args.pointerCoordinates;
      const rootElementRect =
        rootDropTargetRef.current?.getBoundingClientRect();
      const rootRect = args.droppableRects.get(ROOT_DROP_TARGET_DROPPABLE_ID);

      if (
        pointer &&
        rootElementRect &&
        rectContainsPoint(rootElementRect, pointer)
      ) {
        const rootCollision = collisions.find(
          (collision) => collision.id === ROOT_DROP_TARGET_DROPPABLE_ID,
        );

        if (rootCollision) {
          return [rootCollision];
        }

        return [];
      }

      const viewportRect =
        targetScrollViewportRef.current?.getBoundingClientRect();
      const visibleCollisions = viewportRect
        ? collisions.filter((collision) => {
            const collisionRect = args.droppableRects.get(collision.id);
            return collisionRect
              ? rectIntersects(collisionRect, viewportRect)
              : false;
          })
        : collisions;

      if (rootDropDisabled) {
        return visibleCollisions.filter(
          (collision) => collision.id !== ROOT_DROP_TARGET_DROPPABLE_ID,
        );
      }

      const rootCollision = visibleCollisions.find(
        (collision) => collision.id === ROOT_DROP_TARGET_DROPPABLE_ID,
      );

      if (rootCollision) {
        return [
          rootCollision,
          ...visibleCollisions.filter(
            (collision) => collision.id !== ROOT_DROP_TARGET_DROPPABLE_ID,
          ),
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
    resetWorkspaceSnapshots();
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

        setTargetData(
          (Array.isArray(page.content) ? page.content : []).map(
            mapCategoryNodeToTransferNode,
          ),
        );
        setTargetExpandedKeys([]);
        setTargetLoadedKeys([]);
      } catch (error: any) {
        if (!cancelled) {
          setTargetData([]);
          messageApi.error(getErrorMessage(error, "加载目标分类失败"));
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

    const sourceNodeId = String(activeDragNode.key);
    const blockedKeys = new Set<React.Key>([sourceNodeId]);

    const getEffectiveParentId = (nodeId: string): string | null => {
      const virtualParentId = virtualRelationMap[nodeId]?.currentParentId;
      if (virtualParentId !== undefined) {
        return virtualParentId;
      }

      return transferNodeLookup.get(nodeId)?.dataRef?.parentId ?? null;
    };

    transferNodeLookup.forEach((_node, nodeId) => {
      if (nodeId === sourceNodeId) {
        return;
      }

      const visited = new Set<string>();
      let currentParentId = getEffectiveParentId(nodeId);

      while (currentParentId && !visited.has(currentParentId)) {
        if (currentParentId === sourceNodeId) {
          blockedKeys.add(nodeId);
          break;
        }

        visited.add(currentParentId);
        currentParentId = getEffectiveParentId(currentParentId);
      }
    });

    if (currentActionType === "move") {
      const currentParentId =
        virtualRelationMap[sourceNodeId]?.currentParentId ??
        activeDragNode.dataRef?.parentId ??
        null;

      if (currentParentId) {
        blockedKeys.add(currentParentId);
      }
    }

    return Array.from(blockedKeys);
  }, [
    activeDragNode,
    currentActionType,
    virtualRelationMap,
    transferNodeLookup,
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleLoadTargetChildren = async (
    node: TransferTreeNode,
  ): Promise<void> => {
    if (
      node.isLeaf ||
      node.isVirtual ||
      node.isPreviewNode ||
      targetLoadedKeys.includes(node.key)
    ) {
      return;
    }

    const page = await metaCategoryApi.listNodes({
      businessDomain,
      parentId: String(node.key),
      status: DEFAULT_LIST_STATUS,
      page: 0,
      size: TARGET_ROOT_PAGE_SIZE,
    });

    const childNodes = (Array.isArray(page.content) ? page.content : []).map(
      mapCategoryNodeToTransferNode,
    );
    setTargetData((origin) =>
      updateTransferNode(origin, node.key, (targetNode) => ({
        ...targetNode,
        isLeaf: childNodes.length === 0,
        children: childNodes,
      })),
    );
    setTargetLoadedKeys((keys) =>
      keys.includes(node.key) ? keys : [...keys, node.key],
    );
  };

  const clearHoverTargetCommitTimer = () => {
    if (hoverTargetCommitTimerRef.current) {
      clearTimeout(hoverTargetCommitTimerRef.current);
      hoverTargetCommitTimerRef.current = null;
    }
  };

  const commitHoveredTarget = (key: React.Key | null, title: string) => {
    clearHoverTargetCommitTimer();
    pendingHoverTargetRef.current = { key, title };
    setLiveHoveredTargetKey((previousKey) =>
      previousKey === key ? previousKey : key,
    );
    setHoveredTargetKey((previousKey) =>
      previousKey === key ? previousKey : key,
    );
    setHoveredTargetTitle((previousTitle) =>
      previousTitle === title ? previousTitle : title,
    );
  };

  const scheduleHoveredTargetCommit = (
    key: React.Key | null,
    title: string,
  ) => {
    const pendingHoverTarget = pendingHoverTargetRef.current;
    if (pendingHoverTarget.key === key && pendingHoverTarget.title === title) {
      return;
    }

    clearHoverTargetCommitTimer();
    pendingHoverTargetRef.current = { key, title };
    hoverTargetCommitTimerRef.current = setTimeout(() => {
      setHoveredTargetKey((previousKey) =>
        previousKey === key ? previousKey : key,
      );
      setHoveredTargetTitle((previousTitle) =>
        previousTitle === title ? previousTitle : title,
      );
      hoverTargetCommitTimerRef.current = null;
    }, HOVER_TARGET_COMMIT_DELAY);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const nodeData = event.active.data.current as TransferTreeNode | undefined;
    if (!nodeData) return;

    setShouldAnimateDragOverlayDropBack(true);
    commitHoveredTarget(null, "目标分类");
    setActiveDragNode(nodeData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overNode = event.over?.data.current as TransferTreeNode | undefined;
    if (!overNode) {
      commitHoveredTarget(null, "目标分类");
      return;
    }

    if (
      (overNode.key === ROOT_DROP_TARGET_KEY && rootDropDisabled) ||
      (overNode.key !== ROOT_DROP_TARGET_KEY &&
        disabledKeys.includes(overNode.key))
    ) {
      commitHoveredTarget(null, "目标分类");
      return;
    }

    setLiveHoveredTargetKey((previousKey) =>
      previousKey === overNode.key ? previousKey : overNode.key,
    );
    scheduleHoveredTargetCommit(
      overNode.key,
      overNode.key === ROOT_DROP_TARGET_KEY
        ? ROOT_DROP_TARGET_TITLE
        : overNode.title || "目标分类",
    );
  };

  useEffect(() => {
    return () => {
      clearHoverTargetCommitTimer();
    };
  }, []);

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
      if (
        hoveredNode &&
        !hoveredNode.isLeaf &&
        !targetLoadedKeys.includes(hoveredTargetKey)
      ) {
        void handleLoadTargetChildren(hoveredNode).catch(() => {
          // 自动展开场景下的懒加载失败，保留已有结构即可。
        });
      }
      setTargetExpandedKeys((prev) =>
        Array.from(new Set([...prev, hoveredTargetKey])),
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [hoveredTargetKey, disabledKeys, targetData, targetLoadedKeys]);

  const handleDragEnd = (event: DragEndEvent) => {
    const overNode = event.over?.data.current as TransferTreeNode | undefined;
    const draggedNode = activeDragNode;
    const isInvalidDrop =
      !overNode ||
      !draggedNode ||
      (overNode.key === ROOT_DROP_TARGET_KEY && rootDropDisabled) ||
      (overNode.key !== ROOT_DROP_TARGET_KEY &&
        disabledKeys.includes(overNode.key));

    setShouldAnimateDragOverlayDropBack(isInvalidDrop);
    commitHoveredTarget(null, "目标分类");
    setActiveDragNode(null);

    if (isInvalidDrop) {
      return;
    }

    const resolvedTargetKey =
      overNode.key === ROOT_DROP_TARGET_KEY ? null : overNode.key;
    const nextOperation: PendingOperation = {
      sourceNode: draggedNode,
      targetKey: resolvedTargetKey,
      id: `OP_${Date.now()}_${draggedNode.key}`,
    };
    const resolvedAction = pendingAction || initialAction || "move";

    const nextPendingOperations =
      resolvedAction === "move"
        ? [
            ...pendingOperations.filter(
              (item) => item.sourceNode.key !== draggedNode.key,
            ),
            nextOperation,
          ]
        : [...pendingOperations, nextOperation];
    const nextVirtualRelationMap =
      resolvedAction === "move"
        ? {
            ...virtualRelationMap,
            [String(draggedNode.key)]: {
              currentParentId:
                resolvedTargetKey == null ? null : String(resolvedTargetKey),
              isVirtual: true,
            },
          }
        : virtualRelationMap;
    const nextTargetExpandedKeys = resolvedTargetKey
      ? Array.from(new Set([...targetExpandedKeys, resolvedTargetKey]))
      : targetExpandedKeys;
    const nextPendingAction = pendingAction || initialAction || "move";
    const nextSnapshot: WorkspaceSnapshot = {
      pendingAction: nextPendingAction,
      pendingOperations: nextPendingOperations,
      virtualRelationMap: nextVirtualRelationMap,
      targetExpandedKeys: nextTargetExpandedKeys,
    };

    applyWorkspaceSnapshot(nextSnapshot);
    pushWorkspaceSnapshot(nextSnapshot);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setShouldAnimateDragOverlayDropBack(true);
    commitHoveredTarget(null, "目标分类");
    setActiveDragNode(null);
  };

  const handleUndo = () => {
    if (!canUndo) {
      return;
    }

    const nextIndex = workspaceHistoryIndex - 1;
    const snapshot = workspaceHistory[nextIndex];
    if (!snapshot) {
      return;
    }

    setWorkspaceHistoryIndex(nextIndex);
    applyWorkspaceSnapshot(snapshot);
  };

  const handleRedo = () => {
    if (!canRedo) {
      return;
    }

    const nextIndex = workspaceHistoryIndex + 1;
    const snapshot = workspaceHistory[nextIndex];
    if (!snapshot) {
      return;
    }

    setWorkspaceHistoryIndex(nextIndex);
    applyWorkspaceSnapshot(snapshot);
  };

  const buildBatchTransferRequest = (
    actionType: "copy",
    dryRun: boolean,
  ): MetaCategoryBatchTransferRequestDto => {
    return {
      businessDomain,
      action: actionType.toUpperCase() as "MOVE" | "COPY",
      dryRun,
      atomic: false,
      operator: "admin",
      copyOptions: actionType === "copy" ? DEFAULT_COPY_OPTIONS : undefined,
      operations: pendingOperations.map((operation) => ({
        clientOperationId: operation.id,
        sourceNodeId: String(operation.sourceNode.key),
        targetParentId:
          operation.targetKey == null ? null : String(operation.targetKey),
      })),
    };
  };

  const buildTopologyBatchTransferRequest = (
    preparedOperations: PreparedMoveOperation[],
    dryRun: boolean,
    options?: { includeExpectedSourceParentId?: boolean },
  ): MetaCategoryBatchTransferTopologyRequestDto => {
    return {
      businessDomain,
      action: "MOVE",
      dryRun,
      atomic: true,
      operator: "admin",
      planningMode: "TOPOLOGY_AWARE",
      orderingStrategy: "CLIENT_ORDER",
      strictDependencyValidation: true,
      operations: preparedOperations.map(
        ({
          operation,
          sourceNodeId,
          targetParentId,
          dependsOnOperationIds,
          originalParentId,
        }) => ({
          operationId: operation.id,
          sourceNodeId,
          targetParentId,
          dependsOnOperationIds,
          allowDescendantFirstSplit: true,
          expectedSourceParentId: options?.includeExpectedSourceParentId
            ? originalParentId
            : undefined,
        }),
      ),
    };
  };

  const getMoveOperationTitleMap = (
    preparedOperations: PreparedMoveOperation[],
  ) => {
    const titleMap = new Map<string, string>();
    preparedOperations.forEach(({ operation, sourceNodeId }) => {
      titleMap.set(operation.id, operation.sourceNode.title || sourceNodeId);
    });
    return titleMap;
  };

  const getNodeDisplayTitle = (
    nodeId?: string | null,
    fallback?: string,
  ): string => {
    if (nodeId == null) {
      return ROOT_DROP_TARGET_TITLE;
    }

    return transferNodeLookup.get(String(nodeId))?.title || fallback || nodeId;
  };

  const buildPendingOperationSummaries = (
    actionType: "move" | "copy",
    preparedOperations?: PreparedMoveOperation[] | null,
  ) => {
    if (actionType === "move" && preparedOperations?.length) {
      const operationTitleMap = getMoveOperationTitleMap(preparedOperations);

      return preparedOperations.map(
        ({ operation, targetParentId, dependsOnOperationIds }, index) => ({
          key: operation.id,
          title: `${index + 1}. ${operation.sourceNode.title} -> ${getNodeDisplayTitle(targetParentId)}`,
          detail:
            dependsOnOperationIds.length > 0
              ? `需等待 ${dependsOnOperationIds
                  .map(
                    (operationId) =>
                      operationTitleMap.get(operationId) || operationId,
                  )
                  .join("、")} 先完成`
              : "可直接执行",
        }),
      );
    }

    return pendingOperations.map((operation, index) => ({
      key: operation.id,
      title: `${index + 1}. ${operation.sourceNode.title} -> ${getNodeDisplayTitle(
        operation.targetKey == null ? null : String(operation.targetKey),
      )}`,
      detail: actionType === "copy" ? "复制后保留原节点" : "等待执行",
    }));
  };

  const buildFailedIssueSummaries = (
    results: Array<
      | MetaCategoryBatchTransferResponseDto["results"][number]
      | MetaCategoryBatchTransferTopologyResponseDto["results"][number]
    >,
  ): DryRunTimelineItem[] => {
    return results.map((result, index) => {
      const sourceTitle = getNodeDisplayTitle(
        result.sourceNodeId,
        result.sourceNodeId,
      );
      const targetTitle = getNodeDisplayTitle(result.targetParentId ?? null);

      return {
        key:
          ("operationId" in result ? result.operationId : undefined) ||
          `${result.sourceNodeId}-${index}`,
        title: `${sourceTitle} -> ${targetTitle}`,
        detail:
          result.message ||
          result.code ||
          `源节点 ${result.sourceNodeId} 预检失败`,
        color: "red",
      };
    });
  };

  const buildResolvedOrderSummaries = (
    resolvedOrder: string[],
    moveOperationTitleMap: Map<string, string>,
  ): DryRunTimelineItem[] => {
    return resolvedOrder.map((operationId, index) => ({
      key: operationId,
      title: `${index + 1}. ${moveOperationTitleMap.get(operationId) || operationId}`,
      detail: "服务端建议按此顺序执行",
      color: "blue",
    }));
  };

  const buildFinalPlacementSummaries = (
    mappings: NonNullable<
      MetaCategoryBatchTransferTopologyResponseDto["finalParentMappings"]
    >,
  ): DryRunTimelineItem[] => {
    return mappings.map((mapping) => ({
      key: mapping.sourceNodeId,
      title: getNodeDisplayTitle(mapping.sourceNodeId, mapping.sourceNodeId),
      detail: `最终位于 ${getNodeDisplayTitle(mapping.finalParentId ?? null)} 下`,
      color: "green",
    }));
  };

  const executeBatchTransfer = async (
    actionType: "move" | "copy",
    preparedMoveOperations?: PreparedMoveOperation[],
    options?: { showFailureModal?: boolean; skipCompleteCallback?: boolean },
  ) => {
    setLoading(true);
    try {
      const resolvedPreparedMoveOperations =
        actionType === "move"
          ? preparedMoveOperations ||
            prepareTopologyMoveOperations(pendingOperations, virtualRelationMap)
          : undefined;
      const response =
        actionType === "move"
          ? await metaCategoryApi.batchTransferCategoriesWithTopology(
              buildTopologyBatchTransferRequest(
                resolvedPreparedMoveOperations || [],
                false,
                {
                  includeExpectedSourceParentId: true,
                },
              ),
            )
          : await metaCategoryApi.batchTransferCategories(
              buildBatchTransferRequest("copy", false),
            );

      const actionLabel = actionType === "copy" ? "复制" : "移动";
      const failedMessages = collectFailedTransferMessages(response);
      const rollbackTriggered = hasAtomicRollbackFailure(response);
      if (response.failureCount > 0 && response.successCount > 0) {
        messageApi.warning(
          `${actionLabel}完成，成功 ${response.successCount} 项，失败 ${response.failureCount} 项`,
        );
      } else if (response.failureCount > 0) {
        messageApi.error(
          `${actionLabel}失败，共 ${response.failureCount} 项失败`,
        );
      } else {
        messageApi.success(
          `${actionLabel}成功，共处理 ${response.successCount} 项`,
        );
      }

      if (response.failureCount > 0 && options?.showFailureModal !== false) {
        modal.error({
          title: rollbackTriggered
            ? `${actionLabel}失败，事务已回滚`
            : `${actionLabel}失败`,
          icon: null,
          width: 640,
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rollbackTriggered && (
                <div>
                  后端已触发 atomic rollback，SQL 可能执行过但最终未提交。
                </div>
              )}
              {failedMessages.slice(0, 8).map((item) => (
                <div key={item}>{item}</div>
              ))}
              {failedMessages.length > 8 && (
                <div>其余 {failedMessages.length - 8} 条失败结果已省略。</div>
              )}
            </div>
          ),
        });
      }

      if (
        response.successCount > 0 ||
        (!isTopologyTransferResponse(response) && response.normalizedCount > 0)
      ) {
        setPendingOperations([]);
        setPendingAction(null);
        setVirtualRelationMap({});
        setWorkspaceHistory([createEmptyWorkspaceSnapshot()]);
        setWorkspaceHistoryIndex(0);
        if (!options?.skipCompleteCallback) {
          onComplete?.(response);
        }
      }

      return response;
    } catch (error: any) {
      messageApi.error(
        getErrorMessage(
          error,
          `${actionType === "copy" ? "复制" : "移动"}失败`,
        ),
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (actionType: "move" | "copy") => {
    if (!pendingOperations.length) {
      return;
    }

    setLoading(true);
    try {
      const preparedMoveOperations =
        actionType === "move"
          ? prepareTopologyMoveOperations(pendingOperations, virtualRelationMap)
          : null;
      const moveDryRunRequest =
        actionType === "move" && preparedMoveOperations
          ? buildTopologyBatchTransferRequest(preparedMoveOperations, true)
          : null;
      const dryRunResponse =
        actionType === "move"
          ? await metaCategoryApi.batchTransferCategoriesWithTopology(
              moveDryRunRequest!,
            )
          : await metaCategoryApi.batchTransferCategories(
              buildBatchTransferRequest("copy", true),
            );
      const actionLabel = actionType === "copy" ? "复制" : "移动";
      const failedResults = dryRunResponse.results.filter(
        (result) => !result.success,
      );
      const normalizedResults = !isTopologyTransferResponse(dryRunResponse)
        ? dryRunResponse.results.filter(
            (result) => result.code === "SOURCE_OVERLAP_NORMALIZED",
          )
        : [];
      const planningWarnings = isTopologyTransferResponse(dryRunResponse)
        ? dryRunResponse.planningWarnings || []
        : dryRunResponse.warnings || [];
      const moveOperationTitleMap =
        actionType === "move" && preparedMoveOperations
          ? getMoveOperationTitleMap(preparedMoveOperations)
          : new Map<string, string>();
      const pendingOperationSummaries = buildPendingOperationSummaries(
        actionType,
        preparedMoveOperations,
      );
      const resolvedOrderPreview = isTopologyTransferResponse(dryRunResponse)
        ? dryRunResponse.resolvedOrder || []
        : [];
      const finalParentMappingPreview = isTopologyTransferResponse(dryRunResponse)
        ? dryRunResponse.finalParentMappings || []
        : [];
      const failedIssueSummaries = buildFailedIssueSummaries(failedResults);
      const resolvedOrderSummaries = buildResolvedOrderSummaries(
        resolvedOrderPreview,
        moveOperationTitleMap,
      );
      const finalPlacementSummaries = buildFinalPlacementSummaries(
        finalParentMappingPreview,
      );

      if (failedResults.length > 0 || dryRunResponse.successCount === 0) {
        modal.error({
          title: `${actionLabel}预检未通过`,
          icon: null,
          className: DRY_RUN_MODAL_CLASS,
          width: DRY_RUN_MODAL_WIDTH,
          centered: true,
          content: (
            <BatchTransferDryRunPanel
              actionLabel={actionLabel}
              status="failed"
              total={dryRunResponse.total}
              successCount={dryRunResponse.successCount}
              planningMode={
                isTopologyTransferResponse(dryRunResponse)
                  ? dryRunResponse.planningMode || "TOPOLOGY_AWARE"
                  : undefined
              }
              normalizedCount={normalizedResults.length}
              pendingOperations={pendingOperationSummaries}
              resolvedOrder={resolvedOrderSummaries}
              finalPlacements={finalPlacementSummaries}
              failedIssues={failedIssueSummaries}
              warnings={planningWarnings}
              height={DRY_RUN_MODAL_HEIGHT}
            />
          ),
        });
        return;
      }

      const confirmModal = modal.confirm({
        title: `确认${actionLabel}`,
        icon: null,
        className: DRY_RUN_MODAL_CLASS,
        okText: `确认${actionLabel}`,
        cancelText: "取消",
        width: DRY_RUN_MODAL_WIDTH,
        centered: true,
        maskClosable: true,
        content: (
          <BatchTransferDryRunPanel
            actionLabel={actionLabel}
            status="passed"
            total={dryRunResponse.total}
            successCount={dryRunResponse.successCount}
            planningMode={
              isTopologyTransferResponse(dryRunResponse)
                ? dryRunResponse.planningMode || "TOPOLOGY_AWARE"
                : undefined
            }
            normalizedCount={normalizedResults.length}
            pendingOperations={pendingOperationSummaries}
            resolvedOrder={resolvedOrderSummaries}
            finalPlacements={finalPlacementSummaries}
            failedIssues={failedIssueSummaries}
            warnings={planningWarnings}
            height={DRY_RUN_MODAL_HEIGHT}
          />
        ),
        onOk: (close) => {
          const closeResultModal = (response?:
            | MetaCategoryBatchTransferResponseDto
            | MetaCategoryBatchTransferTopologyResponseDto,
          ) => {
            if (response) {
              onComplete?.(response);
            }
            if (typeof close === "function") {
              close();
            } else {
              confirmModal.destroy();
            }
          };

          confirmModal.update({
            title: `正在${actionLabel}`,
            closable: false,
            maskClosable: false,
            okCancel: false,
            cancelButtonProps: { style: { display: "none" } },
            okButtonProps: { style: { display: "none" } },
            content: (
              <BatchTransferDryRunPanel
                actionLabel={actionLabel}
                status="passed"
                total={dryRunResponse.total}
                successCount={dryRunResponse.successCount}
                planningMode={
                  isTopologyTransferResponse(dryRunResponse)
                    ? dryRunResponse.planningMode || "TOPOLOGY_AWARE"
                    : undefined
                }
                normalizedCount={normalizedResults.length}
                pendingOperations={pendingOperationSummaries}
                resolvedOrder={resolvedOrderSummaries}
                finalPlacements={finalPlacementSummaries}
                failedIssues={failedIssueSummaries}
                warnings={planningWarnings}
                height={DRY_RUN_MODAL_HEIGHT}
                executionStage="processing"
                executionSummary={`服务端正在处理 ${pendingOperationSummaries.length} 项批量${actionLabel}操作。`}
              />
            ),
          });

          void (async () => {
            try {
              const response = await executeBatchTransfer(
                actionType,
                preparedMoveOperations || undefined,
                { showFailureModal: false, skipCompleteCallback: true },
              );
              const isFailed = !response || response.failureCount > 0;

              confirmModal.update({
                title: isFailed ? `${actionLabel}执行结果` : `${actionLabel}完成`,
                closable: true,
                maskClosable: true,
                okCancel: false,
                okText: "关闭",
                cancelButtonProps: { style: { display: "none" } },
                okButtonProps: { loading: false },
                onOk: () => {
                  closeResultModal(!isFailed ? response : undefined);
                },
                onCancel: () => {
                  closeResultModal(!isFailed ? response : undefined);
                },
                content: (
                  <BatchTransferDryRunPanel
                    actionLabel={actionLabel}
                    status={isFailed ? "failed" : "passed"}
                    total={dryRunResponse.total}
                    successCount={response?.successCount || 0}
                    planningMode={
                      isTopologyTransferResponse(dryRunResponse)
                        ? dryRunResponse.planningMode || "TOPOLOGY_AWARE"
                        : undefined
                    }
                    normalizedCount={normalizedResults.length}
                    pendingOperations={pendingOperationSummaries}
                    resolvedOrder={resolvedOrderSummaries}
                    finalPlacements={finalPlacementSummaries}
                    failedIssues={isFailed ? failedIssueSummaries : []}
                    warnings={planningWarnings}
                    height={DRY_RUN_MODAL_HEIGHT}
                    executionStage={isFailed ? "failed" : "success"}
                    executionSummary={
                      response
                        ? isFailed
                          ? `执行结束，成功 ${response.successCount} 项，失败 ${response.failureCount} 项。`
                          : `执行成功，共处理 ${response.successCount} 项，请确认后手动关闭。`
                        : `批量${actionLabel}未返回结果，请稍后刷新列表确认。`
                    }
                  />
                ),
              });
            } catch (error: any) {
              confirmModal.update({
                title: `${actionLabel}失败`,
                closable: true,
                maskClosable: true,
                okCancel: false,
                okText: "关闭",
                cancelButtonProps: { style: { display: "none" } },
                okButtonProps: { loading: false },
                onOk: () => {
                  closeResultModal();
                },
                onCancel: () => {
                  closeResultModal();
                },
                content: (
                  <BatchTransferDryRunPanel
                    actionLabel={actionLabel}
                    status="failed"
                    total={dryRunResponse.total}
                    successCount={0}
                    planningMode={
                      isTopologyTransferResponse(dryRunResponse)
                        ? dryRunResponse.planningMode || "TOPOLOGY_AWARE"
                        : undefined
                    }
                    normalizedCount={normalizedResults.length}
                    pendingOperations={pendingOperationSummaries}
                    resolvedOrder={resolvedOrderSummaries}
                    finalPlacements={finalPlacementSummaries}
                    failedIssues={failedIssueSummaries}
                    warnings={planningWarnings}
                    height={DRY_RUN_MODAL_HEIGHT}
                    executionStage="failed"
                    executionSummary={getErrorMessage(error, `批量${actionLabel}执行失败`)}
                  />
                ),
              });
            }
          })();
        },
      });
    } catch (error: any) {
      messageApi.error(getErrorMessage(error, "批量转移预检失败"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setHoveredMovedSourceKey(null);
    resetWorkspaceSnapshots();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const displaySourceData = useMemo(() => {
    const movedSourceKeySet = new Set<string>();

    if (currentActionType === "move") {
      pendingOperations.forEach((operation) => {
        collectSubtreeKeys(operation.sourceNode, movedSourceKeySet);
      });
    }

    return annotateMovedSourceNodes(sourceData, movedSourceKeySet);
  }, [sourceData, pendingOperations, currentActionType]);

  const displayTargetData = useMemo(() => {
    if (currentActionType === "move") {
      const pendingSourceKeySet = new Set<string>(
        pendingOperations.map((operation) => String(operation.sourceNode.key)),
      );
      const orderedPendingOperations = preparePreviewMoveOperations(
        pendingOperations,
        virtualRelationMap,
      );
      let currentData = removeNodesFromTree(
        targetData.map(cloneTransferTreeNode),
        pendingSourceKeySet,
      );

      orderedPendingOperations.forEach((operation) => {
        const virtualRelation =
          virtualRelationMap[String(operation.sourceNode.key)];
        const currentParentId = virtualRelation
          ? virtualRelation.currentParentId
          : operation.targetKey == null
            ? null
            : String(operation.targetKey);
        const canonicalSourceNode = pruneNestedPendingNodes(
          cloneTransferTreeNode(operation.sourceNode),
          String(operation.sourceNode.key),
          pendingSourceKeySet,
        );
        const movingNode = markMovedPreviewNode(
          canonicalSourceNode ?? cloneTransferTreeNode(operation.sourceNode),
          currentParentId == null,
        );

        currentData = insertNodeIntoTree(
          currentData,
          currentParentId,
          movingNode,
        );
      });

      return currentData;
    }

    let currentData = [...targetData];

    pendingOperations.forEach((operation) => {
      const createVirtualNodes = (
        node: TransferTreeNode,
        isRoot: boolean,
        isRootPlacement: boolean,
      ): TransferTreeNode => ({
        ...node,
        key: isRoot
          ? `VIRTUAL_PENDING_${operation.id}`
          : `VIRTUAL_PENDING_${operation.id}_${node.key}`,
        title: node.title,
        isVirtual: true,
        isPendingPlacement: isRoot && isRootPlacement,
        isPreviewRoot: isRoot,
        children: node.children?.map((child) =>
          createVirtualNodes(child, false, false),
        ),
      });

      const virtualNode = createVirtualNodes(
        operation.sourceNode,
        true,
        operation.targetKey == null,
      );
      const insertNode = (
        nodes: TransferTreeNode[],
        targetKey: React.Key,
      ): TransferTreeNode[] => {
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

      currentData =
        operation.targetKey == null
          ? [...currentData, virtualNode]
          : insertNode(currentData, operation.targetKey);
    });

    return currentData;
  }, [targetData, pendingOperations, currentActionType, virtualRelationMap]);

  const spinning = loading || externalLoading;

  return (
    <Spin
      spinning={spinning}
      tip="正在处理中，请稍候..."
      size="large"
      wrapperClassName="transfer-workspace-spin"
    >
      <style dangerouslySetInnerHTML={{ __html: workspaceLayoutStyles }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          background: token.colorBgContainer,
          borderRadius: 12,
          boxShadow: token.boxShadowTertiary,
          overflow: "hidden",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: dndTreeGlobalStyles }} />
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          autoScroll={false}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <Row
            style={{
              flex: 1,
              height: "100%",
              minHeight: 0,
              overflow: "hidden",
            }}
            gutter={0}
          >
            <Col
              span={12}
              style={{
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: `1px solid ${token.colorSplit}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>已选源分类</div>
                <div
                  style={{
                    fontSize: 12,
                    color: token.colorTextDescription,
                    marginTop: 4,
                  }}
                >
                  基于专用子树接口加载完整源分类结构
                </div>
              </div>
              <div className="transfer-workspace-pane">
                {displaySourceData.length > 0 ? (
                  <DraggableSourceTree
                    treeData={displaySourceData}
                    expandedKeys={sourceExpandedKeys}
                    onExpand={setSourceExpandedKeys}
                    onMovedNodeHover={setHoveredMovedSourceKey}
                  />
                ) : (
                  <div
                    style={{
                      color: token.colorTextDisabled,
                      textAlign: "center",
                      marginTop: 40,
                    }}
                  >
                    (暂无源分类数据)
                  </div>
                )}
              </div>
            </Col>

            <Col
              span={12}
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: `1px solid ${token.colorSplit}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>目标位置</div>
                <div
                  style={{
                    fontSize: 12,
                    color: token.colorTextDescription,
                    marginTop: 4,
                  }}
                >
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
                  rootPendingCount={
                    pendingOperations.filter(
                      (operation) => operation.targetKey == null,
                    ).length
                  }
                  hoveredTargetKey={liveHoveredTargetKey}
                  rootDropTargetKey={ROOT_DROP_TARGET_KEY}
                  rootDropTargetTitle={ROOT_DROP_TARGET_TITLE}
                  rootDropDisabled={rootDropDisabled}
                  scrollViewportRef={targetScrollViewportRef}
                  rootDropTargetRef={rootDropTargetRef}
                  highlightedPreviewKey={hoveredMovedSourceKey}
                />
              </div>
            </Col>
          </Row>

          {isClientMounted
            ? createPortal(
                <DragOverlay
                  zIndex={DRAG_OVERLAY_Z_INDEX}
                  dropAnimation={
                    shouldAnimateDragOverlayDropBack
                      ? DEFAULT_DRAG_OVERLAY_DROP_ANIMATION
                      : null
                  }
                >
                  {activeDragNode ? (
                    <div style={getTransferNodeOverlayShellStyle(token)}>
                      <div style={getTransferNodeOverlayCardStyle(token)}>
                        <div style={getTransferNodeOverlayActionStyle(token)}>
                          {overlayActionLabel}
                        </div>
                        <div style={getTransferNodeOverlayIconStyle(token)}>
                          <FolderOutlined style={{ fontSize: 12 }} />
                        </div>
                        <div style={getTransferNodeOverlayTitleStyle(token)}>
                          {activeDragNode.title}
                        </div>
                        <div
                          style={getTransferNodeOverlayConnectorStyle(token)}
                        >
                          至
                        </div>
                        <div style={getTransferNodeOverlayTargetStyle(token)}>
                          {hoveredTargetTitle}
                        </div>
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
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          currentStep={workspaceHistoryIndex}
          totalSteps={workspaceHistory.length - 1}
          loading={spinning}
        />
      </div>
    </Spin>
  );
}
