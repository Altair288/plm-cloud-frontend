import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Space,
  Typography,
  Splitter,
  Layout,
  theme,
  Flex,
} from "antd";
import AttributeList from "./components/AttributeList";
import AttributeWorkspace from "./components/AttributeWorkspace";
// import AttributeExportModal from "./components/export/AttributeExportModal";
import { AttributeItem, EnumOptionItem } from "./components/types";
import { metaAttributeApi } from "@/services/metaAttribute";
import {
  CreateAttributeCodePreviewRequestDto,
  MetaAttributeUpsertRequestDto,
  MetaAttributeDefListItemDto,
  MetaAttributeDefDetailDto,
  MetaAttributeLovValueDto,
} from "@/models/metaAttribute";
import dayjs from "dayjs";

const isNewAttributeId = (id?: string | null) => !!id && id.startsWith("new_attr_");
const isEnumLikeType = (type?: string | null) => type === "enum" || type === "multi-enum";
const mapAttributeTypeToBackend = (
  type: AttributeItem["type"],
): MetaAttributeUpsertRequestDto["dataType"] => (type === "boolean" ? "bool" : type) as MetaAttributeUpsertRequestDto["dataType"];
const normalizeAttributeTypeFromBackend = (type?: string | null) => {
  if (type === 'bool') {
    return 'boolean';
  }
  if (type === 'multi_enum') {
    return 'multi-enum';
  }
  return type;
};
const normalizeDefaultValueFromBackend = (type?: string | null, value?: string | null) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (type === "boolean") {
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
    return undefined;
  }

  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (type === "multi-enum") {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
};
const serializeDefaultValueForBackend = (value?: AttributeItem["defaultValue"]) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(",") : undefined;
  }

  return String(value);
};
const normalizeCode = (value?: string | null) => String(value || "").trim();
const buildLovPreviewPlaceholder = (index: number) => `__DRAFT_ENUM_OPTION_${index + 1}__`;
const isManualCodeOverride = (value?: string | null, suggestedValue?: string | null) => {
  const normalizedValue = normalizeCode(value);
  if (!normalizedValue) {
    return false;
  }
  const normalizedSuggestedValue = normalizeCode(suggestedValue);
  return !normalizedSuggestedValue || normalizedValue !== normalizedSuggestedValue;
};

interface CurrentNodeContext {
  title?: string;
  code?: string;
  businessDomain?: string;
}

interface ErrorWithMessage {
  message?: string;
  error?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object") {
    const candidate = error as ErrorWithMessage;
    return candidate.message || candidate.error || fallback;
  }
  return fallback;
};

