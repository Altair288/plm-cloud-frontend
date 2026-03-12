import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  MarkerType,
  Edge,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Delta from "quill-delta";
import { Space, Typography, Divider, Spin, Alert, Table } from "antd";
import DraggableModal from "@/components/DraggableModal";
import { metaCategoryApi, type MetaCategoryVersionCompareDto } from "@/services/metaCategory";

export interface VersionNode {
  versionId?: string;
  versionNo: number;
  name?: string;
  latest?: boolean;
  updatedBy?: string;
  versionDate?: string;
  description?: string;
}

interface VersionGraphProps {
  categoryId: string;
  versions: VersionNode[];
}

interface DiffSegment {
  text: string;
  type: "equal" | "remove" | "add" | "format";
}

const ensureTrailingNewLine = (text: string) =>
  text.endsWith("\n") ? text : `${text}\n`;

const parseDeltaFromMaybeJson = (value?: string): Delta => {
  if (!value) {
    return new Delta().insert("\n");
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.ops)) {
      return new Delta(parsed.ops);
    }
  } catch {
    // 不是 JSON Delta 时按纯文本降级
  }

  return new Delta().insert(ensureTrailingNewLine(value));
};

const toPlainText = (delta: Delta) => {
  const text = (delta.ops || [])
    .map((op: any) => (typeof op?.insert === "string" ? op.insert : ""))
    .join("");
  return text.replace(/\n$/, "");
};

const buildDeltaDiffSegments = (baseDescription?: string, targetDescription?: string) => {
  const baseDelta = parseDeltaFromMaybeJson(baseDescription);
  const targetDelta = parseDeltaFromMaybeJson(targetDescription);
  const diffDelta = baseDelta.diff(targetDelta);

  const baseText = ensureTrailingNewLine(toPlainText(baseDelta));
  const targetText = ensureTrailingNewLine(toPlainText(targetDelta));

  let baseCursor = 0;
  let targetCursor = 0;
  const leftSegments: DiffSegment[] = [];
  const rightSegments: DiffSegment[] = [];

  for (const op of diffDelta.ops || []) {
    if (typeof op.retain === "number") {
      const retained = targetText.slice(targetCursor, targetCursor + op.retain);
      if (retained) {
        const type: DiffSegment["type"] = op.attributes ? "format" : "equal";
        leftSegments.push({ text: retained, type });
        rightSegments.push({ text: retained, type });
      }
      baseCursor += op.retain;
      targetCursor += op.retain;
      continue;
    }

    if (typeof op.delete === "number") {
      const removed = baseText.slice(baseCursor, baseCursor + op.delete);
      if (removed) {
        leftSegments.push({ text: removed, type: "remove" });
      }
      baseCursor += op.delete;
      continue;
    }

    if (typeof op.insert === "string") {
      rightSegments.push({ text: op.insert, type: "add" });
      targetCursor += op.insert.length;
      continue;
    }
  }

  const hasMeaningfulDiff = (diffDelta.ops || []).some((op: any) =>
    typeof op.insert === "string" || typeof op.delete === "number" || !!op.attributes,
  );

  return {
    leftSegments,
    rightSegments,
    hasMeaningfulDiff,
  };
};

const renderSegments = (segments: DiffSegment[]) => {
  if (!segments.length) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }

  return (
    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
      {segments.map((seg, idx) => {
        if (seg.type === "remove") {
          return (
            <span
              key={`seg-${idx}`}
              style={{
                background: "#ffebe9",
                color: "#cf222e",
                textDecoration: "line-through",
                borderRadius: 4,
                padding: "0 2px",
              }}
            >
              {seg.text}
            </span>
          );
        }

        if (seg.type === "add") {
          return (
            <span
              key={`seg-${idx}`}
              style={{
                background: "#dafbe1",
                color: "#1a7f37",
                borderRadius: 4,
                padding: "0 2px",
              }}
            >
              {seg.text}
            </span>
          );
        }

        if (seg.type === "format") {
          return (
            <span
              key={`seg-${idx}`}
              style={{
                background: "#fff8c5",
                color: "#7a5f00",
                borderRadius: 4,
                padding: "0 2px",
              }}
            >
              {seg.text}
            </span>
          );
        }

        return <span key={`seg-${idx}`}>{seg.text}</span>;
      })}
    </div>
  );
};

