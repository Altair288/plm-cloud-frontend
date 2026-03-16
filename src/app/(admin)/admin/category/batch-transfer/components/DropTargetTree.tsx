import React from 'react';
import { Tree, Input, theme } from 'antd';
import type { TreeDataNode } from 'antd';
import { SearchOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/core';
import type { TransferTreeNode } from './TransferWorkspace';

const { Search } = Input;

interface DropTargetTreeProps {
  treeData: TransferTreeNode[];
  expandedKeys: React.Key[];
  onExpand: (keys: React.Key[]) => void;
  disabledKeys: React.Key[]; 
  pendingDropKeys?: React.Key[];
  hoveredTargetKey?: React.Key | null; // 从外部透传的悬停状态，用于绘制呼吸灯
}

const TargetNodeTitle = ({ nodeData, token, disabledKeys, pendingDropKeys = [], isHoveringByDnd }: any) => {
  const isDisabled = disabledKeys.includes(nodeData.key);
  const isPendingTarget = pendingDropKeys.includes(nodeData.key);

  const { setNodeRef, isOver } = useDroppable({
    id: `tgt-${nodeData.key}`,
    data: nodeData,
    disabled: isDisabled
  });

  return (
    <span
      ref={setNodeRef}
      style={{
        transition: 'all 0.3s ease',
        backgroundColor: (isOver || isHoveringByDnd) && !isDisabled ? token.colorPrimaryBgHover : 'transparent',
        color: isDisabled ? token.colorTextDisabled : token.colorText,
        padding: '4px 8px',
        borderRadius: 4,
        border: isPendingTarget ? `1px dashed ${token.colorPrimary}` : '1px solid transparent',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        flex: 1,
        minHeight: 24,
        minWidth: 0,
        lineHeight: 1,
        verticalAlign: 'middle',
        boxSizing: 'border-box'
      }}
    >
      {nodeData.title}
      {isPendingTarget && <span style={{ marginLeft: 8, fontSize: 12, color: token.colorPrimary }}>[待确认位置]</span>}
    </span>
  );
};

export default function DropTargetTree({
  treeData,
  expandedKeys,
  onExpand,
  disabledKeys,
  pendingDropKeys = [],
  hoveredTargetKey
}: DropTargetTreeProps) {
  const { token } = theme.useToken();

  const titleRender = (nodeData: any) => {
    return (
      <TargetNodeTitle 
        nodeData={nodeData} 
        token={token} 
        disabledKeys={disabledKeys}
        pendingDropKeys={pendingDropKeys}
        isHoveringByDnd={nodeData.key === hoveredTargetKey}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Search 
        placeholder="搜索目标分类..." 
        allowClear 
        prefix={<SearchOutlined />} 
        style={{ marginBottom: 16 }}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Tree
          className="drop-target-tree dnd-transfer-tree"
          treeData={treeData as TreeDataNode[]}
          expandedKeys={expandedKeys}
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
