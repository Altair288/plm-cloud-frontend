import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input, Tree, Empty, Dropdown, MenuProps, message } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SettingOutlined 
} from '@ant-design/icons';

const { Search } = Input;

export interface CategoryTreeProps {
  onSelect: TreeProps['onSelect'];
  treeData: DataNode[];
  loadData?: TreeProps['loadData'];
  loadedKeys?: React.Key[];
  onLoad?: TreeProps['onLoad'];
  initialExpandedKeys?: React.Key[];
  defaultSelectedKeys?: React.Key[];
  searchPlaceholder?: string;
  enableContextMenu?: boolean;
}

const CategoryTree: React.FC<CategoryTreeProps> = ({
  onSelect,
  treeData,
  loadData,
  loadedKeys,
  onLoad,
  initialExpandedKeys = [],
  defaultSelectedKeys = [],
  searchPlaceholder = '搜索分类',
  enableContextMenu = true,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(initialExpandedKeys);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enableContextMenu) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enableContextMenu]);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newExpandedKeys = treeData
      .map((item) => {
        if (String(item.title).indexOf(value) > -1) {
          return getParentKey(item.key, treeData);
        }
        return null;
      })
      .filter((item, i, self) => item && self.indexOf(item) === i);
    setExpandedKeys(newExpandedKeys as React.Key[]);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  // 递归渲染树节点，处理搜索高亮
  const treeDataWithSearch = useMemo(() => {
    const loop = (data: DataNode[]): DataNode[] =>
      data.map((item) => {
        const strTitle = item.title as string;
        const index = strTitle.indexOf(searchValue);
        const beforeStr = strTitle.substring(0, index);
        const afterStr = strTitle.slice(index + searchValue.length);
        const title =
          index > -1 ? (
            <span>
              {beforeStr}
              <span style={{ color: '#f50' }}>{searchValue}</span>
              {afterStr}
            </span>
          ) : (
            <span>{strTitle}</span>
          );
        
        if (item.children) {
          return { ...item, title, key: item.key, children: loop(item.children), icon: item.icon };
        }

        return {
          ...item,
          title,
          key: item.key,
          icon: item.icon,
        };
      });

    return loop(treeData);
  }, [searchValue, treeData]);

  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: DataNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  const renderContextMenuInfo = (node: DataNode | null) => {
    if (!node) return { items: [] };
    const titleText = typeof node.title === 'string' 
        ? node.title 
        : (node.title as any)?.props?.children?.[0] || 'Selected Node'; 

    const items: MenuProps['items'] = [
        { 
            key: 'header', 
            label: <span style={{ cursor: 'default', color: '#888', fontSize: '12px' }}>操作: {titleText}</span>, 
            disabled: true,
            style: { cursor: 'default', background: 'rgba(0,0,0,0.02)' }
        },
        { type: 'divider' },
        { key: 'add', label: '新增子分类', icon: <PlusOutlined /> },
        { key: 'rename', label: '重命名', icon: <EditOutlined /> },
        { type: 'divider' },
        { key: 'design', label: '属性设计', icon: <SettingOutlined /> },
        { type: 'divider' },
        { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
    ];
    return { items };
  };

  const handleRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
    if (!enableContextMenu) return;
    setContextMenuState({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node: node as DataNode, // Antd tree node type casting
    });
  };

  const titleRender = (node: DataNode) => {
    return (
        <span>
          {node.title as React.ReactNode}
        </span>
    );
  };

  return (
    <div 
        ref={containerRef}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '16px 16px 8px' }}>
        <Search style={{ marginBottom: 8 }} placeholder={searchPlaceholder} onChange={onChange} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {treeData.length > 0 ? (
          <>
            <Tree
                onExpand={onExpand}
                expandedKeys={expandedKeys}
                autoExpandParent={autoExpandParent}
                treeData={treeDataWithSearch}
                onSelect={onSelect}
                loadData={loadData}
                loadedKeys={loadedKeys}
                onLoad={onLoad}
                showIcon
                blockNode
                titleRender={titleRender}
                defaultSelectedKeys={defaultSelectedKeys}
                onRightClick={handleRightClick}
            />
            <Dropdown
                menu={{
                    items: renderContextMenuInfo(contextMenuState.node).items,
                    onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        message.info(`Action: ${key} on Node: ${contextMenuState.node?.key}`);
                        setContextMenuState(prev => ({ ...prev, visible: false }));
                    },
                }}
                open={contextMenuState.visible}
                onOpenChange={(visible) => {
                    if (!visible) setContextMenuState(prev => ({ ...prev, visible: false }));
                }}
                trigger={['contextMenu']}
            >
                <div
                    style={{
                        position: 'fixed',
                        left: contextMenuState.x,
                        top: contextMenuState.y,
                        width: 1,
                        height: 1,
                        pointerEvents: 'none',
                    }}
                />
            </Dropdown>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分类数据" />
        )}
      </div>
    </div>
  );
};

// Helper to find parent key (simplified for demo)
const getParentKey = (key: React.Key, tree: DataNode[]): React.Key => {
  let parentKey: React.Key;
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.children) {
      if (node.children.some((item) => item.key === key)) {
        parentKey = node.key;
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children);
      }
    }
  }
  return parentKey!;
};

export default CategoryTree;
