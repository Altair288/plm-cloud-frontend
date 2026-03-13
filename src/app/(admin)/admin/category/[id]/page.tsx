"use client";

import React, { useState, useEffect } from "react";
import { App, Splitter, Input, Drawer, Descriptions, Typography, theme, Spin, Empty, Divider, Button, Form, Select, Space, Card, Row, Col, Tabs } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import dynamic from "next/dynamic";
import CategoryTree from "../AdminCategoryTree";
import VersionGraph from "@/components/VersionGraph";
import {
  metaCategoryApi,
  MetaCategoryNodeDto,
  type MetaCategoryDetailDto,
} from "@/services/metaCategory";
import BatchDeleteModal, { type DeleteTargetNode } from "../components/BatchDeleteModal";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import AttributeDesigner from "../AttributeDesigner";
import { useDictionary } from "@/contexts/DictionaryContext";
import type { MetaDictionaryEntryDto } from "@/models/dictionary";

import { useParams } from "next/navigation";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
const EMPTY_QUILL_DELTA_JSON = '{"ops":[{"insert":"\\n"}]}'

const normalizeDeltaJson = (value?: string) => {
  if (!value || typeof value !== "string") {
    return EMPTY_QUILL_DELTA_JSON;
  }
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: [] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "font",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "align",
  "blockquote",
  "code-block",
  "link",
  "image",
];

interface CategoryTreeNode extends Omit<DataNode, "children"> {
  children?: CategoryTreeNode[];
  dataRef?: CategoryNodeRef;
  level?: "segment" | "family" | "class" | "commodity" | "item";
  loaded?: boolean;
  familyCode?: string;
  classCode?: string; // For Commodity nodes to know their parent Class
  commodityCode?: string;
}

interface CategoryNodeRef extends MetaCategoryNodeDto {
  key?: string;
  title?: string;
  depth?: number;
}

const getChildLevel = (
  level?: CategoryTreeNode["level"],
): CategoryTreeNode["level"] | undefined => {
  if (level === "segment") return "family";
  if (level === "family") return "class";
  if (level === "class") return "commodity";
  if (level === "commodity") return "item";
  return undefined;
};

const resolveStatusSemantic = (
  status: string | undefined,
  entries: MetaDictionaryEntryDto[],
) => {
  const normalized = String(status || "").toUpperCase();
  const matched = entries.find((entry) => {
    const dbValue = typeof entry.extra?.dbValue === "string" ? entry.extra.dbValue : undefined;
    return [entry.key, entry.value, dbValue]
      .filter(Boolean)
      .some((item) => String(item).toUpperCase() === normalized);
  });
  return String(matched?.value || normalized).toUpperCase();
};

const getStatusIcon = (status?: string, entries: MetaDictionaryEntryDto[] = []) => {
  const semantic = resolveStatusSemantic(status, entries);

  if (semantic === "CREATED" || semantic === "DRAFT") {
    return <ClockCircleOutlined style={{ color: "#faad14" }} />;
  }

  if (semantic === "EFFECTIVE" || semantic === "ACTIVE") {
    return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
  }

  if (semantic === "INVALID" || semantic === "INACTIVE") {
    return <StopOutlined style={{ color: "#ff4d4f" }} />;
  }

  return <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />;
};

const getLevelByNumber = (level?: number): CategoryTreeNode["level"] => {
  if (level === 1) return "segment";
  if (level === 2) return "family";
  if (level === 3) return "class";
  if (level === 4) return "commodity";
  return "item";
};

const deltaJsonToPlainText = (input?: string | null) => {
  if (!input) return "";
  try {
    const parsed = JSON.parse(input);
    if (!parsed || !Array.isArray(parsed.ops)) return input;
    return parsed.ops
      .map((op: any) => (typeof op?.insert === "string" ? op.insert : ""))
      .join("")
      .trim();
  } catch {
    return input;
  }
};

const toSemanticCategoryStatus = (status?: string): "CREATED" | "EFFECTIVE" | "INVALID" => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "EFFECTIVE" || normalized === "ACTIVE") return "EFFECTIVE";
  if (normalized === "INVALID" || normalized === "INACTIVE") return "INVALID";
  return "CREATED";
};

