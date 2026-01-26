import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Checkbox, Button, List, Tag, Empty, Input, Space, Badge, Statistic, Tooltip, Select, Spin, Breadcrumb, Modal, Splitter, Tree, App } from 'antd';
import { ShoppingCartOutlined, PlusOutlined, DeleteOutlined, SearchOutlined, EditOutlined, AppstoreOutlined, DatabaseOutlined, ArrowRightOutlined, FolderOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import type { DataNode, TreeProps } from 'antd/es/tree';
import DraggableModal from '../../../../../components/DraggableModal';
import { lightPalette } from '../../../../../styles/colors';

import { LIBRARIES, MOCK_DB, MOCK_ATTRIBUTES, type CategoryItem, type MillerNode } from '../mockData';
import { metaCategoryApi } from '../../../../../services/metaCategory';
import MillerColumns from './MillerColumns';
import CategoryBrowser from './CategoryBrowser';

const { Title, Text } = Typography;

// --- 类型定义 ---

export interface CartItem extends CategoryItem {
  attributes: string[];
  // targetKey 移除，改为在 Stage 2 统一处理
}

interface CategoryMarketplaceProps {
  open: boolean;
  onCancel: () => void;
  onOk: (treeData: DataNode[]) => void; // 接口变更：返回最终的树结构
  userTreeData?: DataNode[];
}

const CategoryMarketplace: React.FC<CategoryMarketplaceProps> = ({ open, onCancel, onOk, userTreeData = [] }) => {
  const { message, modal } = App.useApp();
  // --- 状态管理 ---

  const [stage, setStage] = useState<0 | 1>(0); // 0: 选品, 1: 分配位置

  // 1. 购物车状态 (持久化)
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // 2. 搜索与浏览状态
  const [selectedLibrary, setSelectedLibrary] = useState<string>('GB');
  const [searchResults, setSearchResults] = useState<CategoryItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. 当前选中的分类 (配置区)
  const [activeCategory, setActiveCategory] = useState<CategoryItem | null>(null);
  const [checkedAttributes, setCheckedAttributes] = useState<string[]>([]);
  const [selectedMillerPath, setSelectedMillerPath] = useState<string[]>([]);

  // Handler for CategoryBrowser selection (Leaf node)
  const handleBrowserSelect = (node: MillerNode) => {
    const pathTitles: string[] = node.fullPathName
      ? node.fullPathName.split('/').filter(Boolean)
      : ['UNSPSC', node.title];
    
    const categoryItem: CategoryItem = {
      key: node.key,
      title: node.title,
      code: node.code,
      path: pathTitles,
      library: 'UNSPSC'
    };
    handleSelectCategory(categoryItem);
  };

  const handleMillerSelect = (node: MillerNode, level: number) => {
    // Update selected path
    const newPath = selectedMillerPath.slice(0, level);
    newPath.push(node.key);
    setSelectedMillerPath(newPath);

    if (node.isLeaf) {
      const categoryItem: CategoryItem = {
        key: node.key,
        title: node.title,
        code: node.code,
        path: ['UNSPSC', node.title],
        library: 'UNSPSC'
      };
      handleSelectCategory(categoryItem);
    }
  };

  // 4. Stage 2 状态
  const [previewTreeData, setPreviewTreeData] = useState<DataNode[]>([]);
  const [pendingItems, setPendingItems] = useState<CartItem[]>([]);
  const [selectedPendingKeys, setSelectedPendingKeys] = useState<string[]>([]);
  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);
  const [selectedTargetNodeKey, setSelectedTargetNodeKey] = useState<React.Key | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  
  // Tree height auto-adjustment
  const [treeHeight, setTreeHeight] = useState<number>(600);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage === 1 && treeContainerRef.current) {
      const updateHeight = () => {
        if (treeContainerRef.current) {
          setTreeHeight(treeContainerRef.current.offsetHeight);
        }
      };

      // Initial calculation
      updateHeight();

      const observer = new ResizeObserver(updateHeight);
      observer.observe(treeContainerRef.current);
      
      return () => observer.disconnect();
    }
  }, [stage]);

  // --- 业务逻辑 ---

  // UNSPSC search via backend; other libraries stay on mock
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      if (selectedLibrary === 'UNSPSC') {
        const hits = await metaCategoryApi.searchUnspsc({ q, limit: 50 });
        const results: CategoryItem[] = hits.map((hit) => ({
          key: hit.key,
          title: hit.title,
          code: hit.code,
          path: hit.fullPathName ? hit.fullPathName.split('/').filter(Boolean) : ['UNSPSC', hit.title],
          library: 'UNSPSC',
        }));
        setSearchResults(results);
      } else {
        const source = MOCK_DB[selectedLibrary] || [];
        const results = source.filter(item =>
          item.title.toLowerCase().includes(q.toLowerCase()) || item.code.includes(q)
        );
        setSearchResults(results);
      }
    } finally {
      setIsSearching(false);
    }
  }, [selectedLibrary]);

  // --- 持久化逻辑 ---
  const STORAGE_KEY = 'PLM_CATEGORY_CART_DRAFT';

  // 初始化加载
  useEffect(() => {
    if (open) {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
            message.success({ content: `已恢复上次未提交的 ${parsed.length} 项分类`, key: 'restore_cart' });
          }
        } catch (e) {
          console.error('Failed to parse cart draft', e);
        }
      }
      // 初始加载列表
      setSearchQuery('');
      setSearchResults([]);
      // 重置 Stage
      setStage(0);
    }
  }, [open]);

  // 自动保存
  useEffect(() => {
    if (open && stage === 0) { // 只有打开状态下才同步，避免意外覆盖
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, open, stage]);

  const handleLibraryChange = (value: string) => {
    setSelectedLibrary(value);
    // 切换库后重置搜索结果，或者自动触发一次空搜索
    setIsSearching(true);
    setTimeout(() => {
      const source = MOCK_DB[value] || [];
      setSearchResults(source); // 显示全部或前N条
      setIsSearching(false);
    }, 300);
  };

  const handleSelectCategory = (item: CategoryItem) => {
    setActiveCategory(item);

    // 检查是否已在购物车中 (编辑模式)
    const existingItem = cart.find(c => c.key === item.key);
    if (existingItem) {
      setCheckedAttributes(existingItem.attributes);
    } else {
      // 默认全选或者空，这里设为默认选前3个模拟智能推荐
      setCheckedAttributes(MOCK_ATTRIBUTES.slice(0, 3));
    }
  };

  const handleAddToCart = () => {
    if (!activeCategory) return;

    const newItem: CartItem = {
      ...activeCategory,
      attributes: checkedAttributes,
    };

    const index = cart.findIndex(item => item.key === newItem.key);
    if (index > -1) {
      const newCart = [...cart];
      newCart[index] = newItem;
      setCart(newCart);
      message.success('已更新配置');
    } else {
      setCart([...cart, newItem]);
      message.success('已加入清单');
    }
  };

  const handleRemoveFromCart = (key: string) => {
    setCart(prev => prev.filter(item => item.key !== key));
    if (activeCategory?.key === key) {
      // 如果删除的是当前正在配置的，可以选择重置状态，或者保持不变
    }
  };

  const handleClearCart = () => {
    modal.confirm({
      title: '确认清空清单?',
      content: '此操作将移除所有已选分类，且不可恢复。',
      onOk: () => {
        setCart([]);
        localStorage.removeItem(STORAGE_KEY);
        message.info('清单已清空');
      }
    });
  };

  // --- Stage 2 Logic ---

  // Helper for deep cloning tree data while preserving React Nodes (like icon)
  const cloneTree = (data: DataNode[]): DataNode[] => {
    return data.map(item => ({
      ...item,
      children: item.children ? cloneTree(item.children) : undefined,
    }));
  };

  const getAllKeys = (data: DataNode[]): React.Key[] => {
    let keys: React.Key[] = [];
    data.forEach(item => {
      keys.push(item.key);
      if (item.children) {
        keys = keys.concat(getAllKeys(item.children));
      }
    });
    return keys;
  };

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const handleNextStage = () => {
    if (cart.length === 0) {
      message.warning('请先选择要导入的分类');
      return;
    }
    // 初始化 Stage 2 数据
    // 深拷贝 userTreeData 以便在预览中修改
    const clonedData = cloneTree(userTreeData);
    setPreviewTreeData(clonedData);
    setExpandedKeys(getAllKeys(clonedData));
    setPendingItems([...cart]);
    setSelectedPendingKeys([]);
    setLastSelectedKey(null);
    setSelectedTargetNodeKey(null);
    setStage(1);
  };

  const handlePrevStage = () => {
    setStage(0);
  };

  const handleAssignToTree = () => {
    if (selectedPendingKeys.length === 0) {
      message.warning('请先在左侧选择要分配的分类');
      return;
    }
    if (!selectedTargetNodeKey) {
      message.warning('请在右侧树中选择一个目标节点');
      return;
    }

    const itemsToAssign = pendingItems.filter(item => selectedPendingKeys.includes(item.key));
    
    // 构建新节点
    const newNodes: DataNode[] = itemsToAssign.map(item => ({
      title: item.title,
      key: item.key, // 注意：这里直接使用了库中的 key，实际可能需要生成新 key 避免冲突，这里暂且假设库 key 唯一或作为前缀
      icon: <FolderOutlined />,
      isLeaf: true,
      // 可以在这里添加额外属性标识这是新导入的节点
    }));

    // 递归更新树
    const updateTree = (data: DataNode[]): DataNode[] => {
      return data.map(node => {
        if (node.key === selectedTargetNodeKey) {
          return {
            ...node,
            children: [...(node.children || []), ...newNodes],
            isLeaf: false,
          };
        }
        if (node.children) {
          return {
            ...node,
            children: updateTree(node.children),
          };
        }
        return node;
      });
    };

    setPreviewTreeData(prev => updateTree(prev));
    
    // 自动展开目标节点
    if (selectedTargetNodeKey) {
      setExpandedKeys(prev => {
        if (!prev.includes(selectedTargetNodeKey)) {
          return [...prev, selectedTargetNodeKey];
        }
        return prev;
      });
      setAutoExpandParent(true);
    }

    // 从待分配列表中移除
    setPendingItems(prev => prev.filter(item => !selectedPendingKeys.includes(item.key)));
    setSelectedPendingKeys([]);
    setLastSelectedKey(null);
    message.success(`已将 ${itemsToAssign.length} 个分类分配到目标节点`);
  };

  const onDrop: TreeProps['onDrop'] = (info) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (data: DataNode[], key: React.Key, callback: (node: DataNode, i: number, data: DataNode[]) => void) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data);
        }
        if (data[i].children) {
          loop(data[i].children!, key, callback);
        }
      }
    };
    const data = cloneTree(previewTreeData);

    // Find dragObject
    let dragObj: DataNode;
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        // where to insert? default to end
        item.children.unshift(dragObj);
        item.isLeaf = false; // 确保父节点不再是叶子节点
      });
      
      // 自动展开目标节点
      setExpandedKeys(prev => {
        if (!prev.includes(dropKey)) {
          return [...prev, dropKey];
        }
        return prev;
      });
      setAutoExpandParent(true);
    } else if (
      ((info.node as any).props.children || []).length > 0 && // Has children
      (info.node as any).expanded && // Is expanded
      dropPosition === 1 // On the bottom gap
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else {
      let ar: DataNode[] = [];
      let i: number;
      loop(data, dropKey, (_, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i!, 0, dragObj!);
      } else {
        ar.splice(i! + 1, 0, dragObj!);
      }
    }
    setPreviewTreeData(data);
  };

  const handlePendingItemClick = (key: string, e: React.MouseEvent) => {
    // 阻止默认行为，防止 Checkbox 自身的 onChange 干扰
    // e.preventDefault(); 
    // 注意：如果阻止了 Checkbox 的默认行为，可能导致 Checkbox 状态不更新，所以这里我们主要依赖 onClick 处理逻辑
    
    let newSelectedKeys = [...selectedPendingKeys];

    if (e.shiftKey && lastSelectedKey) {
      // Shift 范围选择
      const lastIndex = pendingItems.findIndex(item => item.key === lastSelectedKey);
      const currentIndex = pendingItems.findIndex(item => item.key === key);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeKeys = pendingItems.slice(start, end + 1).map(item => item.key);
        
        // 合并选中（去重）
        newSelectedKeys = Array.from(new Set([...newSelectedKeys, ...rangeKeys]));
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd 单选（切换）
      if (newSelectedKeys.includes(key)) {
        newSelectedKeys = newSelectedKeys.filter(k => k !== key);
      } else {
        newSelectedKeys.push(key);
      }
      setLastSelectedKey(key);
    } else {
      // 普通点击：只选中当前项
      newSelectedKeys = [key];
      setLastSelectedKey(key);
    }

    setSelectedPendingKeys(newSelectedKeys);
  };

  const handleCheckboxClick = (key: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡到行点击事件
    
    let newSelectedKeys = [...selectedPendingKeys];
    if (newSelectedKeys.includes(key)) {
      newSelectedKeys = newSelectedKeys.filter(k => k !== key);
    } else {
      newSelectedKeys.push(key);
    }
    // Checkbox 点击通常不更新 Shift 选择的锚点，或者更新？Windows Explorer 似乎更新。
    setLastSelectedKey(key);
    setSelectedPendingKeys(newSelectedKeys);
  };

  const handleFinalSubmit = () => {
    if (pendingItems.length > 0) {
      modal.confirm({
        title: '还有未分配的分类',
        content: `还有 ${pendingItems.length} 个分类未分配到树中。继续提交将忽略这些分类。`,
        onOk: () => {
          onOk(previewTreeData);
          localStorage.removeItem(STORAGE_KEY);
          setCart([]);
          setStage(0);
        }
      });
    } else {
      onOk(previewTreeData);
      localStorage.removeItem(STORAGE_KEY);
      setCart([]);
      setStage(0);
    }
  };

  // --- 渲染辅助 ---

  const renderSearchResultItem = (item: CategoryItem) => {
    const isActive = activeCategory?.key === item.key;
    const isInCart = cart.some(c => c.key === item.key);

    return (
      <List.Item
        onClick={() => handleSelectCategory(item)}
        style={{
          cursor: 'pointer',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: isActive ? lightPalette.menuItemSelectedBg : 'transparent',
          border: isActive ? `1px solid ${lightPalette.menuTextSelected}` : '1px solid transparent',
          transition: 'all 0.2s',
          marginBottom: 4
        }}
        className="search-result-item"
      >
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text strong style={{ color: isActive ? lightPalette.menuTextSelected : lightPalette.textPrimary }}>
              {item.title}
            </Text>
            {isInCart && <Badge status="processing" text={<span style={{ fontSize: 12, color: lightPalette.textSecondary }}>已选</span>} />}
          </div>
          <Space size={4} style={{ flexWrap: 'wrap' }}>
            <Tag variant="filled" style={{ fontSize: 10, margin: 0 }}>{item.code}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.path.join(' / ')}
            </Text>
          </Space>
        </div>
      </List.Item>
    );
  };

  return (
    <DraggableModal
      title={
        <Space>
          <ShoppingCartOutlined style={{ color: lightPalette.menuTextSelected, fontSize: 20 }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            {stage === 0 ? '分类采购中心 (Category Marketplace) - 选品' : '分类导入向导 - 位置分配'}
          </span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={stage === 0 ? handleNextStage : handleFinalSubmit}
      width="90%"
      okText={stage === 0 ? "下一步：分配位置" : "确认导入"}
      cancelText={stage === 0 ? "取消" : "上一步"}
      // 注意：DraggableModal 可能不支持 onCancelText 属性，这里需要自定义 footer
      footer={[
        <Button key="cancel" onClick={stage === 0 ? onCancel : handlePrevStage}>
          {stage === 0 ? "取消" : "上一步"}
        </Button>,
        <Button key="submit" type="primary" onClick={stage === 0 ? handleNextStage : handleFinalSubmit}>
          {stage === 0 ? "下一步：分配位置" : "确认导入"}
        </Button>
      ]}
      styles={{ body: { height: '80vh', padding: 0, overflow: 'hidden' } }}
      destroyOnClose={false} // 保持状态
      maskClosable={false}
    >
      {stage === 0 ? (
        <Splitter style={{ height: '100%', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
          {/* --- 左侧：选品区 (Discovery) --- */}
          <Splitter.Panel defaultSize="50%" min="30%" max="70%">
            <ProCard
              title="1. 选品 (Discovery - UNSPSC)"
              headerBordered
              style={{ height: '100%', display: 'flex', flexDirection: 'column', border: 'none' }}
              bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#fafafa' }}
            >
              <Space orientation="vertical" style={{ width: '100%', marginBottom: 16 }}>
                <Input.Search
                  placeholder="输入 UNSPSC 编码或名称搜索..."
                  allowClear
                  onSearch={handleSearch}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setSearchQuery('');
                      setSearchResults([]);
                    }
                  }}
                  enterButton={<Button icon={<SearchOutlined />} type="primary" />}
                />
              </Space>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                {searchQuery.trim() ? (
                  isSearching ? (
                    <div style={{ padding: 24 }}><Spin /></div>
                  ) : searchResults.length > 0 ? (
                    <List
                      dataSource={searchResults}
                      renderItem={renderSearchResultItem}
                      style={{ height: '100%', overflowY: 'auto' }}
                    />
                  ) : (
                    <Empty description="未找到匹配结果" />
                  )
                ) : (
                  <CategoryBrowser onSelect={handleBrowserSelect} />
                )}
              </div>
            </ProCard>
          </Splitter.Panel>

          {/* --- 中间：配置区 (Configuration) --- */}
          <Splitter.Panel defaultSize="25%" min="20%">
            <ProCard
              title="2. 配置 (Configuration)"
              headerBordered
              style={{ height: '100%', display: 'flex', flexDirection: 'column', border: 'none' }}
              extra={
                activeCategory && (
                  <Space>
                    <Button size="small" type="text" onClick={() => setCheckedAttributes(MOCK_ATTRIBUTES)}>全选</Button>
                    <Button size="small" type="text" onClick={() => setCheckedAttributes([])}>清空</Button>
                </Space>
              )
            }
            bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
          >
            {activeCategory ? (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Breadcrumb items={activeCategory.path.map(p => ({ title: p }))} style={{ marginBottom: 8, fontSize: 12 }} />
                  <Title level={4} style={{ margin: 0, color: lightPalette.textPrimary }}>{activeCategory.title}</Title>
                  <Space style={{ marginTop: 8 }}>
                    <Tag color="blue">{activeCategory.code}</Tag>
                    <Tag>{LIBRARIES.find(l => l.value === activeCategory.library)?.label}</Tag>
                  </Space>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <Title level={5} style={{ fontSize: 14, marginBottom: 16 }}>选择业务属性</Title>
                  <Checkbox.Group
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    value={checkedAttributes}
                    onChange={(vals) => setCheckedAttributes(vals as string[])}
                  >
                    {MOCK_ATTRIBUTES.map(attr => (
                      <Checkbox key={attr} value={attr} style={{ marginLeft: 0 }}>
                        <Space>
                          <span>{attr}</span>
                          {/* 模拟一些属性的元数据展示 */}
                          <Text type="secondary" style={{ fontSize: 12 }}>(String)</Text>
                        </Space>
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${lightPalette.borderColor}` }}>
                  <Button
                    type="primary"
                    block
                    size="large"
                    icon={cart.some(c => c.key === activeCategory.key) ? <EditOutlined /> : <PlusOutlined />}
                    onClick={handleAddToCart}
                    style={{ height: 48, fontSize: 16 }}
                  >
                    {cart.some(c => c.key === activeCategory.key) ? '更新配置 (Update)' : '加入清单 (Add to Cart)'}
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: lightPalette.textSecondary }}>
                <AppstoreOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }} />
                <Text type="secondary">请从左侧选择一个分类进行配置</Text>
              </div>
            )}
          </ProCard>
        </Splitter.Panel>

        {/* --- 右侧：清单区 (Cart) --- */}
        <Splitter.Panel defaultSize="25%" min="20%" max="40%">
          <ProCard
            title={
              <Space>
                <span>3. 清单 (Cart)</span>
                <Badge count={cart.length} showZero color={lightPalette.menuTextSelected} />
              </Space>
            }
            headerBordered
            style={{ height: '100%', display: 'flex', flexDirection: 'column', border: 'none' }}
            extra={
              cart.length > 0 && (
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={handleClearCart}>
                  清空
                </Button>
              )
            }
            bodyStyle={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#fafafa' }}
          >
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <List
                dataSource={cart}
                renderItem={(item) => (
                  <div
                    key={item.key}
                    style={{
                      backgroundColor: '#fff',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: activeCategory?.key === item.key ? `1px solid ${lightPalette.menuTextSelected}` : `1px solid ${lightPalette.borderColor}`,
                      cursor: 'pointer',
                      position: 'relative',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                    onClick={() => handleSelectCategory(item)}
                  >
                    <div style={{ paddingRight: 24 }}>
                      <Text strong>{item.title}</Text>
                      <div style={{ marginTop: 4 }}>
                        <Tag style={{ fontSize: 10 }}>{item.code}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>已选 {item.attributes.length} 个属性</Text>
                      </div>
                    </div>

                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <Tooltip title="移除">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromCart(item.key);
                          }}
                        />
                      </Tooltip>
                    </div>
                  </div>
                )}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="清单为空" /> }}
              />
            </div>

            {/* 底部统计 */}
            <div style={{ padding: '16px', backgroundColor: '#fff', borderTop: `1px solid ${lightPalette.borderColor}` }}>
              <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Statistic
                  title="分类数量"
                  value={cart.length}
                  valueStyle={{ fontSize: 18, fontWeight: 600 }}
                />
                <Statistic
                  title="属性总数"
                  value={cart.reduce((acc, cur) => acc + cur.attributes.length, 0)}
                  valueStyle={{ fontSize: 18, fontWeight: 600 }}
                />
              </Space>
            </div>
          </ProCard>
        </Splitter.Panel>
      </Splitter>
      ) : (
        <Splitter style={{ height: '100%', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
          {/* --- 左侧：待分配列表 --- */}
          <Splitter.Panel defaultSize="30%" min="20%" max="40%">
            <ProCard
              title="待分配分类 (Pending)"
              headerBordered
              style={{ height: '100%', display: 'flex', flexDirection: 'column', border: 'none' }}
              bodyStyle={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#fafafa' }}
            >
              <div style={{ padding: '12px', borderBottom: `1px solid ${lightPalette.borderColor}`, backgroundColor: '#fff' }}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Text type="secondary">选中下方分类，然后在右侧树中选择目标节点，点击分配。</Text>
                  <Button 
                    type="primary" 
                    block 
                    icon={<ArrowRightOutlined />} 
                    disabled={selectedPendingKeys.length === 0 || !selectedTargetNodeKey}
                    onClick={handleAssignToTree}
                  >
                    分配到选中节点
                  </Button>
                </Space>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingItems.map(item => {
                    const isSelected = selectedPendingKeys.includes(item.key);
                    return (
                      <div 
                        key={item.key}
                        onClick={(e) => handlePendingItemClick(item.key, e)}
                        style={{ 
                          padding: '8px 12px', 
                          backgroundColor: isSelected ? lightPalette.menuItemSelectedBg : '#fff', 
                          borderRadius: '6px', 
                          border: isSelected ? `1px solid ${lightPalette.menuTextSelected}` : `1px solid ${lightPalette.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none', // 防止 Shift 选择时出现文本选中
                          transition: 'all 0.1s'
                        }}
                      >
                        <Checkbox 
                          checked={isSelected} 
                          onClick={(e) => handleCheckboxClick(item.key, e)}
                        />
                        <div style={{ marginLeft: 8, flex: 1 }}>
                          <Space>
                            <Text strong style={{ color: isSelected ? lightPalette.menuTextSelected : undefined }}>{item.title}</Text>
                            <Tag style={{ fontSize: 10 }}>{item.code}</Tag>
                          </Space>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pendingItems.length === 0 && <Empty description="所有分类已分配" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </div>
            </ProCard>
          </Splitter.Panel>

          {/* --- 右侧：预览树 --- */}
          <Splitter.Panel defaultSize="70%" min="50%">
            <ProCard
              title="预览树 (Preview Tree)"
              headerBordered
              style={{ height: '100%', display: 'flex', flexDirection: 'column', border: 'none' }}
              extra={<Text type="secondary">支持拖拽调整位置</Text>}
              bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
            >
              <div ref={treeContainerRef} style={{ flex: 1, overflow: 'hidden' }}>
                <Tree
                  treeData={previewTreeData}
                  draggable
                  blockNode
                  expandedKeys={expandedKeys}
                  onExpand={onExpand}
                  autoExpandParent={autoExpandParent}
                  onDrop={onDrop}
                  onSelect={(keys) => setSelectedTargetNodeKey(keys[0])}
                  selectedKeys={selectedTargetNodeKey ? [selectedTargetNodeKey] : []}
                  height={treeHeight} // Dynamic height for virtual scroll
                  virtual // Explicitly enable virtual scroll
                />
              </div>
            </ProCard>
          </Splitter.Panel>
        </Splitter>
      )}
    </DraggableModal>
  );
};

export default CategoryMarketplace;
