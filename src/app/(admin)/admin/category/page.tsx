// "use client";

// import React, { useState, useEffect, useRef } from 'react';
// import { PageContainer } from '@ant-design/pro-components';
// import ProCard from '@ant-design/pro-card';
// import ProTable, { type ActionType, type ProColumns } from '@ant-design/pro-table';
// import { Tree, message, Button, Modal, Form, Input, type TreeDataNode, Space, Tag, theme } from 'antd';
// import { 
//   PlusOutlined, 
//   EditOutlined, 
//   DeleteOutlined, 
//   ReloadOutlined,
//   FolderOpenOutlined,
//   FileOutlined,
//   AppstoreOutlined,
//   BarsOutlined
// } from '@ant-design/icons';
// import { metaCategoryApi, type MetaCategoryBrowseNodeDto } from '@/services/metaCategory';

// /**
//  * Mapped Tree Node extending Antd TreeDataNode
//  * 
//   */
"use client";

import React, { useState } from 'react';
import { Splitter } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import CategoryTree from '@/features/category/CategoryTree';

const CategoryManagementPage: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<React.Key>('');
  const [selectedNode, setSelectedNode] = useState<DataNode | undefined>(undefined);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  // TODO: replace with real backend data
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  
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
    <div style={{ height: 'calc(100vh - 201px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Splitter
        onCollapse={(collapsed) => setLeftCollapsed(collapsed[0] ?? false)}
        style={{
          flex: 1,
          minHeight: 0,
          background: 'var(--ant-color-bg-container, #fff)',
          borderRadius: 8,
          border: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <Splitter.Panel
          defaultSize={280}
          min={200}
          max={600}
          collapsible={{ end: true, showCollapsibleIcon: leftCollapsed ? true : 'auto' }}
        >
          <CategoryTree onSelect={onSelect} treeData={treeData} />
        </Splitter.Panel>
        <Splitter.Panel>
          <div style={{ height: '100%', padding: '16px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            请选择左侧分类节点
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default CategoryManagementPage;
