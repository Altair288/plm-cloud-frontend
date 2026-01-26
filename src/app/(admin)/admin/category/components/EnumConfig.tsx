import React, { useState } from "react";
import { Empty, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-table";
import { EditableProTable } from "@ant-design/pro-components";
import { AttributeItem, EnumOptionItem } from "./types";

interface EnumConfigProps {
    currentAttribute: AttributeItem | null;
    enumOptions: EnumOptionItem[];
    setEnumOptions: (data: EnumOptionItem[]) => void;
}

const EnumConfig: React.FC<EnumConfigProps> = ({
    currentAttribute,
    enumOptions,
    setEnumOptions
}) => {
    const [enumEditableKeys, setEnumEditableKeys] = useState<React.Key[]>([]);

    const enumColumns: ProColumns<EnumOptionItem>[] = [
        {
          title: "值编码",
          dataIndex: "value",
          width: "30%",
          formItemProps: {
            rules: [{ required: true, message: "请输入值" }],
          },
        },
        {
          title: "显示标签",
          dataIndex: "label",
          width: "30%",
          formItemProps: {
            rules: [{ required: true, message: "请输入标签" }],
          },
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

    if (!currentAttribute) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Empty description="请选择左侧属性进行配置" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
                <Typography.Title level={5} style={{ margin: 0 }}>
                {`属性配置: ${currentAttribute.name}`} 
                <span className="text-gray-400 text-xs ml-2 font-normal">({currentAttribute.code})</span>
                </Typography.Title>
            </div>
            
            {["enum", "multi-enum"].includes(currentAttribute.type) ? (
                    <div className="flex-1 overflow-hidden p-2">
                    <EditableProTable<EnumOptionItem>
                        rowKey="id"
                        headerTitle="枚举值管理"
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
                        scroll={{ y: "calc(80vh - 250px)" }}
                        editable={{
                        type: "multiple",
                        editableKeys: enumEditableKeys,
                        onChange: setEnumEditableKeys,
                        onSave: async (rowKey, data, row) => {
                            // save enum option
                        },
                        }}
                    />
                    </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                    <Empty description="当前属性无需额外配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
            )}
        </div>
    );
};

export default EnumConfig;
