'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Row, Col, theme, Spin, message } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  pointerWithin
} from '@dnd-kit/core';
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

// 临时 Types，后续替换为 src/models/ 下的真实接口
export interface TransferTreeNode {
  key: string;
  title: string;
  isLeaf?: boolean;
  children?: TransferTreeNode[];
  isContextOnly?: boolean;  // 用于左侧树：指示只是补全上下文的父节点
  isVirtual?: boolean;      // 用于右侧树：指示这是插入的“虚位待命”节点
}

// ================= Mock 数据生成 =================
const getMockSourceData = (): TransferTreeNode[] => ([
  {
    key: 'SRC_A',
    title: 'A大类 (上下文)',
    isContextOnly: true,
    children: [
      {
        key: 'SRC_A01',
        title: 'A01 分类 (已勾选)',
        isContextOnly: false,
        children: [
          { key: 'SRC_A01-1', title: 'A01-1 子类', isContextOnly: false }
        ]
      },
      {
        key: 'SRC_A02',
        title: 'A02 分类 (已勾选)',
        isContextOnly: false,
      }
    ]
  }
]);

const getMockTargetData = (): TransferTreeNode[] => ([
  {
    key: 'TGT_B',
    title: 'B大类',
    children: [
      {
        key: 'TGT_B01',
        title: 'B01 分类',
        children: [
          { key: 'TGT_B01-1', title: 'B01-1 现有子类' }
        ]
      }
    ]
  },
  {
    key: 'TGT_C',
    title: 'C大类',
    children: []
  }
]);

// Helper: 递归移除虚位待命节点
const removeVirtualNode = (data: TransferTreeNode[]): TransferTreeNode[] => {
  return data.filter(node => !node.isVirtual).map(node => {
    if (node.children) return { ...node, children: removeVirtualNode(node.children) };
    return node;
  });
};

export interface TransferWorkspaceProps {
  initialAction?: 'move' | 'copy';
  sourceNodesData?: TransferTreeNode[];
  onComplete?: () => void;
  onCancelWorkspace?: () => void;
}

