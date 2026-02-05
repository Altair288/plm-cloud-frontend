import React, { useState, useEffect } from "react";
import DraggableModal from "@/components/DraggableModal";
import {
  SaveOutlined,
  HistoryOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Space,
  Typography,
  Tag,
  Splitter,
  Layout,
  theme,
  Flex,
  Input,
  message,
} from "antd";
import AttributeList from "./components/AttributeList";
import AttributeWorkspace from "./components/AttributeWorkspace";
import { AttributeItem, EnumOptionItem } from "./components/types";
import { metaAttributeApi } from "@/services/metaAttribute";
import { MetaAttributeUpsertRequestDto, MetaAttributeDefListItemDto, MetaAttributeDefDetailDto } from "@/models/metaAttribute";
import dayjs from "dayjs";

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
  const [searchText, setSearchText] = useState("");
  const [dataSource, setDataSource] = useState<AttributeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentAttribute, setCurrentAttribute] =
    useState<AttributeItem | null>(null);

  // Helper: Map Backend DTO List Item to Frontend AttributeItem
  const mapListItemToAttributeItem = (dto: MetaAttributeDefListItemDto): AttributeItem => ({
    id: dto.key,
    code: dto.key,
    name: dto.displayName,
    type: (dto.dataType === 'bool' ? 'boolean' : dto.dataType) as any,
    unit: dto.unit || undefined,
    version: dto.latestVersionNo,
    isLatest: true,
    // Map the new extended fields from list API
    required: dto.required,
    unique: dto.unique,
    hidden: dto.hidden,
    readonly: dto.readOnly,
    searchable: dto.searchable,
  });

   // Helper: Map Backend Detail DTO to Frontend AttributeItem
   const mapDetailToAttributeItem = (dto: MetaAttributeDefDetailDto): AttributeItem => ({
    id: dto.key,
    code: dto.key,
    name: dto.latestVersion.displayName,
    type: (dto.latestVersion.dataType === 'bool' ? 'boolean' : dto.latestVersion.dataType) as any,
    unit: dto.latestVersion.unit || undefined,
    defaultValue: dto.latestVersion.defaultValue || undefined,
    required: dto.latestVersion.required,
    unique: dto.latestVersion.unique,
    hidden: dto.latestVersion.hidden,
    readonly: dto.latestVersion.readOnly,
    searchable: dto.latestVersion.searchable,
    version: dto.latestVersion.versionNo,
    isLatest: true, 
    createdBy: dto.createdBy,
    createdAt: dto.createdAt ? dayjs(dto.createdAt).format("YYYY-MM-DD HH:mm:ss") : undefined,
    modifiedBy: dto.modifiedBy,
    modifiedAt: dto.modifiedAt ? dayjs(dto.modifiedAt).format("YYYY-MM-DD HH:mm:ss") : undefined,
    description: dto.latestVersion.description || undefined,
  });

  const loadAttributes = async (categoryCode: string) => {
    setLoading(true);
    try {
      const res = await metaAttributeApi.listAttributes({ 
        categoryCode, page: 0, size: 100 
      });
      setDataSource(res.content.map(mapListItemToAttributeItem));
    } catch (e) {
      console.error(e);
      message.error("加载属性列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && currentNode?.code) {
      loadAttributes(currentNode.code);
      setSelectedAttributeId(null);
      setCurrentAttribute(null);
    }
  }, [open, currentNode]);

  // Sync currentAttribute from dataSource when selection changes
  useEffect(() => {
    const fetchDetail = async () => {
      if (selectedAttributeId) {
        // First check if it's a new unsaved item (local only) using ID
        if (selectedAttributeId.startsWith('new_attr_')) {
             const localItem = dataSource.find(i => i.id === selectedAttributeId);
             if (localItem) {
                setCurrentAttribute({ ...localItem });
             }
             return;
        }

        try {
           console.log(`Fetching detail for ${selectedAttributeId}`);
           const detail = await metaAttributeApi.getAttributeDetail(selectedAttributeId);
           console.log('Detail fetched:', detail);
           const mapped = mapDetailToAttributeItem(detail);
           setCurrentAttribute(mapped);
           // Also update the list item with latest details just in case
           setDataSource(prev => prev.map(p => p.id === selectedAttributeId ? mapped : p));
        } catch(e) {
           console.error('Fetch detail failed', e);
           message.error("Failed to load attribute details");
        }
      } else {
        setCurrentAttribute(null);
      }
    };
    fetchDetail();
  }, [selectedAttributeId]);

  // Sync selection state when dataSource changes (e.g. deletion)
  useEffect(() => {
    if (selectedAttributeId && !dataSource.some(item => item.id === selectedAttributeId)) {
      setSelectedAttributeId(null);
    }
  }, [dataSource, selectedAttributeId]);

  const handleAttributeUpdate = (key: string, value: any) => {
    if (!currentAttribute) return;

    setHasUnsavedChanges(true); // Can also be local dirty state
    const updated = { ...currentAttribute, [key]: value };
    setCurrentAttribute(updated);

    // Update list view optimistically
    setDataSource((prev) =>
      prev.map((item) => (item.id === currentAttribute.id ? updated : item)),
    );
  };

  const [enumOptions, setEnumOptions] = useState<EnumOptionItem[]>([]);

  const handleAddAttribute = () => {
    const timestamp = Date.now();
    const newAttr: AttributeItem = {
      id: `new_attr_${timestamp}`,
      code: `ATTR_${timestamp}`, 
      name: "New Attribute",
      type: "string",
      version: 1,
      isLatest: true,
    };
    setDataSource([...dataSource, newAttr]);
    setSelectedAttributeId(newAttr.id);
    setHasUnsavedChanges(true);
  };

  const handleSingleSave = async (attribute: AttributeItem) => {
      if (!currentNode?.code) return;
      
      const isNew = attribute.id.startsWith("new_attr_");
      // Use the modified code if not new, or the new code
      const dto: MetaAttributeUpsertRequestDto = {
          key: attribute.code,
          displayName: attribute.name,
          dataType: (attribute.type === 'boolean' ? 'bool' : attribute.type) as any,
          unit: attribute.unit,
          defaultValue: attribute.defaultValue ? String(attribute.defaultValue) : undefined,
          required: attribute.required,
          unique: attribute.unique,
          hidden: attribute.hidden,
          readOnly: attribute.readonly,
          searchable: attribute.searchable,
          description: attribute.description,
      };

      try {
          if (isNew) {
              await metaAttributeApi.createAttribute(currentNode.code, dto);
              message.success("Created successfully");
          } else {
              await metaAttributeApi.updateAttribute(attribute.code, currentNode.code, dto);
              message.success("Updated successfully");
          }
          // Reload to get latest state/version
          loadAttributes(currentNode.code);
          setHasUnsavedChanges(false);
      } catch (e) {
          console.error(e);
          message.error("Operation failed");
          throw e; // Throw to let Workspace know it failed
      }
  };

  const handleSaveAll = () => {
    // Optional: Bulk save implementation if backend supports it, otherwise warn user
    message.info("Please save each attribute individually in the workspace.");
  };

  // Modal Title
  const modalTitle = (
    <Space align="center">
      <Typography.Title level={5} style={{ margin: 0 }}>
        &gt; {currentNode?.title || "未知对象 (Unknown Item)"}
      </Typography.Title>
      {hasUnsavedChanges && (
         <Tag color="warning" variant="filled" style={{ marginLeft: 8 }}>
            未保存 (Unsaved Changes)
         </Tag>
      )}
    </Space>
  );

  // Toolbar Actions
  const renderToolbar = () => (
    <Flex
      justify="space-between"
      align="center"
      style={{
        height: 48,
        padding: "0 16px",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgLayout,
      }}
    >
      <Space>
        
        <Input
          placeholder="筛选属性 . . ."
          prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 300 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddAttribute}
        >
          新建属性
        </Button>
      </Space>
      <Space>
        <Button icon={<EyeOutlined />}>预览 (Preview)</Button>
        <Button icon={<HistoryOutlined />}>日志 (Log)</Button>
        {/* Bulk Save is disabled or hidden as we move to single save */}
        {/* <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAll}>保存模型</Button> */}
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
          <Splitter.Panel defaultSize={600} min={300} max={600} collapsible>
            <AttributeList
              dataSource={dataSource}
              setDataSource={setDataSource}
              selectedAttributeId={selectedAttributeId}
              onSelectAttribute={(id) => setSelectedAttributeId(id)}
              searchText={searchText}
            />
          </Splitter.Panel>
          <Splitter.Panel>
            <AttributeWorkspace
              attribute={currentAttribute}
              onUpdate={handleAttributeUpdate}
              enumOptions={enumOptions}
              setEnumOptions={setEnumOptions}
              onSave={handleSingleSave}
              onDiscard={(id) => {
                setDataSource((prev) => prev.filter((item) => item.id !== id));
                if (selectedAttributeId === id) {
                  setSelectedAttributeId(null);
                }
              }}
            />
          </Splitter.Panel>
        </Splitter>
      </Layout>
    </DraggableModal>
  );
};


export default AttributeDesigner;