const CategoryManagementPage: React.FC = () => {
  const { message: messageApi, modal } = App.useApp();
  const { token } = theme.useToken();
  const { ensureScene, getEntries, getLabel } = useDictionary();
  const params = useParams();
  const categoryId = params.id as string;

  useEffect(() => {
    void ensureScene("category-admin");
  }, [ensureScene]);

  const categoryStatusEntries = getEntries("META_CATEGORY_STATUS");
  const businessDomainEntries = getEntries("META_CATEGORY_BUSINESS_DOMAIN");

  const [selectedKey, setSelectedKey] = useState<React.Key>("");
  const [selectedNode, setSelectedNode] = useState<
    CategoryTreeNode | undefined
  >(undefined);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewNode, setPreviewNode] = useState<CategoryTreeNode | undefined>(undefined);
  const [previewDetail, setPreviewDetail] = useState<MetaCategoryDetailDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEditing, setPreviewEditing] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [renameGuidedEdit, setRenameGuidedEdit] = useState(false);
  const [previewEditBaseline, setPreviewEditBaseline] = useState("");
  const [previewEditCurrent, setPreviewEditCurrent] = useState("");
  const [pendingPreviewFormValues, setPendingPreviewFormValues] = useState<Record<string, any> | null>(null);
  const [previewForm] = Form.useForm();

  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<React.Key[]>([]);
  const [attributeUnsavedState, setAttributeUnsavedState] = useState({
    hasUnsavedChanges: false,
    unsavedNewCount: 0,
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetNodes, setDeleteTargetNodes] = useState<DeleteTargetNode[]>([]);

  const updateNodeInTree = (
    list: CategoryTreeNode[],
    key: React.Key,
    updater: (node: CategoryTreeNode) => CategoryTreeNode,
  ): CategoryTreeNode[] => {
    return list.map((node) => {
      if (node.key === key) {
        return updater(node);
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, key, updater),
        };
      }
      return node;
    });
  };

  const removeNodeFromTree = (
    list: CategoryTreeNode[],
    key: React.Key,
  ): CategoryTreeNode[] => {
    return list
      .filter((node) => node.key !== key)
      .map((node) => {
        if (!node.children) return node;
        return {
          ...node,
          children: removeNodeFromTree(node.children, key),
        };
      });
  };

  const removeNodesFromTree = (
    list: CategoryTreeNode[],
    keysToRemove: Set<React.Key>,
  ): CategoryTreeNode[] => {
    return list
      .filter((node) => !keysToRemove.has(node.key))
      .map((node) => {
        const nextChildren = node.children
          ? removeNodesFromTree(node.children, keysToRemove)
          : node.children;

        if (!node.children) {
          return node;
        }

        const normalizedChildren = nextChildren ?? [];
        const hasChildren = normalizedChildren.length > 0;

        return {
          ...node,
          children: normalizedChildren,
          isLeaf: !hasChildren,
          dataRef: node.dataRef
            ? {
                ...node.dataRef,
                hasChildren,
                leaf: !hasChildren,
              }
            : node.dataRef,
        };
      });
  };

  const collectNodeKeys = (nodes: CategoryTreeNode[]): Set<React.Key> => {
    const keySet = new Set<React.Key>();
    const visit = (items: CategoryTreeNode[]) => {
      items.forEach((item) => {
        keySet.add(item.key);
        if (item.children?.length) {
          visit(item.children);
        }
      });
    };
    visit(nodes);
    return keySet;
  };

  const buildParentKeyMap = (nodes: CategoryTreeNode[]) => {
    const parentMap = new Map<React.Key, React.Key | null>();
    const visit = (items: CategoryTreeNode[], parentKey: React.Key | null = null) => {
      items.forEach((item) => {
        parentMap.set(item.key, parentKey);
        if (item.children?.length) {
          visit(item.children, item.key);
        }
      });
    };
    visit(nodes);
    return parentMap;
  };



  const applyDeletedNodes = (deletedKeys: React.Key[]) => {
    if (!deletedKeys.length) return;

    const deletedKeySet = new Set<React.Key>(deletedKeys);
    setTreeData((origin) => removeNodesFromTree(origin, deletedKeySet));

    if (selectedKey && deletedKeySet.has(selectedKey)) {
      setSelectedKey("");
      setSelectedNode(undefined);
    }

    if (previewNode && deletedKeySet.has(previewNode.key)) {
      setDrawerVisible(false);
      setPreviewNode(undefined);
      setPreviewDetail(null);
      setPreviewEditing(false);
      setRenameGuidedEdit(false);
      setPreviewEditBaseline("");
      setPreviewEditCurrent("");
      setPendingPreviewFormValues(null);
    }
  };


  const normalizeBatchDeleteTargets = (nodes: CategoryTreeNode[]) => {
    const existingKeys = collectNodeKeys(treeData);
    const parentMap = buildParentKeyMap(treeData);
    const uniqueNodes = new Map<React.Key, CategoryTreeNode>();

    nodes.forEach((node) => {
      if (existingKeys.has(node.key)) {
        uniqueNodes.set(node.key, node);
      }
    });

    return Array.from(uniqueNodes.values()).filter((node) => {
      let currentParent = parentMap.get(node.key);
      while (currentParent) {
        if (uniqueNodes.has(currentParent)) {
          return false;
        }
        currentParent = parentMap.get(currentParent);
      }
      return true;
    });
  };

  const openDeleteModal = (nodes: CategoryTreeNode[]) => {
    const targetNodes = normalizeBatchDeleteTargets(nodes);
    if (!targetNodes.length) {
      messageApi.info("未找到可删除的分类");
      return;
    }
    setDeleteTargetNodes(
      targetNodes.map((n) => ({
        key: n.key,
        name: n.dataRef?.name,
        code: n.dataRef?.code,
        level: n.dataRef?.level,
        status: n.dataRef?.status,
      })),
    );
    setDeleteModalOpen(true);
  };

  // Initial Load (Segments)
  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const page = await metaCategoryApi.listNodes({ businessDomain: "MATERIAL", level: 1, status: "ALL", page: 0, size: 200 });
      const nodes: CategoryTreeNode[] = (Array.isArray(page.content) ? page.content : []).map((s) => {
        const ref: CategoryNodeRef = {
          ...s,
          key: s.id,
          title: s.name,
          depth: (s.level ?? 1) - 1,
        };
        const level = getLevelByNumber(s.level);
        return {
          title: `${s.code} - ${s.name}`,
          key: s.id,
          isLeaf: !s.hasChildren,
          dataRef: ref,
          level,
          icon: getStatusIcon(s.status, categoryStatusEntries),
        };
      });
      setTreeData(nodes);
      setLoadedKeys([]);
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to load segments");
    }
  };

  const onLoadData = async (node: any): Promise<void> => {
    const { key, children } = node as CategoryTreeNode;
    if (children && children.length > 0) return;

    try {
      const page = await metaCategoryApi.listNodes({
        businessDomain: "MATERIAL",
        parentId: String(key),
        status: "ALL",
        page: 0,
        size: 200,
      });

      const childNodes: CategoryTreeNode[] = (page.content || []).map((c) => {
        const ref: CategoryNodeRef = {
          ...c,
          key: c.id,
          title: c.name,
          depth: (c.level ?? 1) - 1,
        };
        const childLevel = getLevelByNumber(c.level);
        return {
          title: `${c.code} - ${c.name}`,
          key: c.id,
          isLeaf: !c.hasChildren,
          dataRef: ref,
          level: childLevel,
          icon: getStatusIcon(c.status, categoryStatusEntries),
        };
      });

      setTreeData((origin) =>
        updateTreeData(origin, key as React.Key, childNodes),
      );
      setLoadedKeys((keys) => [...keys, key as React.Key]);
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to load children");
    }
  };

  const updateTreeData = (
    list: CategoryTreeNode[],
    key: React.Key,
    children: CategoryTreeNode[],
  ): CategoryTreeNode[] => {
    return list.map((node) => {
      if (node.key === key) {
        return { ...node, children };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeData(node.children, key, children),
        };
      }
      return node;
    });
  };

  const requestCategorySelection = (
    nextKey: React.Key,
    nextNode?: CategoryTreeNode,
  ) => {
    if (nextKey === selectedKey) {
      return;
    }

    if (attributeUnsavedState.hasUnsavedChanges || attributeUnsavedState.unsavedNewCount > 0) {
      const unsavedParts: string[] = [];
      if (attributeUnsavedState.hasUnsavedChanges) {
        unsavedParts.push("当前属性存在未保存修改");
      }
      if (attributeUnsavedState.unsavedNewCount > 0) {
        unsavedParts.push(`存在 ${attributeUnsavedState.unsavedNewCount} 条未保存新建属性`);
      }

      modal.confirm({
        title: "切换分类前确认",
        content: `检测到${unsavedParts.join("，")}。切换后将放弃这些内容，是否继续？`,
        okText: "放弃并切换",
        cancelText: "继续编辑",
        okType: "danger",
        onOk: () => {
          setSelectedKey(nextKey);
          setSelectedNode(nextNode);
          setAttributeUnsavedState({ hasUnsavedChanges: false, unsavedNewCount: 0 });
        },
      });
      return;
    }

    setSelectedKey(nextKey);
    setSelectedNode(nextNode);
  };

  const onSelect: TreeProps["onSelect"] = (keys, info) => {
    const nextKey = keys.length > 0 ? keys[0] : "";
    const nextNode = keys.length > 0 ? (info.node as CategoryTreeNode) : undefined;

    if (keys.length > 0) {
      requestCategorySelection(nextKey, nextNode);
    } else {
      requestCategorySelection("", undefined);
    }
  };

  const buildPreviewSnapshot = (values?: {
    name?: string;
    businessDomain?: string;
    status?: string;
    description?: string;
  }) => JSON.stringify({
    name: values?.name || "",
    businessDomain: values?.businessDomain || "",
    status: values?.status || "",
    description: normalizeDeltaJson(values?.description || EMPTY_QUILL_DELTA_JSON),
  });

  const checkPreviewUnsaved = (onConfirm: () => void) => {
    if (!previewEditing) {
      setPreviewEditBaseline("");
      setPreviewEditCurrent("");
      onConfirm();
      return;
    }

    const hasRealChanges = previewEditing && !!previewEditBaseline && previewEditCurrent !== previewEditBaseline;

    if (hasRealChanges) {
      modal.confirm({
        title: "放弃修改确认",
        content: "检测到分类详细信息存在未保存的修改，放弃或离开后将丢失这些内容，是否继续？",
        okText: "放弃并继续",
        cancelText: "取消",
        okType: "danger",
        onOk: () => {
          setPreviewEditBaseline("");
          setPreviewEditCurrent("");
          onConfirm();
        },
      });
    } else {
      setPreviewEditBaseline("");
      setPreviewEditCurrent("");
      onConfirm();
    }
  };

  useEffect(() => {
    if (!drawerVisible || !previewEditing || !pendingPreviewFormValues) {
      return;
    }
    previewForm.setFieldsValue(pendingPreviewFormValues);
    setPendingPreviewFormValues(null);
  }, [drawerVisible, previewEditing, pendingPreviewFormValues, previewForm]);

  const openPreviewDetail = (
    node: CategoryTreeNode,
    startEdit = false,
    options?: { openAfterDataReady?: boolean },
  ) => {
    setPreviewNode(node);
    const id = String(node.key);
    const openAfterDataReady = !!options?.openAfterDataReady;

    if (!openAfterDataReady) {
      setDrawerVisible(true);
    }

    if (id.startsWith("local_")) {
      setPreviewDetail(null);
      setPreviewEditing(false);
      setRenameGuidedEdit(false);
      setPendingPreviewFormValues(null);
      setPreviewEditBaseline("");
      setPreviewEditCurrent("");
      messageApi.warning(
        startEdit
          ? "本地临时节点暂不支持重命名，请保存后在详情页编辑"
          : "本地临时节点暂无完整详情，请保存后查看",
      );
      return;
    }

    setPreviewLoading(true);
    metaCategoryApi
      .getCategoryDetail(id)
      .then((detail) => {
        setPreviewDetail(detail);

        if (startEdit) {
          setRenameGuidedEdit(true);
          const initialValues = {
            name: detail.latestVersion?.name || "",
            businessDomain: detail.businessDomain,
            status: resolveStatusSemantic(detail.status, categoryStatusEntries),
            description: detail.description || EMPTY_QUILL_DELTA_JSON,
          };
          const snapshot = buildPreviewSnapshot(initialValues);
          setPreviewEditBaseline(snapshot);
          setPreviewEditCurrent(snapshot);
          setPendingPreviewFormValues(initialValues);
          setPreviewEditing(true);
        } else {
          setPreviewEditing(false);
          setRenameGuidedEdit(false);
          setPreviewEditBaseline("");
          setPreviewEditCurrent("");
          setPendingPreviewFormValues(null);
        }

        if (openAfterDataReady) {
          setDrawerVisible(true);
        }
      })
      .catch((e) => {
        console.error(e);
        setPreviewDetail(null);
        setPreviewEditing(false);
        setRenameGuidedEdit(false);
        setPreviewEditBaseline("");
        setPreviewEditCurrent("");
        setPendingPreviewFormValues(null);
        messageApi.error("加载分类详情失败");
      })
      .finally(() => {
        setPreviewLoading(false);
      });
  };

  const handleMenuClick = (key: string, node: CategoryTreeNode) => {
    if (key === "basic-info") {
      checkPreviewUnsaved(() => openPreviewDetail(node, false));
      return;
    }

    if (key === "design") {
      requestCategorySelection(node.key, node);
      return;
    }

    if (key === "add") {
      const childLevel = getChildLevel(node.level);
      if (!childLevel) {
        messageApi.warning("当前节点不支持新增子分类");
        return;
      }

      let inputValue = "";
      modal.confirm({
        title: "新增子分类",
        content: (
          <Input
            placeholder="请输入子分类名称"
            onChange={(e) => {
              inputValue = e.target.value;
            }}
          />
        ),
        okText: "确认",
        cancelText: "取消",
        onOk: () => {
          const trimmed = inputValue.trim();
          if (!trimmed) {
            messageApi.warning("请输入子分类名称");
            return Promise.reject();
          }

          const localCode = `LOCAL_${Date.now()}`;
          const levelNumber = ((node.dataRef?.level ?? 1) + 1);
          const childNode: CategoryTreeNode = {
            key: `local_${childLevel}_${Date.now()}`,
            title: `${localCode} - ${trimmed}`,
            dataRef: {
              id: `local_${childLevel}_${Date.now()}`,
              businessDomain: "MATERIAL",
              key: `local_${childLevel}_${Date.now()}`,
              code: localCode,
              name: trimmed,
              title: trimmed,
              hasChildren: childLevel !== "commodity" && childLevel !== "item",
              level: levelNumber,
              depth: (node.dataRef?.depth ?? 0) + 1,
            },
            level: childLevel,
            isLeaf: childLevel === "commodity" || childLevel === "item",
            icon: getStatusIcon("CREATED", categoryStatusEntries),
          };

          setTreeData((origin) =>
            updateNodeInTree(origin, node.key, (targetNode) => ({
              ...targetNode,
              isLeaf: false,
              children: [...(targetNode.children ?? []), childNode],
            })),
          );

          setLoadedKeys((keys) =>
            keys.includes(node.key) ? keys : [...keys, node.key],
          );
          messageApi.success("子分类已新增");
          return Promise.resolve();
        },
      });
      return;
    }

    if (key.startsWith("status:")) {
      const targetStatus = key.replace("status:", "") as "CREATED" | "EFFECTIVE" | "INVALID";
      const applyStatusTransition = async () => {
        const id = String(node.key);
        if (id.startsWith("local_")) {
          messageApi.warning("本地临时节点暂不支持状态转换，请保存后再操作");
          return;
        }

        const currentStatus = toSemanticCategoryStatus((node.dataRef as any)?.status);
        if (currentStatus === targetStatus) {
          messageApi.info("当前已是目标状态");
          return;
        }

        try {
          const updated = await metaCategoryApi.patchCategory(
            id,
            { status: targetStatus },
            { operator: "admin" },
          );

          setTreeData((origin) =>
            updateNodeInTree(origin, id, (targetNode) => {
              const nextName = updated.latestVersion?.name || targetNode.dataRef?.name || "未命名分类";
              return {
                ...targetNode,
                title: `${updated.code} - ${nextName}`,
                icon: getStatusIcon(updated.status, categoryStatusEntries),
                dataRef: targetNode.dataRef
                  ? {
                      ...targetNode.dataRef,
                      status: updated.status,
                      name: nextName,
                    }
                  : targetNode.dataRef,
              };
            }),
          );

          if (selectedKey === id) {
            setSelectedNode((prev) =>
              prev
                ? {
                    ...prev,
                    title: `${updated.code} - ${updated.latestVersion?.name || prev.dataRef?.name || "未命名分类"}`,
                    icon: getStatusIcon(updated.status, categoryStatusEntries),
                    dataRef: prev.dataRef
                      ? {
                          ...prev.dataRef,
                          status: updated.status,
                          name: updated.latestVersion?.name || prev.dataRef.name,
                        }
                      : prev.dataRef,
                  }
                : prev,
            );
          }

          if (previewNode && String(previewNode.key) === id) {
            setPreviewNode((prev) =>
              prev
                ? {
                    ...prev,
                    icon: getStatusIcon(updated.status, categoryStatusEntries),
                    dataRef: prev.dataRef
                      ? {
                          ...prev.dataRef,
                          status: updated.status,
                          name: updated.latestVersion?.name || prev.dataRef.name,
                        }
                      : prev.dataRef,
                  }
                : prev,
            );
          }

          if (previewDetail?.id === id) {
            setPreviewDetail(updated);
            if (previewEditing) {
              setPendingPreviewFormValues((prev) => ({
                ...(prev || {}),
                status: resolveStatusSemantic(updated.status, categoryStatusEntries),
              }));
            }
          }

          messageApi.success("状态转换成功");
        } catch (e: any) {
          const msg = e?.message || e?.error || "状态转换失败";
          messageApi.error(msg);
        }
      };

      checkPreviewUnsaved(() => {
        void applyStatusTransition();
      });
      return;
    }

    if (key === "rename") {
      checkPreviewUnsaved(() => openPreviewDetail(node, true, { openAfterDataReady: true }));
      return;
    }

    if (key === "delete") {
      openDeleteModal([node]);
    }
  };

  const handleCategoryCreated = (
    created: MetaCategoryDetailDto,
    parent?: {
      id?: string | null;
      level?: number;
      path?: string;
      code?: string;
      name?: string;
    } | null,
  ) => {
    const levelNumber =
      created.level ?? (parent?.level ? parent.level + 1 : 1);
    const level = getLevelByNumber(levelNumber);
    const name = created.latestVersion?.name || "未命名分类";

    const newNode: CategoryTreeNode = {
      key: created.id,
      title: `${created.code} - ${name}`,
      isLeaf: true,
      dataRef: {
        id: created.id,
        businessDomain: created.businessDomain || "MATERIAL",
        code: created.code,
        name,
        level: levelNumber,
        parentId: created.parentId || null,
        path: created.path,
        hasChildren: false,
        leaf: true,
        status: created.status,
        sort: created.sort,
      },
      level,
      icon: getStatusIcon(created.status, categoryStatusEntries),
    };

    if (!created.parentId) {
      setTreeData((prev) => {
        if (prev.some((item) => item.key === created.id)) return prev;
        return [...prev, newNode];
      });
      return;
    }

    setTreeData((origin) =>
      updateNodeInTree(origin, created.parentId!, (targetNode) => {
        const existingChildren = targetNode.children ?? [];
        if (existingChildren.some((child) => child.key === created.id)) {
          return targetNode;
        }
        return {
          ...targetNode,
          isLeaf: false,
          children: [...existingChildren, newNode],
          dataRef: targetNode.dataRef
            ? { ...targetNode.dataRef, hasChildren: true, leaf: false }
            : targetNode.dataRef,
        };
      }),
    );
    setLoadedKeys((keys) =>
      keys.includes(created.parentId!) ? keys : [...keys, created.parentId!],
    );
  };

  const handleStartPreviewEdit = () => {
    if (!previewDetail) return;
    setRenameGuidedEdit(false);
    const initialValues = {
      name: previewDetail.latestVersion?.name || "",
      businessDomain: previewDetail.businessDomain,
      status: resolveStatusSemantic(previewDetail.status, categoryStatusEntries),
      description: previewDetail.description || EMPTY_QUILL_DELTA_JSON,
    };
    const snapshot = buildPreviewSnapshot(initialValues);
    setPreviewEditBaseline(snapshot);
    setPreviewEditCurrent(snapshot);
    setPendingPreviewFormValues(initialValues);
    setPreviewEditing(true);
  };

  const handleSavePreviewEdit = async () => {
    if (!previewDetail) return;
    const values = await previewForm.validateFields();

    setPreviewSaving(true);
    try {
      const updated = await metaCategoryApi.updateCategory(
        previewDetail.id,
        {
          name: values.name,
          businessDomain: values.businessDomain,
          parentId: previewDetail.parentId || null,
          status: values.status,
          description: values.description || EMPTY_QUILL_DELTA_JSON,
        },
        { operator: "admin" },
      );

      setPreviewDetail(updated);
      setPreviewEditing(false);
      setRenameGuidedEdit(false);
      setPreviewEditBaseline("");
      setPreviewEditCurrent("");
      setPendingPreviewFormValues(null);

      setTreeData((origin) =>
        updateNodeInTree(origin, previewDetail.id, (targetNode) => ({
          ...targetNode,
          title: `${updated.code} - ${updated.latestVersion?.name || updated.code}`,
          icon: getStatusIcon(updated.status, categoryStatusEntries),
          dataRef: targetNode.dataRef
            ? {
                ...targetNode.dataRef,
                name: updated.latestVersion?.name || targetNode.dataRef.name,
                status: updated.status,
              }
            : targetNode.dataRef,
        })),
      );

      if (selectedKey === previewDetail.id) {
        setSelectedNode((prev) =>
          prev
            ? {
                ...prev,
                title: `${updated.code} - ${updated.latestVersion?.name || updated.code}`,
                icon: getStatusIcon(updated.status, categoryStatusEntries),
                dataRef: prev.dataRef
                  ? {
                      ...prev.dataRef,
                      name: updated.latestVersion?.name || prev.dataRef.name,
                      status: updated.status,
                    }
                  : prev.dataRef,
              }
            : prev,
        );
      }

      messageApi.success("分类信息已更新");
    } catch (e: any) {
      const msg = e?.message || e?.error || "更新分类失败";
      messageApi.error(msg);
    } finally {
      setPreviewSaving(false);
    }
  };

  if (categoryId !== "2") {
    return (
      <div
        style={{
          height: "calc(100vh - 163px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ant-color-bg-container, #fff)",
          borderRadius: 8,
          border: "1px solid var(--ant-color-border-secondary, #f0f0f0)",
        }}
      >
        <div style={{ color: "#999", fontSize: 16 }}>
          该分类下的数据能力建设功能正在开发中...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "calc(100vh - 163px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "hidden",
      }}
    >
      <Splitter
        onCollapse={(collapsed) => setLeftCollapsed(collapsed[0] ?? false)}
        style={{
          flex: 1,
          minHeight: 0,
          background: "var(--ant-color-bg-container, #fff)",
          borderRadius: 8,
          border: "1px solid var(--ant-color-border-secondary, #f0f0f0)",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <Splitter.Panel
          defaultSize={450}
          min={350}
          max={600}
          collapsible={{
            end: true,
            showCollapsibleIcon: leftCollapsed ? true : "auto",
          }}
        >
          <CategoryTree
            onSelect={onSelect}
            treeData={treeData}
            selectedKeys={selectedKey ? [selectedKey] : []}
            loadData={onLoadData}
            loadedKeys={loadedKeys}
            onLoad={(keys) => setLoadedKeys(keys as React.Key[])}
            onMenuClick={handleMenuClick}
            onBatchDelete={(nodes) => openDeleteModal(nodes as CategoryTreeNode[])}
            onCategoryCreated={handleCategoryCreated}
          />
        </Splitter.Panel>
        <Splitter.Panel>
          <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
            {selectedNode ? (
              <AttributeDesigner
                currentNode={selectedNode.dataRef}
                onUnsavedStateChange={setAttributeUnsavedState}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  padding: "16px",
                  color: "#999",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                请选择左侧分类节点
              </div>
            )}
            
            <Drawer
              title={previewNode?.dataRef?.name ? `分类详细信息 - ${previewNode.dataRef.name}` : "分类详细信息"}
              placement="right"
              closable={true}
              extra={
                previewDetail ? (
                  previewEditing ? (
                    <Space>
                      <Button onClick={() => checkPreviewUnsaved(() => {
                        setPreviewEditing(false);
                        setRenameGuidedEdit(false);
                        setPreviewEditBaseline("");
                        setPreviewEditCurrent("");
                        setPendingPreviewFormValues(null);
                      })}>取消</Button>
                      <Button type="primary" loading={previewSaving} onClick={handleSavePreviewEdit}>
                        保存
                      </Button>
                    </Space>
                  ) : (
                    <Button type="primary" onClick={handleStartPreviewEdit}>编辑</Button>
                  )
                ) : null
              }
              onClose={() => {
                checkPreviewUnsaved(() => {
                  setDrawerVisible(false);
                  setPreviewDetail(null);
                  setPreviewEditing(false);
                  setRenameGuidedEdit(false);
                  setPreviewEditBaseline("");
                  setPreviewEditCurrent("");
                  setPendingPreviewFormValues(null);
                });
              }}
              open={drawerVisible}
              forceRender
              getContainer={false}
              rootStyle={{ position: 'absolute' }}
              width="100%"
            >
              {previewLoading ? (
                <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spin />
                </div>
              ) : previewDetail ? (
                <Tabs
                  defaultActiveKey="basic"
                  items={[
                    {
                      key: 'basic',
                      label: '基本信息',
                      children: (
                        <>
                          {previewEditing ? (
                            <Form
                              form={previewForm}
                              layout="vertical"
                              onValuesChange={(_, allValues) => {
                                setPreviewEditCurrent(buildPreviewSnapshot(allValues));
                              }}
                            >
                              <Card 
                                size="small" 
                                variant="outlined" 
                                style={{ 
                                  borderRadius: token.borderRadiusLG,
                                  backgroundColor: token.colorFillAlter,
                                  marginBottom: 16
                                }}
                              >
                                <Row gutter={24}>
                                  <Col span={12}>
                                    <Form.Item label="分类编码">
                                      <Input 
                                        value={previewDetail.code} 
                                        readOnly 
                                        style={{ 
                                          color: token.colorTextDisabled, 
                                          backgroundColor: token.colorBgContainerDisabled, 
                                          cursor: 'not-allowed' 
                                        }} 
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item label="分类名称" name="name" rules={[{ required: true, message: "请输入分类名称" }]}>
                                      <Input
                                        autoFocus={renameGuidedEdit}
                                        placeholder="请输入分类名称"
                                        style={renameGuidedEdit ? { borderColor: token.colorInfo, boxShadow: `0 0 0 2px ${token.colorInfoBg}` } : undefined}
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>

                                <Row gutter={24}>
                                  <Col span={12}>
                                    <Form.Item label="业务领域" name="businessDomain" rules={[{ required: true, message: "请选择业务领域" }]}>
                                      <Select placeholder="请选择业务领域">
                                        {businessDomainEntries.map((entry) => (
                                          <Select.Option key={entry.value} value={entry.value}>
                                            {entry.label} ({entry.value})
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item label="上级分类">
                                      <Input 
                                        value={previewDetail.parentCode ? `${previewDetail.parentCode} - ${previewDetail.parentName || ""}` : "-"} 
                                        readOnly 
                                        style={{ 
                                          color: token.colorTextDisabled, 
                                          backgroundColor: token.colorBgContainerDisabled, 
                                          cursor: 'not-allowed' 
                                        }} 
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>

                                <Row gutter={24}>
                                  <Col span={12}>
                                    <Form.Item label="分类状态" name="status" rules={[{ required: true, message: "请选择分类状态" }]}>
                                      <Select placeholder="请选择分类状态">
                                        {categoryStatusEntries
                                          .filter((entry) => ["CREATED", "EFFECTIVE", "INVALID"].includes(String(entry.value).toUpperCase()))
                                          .map((entry) => (
                                            <Select.Option key={entry.value} value={entry.value}>
                                              {entry.label}
                                            </Select.Option>
                                          ))}
                                      </Select>
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item label="根分类">
                                      <Input 
                                        value={previewDetail.rootCode ? `${previewDetail.rootCode} - ${previewDetail.rootName || ""}` : "-"} 
                                        readOnly 
                                        style={{ 
                                          color: token.colorTextDisabled, 
                                          backgroundColor: token.colorBgContainerDisabled, 
                                          cursor: 'not-allowed' 
                                        }} 
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>

                                <Row gutter={24}>
                                  <Col span={24}>
                                    <Form.Item label="详细信息">
                                      <div
                                        className="category-description-editor"
                                        style={{
                                          border: `1px solid ${token.colorBorder}`,
                                          borderRadius: token.borderRadius,
                                          overflow: "hidden",
                                          background: token.colorBgContainer,
                                        }}
                                      >
                                        <Form.Item
                                          name="description"
                                          noStyle
                                          trigger="onChange"
                                          getValueFromEvent={(_content, _delta, _source, editor) => {
                                            if (!editor || typeof editor.getContents !== "function") {
                                              return EMPTY_QUILL_DELTA_JSON;
                                            }
                                            return JSON.stringify(editor.getContents());
                                          }}
                                          getValueProps={(value) => {
                                            if (!value || typeof value !== "string") {
                                              return { value: undefined };
                                            }
                                            try {
                                              return { value: JSON.parse(value) };
                                            } catch {
                                              return { value: undefined };
                                            }
                                          }}
                                        >
                                          <ReactQuill
                                            theme="snow"
                                            modules={quillModules}
                                            formats={quillFormats}
                                            placeholder="请输入详细信息"
                                            style={{ minHeight: 180 }}
                                          />
                                        </Form.Item>
                                      </div>
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </Card>
                            </Form>
                          ) : (
                            <Descriptions column={1} bordered size="small">
                              <Descriptions.Item label="分类编码">{previewDetail.code || "-"}</Descriptions.Item>
                              <Descriptions.Item label="分类名称">{previewDetail.latestVersion?.name || "-"}</Descriptions.Item>
                              <Descriptions.Item label="业务领域">
                                {getLabel("META_CATEGORY_BUSINESS_DOMAIN", previewDetail.businessDomain, {
                                  fallback: previewDetail.businessDomain || "-",
                                })}
                              </Descriptions.Item>
                              <Descriptions.Item label="分类状态">
                                {getLabel("META_CATEGORY_STATUS", previewDetail.status, {
                                  matchDbValue: true,
                                  fallback: previewDetail.status || "-",
                                })}
                              </Descriptions.Item>
                              <Descriptions.Item label="上级分类">{previewDetail.parentCode ? `${previewDetail.parentCode} - ${previewDetail.parentName || ""}` : "-"}</Descriptions.Item>
                              <Descriptions.Item label="根分类">{previewDetail.rootCode ? `${previewDetail.rootCode} - ${previewDetail.rootName || ""}` : "-"}</Descriptions.Item>
                              <Descriptions.Item label="详细信息">
                                {deltaJsonToPlainText(previewDetail.description) || "暂无描述"}
                              </Descriptions.Item>
                              <Descriptions.Item label="创建人">{previewDetail.createdBy || "-"}</Descriptions.Item>
                              <Descriptions.Item label="创建时间">{previewDetail.createdAt ? new Date(previewDetail.createdAt).toLocaleString() : "-"}</Descriptions.Item>
                              <Descriptions.Item label="修改人">{previewDetail.modifiedBy || "-"}</Descriptions.Item>
                              <Descriptions.Item label="修改时间">{previewDetail.modifiedAt ? new Date(previewDetail.modifiedAt).toLocaleString() : "-"}</Descriptions.Item>
                              <Descriptions.Item label="版本">{previewDetail.version ?? "-"}</Descriptions.Item>
                            </Descriptions>
                          )}
                        </>
                      )
                    },
                    {
                      key: 'version',
                      label: '版本信息',
                      children: <VersionGraph categoryId={previewDetail.id} versions={(previewDetail as any).historyVersions || []} />
                    }
                  ]}
                />
              ) : (
                <div style={{ color: "#999", textAlign: "center", marginTop: 40 }}>请选择节点查看信息</div>
              )}
            </Drawer>
          </div>
        </Splitter.Panel>
      </Splitter>

      <BatchDeleteModal
        open={deleteModalOpen}
        nodes={deleteTargetNodes}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={(deletedIds) => {
          applyDeletedNodes(deletedIds);
          setDeleteModalOpen(false);
        }}
      />
    </div>
  );
};

export default CategoryManagementPage;
