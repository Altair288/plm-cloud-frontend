import React, { useEffect, useMemo, useState } from 'react';
import { List, Card, Typography, Space, Button, Tag, Empty, theme, Tabs, Spin } from 'antd';
import { RightOutlined, LeftOutlined, AppstoreOutlined, ShopOutlined } from '@ant-design/icons';
import type { MillerNode } from '../mockData';
import { metaCategoryApi, type MetaCategoryBrowseNodeDto, type MetaCategoryClassGroupDto } from '../../../../../services/metaCategory';

const { Title, Text, Paragraph } = Typography;

interface CategoryBrowserProps {
  onSelect: (node: MillerNode) => void;
}

const mapBrowseNodeToMillerNode = (dto: MetaCategoryBrowseNodeDto): MillerNode => ({
  key: dto.key,
  code: dto.code,
  title: dto.title,
  hasChildren: dto.hasChildren,
  depth: dto.depth,
  fullPathName: dto.fullPathName,
});

const CategoryBrowser: React.FC<CategoryBrowserProps> = ({ onSelect }) => {
  const { token } = theme.useToken();
  
  // Data state (API)
  const [groups, setGroups] = useState<MillerNode[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);

  const [families, setFamilies] = useState<MillerNode[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [activeFamily, setActiveFamily] = useState<MillerNode | null>(null);

  // Right content can drill down: family -> clazz/commodity -> ...
  const [activeScope, setActiveScope] = useState<MillerNode | null>(null);
  const [scopeStack, setScopeStack] = useState<MillerNode[]>([]);

  const [classGroups, setClassGroups] = useState<MetaCategoryClassGroupDto[]>([]);
  const [classGroupsLoading, setClassGroupsLoading] = useState(false);

  // Load groups once
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setGroupsLoading(true);
      try {
        const resp = await metaCategoryApi.listUnspscSegments();
        if (cancelled) return;
        const nextGroups = resp.map(mapBrowseNodeToMillerNode);
        setGroups(nextGroups);
        setActiveGroupKey((prev) => prev ?? nextGroups[0]?.key ?? null);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load families when group changes
  useEffect(() => {
    if (!activeGroupKey) return;
    let cancelled = false;
    const run = async () => {
      setFamiliesLoading(true);
      setFamilies([]);
      setActiveFamily(null);
      setActiveScope(null);
      setScopeStack([]);
      setClassGroups([]);
      try {
        const resp = await metaCategoryApi.listUnspscFamilies(activeGroupKey);
        if (cancelled) return;
        setFamilies(resp.map(mapBrowseNodeToMillerNode));
      } finally {
        if (!cancelled) setFamiliesLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeGroupKey]);

  // Reset right-side scope when family changes
  useEffect(() => {
    setActiveScope(activeFamily);
    setScopeStack([]);
  }, [activeFamily?.key]);

  // Load right-side classes-with-commodities when scope changes
  useEffect(() => {
    if (!activeScope?.key) return;
    let cancelled = false;
    const run = async () => {
      setClassGroupsLoading(true);
      setClassGroups([]);
      try {
        const resp = await metaCategoryApi.listUnspscClassesWithCommodities(activeScope.key);
        if (cancelled) return;
        setClassGroups(resp);
      } finally {
        if (!cancelled) setClassGroupsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeScope?.key]);

  const activeGroup = useMemo(() => groups.find((g) => g.key === activeGroupKey) ?? null, [groups, activeGroupKey]);

  // Render Left: Families under active group
  const renderFamiliesSidebar = () => (
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
        <Text strong>大类</Text>
        <Tag>{families.length}</Tag>
      </div>
      {!activeGroupKey ? (
        <div style={{ padding: 24, textAlign: 'center', color: token.colorTextTertiary }}>
          请先选择上方分组
        </div>
      ) : (
        <Spin spinning={familiesLoading} style={{ padding: 12 }}>
          <List
            dataSource={families}
            size="small"
            split={false}
            renderItem={(item) => {
              const isActive = activeFamily?.key === item.key;
              return (
                <div
                  onClick={() => setActiveFamily(item)}
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
        </Spin>
      )}
    </div>
  );

  // Render Right Content
  const renderContent = () => {
    if (!activeFamily) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: token.colorTextTertiary, backgroundColor: token.colorBgContainer }}>
          <ShopOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.1 }} />
          <Text type="secondary">请选择左侧大类以查看详情</Text>
        </div>
      );
    }

    const handleClickNode = (node: MillerNode) => {
      if (node.hasChildren) {
        setScopeStack((prev) => {
          const current = activeScope ?? activeFamily;
          if (!current || current.key === node.key) return prev;
          return [...prev, current];
        });
        setActiveScope(node);
        return;
      }
      onSelect(node);
    };

    const canGoBack = !!activeFamily && (activeScope?.key !== activeFamily.key || scopeStack.length > 0);
    const handleGoBack = () => {
      setScopeStack((prev) => {
        if (prev.length === 0) {
          setActiveScope(activeFamily);
          return [];
        }
        const next = [...prev];
        const last = next.pop() ?? null;
        setActiveScope(last ?? activeFamily);
        return next;
      });
    };

    const headerTitle = activeScope?.title ?? activeFamily.title;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${token.colorBorderSecondary}`, backgroundColor: token.colorBgContainer }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {canGoBack && (
              <div>
                <Button
                  type="text"
                  size="small"
                  icon={<LeftOutlined />}
                  onClick={handleGoBack}
                  style={{ padding: 0 }}
                >
                  返回上级
                </Button>
              </div>
            )}

            <Title level={4} style={{ margin: 0 }}>{headerTitle}</Title>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fafafa' }}>
          <Spin spinning={classGroupsLoading}>
            {classGroups.map((group) => {
              const clazzNode = mapBrowseNodeToMillerNode(group.clazz);
              const commodities = (group.commodities || []).map(mapBrowseNodeToMillerNode);
              return (
                <Card
                  key={group.clazz.key}
                  title={<Space><AppstoreOutlined />{group.clazz.title}</Space>}
                  size="small"
                  style={{ marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                  headStyle={{ backgroundColor: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {commodities.map((node) => (
                      <Button
                        key={node.key}
                        type="text"
                        style={{ backgroundColor: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}` }}
                        onClick={() => handleClickNode(node)}
                      >
                        {node.title}
                      </Button>
                    ))}

                    {commodities.length === 0 && !group.clazz.hasChildren && (
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        onClick={() => handleClickNode(clazzNode)}
                      >
                        选择该分类
                      </Button>
                    )}

                    {commodities.length === 0 && group.clazz.hasChildren && (
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        onClick={() => handleClickNode(clazzNode)}
                      >
                        查看子分类
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}

            {!classGroupsLoading && classGroups.length === 0 && (
              <Empty description="暂无子分类" />
            )}
          </Spin>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, overflow: 'hidden', backgroundColor: token.colorBgContainer }}>
      {/* Top Tabs for Groups */}
      <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: '0 16px', backgroundColor: token.colorBgContainer }}>
        <Tabs
          activeKey={activeGroupKey ?? undefined}
          onChange={(key) => setActiveGroupKey(key)}
          items={groups.map(group => ({
            key: group.key,
            label: group.title,
          }))}
          style={{ marginBottom: -1 }}
        />
      </div>
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {groupsLoading ? (
          <div style={{ flex: 1, padding: 24 }}>
            <Spin spinning />
          </div>
        ) : (
          <>
            {renderFamiliesSidebar()}
            {renderContent()}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryBrowser;
