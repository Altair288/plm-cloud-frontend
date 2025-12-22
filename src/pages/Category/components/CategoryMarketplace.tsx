import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Checkbox, Button, List, Tag, message, Empty, Input, Space, Badge, Statistic, Tooltip, Select, Spin, Breadcrumb, Modal } from 'antd';
import { ShoppingCartOutlined, PlusOutlined, DeleteOutlined, SearchOutlined, EditOutlined, AppstoreOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import DraggableModal from '../../../components/DraggableModal';
import { lightPalette } from '../../../styles/colors';

const { Title, Text } = Typography;

// --- 模拟海量数据源 (Mock Data Source) ---
// 在实际场景中，这里是后端 ElasticSearch 或数据库
interface CategoryItem {
  key: string;
  title: string;
  code: string;
  path: string[]; // 面包屑路径
  library: string; // 所属库
}

const LIBRARIES = [
  { label: '国家标准分类库 (GB/T)', value: 'GB' },
  { label: '电子行业标准库 (SJ)', value: 'SJ' },
  { label: '企业私有分类库', value: 'PRIVATE' },
];

// 模拟生成一些数据
const generateMockData = (lib: string, count: number): CategoryItem[] => {
  return Array.from({ length: count }).map((_, i) => ({
    key: `${lib}-${i + 1000}`,
    title: `${lib === 'GB' ? '通用' : lib === 'SJ' ? '电子' : '自研'}物料分类-${i + 1}`,
    code: `${lib}.${(i + 1000).toString()}`,
    path: [lib === 'GB' ? '国标' : '行标', '原材料', `分类组-${Math.floor(i / 10)}`],
    library: lib,
  }));
};

const MOCK_DB: Record<string, CategoryItem[]> = {
  'GB': generateMockData('GB', 50),
  'SJ': generateMockData('SJ', 50),
  'PRIVATE': generateMockData('PRIVATE', 20),
};

// 模拟属性库
const MOCK_ATTRIBUTES = [
  '规格型号', '材质', '颜色', '表面处理', '额定电压', '工作温度', '供应商代码', '环保等级', '重量', '尺寸'
];

// --- 类型定义 ---

export interface CartItem {
  key: string;
  title: string;
  code: string;
  path: string[];
  attributes: string[];
  library: string;
}

interface CategoryMarketplaceProps {
  open: boolean;
  onCancel: () => void;
  onOk: (items: CartItem[]) => void;
}

const CategoryMarketplace: React.FC<CategoryMarketplaceProps> = ({ open, onCancel, onOk }) => {
  // --- 状态管理 ---

  // 1. 购物车状态 (持久化)
  const [cart, setCart] = useState<CartItem[]>([]);

  // 2. 搜索与浏览状态
  const [selectedLibrary, setSelectedLibrary] = useState<string>('GB');
  const [searchResults, setSearchResults] = useState<CategoryItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // 3. 当前选中的分类 (配置区)
  const [activeCategory, setActiveCategory] = useState<CategoryItem | null>(null);
  const [checkedAttributes, setCheckedAttributes] = useState<string[]>([]);

  // --- 业务逻辑 ---

  // 模拟后端搜索 API
  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);

    // 模拟网络延迟
    setTimeout(() => {
      const source = MOCK_DB[selectedLibrary] || [];
      const results = source.filter(item =>
        item.title.includes(query) || item.code.includes(query)
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
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
      handleSearch('');
    }
  }, [open, handleSearch]);

  // 自动保存
  useEffect(() => {
    if (open) { // 只有打开状态下才同步，避免意外覆盖
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, open]);

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

    setCart(prev => {
      const index = prev.findIndex(item => item.key === newItem.key);
      if (index > -1) {
        const newCart = [...prev];
        newCart[index] = newItem;
        message.success('已更新配置');
        return newCart;
      } else {
        message.success('已加入清单');
        return [...prev, newItem];
      }
    });
  };

  const handleRemoveFromCart = (key: string) => {
    setCart(prev => prev.filter(item => item.key !== key));
    if (activeCategory?.key === key) {
      // 如果删除的是当前正在配置的，可以选择重置状态，或者保持不变
    }
  };

  const handleClearCart = () => {
    Modal.confirm({
      title: '确认清空清单?',
      content: '此操作将移除所有已选分类，且不可恢复。',
      onOk: () => {
        setCart([]);
        localStorage.removeItem(STORAGE_KEY);
        message.info('清单已清空');
      }
    });
  };

  const handleFinalSubmit = () => {
    onOk(cart);
    // 提交成功后清除草稿
    localStorage.removeItem(STORAGE_KEY);
    setCart([]);
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
            <Tag bordered={false} style={{ fontSize: 10, margin: 0 }}>{item.code}</Tag>
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
          <span style={{ fontSize: 16, fontWeight: 600 }}>分类采购中心 (Category Marketplace)</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleFinalSubmit}
      width="90%"
      okText={`确认导入 (${cart.length})`}
      cancelText="取消"
      styles={{ body: { height: '80vh', padding: 0, overflow: 'hidden' } }}
      destroyOnClose={false} // 保持状态
      maskClosable={false}
    >
      <ProCard split="vertical" bordered headerBordered style={{ height: '100%' }} bodyStyle={{ height: '100%', padding: 0 }}>

        {/* --- 左侧：选品区 (Discovery) --- */}
        <ProCard
          colSpan="30%"
          title="1. 选品 (Discovery)"
          headerBordered
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#fafafa' }}
        >
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            <Select
              style={{ width: '100%' }}
              value={selectedLibrary}
              onChange={handleLibraryChange}
              options={LIBRARIES}
              prefix={<DatabaseOutlined />}
            />
            <Input.Search
              placeholder="输入编码或名称搜索..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => {
                if (e.target.value === '') handleSearch('');
              }}
              enterButton={<Button icon={<SearchOutlined />} type="primary" />}
            />
          </Space>

          <div style={{ flex: 1, overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
            <Spin spinning={isSearching}>
              <List
                dataSource={searchResults}
                renderItem={renderSearchResultItem}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相关分类" /> }}
              />
            </Spin>
          </div>
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>显示前 {searchResults.length} 条结果</Text>
          </div>
        </ProCard>

        {/* --- 中间：配置区 (Configuration) --- */}
        <ProCard
          colSpan="40%"
          title="2. 配置 (Configuration)"
          headerBordered
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
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

        {/* --- 右侧：清单区 (Cart) --- */}
        <ProCard
          colSpan="30%"
          title={
            <Space>
              <span>3. 清单 (Cart)</span>
              <Badge count={cart.length} showZero color={lightPalette.menuTextSelected} />
            </Space>
          }
          headerBordered
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
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
      </ProCard>
    </DraggableModal>
  );
};

export default CategoryMarketplace;
