import React, { useState, useEffect } from "react";
import DraggableModal from "@/components/DraggableModal";
import {
  Button,
  Space,
  Breadcrumb,
  Typography,
  Tag,
  Splitter,
  Layout,
  theme,
  Flex,
  Card,
} from "antd";
import {
  SaveOutlined,
  HistoryOutlined,
  EyeOutlined,
  AppstoreOutlined,
  RightOutlined,
} from "@ant-design/icons";
import AttributeList from "./components/AttributeList";
import AttributeWorkspace from "./components/AttributeWorkspace";
import { AttributeItem, EnumOptionItem } from "./components/types";

const { Header, Sider, Content } = Layout;

interface Props {
  open: boolean;
  onCancel: () => void;
  currentNode?: { title?: string; code?: string; [key: string]: any };
}

const AttributeDesigner: React.FC<Props> = ({
  open,
  onCancel,
  currentNode,
}) => {
  const { token } = theme.useToken();
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | null>(
    null,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mock Data
  const [dataSource, setDataSource] = useState<AttributeItem[]>([
    {
      id: "1",
      code: "FN",
      name: "连续力",
      type: "number",
      unit: "kN",
      version: 1,
      isLatest: true,
    },
    {
      id: "2",
      code: "FMAXD",
      name: "最大力",
      type: "number",
      unit: "kN",
      version: 1,
      isLatest: true,
    },
    {
      id: "3",
      code: "VDRUCK",
      name: "速度",
      type: "number",
      unit: "m/s",
      version: 1,
      isLatest: true,
    },
    {
      id: "4",
      code: "ADRUCK",
      name: "加速度",
      type: "number",
      unit: "m/s²",
      version: 1,
      isLatest: true,
    },
    {
      id: "5",
      code: "HUB",
      name: "行程",
      type: "number",
      unit: "mm",
      version: 1,
      isLatest: true,
    },
    {
      id: "6",
      code: "DH",
      name: "显示液压缸顶出行程",
      type: "number",
      unit: "mm",
      version: 1,
      isLatest: true,
    },
    {
      id: "7",
      code: "BF",
      name: "结构类型",
      type: "enum",
      version: 1,
      isLatest: true,
    },
    {
      id: "8",
      code: "BFZ",
      name: "液压缸结构类型",
      type: "string",
      version: 1,
      isLatest: true,
    },
    {
      id: "9",
      code: "WMO",
      name: "位移测量系统选项",
      type: "string",
      version: 1,
      isLatest: true,
    },
    {
      id: "10",
      code: "DRUCKSENSOR",
      name: "压力传感器",
      type: "boolean",
      version: 1,
      isLatest: true,
    },
    {
      id: "11",
      code: "SYSDRUCKSENS",
      name: "系统压力传感器",
      type: "string",
      version: 1,
      isLatest: true,
    },
    {
      id: "12",
      code: "DD",
      name: "活塞直径",
      type: "number",
      unit: "mm",
      version: 1,
      isLatest: true,
    },
    {
      id: "13",
      code: "DD1",
      name: "活塞杆直径",
      type: "number",
      unit: "mm",
      version: 1,
      isLatest: true,
    },
    {
      id: "14",
      code: "KW",
      name: "电机额定功率",
      type: "number",
      unit: "kW",
      version: 1,
      isLatest: true,
    },
    {
      id: "15",
      code: "FOERDER",
      name: "泵流量",
      type: "number",
      unit: "l/min",
      version: 1,
      isLatest: true,
    },
    {
      id: "16",
      code: "PDF",
      name: "参数表",
      type: "string",
      version: 1,
      isLatest: true,
    },
    {
      id: "17",
      code: "CNSMNTINTV",
      name: "操作和维护说明",
      type: "string",
      version: 1,
      isLatest: true,
    },
  ]);

  const [currentAttribute, setCurrentAttribute] =
    useState<AttributeItem | null>(null);

  // Sync currentAttribute from dataSource when selection changes
  useEffect(() => {
    if (selectedAttributeId) {
      const found = dataSource.find((item) => item.id === selectedAttributeId);
      if (found)
        setCurrentAttribute({ ...found }); // Clone to avoid direct mutation
      else setCurrentAttribute(null);
    } else {
      setCurrentAttribute(null);
    }
  }, [selectedAttributeId]);

  const handleAttributeUpdate = (key: string, value: any) => {
    if (!currentAttribute) return;

    setHasUnsavedChanges(true);
    const updated = { ...currentAttribute, [key]: value };
    setCurrentAttribute(updated);

    setDataSource((prev) =>
      prev.map((item) => (item.id === currentAttribute.id ? updated : item)),
    );
  };

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
      label: "Aluminum Alloy",
      color: "#A9A9A9",
      order: 2,
    },
  ]);

  const handleAddAttribute = () => {
    const newAttr: AttributeItem = {
      id: Date.now().toString(),
      code: `new_attr_${dataSource.length + 1}`,
      name: "New Attribute",
      type: "string",
      version: 1,
      isLatest: true,
    };
    setDataSource([...dataSource, newAttr]);
    setSelectedAttributeId(newAttr.id);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // API Call Simulation
    console.log("Saving Schema...", dataSource);
    // After success:
    setHasUnsavedChanges(false);
  };

  // Modal Title
  const modalTitle = (
    <Space align="center">
      <Typography.Title level={5} style={{ margin: 0 }}>
        &gt; {currentNode?.title || "未知对象 (Unknown Item)"}
      </Typography.Title>
      <Tag
        color={hasUnsavedChanges ? "warning" : "success"}
        variant="filled"
        style={{ marginLeft: 8 }}
      >
        {hasUnsavedChanges ? "未保存 (Unsaved Changes)" : "已保存 (Up To Date)"}
      </Tag>
    </Space>
  );

  // Toolbar Actions
  const renderToolbar = () => (
    <Flex
      justify="flex-end"
      align="center"
      style={{
        height: 48,
        padding: "0 16px",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgLayout,
      }}
    >
      <Space>
        <Button icon={<EyeOutlined />}>预览 (Preview)</Button>
        <Button icon={<HistoryOutlined />}>日志 (Log)</Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
        >
          保存模型 (Save Schema)
        </Button>
      </Space>
    </Flex>
  );

  return (
    <DraggableModal
      title={modalTitle}
      open={open}
      onCancel={onCancel}
      width="95%"
      styles={{
        body: { height: "85vh", padding: 0, overflow: "hidden" },
      }}
      footer={null}
      destroyOnHidden={false}
      maskClosable={false}
    >
      <Layout style={{ height: "100%", flexDirection: "column", overflow: "hidden" }}>
        {renderToolbar()}

        <Splitter style={{ flex: 1, minHeight: 0 }}>
          <Splitter.Panel defaultSize={450} min={300} max={600} collapsible>
            <AttributeList
              dataSource={dataSource}
              setDataSource={setDataSource}
              selectedAttributeId={selectedAttributeId}
              onSelectAttribute={(id) => setSelectedAttributeId(id)}
              onAddAttribute={handleAddAttribute}
            />
          </Splitter.Panel>
          <Splitter.Panel>
            <AttributeWorkspace
              attribute={currentAttribute}
              onUpdate={handleAttributeUpdate}
              enumOptions={enumOptions}
              setEnumOptions={setEnumOptions}
            />
          </Splitter.Panel>
        </Splitter>
      </Layout>
    </DraggableModal>
  );
};

export default AttributeDesigner;