const normalizeAttributeForCompare = (attribute: AttributeItem | null) => {
  if (!attribute) return null;
  const ignoreGeneratedDraftCode =
    isNewAttributeId(attribute.id) && !isManualCodeOverride(attribute.code, attribute.suggestedCode);
  return {
    id: attribute.id,
    code: ignoreGeneratedDraftCode ? "" : attribute.code,
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

const createEmptyAttributeDraft = (id: string): AttributeItem => ({
  id,
  code: "",
  suggestedCode: "",
  freezeKey: false,
  name: "",
  attributeField: "",
  type: "enum",
  unit: "",
  required: false,
  description: "",
  defaultValue: undefined,
  hidden: false,
  readonly: false,
  searchable: false,
  unique: false,
  min: undefined,
  max: undefined,
  step: undefined,
  precision: undefined,
  trueLabel: "",
  falseLabel: "",
  constraintMode: 'none',
  renderType: 'text',
  version: 1,
  isLatest: true,
});

const mapListItemToAttributeItem = (dto: MetaAttributeDefListItemDto): AttributeItem => {
  const normalizedType = normalizeAttributeTypeFromBackend(dto.dataType) as AttributeItem["type"];

  return {
    id: dto.key,
    code: dto.key,
    suggestedCode: dto.key,
    name: dto.displayName,
    attributeField: dto.attributeField || undefined,
    type: normalizedType,
    unit: dto.unit || undefined,
    version: dto.latestVersionNo,
    isLatest: true,
    required: dto.required,
    unique: dto.unique,
    hidden: dto.hidden,
    readonly: dto.readOnly,
    searchable: dto.searchable,
  };
};

const mapDetailToAttributeItem = (dto: MetaAttributeDefDetailDto): AttributeItem => {
  const normalizedType = normalizeAttributeTypeFromBackend(dto.latestVersion.dataType) as AttributeItem["type"];

  return {
    id: dto.key,
    code: dto.key,
    suggestedCode: dto.key,
    name: dto.latestVersion.displayName,
    attributeField: dto.latestVersion.attributeField || undefined,
    type: normalizedType,
    unit: dto.latestVersion.unit || undefined,
    defaultValue: normalizeDefaultValueFromBackend(normalizedType, dto.latestVersion.defaultValue),
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
    min: dto.latestVersion.minValue,
    max: dto.latestVersion.maxValue,
    step: dto.latestVersion.step,
    precision: dto.latestVersion.precision,
    trueLabel: dto.latestVersion.trueLabel,
    falseLabel: dto.latestVersion.falseLabel,
  };
};

interface Props {
  currentNode?: CurrentNodeContext;
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
  const currentCategoryCode = String(currentNode?.code || "").trim();
  const currentBusinessDomain = String(currentNode?.businessDomain || "").trim();
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | null>(
    null,
  );
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [dataSource, setDataSource] = useState<AttributeItem[]>([]);

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

  const loadAttributes = useCallback(async (
    categoryCode: string,
    businessDomain?: string,
    selectAttributeId?: string,
    localUnsavedItems: AttributeItem[] = [],
  ) => {
    try {
      const res = await metaAttributeApi.listAttributes({ 
        businessDomain,
        categoryCode,
        page: 0,
        size: 100,
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
    }
  }, [messageApi]);

  useEffect(() => {
    if (currentCategoryCode) {
      void loadAttributes(currentCategoryCode, currentBusinessDomain, undefined, []);
      setSelectedAttributeId(null);
      setSelectedAttributeIds([]);
      setCurrentAttribute(null);
      setBaselineAttribute(null);
      setEnumOptions([]);
      setBaselineEnumOptions([]);
    } else {
      setDataSource([]);
      setSelectedAttributeId(null);
      setSelectedAttributeIds([]);
      setCurrentAttribute(null);
      setBaselineAttribute(null);
      setEnumOptions([]);
      setBaselineEnumOptions([]);
    }
  }, [currentBusinessDomain, currentCategoryCode, loadAttributes]);

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

          if (!currentBusinessDomain) {
           setCurrentAttribute(null);
           setBaselineAttribute(null);
           setEnumOptions([]);
           setBaselineEnumOptions([]);
           return;
          }

        try {
           console.log(`Fetching detail for ${selectedAttributeId}`);
            const detail = await metaAttributeApi.getAttributeDetail(selectedAttributeId, currentBusinessDomain, true); // includeValues=true
           const mapped = mapDetailToAttributeItem(detail);
           setCurrentAttribute(mapped);
           setBaselineAttribute(mapped);
           
           // Load enum options if present
           if (detail.lovValues && detail.lovValues.length > 0) {
             const mappedOptions = detail.lovValues.map((valueOption: MetaAttributeLovValueDto, index: number) => ({
               id: `enum_${index}`,
               code: valueOption.code || "",
               suggestedCode: valueOption.code || "",
               value: valueOption.value || "",
               label: valueOption.label || '',
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
    void fetchDetail();
  }, [currentBusinessDomain, dataSource, messageApi, selectedAttributeId, selectedAttributeIds.length]);

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

  const effectiveHasUnsavedChanges = computedDirty;

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
  }, [currentAttribute, enumOptions]);

  useEffect(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    const categoryCode = currentCategoryCode;
    const isNewAttribute = isNewAttributeId(currentAttribute?.id);
    const enumLike = currentAttribute ? isEnumLikeType(currentAttribute.type) : false;
    const persistedAttributeCode = currentAttribute ? normalizeCode(currentAttribute.code) : "";
    const hasExistingEnumRowsNeedingPreview =
      enumLike &&
      !isNewAttribute &&
      enumOptions.some((item) => !normalizeCode(item.code));
    const canPreviewExistingEnumCodes = Boolean(
      persistedAttributeCode && hasExistingEnumRowsNeedingPreview,
    );

    if (!currentAttribute || !categoryCode || !currentBusinessDomain || (!isNewAttribute && !canPreviewExistingEnumCodes)) {
      setPreviewLoading(false);
      setPreviewWarnings([]);
      setAllowManualCodeOverride(false);
      setAllowManualEnumCodeOverride(false);
      return;
    }

    const attributeManualOverride = isManualCodeOverride(currentAttribute.code, currentAttribute.suggestedCode);
    const manualCode = attributeManualOverride ? normalizeCode(currentAttribute.code) : "";
    const previewManualKey = isNewAttribute
      ? (attributeManualOverride ? manualCode : undefined)
      : persistedAttributeCode || undefined;
    const previewLovValues: NonNullable<CreateAttributeCodePreviewRequestDto["lovValues"]> = enumLike
      ? enumOptions
          .map((item, index) => {
            const manualEnumCode = isManualCodeOverride(item.code, item.suggestedCode)
              ? normalizeCode(item.code) || undefined
              : undefined;
            const normalizedValue = item.value?.trim() || undefined;
            const normalizedLabel = item.label?.trim() || undefined;

            return {
              code: manualEnumCode,
              // 后端仅对 name/label 非空的项生成 preview，因此新增空行需要占位值参与预览。
              name: normalizedValue || normalizedLabel || buildLovPreviewPlaceholder(index),
              label: normalizedLabel,
            };
          })
          .filter((item) => item.code || item.name || item.label)
      : [];
    const hasPendingManualAttributeCode = attributeManualOverride && !manualCode;
    const hasPendingManualEnumCode =
      enumLike &&
      enumOptions.some((item) => {
        const hasContent = normalizeCode(item.value) || normalizeCode(item.label);
        return !!hasContent && isManualCodeOverride(item.code, item.suggestedCode) && !normalizeCode(item.code);
      });

    if (isNewAttribute && hasPendingManualAttributeCode) {
      setPreviewLoading(false);
      setPreviewWarnings([]);
      return;
    }

    previewTimerRef.current = setTimeout(async () => {
      const requestId = ++previewRequestIdRef.current;
      setPreviewLoading(true);

      try {
        const preview = await metaAttributeApi.previewCreateCode(currentBusinessDomain, categoryCode, {
          manualKey: previewManualKey,
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

        if (isNewAttribute && !attributeManualOverride) {
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
        } else if (isNewAttribute && !preview.allowManualOverride) {
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
      } catch (error) {
        if (requestId !== previewRequestIdRef.current) {
          return;
        }

        setPreviewWarnings([getErrorMessage(error, "属性编码预计算失败")]);

        if (isNewAttribute && !attributeManualOverride) {
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
  }, [currentAttribute, currentBusinessDomain, currentCategoryCode, enumOptions, enumPreviewSignature]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!effectiveHasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [effectiveHasUnsavedChanges]);

  const handleAttributeUpdate = useCallback((key: string, value: unknown) => {
    setCurrentAttribute((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        [key]: value,
      } as AttributeItem;
    });
  }, []);

  const resetWorkspaceState = () => {
    setCurrentAttribute(null);
    setBaselineAttribute(null);
    setEnumOptions([]);
    setBaselineEnumOptions([]);
    setPreviewWarnings([]);
  };

  const discardCurrentEditingState = () => {
    if (selectedAttributeId && isNewAttributeId(selectedAttributeId)) {
      setDataSource((prev) => prev.filter((item) => item.id !== selectedAttributeId));
      setSelectedAttributeIds((prev) => prev.filter((id) => id !== selectedAttributeId));
      setSelectedAttributeId(null);
      resetWorkspaceState();
      return;
    }

    if (baselineAttribute) {
      setCurrentAttribute({ ...baselineAttribute });
      setEnumOptions([...baselineEnumOptions]);
    }
    setPreviewWarnings([]);
  };

  const runWithUnsavedChangesGuard = (action: () => void) => {
    if (!effectiveHasUnsavedChanges) {
      action();
      return;
    }

    modal.confirm({
      title: "当前属性修改尚未保存，是否放弃修改？",
      content: "继续操作后未保存内容将丢失。",
      okText: "放弃并继续",
      cancelText: "继续编辑",
      okType: "danger",
      onOk: () => {
        discardCurrentEditingState();
        action();
      },
    });
  };

  const applyMultiSelection = (ids: string[], primaryId: string | null) => {
    setCurrentAttribute(null);
    setBaselineAttribute(null);
    setEnumOptions([]);
    setBaselineEnumOptions([]);
    setPreviewWarnings([]);
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

    if (!effectiveHasUnsavedChanges) {
      applyMultiSelection(normalizedIds, nextPrimary);
      return;
    }

    runWithUnsavedChangesGuard(() => {
      applyMultiSelection(normalizedIds, nextPrimary);
    });
  };

  const handleAddAttribute = () => {
    runWithUnsavedChangesGuard(() => {
      const timestamp = Date.now();
      const newAttr = createEmptyAttributeDraft(`new_attr_${timestamp}`);
      setDataSource((prev) => [...prev, newAttr]);
      setSelectedAttributeId(newAttr.id);
      setSelectedAttributeIds([newAttr.id]);
      setCurrentAttribute({ ...newAttr });
      setBaselineAttribute({ ...newAttr });
      setEnumOptions([]);
      setBaselineEnumOptions([]);
      setPreviewWarnings([]);
    });
  };

  const handleDuplicateAttribute = (source: AttributeItem) => {
    runWithUnsavedChangesGuard(() => {
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
      setCurrentAttribute({ ...duplicate });
      setBaselineAttribute({ ...duplicate });
      setEnumOptions([]);
      setBaselineEnumOptions([]);
      setPreviewWarnings([]);
    });
  };

  const handleSingleSave = async (
    attribute: AttributeItem,
    options?: { saveAndNext?: boolean },
  ) => {
      if (!currentCategoryCode || !currentBusinessDomain) {
        messageApi.error("缺少业务领域上下文，无法保存属性");
        return;
      }
      
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
          unit: attribute.unit?.trim() || undefined,
          defaultValue: serializeDefaultValueForBackend(attribute.defaultValue),
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
            savedDetail = await metaAttributeApi.createAttribute(currentBusinessDomain, currentCategoryCode, dto);
              messageApi.success("Created successfully");
          } else {
            savedDetail = await metaAttributeApi.updateAttribute(attribute.code, currentBusinessDomain, currentCategoryCode, dto);
              messageApi.success("Updated successfully");
          }

          const remainingUnsavedItems = dataSource.filter(
            (item) => !isNewAttributeId(item.id) || item.id !== attribute.id,
          );

          const targetId = nextUnsavedNewId || savedDetail.key;
          await loadAttributes(
            currentCategoryCode,
            currentBusinessDomain,
            targetId,
            remainingUnsavedItems.filter((item) => isNewAttributeId(item.id)),
          );

          if (nextUnsavedNewId) {
            setSelectedAttributeId(nextUnsavedNewId);
          }

          if (isNew) {
            setDataSource((prev) => prev.filter((item) => item.id !== attribute.id));
          }

          setBaselineAttribute(null);
          setBaselineEnumOptions([]);
    } catch (error) {
      console.error("Save error:", error);
          // Since request.ts interceptor now rejects with error.response.data directly
      let errorMsg = getErrorMessage(error, "Operation failed");
          
          // User-friendly error message translation
          if (errorMsg.includes("attribute code already exists in business domain") || errorMsg.includes("attribute already exists")) {
            errorMsg = `保存失败：属性编码在当前业务领域内已存在，请使用其他编码。`;
          } else if (errorMsg.includes("enum option code already exists in business domain")) {
            errorMsg = "保存失败：枚举值编码在当前业务领域内已存在，请调整后重试。";
          } else if (errorMsg.includes("INVALID_ARGUMENT")) {
            errorMsg = `参数错误：${errorMsg}`;
          } else {
            errorMsg = `保存失败：${errorMsg}`;
          }
          
            messageApi.error(errorMsg);
          throw error;
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
        if (!currentCategoryCode || !currentBusinessDomain) {
          messageApi.error("缺少业务领域上下文，无法删除属性");
          return;
        }

        try {
          await metaAttributeApi.deleteAttribute(attribute.code, currentBusinessDomain, currentCategoryCode);
          messageApi.success("删除成功 (Deleted)");
          // Refresh list
          void loadAttributes(
            currentCategoryCode,
            currentBusinessDomain,
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
      hasUnsavedChanges: effectiveHasUnsavedChanges,
      unsavedNewCount,
    });
  }, [effectiveHasUnsavedChanges, unsavedNewCount, onUnsavedStateChange]);

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
            key={selectedAttributeIds.length === 1 ? (currentAttribute?.id || selectedAttributeId || 'attribute-workspace-empty') : 'attribute-workspace-multi'}
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
            hasUnsavedChanges={effectiveHasUnsavedChanges}
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
            }}
            onCancelEdit={() => {
              if (baselineAttribute) {
                setCurrentAttribute({ ...baselineAttribute });
                setEnumOptions([...baselineEnumOptions]);
              }
            }}
          />
        </Splitter.Panel>
      </Splitter>
    </Layout>
  );
};

export default AttributeDesigner;
