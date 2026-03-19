import React, { useEffect, useMemo, useState } from 'react';
import { App } from 'antd';
import type { DataNode } from 'antd/es/tree';
import DraggableModal from '@/components/DraggableModal';
import {
  metaCategoryApi,
  type MetaCategoryBatchTransferResponseDto,
  type MetaCategoryBatchTransferTopologyResponseDto,
} from '@/services/metaCategory';
import type { MetaCategoryTreeNodeDto } from '@/models/metaCategory';
import TransferWorkspace, { type TransferTreeNode } from '../batch-transfer/components/TransferWorkspace';

interface BatchTransferModalProps {
  open: boolean;
  actionType: 'copy' | 'move' | null;
  checkedKeys: React.Key[];
  fullTreeData: DataNode[];
  onCancel: () => void;
  onSuccess?: (response: MetaCategoryBatchTransferResponseDto | MetaCategoryBatchTransferTopologyResponseDto) => void;
}

const formatNodeTitle = (code?: string | null, name?: string | null, fallback?: string) => {
  if (code && name) {
    return `${code} - ${name}`;
  }
  return fallback || name || code || '-';
};

const getNodeDataRef = (node: DataNode) => {
  return (node as any)?.dataRef as
    | {
        id?: string;
        businessDomain?: string;
        code?: string;
        name?: string;
        hasChildren?: boolean;
        leaf?: boolean;
        status?: string;
        level?: number;
        parentId?: string | null;
        path?: string | null;
      }
    | undefined;
};

const toFallbackTransferNode = (node: DataNode): TransferTreeNode => {
  const dataRef = getNodeDataRef(node);
  const rawTitle = typeof node.title === 'string' ? node.title : String(node.title || node.key);
  return {
    key: String(dataRef?.id || node.key),
    title: formatNodeTitle(dataRef?.code, dataRef?.name, rawTitle),
    isLeaf: Boolean(node.isLeaf),
    isContextOnly: false,
    dataRef: dataRef
      ? {
          id: String(dataRef.id || node.key),
          businessDomain: dataRef.businessDomain || '',
          code: dataRef.code || '',
          name: dataRef.name || rawTitle,
          hasChildren: Boolean(dataRef.hasChildren ?? !node.isLeaf),
          leaf: dataRef.leaf ?? Boolean(node.isLeaf),
          status: dataRef.status,
          level: dataRef.level,
          parentId: dataRef.parentId,
          path: dataRef.path,
        }
      : undefined,
    children: node.children ? node.children.map(toFallbackTransferNode) : undefined,
  };
};

const mapSubtreeNodeToTransferNode = (node: MetaCategoryTreeNodeDto): TransferTreeNode => ({
  key: node.id,
  title: formatNodeTitle(node.code, node.name, node.name),
  isLeaf: node.leaf ?? !node.hasChildren,
  isContextOnly: false,
  dataRef: {
    id: node.id,
    businessDomain: node.businessDomain,
    code: node.code,
    name: node.name,
    hasChildren: node.hasChildren,
    leaf: node.leaf,
    status: node.status,
    level: node.level,
    parentId: node.parentId,
    path: node.path,
  },
  children: node.children?.map(mapSubtreeNodeToTransferNode),
});

const collectSelectedRootNodes = (
  nodes: DataNode[],
  checkedKeySet: Set<string>,
  ancestorSelected = false,
): DataNode[] => {
  const result: DataNode[] = [];

  nodes.forEach((node) => {
    const nodeKey = String(node.key);
    const isSelected = checkedKeySet.has(nodeKey);

    if (isSelected && !ancestorSelected) {
      result.push(node);
      return;
    }

    if (node.children?.length) {
      result.push(...collectSelectedRootNodes(node.children, checkedKeySet, ancestorSelected || isSelected));
    }
  });

  return result;
};