const VersionGraph: React.FC<VersionGraphProps> = ({ categoryId, versions = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionNode | null>(null);
  const [previousVersion, setPreviousVersion] = useState<VersionNode | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareData, setCompareData] = useState<MetaCategoryVersionCompareDto | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const descriptionDiff = useMemo(() => {
    if (!compareData) {
      return null;
    }
    return buildDeltaDiffSegments(
      compareData.baseVersion?.description,
      compareData.targetVersion?.description,
    );
  }, [compareData]);

  const compareRows = useMemo(() => {
    if (!compareData) {
      return [] as Array<{
        key: string;
        field: string;
        rowType: "text" | "delta";
        baseValue: React.ReactNode;
        targetValue: React.ReactNode;
        isChanged: boolean;
      }>;
    }

    const baseName = compareData.baseVersion?.name || "";
    const targetName = compareData.targetVersion?.name || "";

    const rows: Array<{
      key: string;
      field: string;
      rowType: "text" | "delta";
      baseValue: React.ReactNode;
      targetValue: React.ReactNode;
      isChanged: boolean;
    }> = [
      {
        key: "name",
        field: "分类名称",
        rowType: "text",
        baseValue: baseName || "-",
        targetValue: targetName || "-",
        isChanged: baseName !== targetName,
      },
    ];

    if (descriptionDiff) {
      rows.push({
        key: "description",
        field: "分类描述",
        rowType: "delta",
        baseValue: descriptionDiff.hasMeaningfulDiff
          ? renderSegments(descriptionDiff.leftSegments)
          : <Typography.Text type="secondary">内容无变化</Typography.Text>,
        targetValue: descriptionDiff.hasMeaningfulDiff
          ? renderSegments(descriptionDiff.rightSegments)
          : <Typography.Text type="secondary">内容无变化</Typography.Text>,
        isChanged: descriptionDiff.hasMeaningfulDiff,
      });
    }

    return rows.filter((item) => item.key === "description" || item.isChanged);
  }, [compareData, descriptionDiff]);

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

  const handleNodeClick = async (_event: React.MouseEvent, node: Node) => {
    const clickedVer = versions.find((v) => `v${v.versionNo}` === node.id);
    if (clickedVer) {
      // 找到上一个版本（按版本号排序后的前一个）
      const sortedVersions = [...versions].sort((a, b) => a.versionNo - b.versionNo);
      const currentIndex = sortedVersions.findIndex(v => v.versionNo === clickedVer.versionNo);
      const prevVer = currentIndex > 0 ? sortedVersions[currentIndex - 1] : null;

      setSelectedVersion(clickedVer);
      setPreviousVersion(prevVer);
      setIsModalOpen(true);

      setCompareData(null);
      setCompareError(null);
      if (!categoryId || !clickedVer.versionId) {
        setCompareError("缺少分类或版本标识，无法发起对比");
        return;
      }

      const baseVersionId = prevVer?.versionId || clickedVer.versionId;
      if (!baseVersionId) {
        setCompareError("缺少基线版本标识，无法发起对比");
        return;
      }

      setCompareLoading(true);
      try {
        const compare = await metaCategoryApi.compareCategoryVersions(
          categoryId,
          baseVersionId,
          clickedVer.versionId,
        );
        setCompareData(compare);
      } catch (error: any) {
        const message = error?.message || error?.error || "加载版本差异失败";
        setCompareError(message);
      } finally {
        setCompareLoading(false);
      }
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
        panOnDrag={true}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        {/* <Background gap={16} size={1} /> */}
      </ReactFlow>

      <DraggableModal
        title={`版本比对：${previousVersion ? `v${previousVersion.versionNo} -> ` : ''}v${selectedVersion?.versionNo}`}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setCompareLoading(false);
          setCompareData(null);
          setCompareError(null);
        }}
        footer={null}
        width={960}
        destroyOnHidden
      >
        <Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}>
          <Divider style={{ margin: '0 0 12px 0' }}>差异内容（Git Diff 视图）</Divider>

          {compareLoading ? (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Spin tip="正在加载版本差异..." />
            </div>
          ) : compareError ? (
            <Alert type="error" showIcon title="版本对比失败" description={compareError} />
          ) : compareData ? (
            <Space orientation="vertical" style={{ width: "100%" }} size={12}>
              <Table 
                size="small" 
                pagination={false} 
                bordered
                style={{ borderRadius: 10, overflow: "hidden" }}
                rowKey="key"
                footer={() => <div style={{ height: 0 }} />}
                columns={[
                  { title: '字段', dataIndex: 'field', width: 120 },
                  { 
                    title: `变更前 (v${compareData.baseVersion?.versionNo})`, 
                    dataIndex: 'baseValue',
                    render: (text, record) => (
                      <div style={{ 
                        background: record.rowType === 'delta'
                          ? 'transparent'
                          : (record.isChanged ? '#ffebe9' : 'transparent'), 
                        color: record.rowType === 'delta'
                          ? 'inherit'
                          : (record.isChanged ? '#cf222e' : 'inherit'),
                        textDecoration: record.rowType === 'delta'
                          ? 'none'
                          : (record.isChanged ? 'line-through' : 'none'),
                        padding: '4px 8px', borderRadius: 4 
                      }}>
                        {text || '-'}
                      </div>
                    )
                  },
                  { 
                    title: `变更后 (v${compareData.targetVersion?.versionNo})`, 
                    dataIndex: 'targetValue',
                    render: (text, record) => (
                      <div style={{ 
                        background: record.rowType === 'delta'
                          ? 'transparent'
                          : (record.isChanged ? '#dafbe1' : 'transparent'), 
                        color: record.rowType === 'delta'
                          ? 'inherit'
                          : (record.isChanged ? '#1a7f37' : 'inherit'),
                        padding: '4px 8px', borderRadius: 4 
                      }}>
                        {text || '-'}
                      </div>
                    )
                  },
                ]}
                dataSource={compareRows}
              />

              {compareRows.length === 0 && (
                <Typography.Text type="secondary">当前两个版本无可见业务差异</Typography.Text>
              )}
            </Space>
          ) : (
            <Typography.Text type="secondary">暂无差异数据</Typography.Text>
          )}
        </Space>
      </DraggableModal>
    </div>
  );
};

export default VersionGraph;
