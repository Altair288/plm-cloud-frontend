"use client";

import React, { useState, useEffect } from "react";
import { Splitter, message, Tabs, Button } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import CategoryTree from "./AdminCategoryTree";
import {
  metaCategoryApi,
  MetaCategoryBrowseNodeDto,
} from "@/services/metaCategory";
import {
  AppstoreOutlined,
  PartitionOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import CategoryList from "./CategoryList";
import AttributeDesigner from "./AttributeDesigner";

interface CategoryTreeNode extends Omit<DataNode, "children"> {
  children?: CategoryTreeNode[];
  dataRef?: MetaCategoryBrowseNodeDto;
  level?: "segment" | "family" | "class" | "commodity";
  loaded?: boolean;
  familyCode?: string;
  classCode?: string; // For Commodity nodes to know their parent Class
}

const CategoryManagementPage: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<React.Key>("");
  const [selectedNode, setSelectedNode] = useState<
    CategoryTreeNode | undefined
  >(undefined);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  // Right Panel View Mode
  const [viewMode, setViewMode] = useState<"list" | "design">("list");
  // Specifically track which ITEM is being designed (different from selectedNode which is the PARENT)
  const [designTarget, setDesignTarget] = useState<any | null>(null);

  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<React.Key[]>([]);

  // Initial Load (Segments)
  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const segments = await metaCategoryApi.listUnspscSegments();
      const nodes: CategoryTreeNode[] = segments.map((s) => ({
        title: `${s.code} - ${s.title}`,
        key: s.key,
        isLeaf: false,
        dataRef: s,
        level: "segment",
        icon: <AppstoreOutlined />,
      }));
      setTreeData(nodes);
      setLoadedKeys([]);
    } catch (error) {
      console.error(error);
      message.error("Failed to load segments");
    }
  };

  const onLoadData = async (node: any): Promise<void> => {
    const { key, children, dataRef, level } = node as CategoryTreeNode;
    if (children && children.length > 0) return;

    try {
      let childNodes: CategoryTreeNode[] = [];

      if (level === "segment") {
        // Load Families
        const families = await metaCategoryApi.listUnspscFamilies(
          dataRef!.code,
        );
        childNodes = families.map((f) => ({
          title: `${f.code} - ${f.title}`,
          key: f.key,
          isLeaf: false,
          dataRef: f,
          level: "family",
          icon: <PartitionOutlined />,
        }));
      } else if (level === "family") {
        // Load Classes
        const groups = await metaCategoryApi.listUnspscClassesWithCommodities(
          dataRef!.code,
        );
        childNodes = groups.map((g) => ({
          title: `${g.clazz.code} - ${g.clazz.title}`,
          key: g.clazz.key,
          isLeaf: !g.commodities || g.commodities.length === 0,
          dataRef: g.clazz,
          level: "class",
          icon: <PartitionOutlined />,
          familyCode: dataRef!.code,
        }));
      } else if (level === "class") {
        // Load Commodities
        // Since listUnspscClassesWithCommodities is by family, we need finding the parent family code
        // Which we passed down as node.familyCode
        const parentFamilyCode = (node as CategoryTreeNode).familyCode;
        if (parentFamilyCode) {
          const groups =
            await metaCategoryApi.listUnspscClassesWithCommodities(
              parentFamilyCode,
            );
          // Find current class group
          const currentClassGroup = groups.find(
            (g) => g.clazz.key === dataRef?.key,
          );
          if (currentClassGroup && currentClassGroup.commodities) {
            childNodes = currentClassGroup.commodities.map((c) => ({
              title: `${c.code} - ${c.title}`,
              key: c.key,
              isLeaf: true,
              dataRef: c,
              level: "commodity",
              icon: <TagsOutlined />,
              familyCode: parentFamilyCode,
              classCode: dataRef?.code,
            }));
          }
        }
      }

      setTreeData((origin) =>
        updateTreeData(origin, key as React.Key, childNodes),
      );
      setLoadedKeys((keys) => [...keys, key as React.Key]);
    } catch (error) {
      console.error(error);
      message.error("Failed to load children");
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

  const onSelect: TreeProps["onSelect"] = (keys, info) => {
    if (keys.length > 0) {
      setSelectedKey(keys[0]);
      setSelectedNode(info.node as CategoryTreeNode);
      // Reset to list view when selecting a new node
      setViewMode("list");
    } else {
      setSelectedKey("");
      setSelectedNode(undefined);
      setViewMode("list");
    }
  };

  const handleEnterDesign = (item: any) => {
    setDesignTarget(item);
    setViewMode("design");
  };

  const handleBackToList = () => {
    setDesignTarget(null);
    setViewMode("list");
  };

  return (
    <div
      style={{
        height: "calc(100vh - 201px)",
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
            loadData={onLoadData}
            loadedKeys={loadedKeys}
            onLoad={(keys) => setLoadedKeys(keys as React.Key[])}
          />
        </Splitter.Panel>
        <Splitter.Panel>
          {selectedNode ? (
            <div
              style={{
                padding: "0 16px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {viewMode === "list" ? (
                <CategoryList
                  parentKey={selectedKey}
                  parentNode={selectedNode}
                  onDesignAttribute={handleEnterDesign}
                />
              ) : (
                <Tabs
                  defaultActiveKey="attributes"
                  tabBarExtraContent={
                    <Button type="link" onClick={handleBackToList}>
                      &lt; Back to Children List
                    </Button>
                  }
                  items={[
                    {
                      key: "attributes",
                      label: `Attribute Schema: ${designTarget?.title}`,
                      children: (
                        <AttributeDesigner currentNode={designTarget} />
                      ),
                    },
                  ]}
                />
              )}
            </div>
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
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default CategoryManagementPage;
