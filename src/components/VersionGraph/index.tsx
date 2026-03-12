import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  MarkerType,
  Edge,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Modal, Descriptions, Space, Typography, Tag, Divider } from "antd";

export interface VersionNode {
  versionNo: number;
  name?: string;
  latest?: boolean;
  updatedBy?: string;
  versionDate?: string;
  description?: string;
}

interface VersionGraphProps {
  versions: VersionNode[];
}

const VersionGraph: React.FC<VersionGraphProps> = ({ versions = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionNode | null>(null);
  const [previousVersion, setPreviousVersion] = useState<VersionNode | null>(null);

  const { nodes, edges } = useMemo(() => {
    // 按版本号从小到大排序，从左侧向右侧排布
    const sortedVersions = [...versions].sort(
      (a, b) => a.versionNo - b.versionNo,
    );

    const resultingNodes: Node[] = sortedVersions.map((v, index) => ({
      id: `v${v.versionNo}`,
      position: { x: index * 280, y: 100 }, // 水平排列布局
      data: {
        label: (
          <div style={{ textAlign: "left", minWidth: 160 }}>
            <div style={{ fontWeight: "bold", fontSize: 14 }}>
              v{v.versionNo} {v.latest ? "(当前版本)" : ""}
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
              更新者: {v.updatedBy || "系统"}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {v.versionDate
                ? new Date(v.versionDate).toLocaleDateString()
                : "-"}
            </div>
          </div>
        ),
      },
      style: {
        border: v.latest ? "2px solid #1677ff" : "1px solid #d9d9d9",
        borderRadius: 8,
        background: "#fff",
        boxShadow: v.latest ? "0 0 8px rgba(22,119,255,0.2)" : "none",
      },
      sourcePosition: "right" as any,
      targetPosition: "left" as any,
    }));

    const resultingEdges: Edge[] = [];
    for (let i = 0; i < sortedVersions.length - 1; i++) {
      resultingEdges.push({
        id: `e-v${sortedVersions[i].versionNo}-v${sortedVersions[i + 1].versionNo}`,
        source: `v${sortedVersions[i].versionNo}`,
        target: `v${sortedVersions[i + 1].versionNo}`,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#1677ff",
        },
        style: { stroke: "#1677ff" },
      });
    }

    return { nodes: resultingNodes, edges: resultingEdges };
  }, [versions]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    const clickedVer = versions.find((v) => `v${v.versionNo}` === node.id);
    if (clickedVer) {
      // 找到上一个版本（按版本号排序后的前一个）
      const sortedVersions = [...versions].sort((a, b) => a.versionNo - b.versionNo);
      const currentIndex = sortedVersions.findIndex(v => v.versionNo === clickedVer.versionNo);
      const prevVer = currentIndex > 0 ? sortedVersions[currentIndex - 1] : null;

      setSelectedVersion(clickedVer);
      setPreviousVersion(prevVer);
      setIsModalOpen(true);
    }
  };

  if (!versions || versions.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
        暂无历史版本
      </div>
    );
  }

  return (
    <div
      style={{
        height: 400,
        width: "100%",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{
            maxZoom: 1,
        }}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        {/* <Background gap={16} size={1} /> */}
      </ReactFlow>

      <Modal
        title={`版本比对：${previousVersion ? `v${previousVersion.versionNo} -> ` : ''}v${selectedVersion?.versionNo}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
      >
        <Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="当前版本">
              <Tag color="processing">v{selectedVersion?.versionNo}</Tag>
              {selectedVersion?.latest && <Tag color="success">最新版</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="更新者">{selectedVersion?.updatedBy || "-"}</Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {selectedVersion?.versionDate ? new Date(selectedVersion.versionDate).toLocaleString() : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="版本说明">{selectedVersion?.description || "暂无说明"}</Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '16px 0' }} orientation="vertical">详情变更</Divider>
          
          {/* 这里可以放置基于先前版本与当前版本之间字段的差分视图（diff view） */}
          <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, color: '#666' }}>
            <Typography.Text type="secondary">
              这里是差异对比区域（如 Git Diff 视图）。<br />
              未来接入具体字段数据后，您可以比对 
              {previousVersion ? `版本 v${previousVersion.versionNo}` : "无状态 (首版)"} 和 
              版本 v{selectedVersion?.versionNo} 的具体差异。
            </Typography.Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default VersionGraph;
