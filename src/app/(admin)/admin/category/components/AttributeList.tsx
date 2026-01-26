import React, { useState, useRef, useEffect } from "react";
import {
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import { Tag, Dropdown, MenuProps, Button, Space } from "antd";
import type { ActionType, ProColumns } from "@ant-design/pro-table";
import { EditableProTable } from "@ant-design/pro-components";
import { AttributeItem } from "./types";

interface AttributeListProps {
    currentNode?: { title?: string; [key: string]: any };
    dataSource: AttributeItem[];
    setDataSource: (data: AttributeItem[]) => void;
    selectedAttributeId: string | null;
    onSelectAttribute: (id: string) => void;
}

const AttributeList: React.FC<AttributeListProps> = ({
    currentNode,
    dataSource,
    setDataSource,
    selectedAttributeId,
    onSelectAttribute
}) => {
  const actionRef = useRef<ActionType>();
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Context Menu State
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    record: AttributeItem | null;
  }>({ visible: false, x: 0, y: 0, record: null });

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenuState.visible) {
        setContextMenuState({ ...contextMenuState, visible: false });
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [contextMenuState]);

  const menuItems: MenuProps["items"] = [
    {
      key: "edit",
      label: "编辑",
      icon: <EditOutlined />,
      onClick: () => {
        if (contextMenuState.record) {
          actionRef.current?.startEditable(contextMenuState.record.id);
        }
      },
    },
    {
      key: "values",
      label: "枚举值管理",
      icon: <SettingOutlined />,
      disabled:
        !contextMenuState.record ||
        !["enum", "multi-enum"].includes(contextMenuState.record.type),
      onClick: () => {
        if (contextMenuState.record) {
          onSelectAttribute(contextMenuState.record.id);
        }
      },
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "删除",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        if (contextMenuState.record) {
          setDataSource(
            dataSource.filter(
              (item) => item.id !== contextMenuState.record?.id,
            ),
          );
        }
      },
    },
  ];

  const columns: ProColumns<AttributeItem>[] = [
    {
      title: "显示名称",
      dataIndex: "name",
      formItemProps: {
        rules: [{ required: true, message: "请输入名称" }],
      },
      width: "25%",
    },
    {
      title: "编码",
      dataIndex: "code",
      width: "20%",
      formItemProps: {
        rules: [{ required: true, message: "请输入编码" }],
      },
    },
    {
      title: "数据类型",
      key: "type",
      dataIndex: "type",
      valueType: "select",
      valueEnum: {
        string: { text: "字符串", status: "Default" },
        number: { text: "数字", status: "Default" },
        boolean: { text: "布尔值", status: "Default" },
        date: { text: "日期", status: "Default" },
        enum: { text: "枚举", status: "Warning" },
        "multi-enum": { text: "多选枚举", status: "Warning" },
      },
      width: "20%",
    },
    {
      title: "单位",
      dataIndex: "unit",
      width: "10%",
    },
    {
      title: "版本",
      dataIndex: "version",
      readonly: true,
      width: "10%",
      render: (dom) => <Tag color="blue">V{dom}</Tag>,
    },
    {
      title: "操作",
      valueType: "option",
      width: 120,
      render: (text, record, _, action) => {
        const moreItems: MenuProps["items"] = [];

        if (record.type === "enum" || record.type === "multi-enum") {
          moreItems.push({
            key: "values",
            label: "枚举值管理",
            icon: <SettingOutlined />,
            onClick: () => onSelectAttribute(record.id),
          });
        }

        moreItems.push({
          key: "delete",
          label: "删除",
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => {
            setDataSource(dataSource.filter((item) => item.id !== record.id));
          },
        });

        return [
          <a
            key="editable"
            onClick={() => {
              action?.startEditable?.(record.id);
            }}
          >
            编辑
          </a>,
          <Dropdown
            key="more"
            menu={{ items: moreItems }}
            placement="bottomLeft"
          >
            <a
              className="ant-dropdown-link"
              onClick={(e) => e.preventDefault()}
            >
              <EllipsisOutlined style={{ fontSize: 16 }} />
            </a>
          </Dropdown>,
        ];
      },
    },
  ];

  return (
    <>
      <style>{`
        .attribute-list-container .ant-table-body {
            overflow-y: auto !important;
        }
      `}</style>
      <div className="attribute-list-container h-full flex flex-col">
        <EditableProTable<AttributeItem>
            rowKey="id"
            actionRef={actionRef}
            headerTitle={`属性列表`}
            maxLength={50}
            recordCreatorProps={{
            position: "bottom",
            record: () => ({
                id: (Math.random() * 1000000).toFixed(0),
                code: "",
                name: "",
                type: "string",
                unit: "",
                version: 1,
                isLatest: true,
            }),
            }}
            rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            }}
            tableAlertRender={false}
            scroll={{ y: "calc(80vh - 180px)" }} // Adjusted for modal height
            toolBarRender={() => [
            selectedRowKeys.length > 0 && (
                <Space key="batch">
                <Button
                    danger
                    onClick={() => {
                        setDataSource(
                            dataSource.filter((item) => !selectedRowKeys.includes(item.id))
                        );
                        setSelectedRowKeys([]);
                        // Clear selection if deleted
                        if (selectedAttributeId && selectedRowKeys.includes(selectedAttributeId)) {
                             onSelectAttribute('');
                        }
                    }}
                >
                    批量删除 ({selectedRowKeys.length})
                </Button>
                </Space>
            ),
            ]}
            columns={columns}
            value={dataSource}
            onChange={(value) => setDataSource([...value])}
            editable={{
                type: "multiple",
                editableKeys,
                onSave: async (rowKey, data, row) => {
                    console.log(rowKey, data, row);
                },
                onChange: setEditableRowKeys,
            }}
            onRow={(record) => ({
                onClick: () => {
                    onSelectAttribute(record.id);
                },
                style: {
                    cursor: 'pointer',
                    backgroundColor: record.id === selectedAttributeId ? '#e6f7ff' : undefined
                },
                onContextMenu: (e) => {
                    e.preventDefault();
                    setContextMenuState({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        record,
                    });
                },
            })}
        />

        <Dropdown
            menu={{ items: menuItems }}
            open={contextMenuState.visible}
            trigger={["contextMenu"]}
            onOpenChange={(v) => {
            if (!v) setContextMenuState((s) => ({ ...s, visible: false }));
            }}
        >
            <span
            style={{
                position: "fixed",
                left: contextMenuState.x,
                top: contextMenuState.y,
                width: 1,
                height: 1,
            }}
            />
        </Dropdown>
      </div>
    </>
  );
};

export default AttributeList;
