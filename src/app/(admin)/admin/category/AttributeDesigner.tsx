import React, { useState } from "react";
import { SettingOutlined } from "@ant-design/icons";
import { Drawer, Empty } from "antd";
import type { ProColumns } from "@ant-design/pro-table";
import { EditableProTable } from "@ant-design/pro-components";

interface AttributeItem {
  id: string;
  code: string;
  name: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "multi-enum";
  required: boolean;
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
  currentNode: any; // CategoryTreeNode
}

const AttributeDesigner: React.FC<Props> = ({ currentNode }) => {
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [dataSource, setDataSource] = useState<AttributeItem[]>([
    {
      id: "1",
      code: "material",
      name: "Material",
      type: "enum",
      required: true,
      description: "Main material of the item",
    },
    {
      id: "2",
      code: "weight",
      name: "Weight",
      type: "number",
      required: false,
      description: "Item weight in kg",
    },
    {
      id: "3",
      code: "manufacture_date",
      name: "Manufacture Date",
      type: "date",
      required: false,
    },
  ]);

  // Drawer State
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentAttribute, setCurrentAttribute] =
    useState<AttributeItem | null>(null);
  const [enumOptions, setEnumOptions] = useState<EnumOptionItem[]>([
    {
      id: "1",
      value: "STEEL",
      label: "Stainless Steel",
      color: "#C0C0C0",
      order: 1,
    },
    {
      id: "2",
      value: "ALUMINUM",
      label: "Aluminum",
      color: "#A9A9A9",
      order: 2,
    },
    { id: "3", value: "PLASTIC", label: "Plastic", color: "blue", order: 3 },
  ]);
  const [enumEditableKeys, setEnumEditableKeys] = useState<React.Key[]>([]);

  const handleConfigureEnum = (record: AttributeItem) => {
    setCurrentAttribute(record);
    setDrawerVisible(true);
    // In real app, fetch enum options for this attribute here
  };

  const columns: ProColumns<AttributeItem>[] = [
    {
      title: "Display Name",
      dataIndex: "name",
      formItemProps: {
        rules: [{ required: true, message: "Name is required" }],
      },
      width: "20%",
    },
    {
      title: "Code",
      dataIndex: "code",
      width: "20%",
      formItemProps: {
        rules: [{ required: true, message: "Code is required" }],
      },
    },
    {
      title: "Data Type",
      key: "type",
      dataIndex: "type",
      valueType: "select",
      valueEnum: {
        string: { text: "String", status: "Default" },
        number: { text: "Number", status: "Default" },
        boolean: { text: "Boolean", status: "Default" },
        date: { text: "Date", status: "Default" },
        enum: { text: "Enum (Single)", status: "Processing" },
        "multi-enum": { text: "Enum (Multi)", status: "Processing" },
      },
      width: "20%",
    },
    {
      title: "Required",
      dataIndex: "required",
      valueType: "switch",
      width: "10%",
    },
    {
      title: "Actions",
      valueType: "option",
      width: 200,
      render: (text, record, _, action) => {
        const actions = [
          <a
            key="editable"
            onClick={() => {
              action?.startEditable?.(record.id);
            }}
          >
            Edit
          </a>,
        ];
        
        if (record.type === "enum" || record.type === "multi-enum") {
          actions.push(
            <a key="config" onClick={() => handleConfigureEnum(record)}>
              <SettingOutlined /> Values
            </a>
          );
        }
        
        actions.push(
          <a
            key="delete"
            className="text-red-500"
            onClick={() => {
              setDataSource(dataSource.filter((item) => item.id !== record.id));
            }}
          >
            Delete
          </a>
        );
        
        return actions;
      },
    },
  ];

  const enumColumns: ProColumns<EnumOptionItem>[] = [
    {
      title: "Value Code",
      dataIndex: "value",
      width: "30%",
    },
    {
      title: "Display Label",
      dataIndex: "label",
      width: "30%",
    },
    {
      title: "Color/Badge",
      dataIndex: "color",
      valueType: "color",
      width: "20%",
    },
    {
      title: "Actions",
      valueType: "option",
      render: (text, record, _, action) => {
        return [
          <a
            key="editable"
            onClick={() => {
              action?.startEditable?.(record.id);
            }}
          >
            Edit
          </a>,
          <a
            key="delete"
            className="text-red-500"
            onClick={() => {
              setEnumOptions(enumOptions.filter((item) => item.id !== record.id));
            }}
          >
            Delete
          </a>,
        ];
      },
    },
  ];

  return (
    <div className="w-full">
      <EditableProTable<AttributeItem>
        rowKey="id"
        headerTitle={`Attribute Schema for: ${currentNode?.title}`}
        maxLength={5}
        recordCreatorProps={{
          position: "bottom",
          record: () => ({
            id: (Math.random() * 1000000).toFixed(0),
            code: "",
            name: "",
            type: "string",
            required: false,
          }),
        }}
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
      />

      <Drawer
        title={`Manage Values for: ${currentAttribute?.name}`}
        size={900}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        maskClosable={false}
        mask={{ blur: false}}
      >
        {currentAttribute ? (
          <EditableProTable<EnumOptionItem>
            rowKey="id"
            headerTitle="Defined Options"
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
