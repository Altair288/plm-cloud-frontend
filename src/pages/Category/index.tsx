import React, { useState } from 'react';
import { theme, Splitter } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import CategoryTree from './components/CategoryTree';
import CategoryDetail from './components/CategoryDetail';

const CategoryPage: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG, colorBorderSecondary },
  } = theme.useToken();

  const [selectedKey, setSelectedKey] = useState<React.Key>('CAT-001-01');
  const [selectedNode, setSelectedNode] = useState<DataNode | undefined>({ title: '休闲零食', key: 'CAT-001-01-01' }); // 默认选中一个用于展示
  
  const onSelect: TreeProps['onSelect'] = (keys, info) => {
    if (keys.length > 0) {
      setSelectedKey(keys[0]);
      setSelectedNode(info.node);
    } else {
      setSelectedKey('');
      setSelectedNode(undefined);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 110px)' }}>
      <Splitter
        style={{
          height: '100%',
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          border: `1px solid ${colorBorderSecondary}`,
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.05)'
        }}
      >
        <Splitter.Panel defaultSize={280} min={200} max={600} collapsible>
          <CategoryTree onSelect={onSelect} />
        </Splitter.Panel>
        <Splitter.Panel>
          <div style={{ height: '100%', padding: '24px 0' }}>
            <CategoryDetail selectedKey={selectedKey} selectedNode={selectedNode} />
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default CategoryPage;
