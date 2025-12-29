import React, { useMemo, useEffect, useRef } from 'react';
import { List, Typography, Empty, theme } from 'antd';
import { RightOutlined, CheckOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import type { MillerNode } from '../mockData';

const { Text } = Typography;

interface MillerColumnsProps {
  data: MillerNode[];
  selectedPath: string[]; // Array of keys
  onSelect: (node: MillerNode, level: number) => void;
  height?: number | string;
}

const MillerColumns: React.FC<MillerColumnsProps> = ({ data, selectedPath, onSelect, height = '100%' }) => {
  const { token } = theme.useToken();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate columns based on selectedPath
  const columns = useMemo(() => {
    const cols = [data];
    let currentLevelNodes = data;
    
    for (let i = 0; i < selectedPath.length; i++) {
      const key = selectedPath[i];
      const node = currentLevelNodes.find(n => n.key === key);
      if (node && node.children && node.children.length > 0) {
        currentLevelNodes = node.children;
        cols.push(currentLevelNodes);
      } else {
        // If node is leaf or not found, stop
        break;
      }
    }
    return cols;
  }, [data, selectedPath]);

  // Auto-scroll to the right when columns change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [columns.length]);

  return (
    <div 
      ref={scrollContainerRef}
      style={{ 
        display: 'flex', 
        height, 
        border: `1px solid ${token.colorBorderSecondary}`, 
        borderRadius: token.borderRadius,
        overflowX: 'auto',
        backgroundColor: token.colorBgContainer,
      }}
    >
      {columns.map((colNodes, level) => (
        <div key={level} style={{ 
          width: 280, 
          minWidth: 280, 
          borderRight: `1px solid ${token.colorBorderSecondary}`, 
          display: 'flex',
          flexDirection: 'column',
          height: '100%' 
        }}>
          <div style={{ 
            padding: '8px 12px', 
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorFillQuaternary,
            fontSize: 12,
            color: token.colorTextSecondary
          }}>
            {level === 0 ? 'Segment (段)' : level === 1 ? 'Family (族)' : level === 2 ? 'Class (类)' : 'Commodity (商品)'}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <List
              dataSource={colNodes}
              size="small"
              split={false}
              renderItem={(item) => {
                const isSelected = selectedPath[level] === item.key;
                return (
                  <div
                    onClick={() => onSelect(item, level)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
                      padding: '8px 12px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    }}
                    className="miller-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1 }}>
                      {item.isLeaf ? 
                        <FileOutlined style={{ marginRight: 8, color: token.colorTextTertiary }} /> : 
                        <FolderOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                      }
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        <Text type="secondary" style={{ fontSize: 12, marginRight: 8, display: 'block' }}>{item.code}</Text>
                        <Text strong={isSelected} style={{ color: isSelected ? token.colorPrimary : token.colorText }}>{item.title}</Text>
                      </div>
                    </div>
                    {!item.isLeaf && <RightOutlined style={{ fontSize: 10, color: token.colorTextQuaternary }} />}
                    {item.isLeaf && isSelected && <CheckOutlined style={{ color: token.colorPrimary }} />}
                  </div>
                );
              }}
            />
          </div>
        </div>
      ))}
      {/* Placeholder for empty state if no selection */}
      {columns.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="No Data" />
        </div>
      )}
    </div>
  );
};

export default MillerColumns;
