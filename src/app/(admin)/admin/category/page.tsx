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

import React, { useState, useEffect } from 'react';
import { Splitter, message } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import CategoryTree from '@/features/category/CategoryTree';
import { metaCategoryApi, MetaCategoryBrowseNodeDto } from '@/services/metaCategory';
import { 
  FolderOpenOutlined,
  AppstoreOutlined,
  BarsOutlined
} from '@ant-design/icons';

interface CategoryTreeNode extends Omit<DataNode, 'children'> {
  children?: CategoryTreeNode[];
  dataRef?: MetaCategoryBrowseNodeDto;
  level?: 'segment' | 'family' | 'class' | 'commodity';
  loaded?: boolean;
  familyCode?: string;
}

const CategoryManagementPage: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<React.Key>('');
  const [selectedNode, setSelectedNode] = useState<DataNode | undefined>(undefined);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<React.Key[]>([]);

  // Initial Load (Segments)
  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const segments = await metaCategoryApi.listUnspscSegments();
      const nodes: CategoryTreeNode[] = segments.map((s) => ({
        title: `${s.code} - ${s.title}`,
        key: s.key,
        isLeaf: false, 
        dataRef: s,
        level: 'segment',
        icon: <AppstoreOutlined />,
      }));
      setTreeData(nodes);
      setLoadedKeys([]);
    } catch (error) {
      console.error(error);
      message.error('Failed to load segments');
    }
  };

  const onLoadData = async (node: any): Promise<void> => {
     const { key, children, dataRef, level } = node as CategoryTreeNode;
    if (children && children.length > 0) return;
    
    try {
      let childNodes: CategoryTreeNode[] = [];

      if (level === 'segment') {
        // Load Families
        const families = await metaCategoryApi.listUnspscFamilies(dataRef!.code);
        childNodes = families.map(f => ({
          title: `${f.code} - ${f.title}`,
          key: f.key,
          isLeaf: false, 
          dataRef: f,
          level: 'family',
          icon: <FolderOpenOutlined />,
        }));
      } else if (level === 'family') {
        // Load Classes
        const groups = await metaCategoryApi.listUnspscClassesWithCommodities(dataRef!.code);
        childNodes = groups.map(g => ({
          title: `${g.clazz.code} - ${g.clazz.title}`,
          key: g.clazz.key,
          isLeaf: !g.commodities || g.commodities.length === 0, 
          dataRef: g.clazz,
          level: 'class',
          icon: <BarsOutlined />,
          familyCode: dataRef!.code 
        }));
      }
      
      setTreeData(origin => updateTreeData(origin, key as React.Key, childNodes));
      setLoadedKeys(keys => [...keys, key as React.Key]);
    } catch (error) {
      console.error(error);
      message.error('Failed to load children');
    }
  };

  const updateTreeData = (list: CategoryTreeNode[], key: React.Key, children: CategoryTreeNode[]): CategoryTreeNode[] => {
    return list.map(node => {
      if (node.key === key) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateTreeData(node.children, key, children) };
      }
      return node;
    });
  };
  
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
    <div style={{ height: 'calc(100vh - 201px)', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
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
          defaultSize={400}
          min={350}
          max={600}
          collapsible={{ end: true, showCollapsibleIcon: leftCollapsed ? true : 'auto' }}
        >
          <CategoryTree 
            onSelect={onSelect} 
            treeData={treeData} 
            loadData={onLoadData}
            loadedKeys={loadedKeys}
            onLoad={(keys) => setLoadedKeys(keys as React.Key[])}
          />
        </Splitter.Panel>
        <Splitter.Panel>
          <div style={{ height: '100%', padding: '16px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selectedNode ? (
                <div className="flex flex-col items-center">
                    <span className="text-lg font-medium text-black">{selectedNode.title as React.ReactNode}</span>
                    <span className="text-sm mt-2">Key: {selectedNode.key}</span>
                </div>
            ) : '请选择左侧分类节点'}
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default CategoryManagementPage;
