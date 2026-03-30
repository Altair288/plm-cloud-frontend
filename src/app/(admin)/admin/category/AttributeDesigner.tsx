import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  App,
  Space,
  Typography,
  Tag,
  Splitter,
  Layout,
  theme,
  Flex,
} from "antd";
import AttributeList from "./components/AttributeList";
import AttributeWorkspace from "./components/AttributeWorkspace";
import { AttributeItem, EnumOptionItem } from "./components/types";
import { metaAttributeApi } from "@/services/metaAttribute";
import {
  CreateAttributeCodePreviewRequestDto,
  MetaAttributeUpsertRequestDto,
  MetaAttributeDefListItemDto,
  MetaAttributeDefDetailDto,
} from "@/models/metaAttribute";
import dayjs from "dayjs";

const isNewAttributeId = (id?: string | null) => !!id && id.startsWith("new_attr_");
const isEnumLikeType = (type?: string | null) => type === "enum" || type === "multi-enum";
const mapAttributeTypeToBackend = (type?: string | null) => (type === "boolean" ? "bool" : type) as any;
const normalizeCode = (value?: string | null) => String(value || "").trim();
const isManualCodeOverride = (value?: string | null, suggestedValue?: string | null) => {
  const normalizedValue = normalizeCode(value);
  if (!normalizedValue) {
    return false;
  }
  const normalizedSuggestedValue = normalizeCode(suggestedValue);
  return !normalizedSuggestedValue || normalizedValue !== normalizedSuggestedValue;
};

const normalizeAttributeForCompare = (attribute: AttributeItem | null) => {
  if (!attribute) return null;
  return {
    id: attribute.id,
    code: attribute.code,
    name: attribute.name,
    attributeField: attribute.attributeField || "",
    type: attribute.type,
    unit: attribute.unit || "",
    required: !!attribute.required,
    unique: !!attribute.unique,
    hidden: !!attribute.hidden,
    readonly: !!attribute.readonly,
    searchable: !!attribute.searchable,
    description: attribute.description || "",
    defaultValue: attribute.defaultValue ?? null,
    min: attribute.min ?? null,
    max: attribute.max ?? null,
    step: attribute.step ?? null,
    precision: attribute.precision ?? null,
    trueLabel: attribute.trueLabel || "",
    falseLabel: attribute.falseLabel || "",
    renderType: attribute.renderType || "text",
    constraintMode: attribute.constraintMode || "none",
  };
};

const normalizeEnumOptionsForCompare = (options: EnumOptionItem[]) =>
  options.map((item) => ({
    code: item.code || "",
    value: item.value || "",
    label: item.label || "",
    image: item.image || "",
    order: item.order ?? 0,
  }));

interface Props {
  currentNode?: { title?: string; code?: string; [key: string]: any };
  onUnsavedStateChange?: (state: {
    hasUnsavedChanges: boolean;
    unsavedNewCount: number;
  }) => void;
}

