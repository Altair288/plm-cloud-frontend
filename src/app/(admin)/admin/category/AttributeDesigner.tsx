import React, { useState, useEffect } from "react";
import DraggableModal from "@/components/DraggableModal";
import AttributeList from "./components/AttributeList";
import EnumConfig from "./components/EnumConfig";
import { AttributeItem, EnumOptionItem } from "./components/types";

interface Props {
  open: boolean;
  onCancel: () => void;
  currentNode?: { title?: string; [key: string]: any };
}

const AttributeDesigner: React.FC<Props> = ({ open, onCancel, currentNode }) => {
  
  // Selection State for Split View
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | null>(null);

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

  const [currentAttribute, setCurrentAttribute] = useState<AttributeItem | null>(null);

  // Update currentAttribute when selection changes
  useEffect(() => {
     if (selectedAttributeId) {
         const found = dataSource.find(item => item.id === selectedAttributeId);
         setCurrentAttribute(found || null);
     } else {
         setCurrentAttribute(null);
     }
  }, [selectedAttributeId, dataSource]);

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

  return (
    <DraggableModal
        title={`属性设计: ${currentNode?.title || "未选择分类"}`}
        open={open}
        onCancel={onCancel}
        width="90%"
        styles={{ body: { height: '80vh', padding: 0, overflow: 'hidden' } }}
        footer={null}
        destroyOnClose={false}
        maskClosable={false}
    >
        <div className="w-full h-full flex attribute-designer-container bg-white rounded-lg overflow-hidden">
        
        {/* Left Pane: Attribute List */}
        <div className="w-1/2 h-full flex flex-col border-r border-gray-200">
            <AttributeList 
                currentNode={currentNode}
                dataSource={dataSource}
                setDataSource={setDataSource}
                selectedAttributeId={selectedAttributeId}
                onSelectAttribute={(id) => {
                     setSelectedAttributeId(id);
                }}
            />
        </div>

        {/* Right Pane: Configuration */}
        <div className="w-1/2 h-full flex flex-col bg-gray-50/30">
            <EnumConfig 
                currentAttribute={currentAttribute}
                enumOptions={enumOptions}
                setEnumOptions={setEnumOptions}
            />
        </div>
        </div>
    </DraggableModal>
  );
};

export default AttributeDesigner;
