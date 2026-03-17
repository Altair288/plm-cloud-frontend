import React from 'react';
import { Tree, Input, theme } from 'antd';
import type { TreeDataNode } from 'antd';
import { SearchOutlined, FolderOutlined, FolderOpenOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/core';
import type { TransferTreeNode } from './TransferWorkspace';
import { colorToRgba } from './transferNodeStyles';

const { Search } = Input;

interface DropTargetTreeProps {
  treeData: TransferTreeNode[];
  expandedKeys: React.Key[];
  onExpand: (keys: React.Key[]) => void;
  loadData?: (node: TransferTreeNode) => Promise<void>;
  disabledKeys: React.Key[]; 
  pendingDropKeys?: React.Key[];
  hoveredTargetKey?: React.Key | null; // 从外部透传的悬停状态，用于绘制呼吸灯
  rootDropTargetKey: React.Key;
  rootDropTargetTitle: string;
  rootPendingCount?: number;
  rootDropDisabled?: boolean;
  scrollViewportRef?: React.RefObject<HTMLDivElement | null>;
  rootDropTargetRef?: React.RefObject<HTMLDivElement | null>;
}

const RootDropTarget = ({
  dropKey,
  title,
  token,
  isHoveringByDnd,
  disabled = false,
  rootDropTargetRef,
}: {
  dropKey: React.Key;
  title: string;
  token: any;
  isHoveringByDnd: boolean;
  disabled?: boolean;
  rootDropTargetRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  const rootDropNode: TransferTreeNode = {
    key: String(dropKey),
    title,
    isLeaf: false,
  };

  const { setNodeRef, isOver } = useDroppable({
    id: `tgt-${String(dropKey)}`,
    data: rootDropNode,
    disabled,
  });

  const active = !disabled && (isOver || isHoveringByDnd);

  return (
    <div
      ref={(element) => {
        setNodeRef(element);
        if (rootDropTargetRef) {
          rootDropTargetRef.current = element;
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '12px 16px',
        marginBottom: 12,
        borderRadius: 8,
        border: `1px dashed ${disabled ? token.colorBorderSecondary : active ? token.colorPrimary : token.colorBorder}`,
        background: disabled
          ? colorToRgba(token.colorBgContainer, 0.62)
          : active
            ? colorToRgba(token.colorPrimaryBg, 0.82)
            : colorToRgba(token.colorBgElevated, 0.72),
        backdropFilter: 'blur(6px) saturate(140%)',
        WebkitBackdropFilter: 'blur(6px) saturate(140%)',
        boxShadow: active ? token.boxShadowSecondary : token.boxShadowTertiary,
        color: disabled ? token.colorTextDisabled : token.colorText,
        transition: 'all 0.2s ease',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        textAlign: 'center',
      }}
    >
      <ApartmentOutlined style={{ color: disabled ? token.colorTextDisabled : active ? token.colorPrimary : token.colorTextSecondary }} />
      <span style={{ fontWeight: 500 }}>{title}</span>
      <span style={{ fontSize: 12, color: disabled ? token.colorTextDisabled : token.colorTextDescription }}>
        {disabled ? '当前源节点已是根分类，不能再次拖拽为根分类' : '拖到这里可提升为根分类'}
      </span>
    </div>
  );
};

const TargetNodeTitle = ({ nodeData, token, disabledKeys, pendingDropKeys = [], isHoveringByDnd }: any) => {
  const isDisabled = disabledKeys.includes(nodeData.key);
  const isPendingTarget = pendingDropKeys.includes(nodeData.key);
  const isPendingPlacement = Boolean(nodeData.isPendingPlacement);
  const isPreviewRoot = Boolean(nodeData.isPreviewRoot);

  const { setNodeRef, isOver } = useDroppable({
    id: `tgt-${nodeData.key}`,
    data: nodeData,
    disabled: isDisabled || isPendingPlacement
  });

  return (
    <span
      ref={setNodeRef}
      style={{
        transition: 'all 0.3s ease',
        backgroundColor: isPendingPlacement
          ? token.colorPrimaryBg
          : (isOver || isHoveringByDnd) && !isDisabled
            ? token.colorPrimaryBgHover
            : 'transparent',
        color: isDisabled ? token.colorTextDisabled : token.colorText,
        padding: '4px 8px',
        borderRadius: 4,
        border: isPendingPlacement || isPendingTarget ? `1px dashed ${token.colorPrimary}` : '1px solid transparent',
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
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nodeData.title}</span>
      {isPreviewRoot && (
        <span
          style={{
            marginLeft: 8,
            fontSize: 12,
            color: token.colorInfo,
            background: token.colorInfoBg,
            border: `1px solid ${token.colorInfoBorder}`,
            borderRadius: 999,
            padding: '1px 6px',
            lineHeight: '18px',
            flexShrink: 0,
          }}
        >
          预览
        </span>
      )}
      {(isPendingPlacement || isPendingTarget) && (
        <span
          style={{
            marginLeft: 8,
            fontSize: 12,
            color: token.colorPrimary,
            background: token.colorPrimaryBg,
            border: `1px solid ${token.colorPrimaryBorder}`,
            borderRadius: 999,
            padding: '1px 6px',
            lineHeight: '18px',
            flexShrink: 0,
          }}
        >
          待确认位置
        </span>
      )}
    </span>
  );
};

export default function DropTargetTree({
  treeData,
  expandedKeys,
  onExpand,
  loadData,
  disabledKeys,
  pendingDropKeys = [],
  hoveredTargetKey,
  rootDropTargetKey,
  rootDropTargetTitle,
  rootPendingCount = 0,
  rootDropDisabled = false,
  scrollViewportRef,
  rootDropTargetRef,
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Search 
        placeholder="搜索目标分类..." 
        allowClear 
        prefix={<SearchOutlined />} 
        style={{ marginBottom: 16 }}
      />
      <div ref={scrollViewportRef} style={{ flex: '1 1 0', height: 0, minHeight: 0, overflow: 'auto' }}>
        <RootDropTarget
          dropKey={rootDropTargetKey}
          title={rootDropTargetTitle}
          token={token}
          isHoveringByDnd={!rootDropDisabled && hoveredTargetKey === rootDropTargetKey}
          disabled={rootDropDisabled}
          rootDropTargetRef={rootDropTargetRef}
        />
        <Tree
          className="drop-target-tree dnd-transfer-tree"
          treeData={treeData as TreeDataNode[]}
          expandedKeys={expandedKeys}
          onExpand={onExpand}
          loadData={loadData ? (node) => loadData(node as unknown as TransferTreeNode) : undefined}
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
