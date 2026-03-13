import React, { useState, useMemo, forwardRef } from 'react';
import { Input, Tree, Empty } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';

const { Search } = Input;

export interface CategoryTreeToolbarState {
  checkableEnabled: boolean;
  checkedKeys: React.Key[];
  checkedCount: number;
  searchValue: string;
  searchExpanded: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchVisibilityChange: (expanded: boolean) => void;
  onSearchClear: () => void;
  onCheckableToggle: () => void;
}

export interface CategoryTreeProps {
  onSelect: TreeProps['onSelect'];
  treeData: DataNode[];
  loadData?: TreeProps['loadData'];
  loadedKeys?: React.Key[];
  onLoad?: TreeProps['onLoad'];
  initialExpandedKeys?: React.Key[];
  defaultSelectedKeys?: React.Key[];
  selectedKeys?: React.Key[];
  defaultCheckedKeys?: React.Key[];
  searchPlaceholder?: string;
  onRightClick?: TreeProps['onRightClick'];
  titleRender?: TreeProps['titleRender'];
  toolbarRender?: React.ReactNode | ((state: CategoryTreeToolbarState) => React.ReactNode);
  defaultCheckable?: boolean;
  showCheckableToggle?: boolean;
}

const CategoryTree = forwardRef<HTMLDivElement, CategoryTreeProps>(({
  onSelect,
  treeData,
  loadData,
  loadedKeys,
  onLoad,
  initialExpandedKeys = [],
  defaultSelectedKeys = [],
  selectedKeys,
  defaultCheckedKeys = [],
  searchPlaceholder = '搜索分类',
  onRightClick,
  titleRender,
  toolbarRender,
  defaultCheckable = false,
  showCheckableToggle = true,
}, ref) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(initialExpandedKeys);
  const [searchValue, setSearchValue] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [checkableEnabled, setCheckableEnabled] = useState(defaultCheckable);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>(defaultCheckedKeys);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const handleCheck: TreeProps['onCheck'] = (nextCheckedKeys) => {
    const normalizedCheckedKeys = Array.isArray(nextCheckedKeys)
      ? nextCheckedKeys
      : nextCheckedKeys.checked;
    setCheckedKeys(normalizedCheckedKeys as React.Key[]);
  };

  const clearSearch = () => {
    setSearchValue('');
    setExpandedKeys(initialExpandedKeys);
    setAutoExpandParent(true);
    setSearchExpanded(false);
  };

  const toggleCheckable = () => {
    setCheckableEnabled((prev) => {
      const nextValue = !prev;
      if (!nextValue) {
        setCheckedKeys([]);
      }
      return nextValue;
    });
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

  const defaultTitleRender = (node: DataNode) => {
    if (titleRender) return titleRender(node);
    return (
      <span>
        {node.title as React.ReactNode}
      </span>
    );
  };

  const toolbarNode =
    typeof toolbarRender === 'function'
      ? toolbarRender({
          checkableEnabled,
          checkedKeys,
          checkedCount: checkedKeys.length,
          searchValue,
          searchExpanded,
          onSearchChange: onChange,
          onSearchVisibilityChange: setSearchExpanded,
          onSearchClear: clearSearch,
          onCheckableToggle: toggleCheckable,
        })
      : toolbarRender;

  return (
    <div
      ref={ref}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {toolbarNode ? (
        <div
          style={{
            height: 48,
            padding: '0 16px',
            borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
            }}
          >
            {toolbarNode}
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 16px 8px' }}>
          <Search style={{ marginBottom: 8 }} placeholder={searchPlaceholder} onChange={onChange} />
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {treeData.length > 0 ? (
          <Tree
            key={checkableEnabled ? 'tree-checkable-enabled' : 'tree-checkable-disabled'}
            checkable={checkableEnabled}
            checkedKeys={checkedKeys}
            onCheck={handleCheck}
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
            titleRender={defaultTitleRender}
            defaultSelectedKeys={defaultSelectedKeys}
            selectedKeys={selectedKeys}
            onRightClick={onRightClick}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分类数据" />
        )}
      </div>
    </div>
  );
});

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
