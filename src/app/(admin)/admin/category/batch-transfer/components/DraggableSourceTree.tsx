import React from 'react';
import { Tree, theme } from 'antd';
import type { TreeDataNode } from 'antd';
import { FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import type { TransferTreeNode } from './TransferWorkspace';
import { getTransferNodeLabelStyle } from './transferNodeStyles';

interface DraggableSourceTreeProps {
  treeData: TransferTreeNode[];
  expandedKeys: React.Key[];
  onExpand: (expandedKeys: React.Key[]) => void;
}

// 封装自定义的可拖拽节点 Title
const SourceNodeTitle = ({ nodeData, token }: { nodeData: any, token: any }) => {
  const { isContextOnly } = nodeData;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `src-${nodeData.key}`,
    data: nodeData,
    disabled: isContextOnly
  });

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={getTransferNodeLabelStyle(token, {
        disabled: isContextOnly,
        dragging: isDragging,
      })}
    >
      {nodeData.title}
    </span>
  );
};

export default function DraggableSourceTree({
  treeData,
  expandedKeys,
  onExpand
}: DraggableSourceTreeProps) {
  const { token } = theme.useToken();

  const titleRender = (nodeData: any) => {
    return <SourceNodeTitle nodeData={nodeData} token={token} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'auto' }}>
        <Tree
          className="draggable-source-tree dnd-transfer-tree"
          treeData={treeData as TreeDataNode[]}
          expandedKeys={expandedKeys}
          autoExpandParent
          onExpand={onExpand}
          titleRender={titleRender}
          showIcon
          icon={(nodeProps: any) => 
            nodeProps.expanded ? <FolderOpenOutlined /> : <FolderOutlined />
          }
          blockNode
          selectable={false}
        />
      </div>
    </div>
  );
}
