import React, { useState, useRef, useEffect } from "react";
import {
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import { Drawer, Empty, Tag, Dropdown, MenuProps, Button, Space } from "antd";
import type { ActionType, ProColumns } from "@ant-design/pro-table";
import { EditableProTable } from "@ant-design/pro-components";

interface AttributeItem {
  id: string;
  code: string;
  name: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "multi-enum";
  unit?: string;
  version: number;
  isLatest: boolean;
  description?: string;
}

interface EnumOptionItem {
  id: string;
  value: string;
  label: string;
  color?: string;
  order: number;
}

interface Props {
  currentNode?: { title?: string; [key: string]: any };
}

const AttributeDesigner: React.FC<Props> = ({ currentNode }) => {
  const actionRef = useRef<ActionType>();
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dataSource, setDataSource] = useState<AttributeItem[]>([
    {
      id: "1",
      code: "material",
      name: "材料",
      type: "enum",
      unit: "",
      version: 1,
      isLatest: true,
      description: "主要材料",
    },
    {
      id: "2",
      code: "weight",
      name: "重量",
      type: "number",
      unit: "千克",
      version: 2,
      isLatest: true,
      description: "重量（kg）",
    },
    {
      id: "3",
      code: "manufacture_date",
      name: "生产日期",
      type: "date",
      unit: "",
      version: 1,
      isLatest: true,
    },
    ...Array.from({ length: 17 }).map((_, i) => ({
      id: `${i + 4}`,
      code: `attribute_${i + 4}`,
      name: `测试属性 ${i + 4}`,
      type: ["string", "number", "boolean", "date", "enum"][i % 5] as any,
      unit: i % 5 === 1 ? "mm" : "",
      version: 1,
      isLatest: true,
      description: `测试属性描述 ${i + 4}`,
    })),
  ]);

  // Drawer State
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentAttribute, setCurrentAttribute] =
    useState<AttributeItem | null>(null);
  const [enumOptions, setEnumOptions] = useState<EnumOptionItem[]>([
    {
      id: "1",
      value: "STEEL",
      label: "不锈钢",
      color: "#C0C0C0",
      order: 1,
    },
    {
      id: "2",
      value: "ALUMINUM",
      label: "铝合金",
      color: "#A9A9A9",
      order: 2,
    },
    { id: "3", value: "PLASTIC", label: "塑料", color: "blue", order: 3 },
  ]);
  const [enumEditableKeys, setEnumEditableKeys] = useState<React.Key[]>([]);

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

  const handleConfigureEnum = (record: AttributeItem) => {
    setCurrentAttribute(record);
    setDrawerVisible(true);
    // In real app, fetch enum options for this attribute here
  };

  const columns: ProColumns<AttributeItem>[] = [
    {
      title: "显示名称",
      dataIndex: "name",
      formItemProps: {
        rules: [{ required: true, message: "请输入名称" }],
      },
      width: "20%",
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
      width: "15%",
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
      title: "最新",
      dataIndex: "isLatest",
      readonly: true,
      width: "10%",
      valueType: "select",
      valueEnum: {
        true: { text: "是", status: "Success" },
        false: { text: "否", status: "Default" },
      },
    },
    {
      title: "操作",
      valueType: "option",
      width: 150,
      render: (text, record, _, action) => {
        // High frequency action: Edit
        const editAction = (
          <a
            key="editable"
            onClick={() => {
              action?.startEditable?.(record.id);
            }}
          >
            编辑
          </a>
        );

        // Low frequency actions in dropdown
        const moreItems: MenuProps["items"] = [];

        if (record.type === "enum" || record.type === "multi-enum") {
          moreItems.push({
            key: "values",
            label: "枚举值管理",
            icon: <SettingOutlined />,
            onClick: () => handleConfigureEnum(record),
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
          editAction,
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
          handleConfigureEnum(contextMenuState.record);
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

  const enumColumns: ProColumns<EnumOptionItem>[] = [
    {
      title: "值编码",
      dataIndex: "value",
      width: "30%",
    },
    {
      title: "显示标签",
      dataIndex: "label",
      width: "30%",
    },
    {
      title: "颜色/标记",
      dataIndex: "color",
      valueType: "color",
      width: "20%",
    },
    {
      title: "操作",
      valueType: "option",
      render: (text, record, _, action) => {
        return [
          <a
            key="editable"
            onClick={() => {
              action?.startEditable?.(record.id);
            }}
          >
            编辑
          </a>,
          <a
            key="delete"
            className="text-red-500"
            onClick={() => {
              setEnumOptions(
                enumOptions.filter((item) => item.id !== record.id),
              );
            }}
          >
            删除
          </a>,
        ];
      },
    },
  ];

  return (
    <div className="w-full attribute-designer-container">
      <style>{`
        .attribute-designer-container .ant-table-body {
            overflow-y: auto !important;
        }
      `}</style>
      <EditableProTable<AttributeItem>
        rowKey="id"
        actionRef={actionRef}
        headerTitle={`属性定义: ${currentNode?.title || ""}`}
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
        scroll={{ y: "calc(100vh - 440px)" }}
        toolBarRender={() => [
          selectedRowKeys.length > 0 && (
            <Space key="batch">
              <Button
                danger
                onClick={() => {
                  setDataSource(
                    dataSource.filter(
                      (item) => !selectedRowKeys.includes(item.id),
                    ),
                  );
                  setSelectedRowKeys([]);
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

      {/* Context Menu Anchor */}
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

      <Drawer
        title={`管理枚举值: ${currentAttribute?.name}`}
        width={900}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        maskClosable={false}
        mask={false}
      >
        {currentAttribute ? (
          <EditableProTable<EnumOptionItem>
            rowKey="id"
            headerTitle="已定义选项"
            recordCreatorProps={{
              position: "bottom",
              record: () => ({
                id: (Math.random() * 1000000).toFixed(0),
                value: "",
                label: "",
                order: 0,
              }),
            }}
            columns={enumColumns}
            value={enumOptions}
            onChange={(value) => setEnumOptions([...value])}
            editable={{
              type: "multiple",
              editableKeys: enumEditableKeys,
              onChange: setEnumEditableKeys,
              onSave: async (rowKey, data, row) => {
                // save enum option
              },
            }}
          />
        ) : (
          <Empty />
        )}
      </Drawer>
    </div>
  );
};

export default AttributeDesigner;
