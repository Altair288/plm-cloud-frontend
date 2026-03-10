"use client";

import React, { useState, useEffect } from "react";
import { App, Splitter, Input, Drawer, Descriptions, Typography, theme, Spin, Empty, Divider } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import CategoryTree from "../AdminCategoryTree";
import {
  metaCategoryApi,
  MetaCategoryNodeDto,
  type MetaCategoryDetailDto,
} from "@/services/metaCategory";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import AttributeDesigner from "../AttributeDesigner";

import { useParams } from "next/navigation";

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

const getStatusIcon = (status?: string) => {
  const normalized = (status || "").toUpperCase();

  if (normalized === "CREATED" || normalized === "DRAFT") {
    return <ClockCircleOutlined style={{ color: "#faad14" }} />;
  }

  if (normalized === "EFFECTIVE" || normalized === "ACTIVE") {
    return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
  }

  if (normalized === "INVALID" || normalized === "INACTIVE") {
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

const CategoryManagementPage: React.FC = () => {
  const { message: messageApi, modal } = App.useApp();
  const { token } = theme.useToken();
  const params = useParams();
  const categoryId = params.id as string;

  const [selectedKey, setSelectedKey] = useState<React.Key>("");
  const [selectedNode, setSelectedNode] = useState<
    CategoryTreeNode | undefined
  >(undefined);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewNode, setPreviewNode] = useState<CategoryTreeNode | undefined>(undefined);
  const [previewDetail, setPreviewDetail] = useState<MetaCategoryDetailDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<React.Key[]>([]);
  const [attributeUnsavedState, setAttributeUnsavedState] = useState({
    hasUnsavedChanges: false,
    unsavedNewCount: 0,
  });

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

  // Initial Load (Segments)
  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const page = await metaCategoryApi.listNodes({ taxonomy: "UNSPSC", level: 1, status: "ALL", page: 0, size: 200 });
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
          icon: getStatusIcon(s.status),
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
        taxonomy: "UNSPSC",
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
          icon: getStatusIcon(c.status),
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

  const handleMenuClick = (key: string, node: CategoryTreeNode) => {
    if (key === "basic-info") {
      setPreviewNode(node);
      setDrawerVisible(true);
      const id = String(node.key);
      if (id.startsWith("local_")) {
        setPreviewDetail(null);
        messageApi.warning("本地临时节点暂无完整详情，请保存后查看");
        return;
      }

      setPreviewLoading(true);
      metaCategoryApi
        .getCategoryDetail(id)
        .then((detail) => {
          setPreviewDetail(detail);
        })
        .catch((e) => {
          console.error(e);
          setPreviewDetail(null);
          messageApi.error("加载分类详情失败");
        })
        .finally(() => {
          setPreviewLoading(false);
        });
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
              taxonomy: "UNSPSC",
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
            icon: getStatusIcon("CREATED"),
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

    if (key === "rename") {
      let inputValue = node.dataRef?.title ?? "";
      modal.confirm({
        title: "重命名分类",
        content: (
          <Input
            defaultValue={inputValue}
            placeholder="请输入新的分类名称"
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
            messageApi.warning("分类名称不能为空");
            return Promise.reject();
          }

          setTreeData((origin) =>
            updateNodeInTree(origin, node.key, (targetNode) => {
              const code = targetNode.dataRef?.code || "LOCAL";
              return {
                ...targetNode,
                title: `${code} - ${trimmed}`,
                dataRef: targetNode.dataRef
                  ? { ...targetNode.dataRef, name: trimmed, title: trimmed }
                  : targetNode.dataRef,
              };
            }),
          );

          if (selectedKey === node.key && selectedNode) {
            setSelectedNode((prev) =>
              prev
                ? {
                    ...prev,
                    title: `${prev.dataRef?.code || "LOCAL"} - ${trimmed}`,
                    dataRef: prev.dataRef
                      ? { ...prev.dataRef, name: trimmed, title: trimmed }
                      : prev.dataRef,
                  }
                : prev,
            );
          }
          messageApi.success("重命名成功");
          return Promise.resolve();
        },
      });
      return;
    }

    if (key === "delete") {
      modal.confirm({
        title: "确认删除",
        content: "删除后不可恢复，是否继续？",
        okType: "danger",
        okText: "删除",
        cancelText: "取消",
        onOk: () => {
          setTreeData((origin) => removeNodeFromTree(origin, node.key));
          if (selectedKey === node.key) {
            setSelectedKey("");
            setSelectedNode(undefined);
          }
          messageApi.success("分类已删除");
        },
      });
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
        taxonomy: "UNSPSC",
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
      icon: getStatusIcon(created.status),
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
              onClose={() => {
                setDrawerVisible(false);
                setPreviewDetail(null);
              }}
              open={drawerVisible}
              getContainer={false}
              style={{ position: 'absolute' }}
              width="100%"
            >
              {previewLoading ? (
                <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spin />
                </div>
              ) : previewDetail ? (
                <>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="分类编码">{previewDetail.code || "-"}</Descriptions.Item>
                    <Descriptions.Item label="分类名称">{previewDetail.latestVersion?.name || "-"}</Descriptions.Item>
                    <Descriptions.Item label="业务领域">{previewDetail.businessDomain || "-"}</Descriptions.Item>
                    <Descriptions.Item label="分类状态">{previewDetail.status || "-"}</Descriptions.Item>
                    <Descriptions.Item label="上级分类">{previewDetail.parentCode ? `${previewDetail.parentCode} - ${previewDetail.parentName || ""}` : "-"}</Descriptions.Item>
                    <Descriptions.Item label="根分类">{previewDetail.rootCode ? `${previewDetail.rootCode} - ${previewDetail.rootName || ""}` : "-"}</Descriptions.Item>
                    <Descriptions.Item label="详细信息">{previewDetail.description || "暂无描述"}</Descriptions.Item>
                    <Descriptions.Item label="创建人">{previewDetail.createdBy || "-"}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{previewDetail.createdAt ? new Date(previewDetail.createdAt).toLocaleString() : "-"}</Descriptions.Item>
                    <Descriptions.Item label="修改人">{previewDetail.modifiedBy || "-"}</Descriptions.Item>
                    <Descriptions.Item label="修改时间">{previewDetail.modifiedAt ? new Date(previewDetail.modifiedAt).toLocaleString() : "-"}</Descriptions.Item>
                    <Descriptions.Item label="版本">{previewDetail.version ?? "-"}</Descriptions.Item>
                  </Descriptions>

                  <Divider titlePlacement="start" style={{ marginTop: 20 }}>历史版本信息</Divider>
                  {previewDetail.historyVersions && previewDetail.historyVersions.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {previewDetail.historyVersions.map((v) => (
                        <div key={v.versionNo} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 8 }}>
                          <div style={{ fontWeight: 600 }}>
                            v{v.versionNo} {v.latest ? "(当前)" : ""}
                          </div>
                          <div>名称: {v.name || "-"}</div>
                          <div>描述: {v.description || "-"}</div>
                          <div>修改人: {v.updatedBy || "-"}</div>
                          <div>修改时间: {v.versionDate ? new Date(v.versionDate).toLocaleString() : "-"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史版本" />
                  )}
                </>
              ) : (
                <div style={{ color: "#999", textAlign: "center", marginTop: 40 }}>请选择节点查看信息</div>
              )}
            </Drawer>
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default CategoryManagementPage;