const AttributeDesigner: React.FC<Props> = ({
  currentNode,
  onUnsavedStateChange,
}) => {
  const { token } = theme.useToken();
  const { message: messageApi, modal } = App.useApp();
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | null>(
    null,
  );
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dataSource, setDataSource] = useState<AttributeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentAttribute, setCurrentAttribute] =
    useState<AttributeItem | null>(null);
  const [baselineAttribute, setBaselineAttribute] =
    useState<AttributeItem | null>(null);
  const [enumOptions, setEnumOptions] = useState<EnumOptionItem[]>([]);
  const [baselineEnumOptions, setBaselineEnumOptions] = useState<EnumOptionItem[]>([]);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRequestIdRef = useRef(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [allowManualCodeOverride, setAllowManualCodeOverride] = useState(false);
  const [allowManualEnumCodeOverride, setAllowManualEnumCodeOverride] = useState(false);

  // Helper: Map Backend DTO List Item to Frontend AttributeItem
  const mapListItemToAttributeItem = (dto: MetaAttributeDefListItemDto): AttributeItem => ({
    id: dto.key,
    code: dto.key,
    suggestedCode: dto.key,
    name: dto.displayName,
    attributeField: dto.attributeField || undefined,
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
    suggestedCode: dto.key,
    name: dto.latestVersion.displayName,
      attributeField: dto.latestVersion.attributeField || undefined,
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
    
    // Map extended value configurations
    min: dto.latestVersion.minValue,
    max: dto.latestVersion.maxValue,
    step: dto.latestVersion.step,
    precision: dto.latestVersion.precision,
    trueLabel: dto.latestVersion.trueLabel,
    falseLabel: dto.latestVersion.falseLabel,
  });

  const loadAttributes = async (
    categoryCode: string,
    selectAttributeId?: string,
    localUnsavedItems: AttributeItem[] = [],
  ) => {
    setLoading(true);
    try {
      const res = await metaAttributeApi.listAttributes({ 
        categoryCode, page: 0, size: 100 
      });
      const merged = [...res.content.map(mapListItemToAttributeItem), ...localUnsavedItems];
      setDataSource(merged);
      
      if (selectAttributeId) {
        setSelectedAttributeId(selectAttributeId);
        setSelectedAttributeIds([selectAttributeId]);
      }
    } catch (e) {
      console.error(e);
      messageApi.error("加载属性列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentNode?.code) {
      loadAttributes(currentNode.code, undefined, []);
      setSelectedAttributeId(null);
      setSelectedAttributeIds([]);
      setCurrentAttribute(null);
      setBaselineAttribute(null);
      setEnumOptions([]);
      setBaselineEnumOptions([]);
      setHasUnsavedChanges(false);
    } else {
      setDataSource([]);
      setSelectedAttributeId(null);
      setSelectedAttributeIds([]);
      setCurrentAttribute(null);
      setBaselineAttribute(null);
      setEnumOptions([]);
      setBaselineEnumOptions([]);
      setHasUnsavedChanges(false);
    }
  }, [currentNode]);

  // Sync currentAttribute from dataSource when selection changes
  useEffect(() => {
    const fetchDetail = async () => {
      if (selectedAttributeId && selectedAttributeIds.length === 1) {
        // First check if it's a new unsaved item (local only) using ID
        if (selectedAttributeId.startsWith('new_attr_')) {
             const localItem = dataSource.find(i => i.id === selectedAttributeId);
             if (localItem) {
               const snapshot = { ...localItem };
               setCurrentAttribute(snapshot);
               setBaselineAttribute(snapshot);
                setEnumOptions([]);
               setBaselineEnumOptions([]);
             }
             return;
        }

        try {
           console.log(`Fetching detail for ${selectedAttributeId}`);
           const detail = await metaAttributeApi.getAttributeDetail(selectedAttributeId, true); // includeValues=true
           const mapped = mapDetailToAttributeItem(detail);
           setCurrentAttribute(mapped);
           setBaselineAttribute(mapped);
           
           // Load enum options if present
           if (detail.lovValues && detail.lovValues.length > 0) {
             const mappedOptions = detail.lovValues.map((v: any, index: number) => ({
               id: `enum_${index}`,
               code: v.code,
               suggestedCode: v.code,
               value: v.value, // Backend detail DTO uses `value`
               label: v.label || '',
               order: index
             }));
             setEnumOptions(mappedOptions);
             setBaselineEnumOptions(mappedOptions);
           } else {
             setEnumOptions([]);
             setBaselineEnumOptions([]);
           }
        } catch(e) {
           console.error('Fetch detail failed', e);
            messageApi.error("Failed to load attribute details");
        }
      } else {
        setCurrentAttribute(null);
        setBaselineAttribute(null);
        setEnumOptions([]);
        setBaselineEnumOptions([]);
      }
    };
    fetchDetail();
  }, [selectedAttributeId, selectedAttributeIds.length, dataSource]);

  // Sync selection state when dataSource changes (e.g. deletion)
  useEffect(() => {
    if (selectedAttributeId && !dataSource.some(item => item.id === selectedAttributeId)) {
      setSelectedAttributeId(null);
    }
    setSelectedAttributeIds((prev) => prev.filter((id) => dataSource.some((item) => item.id === id)));
  }, [dataSource, selectedAttributeId]);

  const computedDirty = useMemo(() => {
    if (!currentAttribute || !baselineAttribute) return false;
    const attrDirty =
      JSON.stringify(normalizeAttributeForCompare(currentAttribute)) !==
      JSON.stringify(normalizeAttributeForCompare(baselineAttribute));

    const enumDirty =
      JSON.stringify(normalizeEnumOptionsForCompare(enumOptions)) !==
      JSON.stringify(normalizeEnumOptionsForCompare(baselineEnumOptions));

    return attrDirty || enumDirty;
  }, [currentAttribute, baselineAttribute, enumOptions, baselineEnumOptions]);

  useEffect(() => {
    setHasUnsavedChanges(computedDirty);
  }, [computedDirty]);

  const enumPreviewSignature = useMemo(() => {
    if (!currentAttribute || !isEnumLikeType(currentAttribute.type)) {
      return "";
    }
    return JSON.stringify(
      enumOptions.map((item) => ({
        id: item.id,
        value: item.value || "",
        label: item.label || "",
        code: item.code || "",
        suggestedCode: item.suggestedCode || "",
      })),
    );
  }, [currentAttribute?.id, currentAttribute?.type, enumOptions]);

  useEffect(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    const categoryCode = currentNode?.code;

    if (!currentAttribute || !categoryCode || !isNewAttributeId(currentAttribute.id)) {
      setPreviewLoading(false);
      setPreviewWarnings([]);
      setAllowManualCodeOverride(false);
      setAllowManualEnumCodeOverride(false);
      return;
    }

    const attributeManualOverride = isManualCodeOverride(currentAttribute.code, currentAttribute.suggestedCode);
    const manualCode = attributeManualOverride ? normalizeCode(currentAttribute.code) : "";
    const enumLike = isEnumLikeType(currentAttribute.type);
    const previewLovValues: NonNullable<CreateAttributeCodePreviewRequestDto["lovValues"]> = enumLike
      ? enumOptions
          .map((item) => ({
            code: isManualCodeOverride(item.code, item.suggestedCode) ? normalizeCode(item.code) || undefined : undefined,
            name: item.value?.trim() || undefined,
            label: item.label?.trim() || undefined,
          }))
          .filter((item) => item.code || item.name || item.label)
      : [];
    const hasPendingManualAttributeCode = attributeManualOverride && !manualCode;
    const hasPendingManualEnumCode =
      enumLike &&
      enumOptions.some((item) => {
        const hasContent = normalizeCode(item.value) || normalizeCode(item.label);
        return !!hasContent && isManualCodeOverride(item.code, item.suggestedCode) && !normalizeCode(item.code);
      });

    if (hasPendingManualAttributeCode) {
      setPreviewLoading(false);
      setPreviewWarnings([]);
      return;
    }

    previewTimerRef.current = setTimeout(async () => {
      const requestId = ++previewRequestIdRef.current;
      setPreviewLoading(true);

      try {
        const preview = await metaAttributeApi.previewCreateCode(categoryCode, {
          manualKey: attributeManualOverride ? manualCode : undefined,
          dataType: mapAttributeTypeToBackend(currentAttribute.type),
          count: 1,
          lovValues: hasPendingManualEnumCode ? undefined : previewLovValues,
        });

        if (requestId !== previewRequestIdRef.current) {
          return;
        }

        setAllowManualCodeOverride(Boolean(preview.allowManualOverride));
        setAllowManualEnumCodeOverride(Boolean(preview.allowLovValueManualOverride));
        setPreviewWarnings([...(preview.warnings || []), ...(preview.lovWarnings || [])]);

        if (!attributeManualOverride) {
          setCurrentAttribute((prev) => {
            if (!prev || prev.id !== currentAttribute.id) {
              return prev;
            }
            const suggestedCode = preview.suggestedCode || "";
            if (prev.code === suggestedCode && prev.suggestedCode === suggestedCode) {
              return prev;
            }
            return { ...prev, code: suggestedCode, suggestedCode };
          });
        } else if (!preview.allowManualOverride) {
          setCurrentAttribute((prev) => {
            if (!prev || prev.id !== currentAttribute.id) {
              return prev;
            }
            const suggestedCode = prev.suggestedCode || preview.suggestedCode || "";
            return {
              ...prev,
              code: suggestedCode,
              suggestedCode,
            };
          });
        }

        if (!enumLike) {
          setAllowManualEnumCodeOverride(false);
          return;
        }

        const previewCodeByIndex = new Map(
          (preview.lovValuePreviews || []).map((item) => [item.index, item.suggestedCode || ""]),
        );

        setEnumOptions((prev) =>
          prev.map((item, index) => {
            const suggestedCode = previewCodeByIndex.get(index);
            if (suggestedCode == null) {
              return item;
            }
            const manualEnumOverride = isManualCodeOverride(item.code, item.suggestedCode);
            if (manualEnumOverride && preview.allowLovValueManualOverride) {
              return item;
            }
            if (item.code === suggestedCode && item.suggestedCode === suggestedCode) {
              return item;
            }
            return { ...item, code: suggestedCode, suggestedCode };
          }),
        );
      } catch (e: any) {
        if (requestId !== previewRequestIdRef.current) {
          return;
        }

        setPreviewWarnings([e?.message || e?.error || "属性编码预计算失败"]);

        if (!attributeManualOverride) {
          setCurrentAttribute((prev) => {
            if (!prev || prev.id !== currentAttribute.id || !prev.code) {
              return prev;
            }
            return { ...prev, code: "", suggestedCode: "" };
          });
        }

        if (enumLike) {
          setEnumOptions((prev) => prev.map((item) => {
            if (isManualCodeOverride(item.code, item.suggestedCode)) {
              return item;
            }
            return item.code || item.suggestedCode ? { ...item, code: "", suggestedCode: "" } : item;
          }));
        }
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setPreviewLoading(false);
        }
      }
    }, attributeManualOverride || hasPendingManualEnumCode ? 300 : 0);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [currentAttribute?.id, currentAttribute?.type, currentAttribute?.code, currentAttribute?.suggestedCode, enumPreviewSignature, currentNode?.code]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleAttributeUpdate = (key: string, value: any) => {
    if (!currentAttribute) return;
    const updated = { ...currentAttribute, [key]: value };
    setCurrentAttribute(updated);
  };

  const applyMultiSelection = (ids: string[], primaryId: string | null) => {
    setSelectedAttributeIds(ids);
    setSelectedAttributeId(ids.length === 1 ? (primaryId || ids[0]) : null);
  };

  const tryApplySelectionChange = (ids: string[], primaryId: string | null) => {
    const normalizedIds = ids.filter((id) => dataSource.some((item) => item.id === id));
    const nextPrimary = normalizedIds.length === 1 ? (primaryId || normalizedIds[0]) : null;
    const samePrimary = selectedAttributeId === nextPrimary;

    if (samePrimary) {
      setSelectedAttributeIds(normalizedIds);
      return;
    }

    if (!hasUnsavedChanges) {
      applyMultiSelection(normalizedIds, nextPrimary);
      return;
    }

    modal.confirm({
      title: "当前属性修改尚未保存，是否放弃修改？",
      content: "切换后未保存内容将丢失。",
      okText: "放弃并切换",
      cancelText: "继续编辑",
      okType: "danger",
      onOk: () => {
        if (baselineAttribute) {
          setCurrentAttribute({ ...baselineAttribute });
          setEnumOptions([...baselineEnumOptions]);
        }
        setHasUnsavedChanges(false);
        applyMultiSelection(normalizedIds, nextPrimary);
      },
    });
  };

  const handleAddAttribute = () => {
    const timestamp = Date.now();
    const newAttr: AttributeItem = {
      id: `new_attr_${timestamp}`,
      code: "",
      suggestedCode: "",
      freezeKey: false,
      name: "",
      type: "enum",
      version: 1,
      isLatest: true,
    };
    setDataSource((prev) => [...prev, newAttr]);
    if (!selectedAttributeId || !isNewAttributeId(selectedAttributeId)) {
      setSelectedAttributeId(newAttr.id);
      setSelectedAttributeIds([newAttr.id]);
    }
  };

  const handleDuplicateAttribute = (source: AttributeItem) => {
    const timestamp = Date.now();
    const duplicate: AttributeItem = {
      ...source,
      id: `new_attr_${timestamp}`,
      code: "",
      suggestedCode: "",
      freezeKey: false,
      name: source.name ? `${source.name}_COPY` : "",
      version: 1,
      isLatest: true,
    };
    setDataSource((prev) => [...prev, duplicate]);
    setSelectedAttributeId(duplicate.id);
    setSelectedAttributeIds([duplicate.id]);
  };

  const handleSingleSave = async (
    attribute: AttributeItem,
    options?: { saveAndNext?: boolean },
  ) => {
      if (!currentNode?.code) return;
      
      const isNew = attribute.id.startsWith("new_attr_");
      const attributeManualOverride = isNew && allowManualCodeOverride && isManualCodeOverride(attribute.code, attribute.suggestedCode);
      const unsavedNewItems = dataSource.filter((item) => isNewAttributeId(item.id));
      const currentNewIndex = unsavedNewItems.findIndex((item) => item.id === attribute.id);
      const nextUnsavedNewId =
        options?.saveAndNext && currentNewIndex > -1 && currentNewIndex < unsavedNewItems.length - 1
          ? unsavedNewItems[currentNewIndex + 1].id
          : undefined;

      // Use the modified code if not new, or the new code
      const dto: MetaAttributeUpsertRequestDto = {
          key: isNew && !attributeManualOverride ? undefined : attribute.code,
          generationMode: isNew && attributeManualOverride ? "MANUAL" : undefined,
          freezeKey: isNew ? Boolean(attribute.freezeKey) : undefined,
          displayName: attribute.name,
          attributeField: attribute.attributeField,
          dataType: mapAttributeTypeToBackend(attribute.type),
          unit: attribute.unit,
          defaultValue: attribute.defaultValue ? String(attribute.defaultValue) : undefined,
          required: attribute.required,
          unique: attribute.unique,
          hidden: attribute.hidden,
          readOnly: attribute.readonly,
          searchable: attribute.searchable,
          description: attribute.description,
          
          // Extended value configurations
          minValue: attribute.min,
          maxValue: attribute.max,
          step: attribute.step,
          precision: attribute.precision,
          trueLabel: attribute.trueLabel,
          falseLabel: attribute.falseLabel,
          lovValues: attribute.type === 'enum' || attribute.type === 'multi-enum' 
            ? enumOptions.map(opt => ({
              code: isNew && !(allowManualEnumCodeOverride && isManualCodeOverride(opt.code, opt.suggestedCode)) ? undefined : opt.code,
                name: opt.value, // Using value as name for now
                label: opt.label
              }))
            : undefined
      };

      try {
            let savedDetail: MetaAttributeDefDetailDto;
          if (isNew) {
              savedDetail = await metaAttributeApi.createAttribute(currentNode.code, dto);
              messageApi.success("Created successfully");
          } else {
              savedDetail = await metaAttributeApi.updateAttribute(attribute.code, currentNode.code, dto);
              messageApi.success("Updated successfully");
          }

          const remainingUnsavedItems = dataSource.filter(
            (item) => !isNewAttributeId(item.id) || item.id !== attribute.id,
          );

          const targetId = nextUnsavedNewId || savedDetail.key;
          await loadAttributes(currentNode.code, targetId, remainingUnsavedItems.filter((item) => isNewAttributeId(item.id)));

          if (nextUnsavedNewId) {
            setSelectedAttributeId(nextUnsavedNewId);
          }

          if (isNew) {
            setDataSource((prev) => prev.filter((item) => item.id !== attribute.id));
          }

          setBaselineAttribute(null);
          setBaselineEnumOptions([]);
          setHasUnsavedChanges(false);
      } catch (e: any) {
          console.error("Save error:", e);
          // Since request.ts interceptor now rejects with error.response.data directly
          let errorMsg = e.message || e.error || "Operation failed";
          
          // User-friendly error message translation
          if (errorMsg.includes("attribute already exists")) {
            errorMsg = `保存失败：属性编码 "${attribute.code}" 已存在，请使用其他编码。`;
          } else if (errorMsg.includes("INVALID_ARGUMENT")) {
            errorMsg = `参数错误：${errorMsg}`;
          } else {
            errorMsg = `保存失败：${errorMsg}`;
          }
          
            messageApi.error(errorMsg);
          throw e; // Throw to let Workspace know it failed
      }
  };

  const handleDeleteAttribute = (attribute: AttributeItem) => {
    modal.confirm({
      title: "确认删除 (Confirm Delete)",
      content: `确定要删除属性 "${attribute.name}" 吗？此操作不可恢复。`,
      okType: "danger",
      onOk: async () => {
        // If it's a new unsaved attribute, just remove from list
        if (attribute.id.startsWith("new_attr_")) {
          setDataSource((prev) => prev.filter((item) => item.id !== attribute.id));
          if (selectedAttributeId === attribute.id) {
            setSelectedAttributeId(null);
            setSelectedAttributeIds((prev) => prev.filter((id) => id !== attribute.id));
            setCurrentAttribute(null);
            setBaselineAttribute(null);
            setEnumOptions([]);
            setBaselineEnumOptions([]);
          }
          messageApi.success("已移除 (Removed)");
          return;
        }

        // If it's a real backend attribute
        if (!currentNode?.code) return;

        try {
          await metaAttributeApi.deleteAttribute(attribute.code, currentNode.code);
          messageApi.success("删除成功 (Deleted)");
          // Refresh list
          loadAttributes(
            currentNode.code,
            undefined,
            dataSource.filter((item) => isNewAttributeId(item.id)),
          );
        } catch (e) {
          console.error(e);
          messageApi.error("删除失败 (Delete Failed)");
        }
      },
    });
  };

  const handleBatchRemoveAttributes = (ids: string[]) => {
    const unsavedIds = ids.filter((id) => isNewAttributeId(id));
    const persistedCount = ids.length - unsavedIds.length;

    if (unsavedIds.length > 0) {
      setDataSource((prev) => prev.filter((item) => !unsavedIds.includes(item.id)));
      setSelectedAttributeIds((prev) => prev.filter((id) => !unsavedIds.includes(id)));
      if (selectedAttributeId && unsavedIds.includes(selectedAttributeId)) {
        setSelectedAttributeId(null);
        setCurrentAttribute(null);
        setBaselineAttribute(null);
        setEnumOptions([]);
        setBaselineEnumOptions([]);
      }
      messageApi.success(`已批量移除 ${unsavedIds.length} 条未保存新属性`);
    }

    if (persistedCount > 0) {
      messageApi.warning("批量移除仅支持未保存的新属性，已存在属性请单条删除");
    }
  };

  const hasNextUnsavedNew = useMemo(() => {
    if (!selectedAttributeId || !isNewAttributeId(selectedAttributeId)) return false;
    const unsavedNewIds = dataSource.filter((item) => isNewAttributeId(item.id)).map((item) => item.id);
    const index = unsavedNewIds.findIndex((id) => id === selectedAttributeId);
    return index > -1 && index < unsavedNewIds.length - 1;
  }, [dataSource, selectedAttributeId]);

  const unsavedNewCount = useMemo(
    () => dataSource.filter((item) => isNewAttributeId(item.id)).length,
    [dataSource],
  );

  useEffect(() => {
    onUnsavedStateChange?.({
      hasUnsavedChanges,
      unsavedNewCount,
    });
  }, [hasUnsavedChanges, unsavedNewCount, onUnsavedStateChange]);

  const handleSaveAll = () => {
    // Optional: Bulk save implementation if backend supports it, otherwise warn user
    messageApi.info("Please save each attribute individually in the workspace.");
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
        <Typography.Title level={5} style={{ margin: 0, marginRight: 16 }}>
          {currentNode?.title || "未知对象 (Unknown Item)"}
        </Typography.Title>
      </Space>
      <Space>
        {/* <Button icon={<EyeOutlined />}>预览 (Preview)</Button> */}
        {/* <Button icon={<HistoryOutlined />}>日志 (Log)</Button> */}
        {/* Bulk Save is disabled or hidden as we move to single save */}
        {/* <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAll}>保存模型</Button> */}
      </Space>
    </Flex>
  );

  return (
    <Layout style={{ height: "100%", flexDirection: "column", overflow: "hidden" }}>
      {renderToolbar()}

      <Splitter style={{ flex: 1, minHeight: 0 }}>
        <Splitter.Panel defaultSize={450} min={350} max={550} collapsible>
          <AttributeList
            dataSource={dataSource}
            setDataSource={setDataSource}
            selectedAttributeIds={selectedAttributeIds}
            activeAttributeId={selectedAttributeId}
            onSelectionChange={tryApplySelectionChange}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            onAddAttribute={handleAddAttribute}
            onDuplicateAttribute={handleDuplicateAttribute}
            onDeleteAttribute={handleDeleteAttribute}
            onBatchRemoveAttributes={handleBatchRemoveAttributes}
          />
        </Splitter.Panel>
        <Splitter.Panel>
          <AttributeWorkspace
            attribute={selectedAttributeIds.length === 1 ? currentAttribute : null}
            selectedCount={selectedAttributeIds.length}
            onUpdate={handleAttributeUpdate}
            enumOptions={enumOptions}
            setEnumOptions={setEnumOptions}
            previewLoading={previewLoading}
            previewWarnings={previewWarnings}
            allowManualCodeOverride={allowManualCodeOverride}
            allowManualEnumCodeOverride={allowManualEnumCodeOverride}
            onSave={(attribute) => handleSingleSave(attribute, { saveAndNext: false })}
            onSaveAndNext={(attribute) => handleSingleSave(attribute, { saveAndNext: true })}
            showSaveAndNext={hasNextUnsavedNew}
            hasUnsavedChanges={hasUnsavedChanges}
            onDiscard={(id) => {
              setDataSource((prev) => prev.filter((item) => item.id !== id));
              if (selectedAttributeId === id) {
                setSelectedAttributeId(null);
              }
              setSelectedAttributeIds((prev) => prev.filter((itemId) => itemId !== id));
              setCurrentAttribute(null);
              setBaselineAttribute(null);
              setEnumOptions([]);
              setBaselineEnumOptions([]);
              setHasUnsavedChanges(false);
            }}
            onCancelEdit={() => {
              if (baselineAttribute) {
                setCurrentAttribute({ ...baselineAttribute });
                setEnumOptions([...baselineEnumOptions]);
              }
              setHasUnsavedChanges(false);
            }}
          />
        </Splitter.Panel>
      </Splitter>
    </Layout>
  );
};

export default AttributeDesigner;