const buildContextTree = (
  nodes: DataNode[],
  checkedKeySet: Set<string>,
  subtreeMap: Map<string, TransferTreeNode>,
): TransferTreeNode[] => {
  const result: TransferTreeNode[] = [];

  nodes.forEach((node) => {
    const nodeKey = String(node.key);
    const isSelected = checkedKeySet.has(nodeKey);

    if (isSelected) {
      result.push(subtreeMap.get(nodeKey) || toFallbackTransferNode(node));
      return;
    }

    if (node.children?.length) {
      const childrenContext = buildContextTree(node.children, checkedKeySet, subtreeMap);
      if (childrenContext.length > 0) {
        const dataRef = getNodeDataRef(node);
        const rawTitle = typeof node.title === 'string' ? node.title : String(node.title || node.key);
        result.push({
          key: String(dataRef?.id || node.key),
          title: formatNodeTitle(dataRef?.code, dataRef?.name, rawTitle),
          isLeaf: Boolean(node.isLeaf),
          isContextOnly: true,
          dataRef: dataRef
            ? {
                id: String(dataRef.id || node.key),
                businessDomain: dataRef.businessDomain || '',
                code: dataRef.code || '',
                name: dataRef.name || rawTitle,
                hasChildren: Boolean(dataRef.hasChildren ?? !node.isLeaf),
                leaf: dataRef.leaf ?? Boolean(node.isLeaf),
                status: dataRef.status,
                level: dataRef.level,
                parentId: dataRef.parentId,
                path: dataRef.path,
              }
            : undefined,
          children: childrenContext,
        });
      }
    }
  });

  return result;
};

const normalizeSubtreeRootNode = (data: MetaCategoryTreeNodeDto | MetaCategoryTreeNodeDto[] | null | undefined) => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data || undefined;
};

export default function BatchTransferModal({
  open,
  actionType,
  checkedKeys,
  fullTreeData,
  onCancel,
  onSuccess
}: BatchTransferModalProps) {
  const { message } = App.useApp();
  const checkedKeySet = useMemo(
    () => new Set(checkedKeys.map((key) => String(key))),
    [checkedKeys],
  );
  const selectedRootNodes = useMemo(
    () => collectSelectedRootNodes(fullTreeData, checkedKeySet),
    [fullTreeData, checkedKeySet],
  );
  const businessDomain = useMemo(() => {
    return (
      selectedRootNodes
        .map((node) => getNodeDataRef(node)?.businessDomain)
        .find((value): value is string => Boolean(value)) || 'MATERIAL'
    );
  }, [selectedRootNodes]);
  const [sourceNodesData, setSourceNodesData] = useState<TransferTreeNode[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSourceNodesData([]);
      setSourceLoading(false);
      return;
    }

    if (!selectedRootNodes.length) {
      setSourceNodesData([]);
      return;
    }

    let cancelled = false;

    const loadSelectedSubtrees = async () => {
      setSourceLoading(true);
      try {
        const responses = await Promise.all(
          selectedRootNodes.map((node) =>
            metaCategoryApi.getCategorySubtree({
              parentId: String(node.key),
              includeRoot: true,
              maxDepth: -1,
              status: 'ALL',
              mode: 'TREE',
              nodeLimit: 2000,
            }),
          ),
        );

        if (cancelled) {
          return;
        }

        const subtreeMap = new Map<string, TransferTreeNode>();
        responses.forEach((response, index) => {
          const sourceNode = selectedRootNodes[index];
          const rootNode = normalizeSubtreeRootNode(response?.data);
          subtreeMap.set(
            String(sourceNode.key),
            rootNode ? mapSubtreeNodeToTransferNode(rootNode) : toFallbackTransferNode(sourceNode),
          );
        });

        setSourceNodesData(buildContextTree(fullTreeData, checkedKeySet, subtreeMap));
      } catch (error: any) {
        if (!cancelled) {
          message.error(error?.message || error?.error || '加载源分类子树失败');
          setSourceNodesData(buildContextTree(fullTreeData, checkedKeySet, new Map()));
        }
      } finally {
        if (!cancelled) {
          setSourceLoading(false);
        }
      }
    };

    void loadSelectedSubtrees();

    return () => {
      cancelled = true;
    };
  }, [open, fullTreeData, checkedKeySet, selectedRootNodes, message]);

  return (
    <DraggableModal
      open={open}
      title={actionType === 'copy' ? '分类批量复制' : '分类批量移动'}
      onCancel={onCancel}
      footer={null}
      width="80%"
      destroyOnHidden
      styles={{ 
        body: {
          padding: 0,
          height: 'min(80vh, calc(100vh - 160px))',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <TransferWorkspace 
          businessDomain={businessDomain}
          initialAction={actionType || undefined}
          sourceNodesData={sourceNodesData}
          externalLoading={sourceLoading}
          onCancelWorkspace={onCancel}
          onComplete={(response) => {
            if (response) {
              onSuccess?.(response);
            }
            onCancel();
          }}
        />
      </div>
    </DraggableModal>
  );
}
