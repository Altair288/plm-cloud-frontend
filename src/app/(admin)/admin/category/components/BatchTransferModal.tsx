import React, { useMemo } from 'react';
import type { DataNode } from 'antd/es/tree';
import DraggableModal from '@/components/DraggableModal';
import TransferWorkspace, { type TransferTreeNode } from '../batch-transfer/components/TransferWorkspace';

interface BatchTransferModalProps {
  open: boolean;
  actionType: 'copy' | 'move' | null;
  checkedKeys: React.Key[];
  fullTreeData: DataNode[];
  onCancel: () => void;
  onSuccess?: () => void;
}

// 辅助函数：将实际勾选的节点补全带出其非勾选但用作上下文结构的父级链路
const buildSubTree = (node: DataNode): TransferTreeNode => ({
  key: String(node.key),
  title: typeof node.title === 'string' ? node.title : String(node.title || node.key),
  isLeaf: node.isLeaf,
  isContextOnly: false, // 实体选中的节点
  children: node.children ? node.children.map(buildSubTree) : undefined,
});

const buildContextTree = (nodes: DataNode[], checkedKeys: React.Key[]): TransferTreeNode[] => {
  const result: TransferTreeNode[] = [];
  
  for (const node of nodes) {
    const isSelected = checkedKeys.includes(node.key);
    
    if (isSelected) {
      // 如果当前节点被选中，那么它连同其所有子节点将作为一个完整的实体结构透传
      result.push(buildSubTree(node));
    } else if (node.children) {
      // 否则，去探查它的子节点中有没有被选中的
      const childrenContext = buildContextTree(node.children, checkedKeys);
      if (childrenContext.length > 0) {
        result.push({
          key: String(node.key),
          title: typeof node.title === 'string' ? node.title : String(node.title || node.key),
          isLeaf: node.isLeaf,
          isContextOnly: true, // 仅作为上下层级结构，置为只读
          children: childrenContext,
        });
      }
    }
  }
  return result;
};

export default function BatchTransferModal({
  open,
  actionType,
  checkedKeys,
  fullTreeData,
  onCancel,
  onSuccess
}: BatchTransferModalProps) {
  
  const transformedSourceNodes = useMemo(() => {
    return buildContextTree(fullTreeData, checkedKeys);
  }, [fullTreeData, checkedKeys]);

  return (
    <DraggableModal
      open={open}
      title={actionType === 'copy' ? '分类批量复制' : '分类批量移动'}
      onCancel={onCancel}
      footer={null}
      width="80%"
      destroyOnHidden
      styles={{ 
        body: { padding: 0 } // 因为 TransferWorkspace 自带了内边距与外壳
      }}
    >
      <div style={{ height: '80vh', minHeight: 600 }}>
        <TransferWorkspace 
          initialAction={actionType || undefined}
          sourceNodesData={transformedSourceNodes}
          onCancelWorkspace={onCancel}
          onComplete={() => {
            onSuccess?.();
            onCancel();
          }}
        />
      </div>
    </DraggableModal>
  );
}
