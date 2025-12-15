import React, { useState, useMemo } from 'react';
import { Input, Tree, Empty } from 'antd';
import { DownOutlined, FolderOutlined, FolderOpenOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';

const { Search } = Input;

// 模拟数据：一级为行业，二级及以下为自定义分类
const defaultData: DataNode[] = [
  {
    title: '食品制造业',
    key: 'IND-001',
    icon: <AppstoreOutlined />,
    children: [
      {
        title: '产成品',
        key: 'CAT-001-01',
        icon: <FolderOutlined />,
        children: [
          { title: '休闲零食', key: 'CAT-001-01-01', icon: <FolderOutlined />, isLeaf: true },
          { title: '饮料', key: 'CAT-001-01-02', icon: <FolderOutlined />, isLeaf: true },
        ],
      },
      {
        title: '原材料',
        key: 'CAT-001-02',
        icon: <FolderOutlined />,
        children: [
          { title: '面粉', key: 'CAT-001-02-01', icon: <FolderOutlined />, isLeaf: true },
          { title: '糖类', key: 'CAT-001-02-02', icon: <FolderOutlined />, isLeaf: true },
        ],
      },
      { title: '包材', key: 'CAT-001-03', icon: <FolderOutlined />, isLeaf: true },
    ],
  },
  {
    title: '烟草制品制造',
    key: 'IND-002',
    icon: <AppstoreOutlined />,
    children: [
      { title: '卷烟', key: 'CAT-002-01', icon: <FolderOutlined />, isLeaf: true },
      { title: '烟叶原料', key: 'CAT-002-02', icon: <FolderOutlined />, isLeaf: true },
    ],
  },
  {
    title: '纺织品制造业',
    key: 'IND-003',
    icon: <AppstoreOutlined />,
    children: [
      { title: '棉纺织', key: 'CAT-003-01', icon: <FolderOutlined />, isLeaf: true },
      { title: '化纤织造', key: 'CAT-003-02', icon: <FolderOutlined />, isLeaf: true },
    ],
  },
  {
    title: '汽车制造业',
    key: 'IND-004',
    icon: <AppstoreOutlined />,
    children: [
      { title: '乘用车整车', key: 'CAT-004-01', icon: <FolderOutlined />, isLeaf: true },
      {
        title: '零部件',
        key: 'CAT-004-02',
        icon: <FolderOutlined />,
        children: [
          { title: '电机总成', key: 'CAT-004-02-01', icon: <FolderOutlined />, isLeaf: true },
          { title: '螺丝类原材料', key: 'CAT-004-02-02', icon: <FolderOutlined />, isLeaf: true },
        ],
      },
    ],
  },
];

interface CategoryTreeProps {
  onSelect: TreeProps['onSelect'];
}

const CategoryTree: React.FC<CategoryTreeProps> = ({ onSelect }) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['IND-001', 'CAT-001-01']);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // 简单的搜索逻辑：如果匹配到，展开该节点
    // 实际项目中可能需要更复杂的过滤显示逻辑
    setSearchValue(value);
    if (value) {
        // 这里仅做演示，实际搜索通常会过滤树节点或高亮
        // 简单起见，这里暂不改变 expandedKeys，仅保存 searchValue 用于高亮（如果实现了高亮逻辑）
        setAutoExpandParent(true);
    }
  };

  // 递归渲染树节点，处理图标切换
  const treeData = useMemo(() => {
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
          return {
            ...item,
            title,
            icon: ({ expanded }: { expanded?: boolean }) => 
                // 一级节点保持 AppstoreOutlined，子节点根据展开状态切换文件夹图标
                String(item.key).startsWith('IND') ? <AppstoreOutlined /> : (expanded ? <FolderOpenOutlined /> : <FolderOutlined />),
            children: loop(item.children),
          };
        }

        return {
          ...item,
          title,
          icon: <FolderOutlined />,
        };
      });
    return loop(defaultData);
  }, [searchValue]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Search style={{ marginBottom: 8 }} placeholder="搜索分类..." onChange={onChange} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px' }}>
        {treeData.length > 0 ? (
          <Tree
            showIcon
            // showLine={{ showLeafIcon: false }}
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onSelect={onSelect}
            treeData={treeData}
            switcherIcon={<DownOutlined />}
            defaultSelectedKeys={['CAT-001-01']}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分类" />
        )}
      </div>
    </div>
  );
};

export default CategoryTree;
