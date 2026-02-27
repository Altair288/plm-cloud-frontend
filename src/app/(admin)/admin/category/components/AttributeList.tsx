import React, { useState, useEffect, useRef } from "react";
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  NumberOutlined,
  FontColorsOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import {
  List,
  Input,
  Button,
  Dropdown,
  MenuProps,
  Typography,
  theme,
  Flex,
  Tooltip,
  Checkbox,
} from "antd";
import { AttributeItem, AttributeType } from "./types";

interface AttributeListProps {
  dataSource: AttributeItem[];
  setDataSource: (data: AttributeItem[]) => void;
  selectedAttributeId: string | null;
  onSelectAttribute: (id: string, item: AttributeItem) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onDeleteAttribute?: (item: AttributeItem) => void;
}

const { Text } = Typography;
// ... existing getTypeIcon code ...
const getTypeIcon = (type: AttributeType) => {
  switch (type) {
    case "string":
      return <FontColorsOutlined style={{ color: "#1890ff" }} />;
    case "number":
      return <NumberOutlined style={{ color: "#52c41a" }} />;
    case "date":
      return <CalendarOutlined style={{ color: "#fa8c16" }} />;
    case "boolean":
      return <CheckSquareOutlined style={{ color: "#722ed1" }} />;
    case "enum":
      return <UnorderedListOutlined style={{ color: "#13c2c2" }} />;
    case "multi-enum":
      return <UnorderedListOutlined style={{ color: "#13c2c2" }} />;
    default:
      return <FontColorsOutlined />;
  }
};

const getTypeLabel = (type: AttributeType) => {
  switch (type) {
    case "string":
      return "文本型";
    case "number":
      return "数字型";
    case "date":
      return "日期型";
    case "boolean":
      return "布尔型";
    case "enum":
      return "枚举型（单选）";
    case "multi-enum":
      return "枚举型（多选）";
    default:
      return type;
  }
};

const AttributeList: React.FC<AttributeListProps> = ({
  dataSource,
  setDataSource,
  selectedAttributeId,
  onSelectAttribute,
  searchText,
  onSearchTextChange,
  onDeleteAttribute,
}) => {
  const { token } = theme.useToken();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedAttributeId && listRef.current) {
      const element = document.getElementById(`attr-list-item-${selectedAttributeId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedAttributeId, dataSource.length]);

  const filteredData = dataSource.filter(
    (item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.code.toLowerCase().includes(searchText.toLowerCase()) ||
      item.attributeField?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleSelectAll = (e: any) => {
    if (e.target.checked) {
      setSelectedRowKeys(filteredData.map(item => item.id));
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(prev => [...prev, id]);
    } else {
      setSelectedRowKeys(prev => prev.filter(key => key !== id));
    }
  };

  const getMenuItems = (item: AttributeItem): MenuProps["items"] => [
    {
      key: "duplicate",
      label: "复制 (Duplicate)",
      icon: <CopyOutlined />,
      onClick: (e) => {
        e.domEvent.stopPropagation();
      },
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "删除 (Delete)",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        if (onDeleteAttribute) {
          onDeleteAttribute(item);
        } else {
          setDataSource(dataSource.filter((d) => d.id !== item.id));
        }
      },
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: token.colorBgContainer,
      }}
    >
      {/* Search Bar */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Input
          placeholder="筛选属性 . . ."
          prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          allowClear
        />
      </div>

      {/* List Header */}
      <div style={{ 
        padding: "8px 16px", 
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorFillAlter,
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingRight: 40,
        position: "relative"
      }}>
        <Checkbox 
          checked={filteredData.length > 0 && selectedRowKeys.length === filteredData.length}
          indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredData.length}
          onChange={handleSelectAll}
        />
        <Text type="secondary" style={{ fontSize: 12, width: 30, textAlign: "center" }}>序号</Text>
        <Flex align="center" style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12, flex: 1, minWidth: 0 }}>属性名称</Text>
          <Text type="secondary" style={{ fontSize: 12, flex: 1, minWidth: 0 }}>属性字段</Text>
          <Text type="secondary" style={{ fontSize: 12, width: 100, flexShrink: 0 }}>数据类型</Text>
          <div style={{ width: 16, flexShrink: 0 }}></div>
        </Flex>
        {selectedRowKeys.length > 0 && (
          <Button 
            type="text" 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => {
              // TODO: Implement batch delete
              console.log("Batch delete", selectedRowKeys);
            }}
            style={{ position: "absolute", right: 8 }}
          />
        )}
      </div>

      {/* List Content */}
      <div style={{ flex: 1, overflowY: "auto" }} ref={listRef}>
        <List
          itemLayout="horizontal"
          dataSource={filteredData}
          split={false}
          renderItem={(item, index) => {
            const isSelected = selectedAttributeId === item.id;
            const isChecked = selectedRowKeys.includes(item.id);
            return (
              <div id={`attr-list-item-${item.id}`}>
                <List.Item
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  borderLeft: `4px solid ${isSelected ? token.colorPrimary : "transparent"}`,
                  background: isSelected
                    ? token.controlItemBgActive
                    : "transparent",
                  position: "relative",
                  paddingRight: "40px"
                }}
                className={!isSelected ? "hover:bg-gray-50" : ""} // Keep minimal tailwind for hover if not strict
                onClick={() => onSelectAttribute(item.id, item)}
              >
                <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
                  <Dropdown
                    key="more"
                    menu={{ items: getMenuItems(item) }}
                    trigger={["click"]}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={
                        <MoreOutlined
                          style={{ color: token.colorTextQuaternary }}
                        />
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 12 }}>
                  <Checkbox 
                    checked={isChecked} 
                    onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Text type="secondary" style={{ fontSize: 12, width: 30, textAlign: "center" }}>
                    {index + 1}
                  </Text>
                  
                  <Flex align="center" style={{ flex: 1, minWidth: 0, gap: 8 }}>
                    <Text
                      strong
                      style={{ fontSize: 14, flex: 1, minWidth: 0 }}
                      ellipsis={{ tooltip: item.name || "未命名属性" }}
                    >
                      {item.name || (
                        <span
                          style={{
                            color: token.colorTextQuaternary,
                            fontStyle: "italic",
                          }}
                        >
                          未命名属性
                        </span>
                      )}
                    </Text>

                    <Text
                      type="secondary"
                      style={{ fontSize: 12, fontFamily: "monospace", flex: 1, minWidth: 0 }}
                      ellipsis={{ tooltip: item.attributeField }}
                    >
                      {item.attributeField || '-'}
                    </Text>

                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        width: 100
                      }}
                      title={item.type}
                    >
                      {getTypeIcon(item.type)}
                      <span style={{ fontSize: 12 }}>
                        {getTypeLabel(item.type)}
                      </span>
                    </span>
                    
                    <div style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      {item.required && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: token.colorError,
                          }}
                          title="必填"
                        ></div>
                      )}
                    </div>
                  </Flex>
                </div>
                </List.Item>
              </div>
            );
          }}
        />
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: 8,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgLayout,
          textAlign: "center",
          fontSize: 12,
          color: token.colorTextQuaternary,
        }}
      >
        共 {dataSource.length} 个属性
      </div>
    </div>
  );
};

export default AttributeList;
