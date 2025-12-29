import React, { useState, useMemo } from 'react';
import { List, Card, Typography, Space, Button, Breadcrumb, Tag, Empty, theme, Divider, Tabs } from 'antd';
import { RightOutlined, ArrowLeftOutlined, AppstoreOutlined, ShopOutlined } from '@ant-design/icons';
import type { MillerNode } from '../mockData';
import { lightPalette } from '../../../../../styles/colors';

const { Title, Text, Paragraph } = Typography;

interface CategoryBrowserProps {
  data: MillerNode[];
  onSelect: (node: MillerNode) => void;
}

const CategoryBrowser: React.FC<CategoryBrowserProps> = ({ data, onSelect }) => {
  const { token } = theme.useToken();
  
  // State
  const [activeGroup, setActiveGroup] = useState<MillerNode | null>(data[0] || null); // Level 0 (Group)
  const [activeSegment, setActiveSegment] = useState<MillerNode | null>(null); // Level 1 (Segment)
  const [activeFamily, setActiveFamily] = useState<MillerNode | null>(null); // Level 2
  const [activeClass, setActiveClass] = useState<MillerNode | null>(null); // Level 3

  // Handle Tab Change (Group Switch)
  const handleTabChange = (key: string) => {
    const group = data.find(g => g.key === key) || null;
    setActiveGroup(group);
    setActiveSegment(null);
    setActiveFamily(null);
    setActiveClass(null);
  };

  // Reset when segment changes
  const handleSegmentClick = (segment: MillerNode) => {
    setActiveSegment(segment);
    setActiveFamily(null);
    setActiveClass(null);
  };

  const handleClassClick = (cls: MillerNode, family: MillerNode) => {
    setActiveFamily(family);
    setActiveClass(cls);
  };

  const handleBackToCategories = () => {
    setActiveClass(null);
    setActiveFamily(null);
  };

  // Render Level 1: Segments (Children of selected Group)
  const renderSegmentSidebar = () => (
    <div style={{ 
      width: 280, 
      borderRight: `1px solid ${token.colorBorderSecondary}`, 
      overflowY: 'auto',
      backgroundColor: token.colorFillQuaternary, // Lighter background
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text strong>大类 (Segments)</Text>
        <Tag>{activeGroup?.children?.length || 0}</Tag>
      </div>
      {!activeGroup ? (
        <div style={{ padding: 24, textAlign: 'center', color: token.colorTextTertiary }}>
          请先选择上方分组
        </div>
      ) : (
        <List
          dataSource={activeGroup.children || []}
          size="small"
          split={false}
          renderItem={(item) => {
            const isActive = activeSegment?.key === item.key;
            return (
              <div
                onClick={() => handleSegmentClick(item)}
                style={{
                  padding: '12px 16px 12px 20px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? token.colorBgContainer : 'transparent',
                  color: isActive ? token.colorPrimary : token.colorText,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  borderBottom: `1px solid ${token.colorBorderSecondary}`
                }}
              >
                <span style={{ marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={item.title}>
                  <span style={{ opacity: 0.7, marginRight: 6, fontSize: 12, fontWeight: 'normal' }}>{item.code}</span>
                  {item.title}
                </span>
                {isActive && <RightOutlined style={{ fontSize: 10, flexShrink: 0 }} />}
              </div>
            );
          }}
        />
      )}
    </div>
  );

  // Render Right Content
  const renderContent = () => {
    if (!activeSegment) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: token.colorTextTertiary, backgroundColor: token.colorBgContainer }}>
          <ShopOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.1 }} />
          <Text type="secondary">请选择左侧大类以查看详情</Text>
        </div>
      );
    }

    // View 1: Family & Class Browser (The "Mega Menu" flattened)
    if (!activeClass) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${token.colorBorderSecondary}`, backgroundColor: token.colorBgContainer }}>
            <Title level={4} style={{ margin: 0 }}>{activeSegment.title}</Title>
            <Text type="secondary">UNSPSC Segment {activeSegment.code}</Text>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fafafa' }}>
            {activeSegment.children?.map((family) => (
              <Card 
                key={family.key} 
                title={<Space><AppstoreOutlined />{family.title}</Space>}
                size="small"
                style={{ marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                headStyle={{ backgroundColor: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {family.children?.map((cls) => (
                    <Button 
                      key={cls.key} 
                      type="text" 
                      style={{ backgroundColor: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}` }}
                      onClick={() => handleClassClick(cls, family)}
                    >
                      {cls.title}
                    </Button>
                  ))}
                  {(!family.children || family.children.length === 0) && <Text type="secondary" style={{ fontSize: 12 }}>无子分类</Text>}
                </div>
              </Card>
            ))}
            {(!activeSegment.children || activeSegment.children.length === 0) && <Empty description="暂无子分类" />}
          </div>
        </div>
      );
    }

    // View 2: Commodity List (Leaf Nodes)
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 24px', borderBottom: `1px solid ${token.colorBorderSecondary}`, backgroundColor: token.colorBgContainer }}>
          <Space style={{ marginBottom: 8 }}>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={handleBackToCategories} style={{ paddingLeft: 0 }}>
              返回分类概览
            </Button>
          </Space>
          <Breadcrumb 
            items={[
              { title: activeSegment.title },
              { title: activeFamily?.title },
              { title: activeClass.title }
            ]} 
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          <List
            dataSource={activeClass.children || []}
            renderItem={(commodity) => (
              <List.Item 
                onClick={() => onSelect(commodity)}
                style={{ 
                  padding: '16px 24px', 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                className="commodity-item"
              >
                <List.Item.Meta
                  title={<Text strong>{commodity.title}</Text>}
                  description={
                    <Space>
                      <Tag>{commodity.code}</Tag>
                      <Text type="secondary">Commodity</Text>
                    </Space>
                  }
                />
                <Button type="primary" ghost size="small">选择</Button>
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="该分类下暂无商品" /> }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, overflow: 'hidden', backgroundColor: token.colorBgContainer }}>
      {/* Top Tabs for Groups */}
      <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: '0 16px', backgroundColor: token.colorBgContainer }}>
        <Tabs
          activeKey={activeGroup?.key}
          onChange={handleTabChange}
          items={data.map(group => ({
            key: group.key,
            label: group.title,
          }))}
          style={{ marginBottom: -1 }}
        />
      </div>
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {renderSegmentSidebar()}
        {renderContent()}
      </div>
    </div>
  );
};

export default CategoryBrowser;
