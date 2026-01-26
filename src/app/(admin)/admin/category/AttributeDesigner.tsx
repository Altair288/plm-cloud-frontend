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
      code: "material",
      name: "Material",
      type: "enum",
      unit: "",
      required: true,
      searchable: true,
      version: 1,
      isLatest: true,
      description: "Primary material composition",
    },
    {
      id: "2",
      code: "weight",
      name: "Weight",
      type: "number",
      unit: "kg",
      min: 0,
      precision: 2,
      version: 2,
      isLatest: true,
      description: "Net weight in KG",
    },
    {
      id: "3",
      code: "mfg_date",
      name: "Manufacture Date",
      type: "date",
      hidden: true,
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
      destroyOnClose={false}
      maskClosable={false}
    >
      <Layout style={{ height: "100%", flexDirection: "column" }}>
        {renderToolbar()}

        <Splitter style={{ flex: 1 }}>
          <Splitter.Panel defaultSize={300} min={250} max={400} collapsible>
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