export default function TransferWorkspace({
  initialAction,
  sourceNodesData,
  onComplete,
  onCancelWorkspace
}: TransferWorkspaceProps) {
  const { token } = theme.useToken();
  
  // ================= 状态管理 =================
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'move' | 'copy' | null>(null);

  // activeDragNode: 当前正在按住拖拽的实时节点信息
  const [activeDragNode, setActiveDragNode] = useState<any>(null); 
  const overlayActionLabel = useMemo(() => {
    const action = pendingAction || initialAction || 'move';
    return action === 'copy' ? '复制' : '移动';
  }, [initialAction, pendingAction]);
  
  // pendingOperations: 暂存的历次拖拽动作数组（支持多节一起批处理）
  interface PendingOperation {
    sourceNode: TransferTreeNode;
    targetKey: React.Key;
    id: string; // 每一次临时拖拽的唯一标记
  }
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  
  const [hoveredTargetKey, setHoveredTargetKey] = useState<React.Key | null>(null);
  const [hoveredTargetTitle, setHoveredTargetTitle] = useState<string>('目标分类');
  
  const [sourceData, setSourceData] = useState<TransferTreeNode[]>([]);
  const [targetData, setTargetData] = useState<TransferTreeNode[]>([]);

  // 展开状态
  const [sourceExpandedKeys, setSourceExpandedKeys] = useState<React.Key[]>(['SRC_A']);
  const [targetExpandedKeys, setTargetExpandedKeys] = useState<React.Key[]>(['TGT_B']);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // 初始化加载数据
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      // 如果外层传入了真实勾选的节点数据，则将其置入，否则回退到 mock 数据以便页面独立预览
      if (sourceNodesData && sourceNodesData.length > 0) {
        setSourceData(sourceNodesData);
        // 默认将外层传来的数据的根节点展开 (简单起见展开第一层)
        setSourceExpandedKeys(sourceNodesData.map(n => n.key));
      } else {
        setSourceData(getMockSourceData());
      }
      setTargetData(getMockTargetData());
      setLoading(false);
    }, 500);
  }, [sourceNodesData]);

  // 动态计算：右侧被禁用的目标节点（防止父挂子以及自身）
  const disabledKeys = useMemo(() => {
    if (!activeDragNode) return [];
    
    // 提取拖拽源的所有相关自节点和子孙节点的 keys，防止逻辑死循环挂载到自己深层链路中
    const getKeys = (node: any): React.Key[] => {
      const keys = [node.key];
      if (node.children) {
        node.children.forEach((child: any) => keys.push(...getKeys(child)));
      }
      return keys;
    };
    
    return getKeys(activeDragNode);
  }, [activeDragNode]);

  // ================= 核心操作钩子 (dnd-kit) =================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 移动超过 5px 才判定为拖拽，防止单击误触
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const nodeData = active.data.current;
    if (!nodeData) return;

    setHoveredTargetKey(null);
    setHoveredTargetTitle('目标分类');
    setActiveDragNode(nodeData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && over.data.current) {
      const overKey = over.data.current.key;
      if (!disabledKeys.includes(overKey)) {
        setHoveredTargetKey(overKey);
        setHoveredTargetTitle(String(over.data.current.title || '目标分类'));
      } else {
        setHoveredTargetKey(null);
        setHoveredTargetTitle('目标分类');
      }
    } else {
      setHoveredTargetKey(null);
      setHoveredTargetTitle('目标分类');
    }
  };

  // 稳定且优雅的自动展开 (Debounced Auto-expand) -> 防抖 400ms
  useEffect(() => {
    if (hoveredTargetKey && !disabledKeys.includes(hoveredTargetKey)) {
      const timer = setTimeout(() => {
        setTargetExpandedKeys(prev => Array.from(new Set([...prev, hoveredTargetKey])));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [hoveredTargetKey, disabledKeys]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    setHoveredTargetKey(null);
    setHoveredTargetTitle('目标分类');

    const draggedNode = activeDragNode;
    setActiveDragNode(null);

    if (!over || !over.data.current || !draggedNode) {
      return;
    }

    const dropKey = over.data.current.key;
    if (disabledKeys.includes(dropKey)) {
      return;
    }

    // 将刚才成功的拖拽作为一条记录放入待处理队列中
    setPendingOperations(prev => [
      ...prev,
      {
        sourceNode: draggedNode,
        targetKey: dropKey,
        id: `OP_${Date.now()}_${draggedNode.key}`
      }
    ]);
    
    // 强制展开目标节点以便用户看到即时的挂载结果
    setTargetExpandedKeys(prev => Array.from(new Set([...prev, dropKey])));
    
    // 如果还没设定意向，默认设定为 initialAction 或者 move
    if (!pendingAction) {
      setPendingAction(initialAction || 'move');
    }
  };

  // 确认操作
  const handleConfirm = async (actionType: 'move' | 'copy') => {
    if (pendingOperations.length === 0) return;
    
    setLoading(true);
    try {
      console.log(`执行批处理: ${actionType}, 共 ${pendingOperations.length} 个节点操作`);
      // 此处将发送真实请求，携带 pendingOperations
      
      await new Promise((resolve) => setTimeout(resolve, 800));
      message.success(`成功${actionType === 'move' ? '移动' : '复制'}了 ${pendingOperations.length} 个节点！`);
      
      // 1. 将真实的拖拽节点深拷贝并统一合并到右边的目标树中
      const buildRealNode = (node: TransferTreeNode, idx: number): TransferTreeNode => ({
        ...node,
        key: `NODE_${Date.now()}_${idx}_${node.key}`, // 模拟生成的新ID
        isVirtual: false,
        isContextOnly: false,
        children: node.children ? node.children.map(child => buildRealNode(child, idx)) : undefined
      });
      
      let updatedData = [...targetData];
      
      const insertMultipleNodes = (data: TransferTreeNode[], op: PendingOperation, idx: number): TransferTreeNode[] => {
        const realNode = buildRealNode(op.sourceNode, idx);
        return data.map(item => {
          if (item.key === op.targetKey) {
            return {
              ...item,
              children: [...(item.children || []), realNode]
            };
          }
          if (item.children) {
            return { ...item, children: insertMultipleNodes(item.children, op, idx) };
          }
          return item;
        });
      };
      
      pendingOperations.forEach((op, index) => {
        updatedData = insertMultipleNodes(updatedData, op, index);
      });
      
      setTargetData(updatedData);

      // 2. 如果是移动操作，从左侧源树中永久移除所有被移动的节点
      if (actionType === 'move') {
        const removeSourceNodes = (data: TransferTreeNode[], keysToRemove: React.Key[]): TransferTreeNode[] => {
          return data
            .filter(item => !keysToRemove.includes(item.key))
            .map(item => ({
              ...item,
              children: item.children ? removeSourceNodes(item.children, keysToRemove) : undefined
            }));
        };
        const keysToRemove = pendingOperations.map(op => op.sourceNode.key);
        setSourceData(prev => removeSourceNodes(prev, keysToRemove));
      }
      
      setPendingOperations([]);
      setPendingAction(null);
      
      onComplete?.();
    } catch (error) {
      message.error('操作失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  // 取消选定
  const handleCancel = () => {
    setPendingAction(null);
    setPendingOperations([]);
  };


  // 监听 Esc 键触发取消
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 计算左侧用于展示的树数据（如果处于“移动”且已拖放到右侧预览，则在左侧临时隐藏该节点避免视觉重复）
  const displaySourceData = useMemo(() => {
    if (pendingAction === 'move' && pendingOperations.length > 0) {
      const keysToHide = pendingOperations.map(op => op.sourceNode.key);
      const hideNodes = (data: TransferTreeNode[]): TransferTreeNode[] => {
        return data
          .filter(item => !keysToHide.includes(item.key))
          .map(item => ({
            ...item,
            children: item.children ? hideNodes(item.children) : undefined
          }));
      };
      return hideNodes(sourceData);
    }
    return sourceData;
  }, [sourceData, pendingAction, pendingOperations]);

  // 计算右侧用于展示的树数据（将所有挂起的记录插装成虚拟节点进行预览）
  const displayTargetData = useMemo(() => {
    let currentData = [...targetData];

    pendingOperations.forEach(op => {
      const createVirtualNodes = (node: TransferTreeNode, isRoot: boolean): TransferTreeNode => {
        return {
          ...node,
          key: isRoot ? `VIRTUAL_PENDING_${op.id}` : `VIRTUAL_PENDING_${op.id}_${node.key}`,
          title: isRoot ? `${node.title} (预览)` : node.title,
          isVirtual: true,
          children: node.children ? node.children.map(child => createVirtualNodes(child, false)) : undefined
        };
      };
      const virtualNode = createVirtualNodes(op.sourceNode, true);

      const insertNode = (data: TransferTreeNode[], targetKey: React.Key): TransferTreeNode[] => {
        return data.map(item => {
          if (item.key === targetKey) {
            return {
              ...item,
              children: [...(item.children || []), virtualNode]
            };
          }
          if (item.children) {
            return { ...item, children: insertNode(item.children, targetKey) };
          }
          return item;
        });
      };
      currentData = insertNode(currentData, op.targetKey);
    });

    return currentData;
  }, [targetData, pendingOperations]);

  return (
    <Spin spinning={loading} tip="正在处理中，请稍候..." size="large">
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          minHeight: '600px',
          background: token.colorBgContainer,
          borderRadius: 12,
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: dndTreeGlobalStyles }} />
        {/* 上半部：双树拖拽区 */}
        <DndContext 
          sensors={sensors} 
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart} 
          onDragOver={handleDragOver} 
          onDragEnd={handleDragEnd}
        >
          <Row style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} gutter={0}>
            {/* 左侧源树区 */}
            <Col 
              span={12} 
              style={{ 
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${token.colorSplit}` }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>已选源分类</div>
                <div style={{ fontSize: 12, color: token.colorTextDescription, marginTop: 4 }}>
                  透传展示已选层级，仅高亮节点可拖拽
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
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

            {/* 右侧目标树区 */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${token.colorSplit}` }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>目标位置 (接收方)</div>
                <div style={{ fontSize: 12, color: token.colorTextDescription, marginTop: 4 }}>
                  支持搜索定位，悬停节点自动展开
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                {displayTargetData.length > 0 ? (
                  <DropTargetTree
                    treeData={displayTargetData}
                    expandedKeys={targetExpandedKeys}
                    onExpand={setTargetExpandedKeys}
                    disabledKeys={disabledKeys}
                    pendingDropKeys={pendingOperations.map(op => op.targetKey)}
                    hoveredTargetKey={hoveredTargetKey}
                  />
                ) : (
                  <div style={{ color: token.colorTextDisabled, textAlign: 'center', marginTop: 40 }}>
                    (无目标树数据)
                  </div>
                )}
              </div>
            </Col>
          </Row>
          
          {/* Drag Overlay 用于在整个页面上方浮动展示拖拽的节点快照 */}
          {isClientMounted
            ? createPortal(
                <DragOverlay 
                  zIndex={DRAG_OVERLAY_Z_INDEX}
                  dropAnimation={{ 
                    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) 
                  }}
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
                        <div style={getTransferNodeOverlayConnectorStyle(token)}>
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

        {/* 底部：操作意图栏 */}
        <ActionFooter 
          pendingAction={pendingAction} 
          onConfirm={handleConfirm} 
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </Spin>
  );
}
