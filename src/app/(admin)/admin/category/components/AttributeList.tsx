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
} from "antd";
import { AttributeItem, AttributeType } from "./types";

interface AttributeListProps {
  dataSource: AttributeItem[];
  setDataSource: (data: AttributeItem[]) => void;
  selectedAttributeId: string | null;
  onSelectAttribute: (id: string, item: AttributeItem) => void;
  searchText: string;
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

const AttributeList: React.FC<AttributeListProps> = ({
  dataSource,
  setDataSource,
  selectedAttributeId,
  onSelectAttribute,
  searchText,
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
      item.code.toLowerCase().includes(searchText.toLowerCase()),
  );

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
        setDataSource(dataSource.filter((d) => d.id !== item.id));
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
      {/* List Content */}
      <div style={{ flex: 1, overflowY: "auto" }} ref={listRef}>
        <List
          itemLayout="horizontal"
          dataSource={filteredData}
          split={false}
          renderItem={(item) => {
            const isSelected = selectedAttributeId === item.id;
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
                }}
                className={!isSelected ? "hover:bg-gray-50" : ""} // Keep minimal tailwind for hover if not strict
                onClick={() => onSelectAttribute(item.id, item)}
                actions={[
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
                  </Dropdown>,
                ]}
              >
                <div style={{ width: "100%" }}>
                  <Flex
                    justify="space-between"
                    align="center"
                    style={{ marginBottom: 4 }}
                  >
                    <Text
                      strong
                      style={{ fontSize: 14, maxWidth: 180 }}
                      ellipsis
                    >
                      {item.name || (
                        <span
                          style={{
                            color: token.colorTextQuaternary,
                            fontStyle: "italic",
                          }}
                        >
                          未命名属性 (Unnamed Attribute)
                        </span>
                      )}
                    </Text>
                    {item.required && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: token.colorError,
                        }}
                        title="Required"
                      ></div>
                    )}
                  </Flex>

                  <Flex align="center">
                    <span
                      style={{
                        marginRight: 8,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title={item.type}
                    >
                      {getTypeIcon(item.type)}
                    </span>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, fontFamily: "monospace" }}
                      ellipsis
                    >
                      {item.code}
                    </Text>
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
        {dataSource.length} attributes defined
      </div>
    </div>
  );
};

export default AttributeList;
