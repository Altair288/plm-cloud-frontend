import React, { useState, useMemo } from 'react';
import { Input, Tree, Empty } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';

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
}) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(initialExpandedKeys);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

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
          return { title, key: item.key, children: loop(item.children), icon: item.icon };
        }

        return {
          title,
          key: item.key,
          icon: item.icon,
        };
      });

    return loop(treeData);
  }, [searchValue, treeData]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <Search style={{ marginBottom: 8 }} placeholder={searchPlaceholder} onChange={onChange} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {treeData.length > 0 ? (
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
            defaultSelectedKeys={defaultSelectedKeys}
          />
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
