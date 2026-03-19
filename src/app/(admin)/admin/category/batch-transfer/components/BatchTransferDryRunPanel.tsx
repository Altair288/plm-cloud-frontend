import React, { useEffect, useMemo, useState } from "react";
import { Collapse, Spin, Tag, Timeline, Typography, theme } from "antd";

const { Text } = Typography;

export interface DryRunTimelineItem {
  key: string;
  title: string;
  detail?: string;
  color?: "blue" | "red" | "green" | "gray";
}

type ExecutionStage = "starting" | "processing" | "success" | "failed";

interface BatchTransferDryRunPanelProps {
  actionLabel: string;
  status: "passed" | "failed";
  total: number;
  successCount: number;
  planningMode?: string;
  normalizedCount?: number;
  pendingOperations: DryRunTimelineItem[];
  resolvedOrder: DryRunTimelineItem[];
  finalPlacements: DryRunTimelineItem[];
  failedIssues: DryRunTimelineItem[];
  warnings: string[];
  height?: string | number;
  executionStage?: ExecutionStage;
  executionSummary?: string;
}

const buildPanelLabel = (label: string) => (
  <div
    style={{
      minHeight: 32,
      display: "flex",
      alignItems: "center",
      lineHeight: 1.3,
    }}
  >
    {label}
  </div>
);

const getExecutionTag = (stage: ExecutionStage) => {
  switch (stage) {
    case "starting":
      return { color: "processing", label: "准备执行" };
    case "processing":
      return { color: "processing", label: "执行中" };
    case "success":
      return { color: "success", label: "执行完成" };
    case "failed":
      return { color: "error", label: "执行失败" };
    default:
      return { color: "default", label: "处理中" };
  }
};

const buildExecutionTimelineItems = (
  actionLabel: string,
  stage: ExecutionStage,
  summary: string,
) => {
  const isFinished = stage === "success" || stage === "failed";

  return [
    {
      color: stage === "starting" ? "blue" : "green",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Text strong>创建执行任务</Text>
          <Text type="secondary">已锁定本次确认内容，准备发起批量{actionLabel}请求。</Text>
        </div>
      ),
    },
    {
      color:
        stage === "starting"
          ? "gray"
          : stage === "processing"
            ? "blue"
            : stage === "success"
              ? "green"
              : "red",
      dot: stage === "processing" ? <Spin size="small" /> : undefined,
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Text strong>服务端执行批量{actionLabel}</Text>
          <Text type="secondary">正在等待服务端完成执行与结果汇总。</Text>
        </div>
      ),
    },
    {
      color: !isFinished ? "gray" : stage === "success" ? "green" : "red",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Text strong>返回执行结果</Text>
          <Text type="secondary">{summary}</Text>
        </div>
      ),
    },
  ];
};

const renderTimeline = (
  items: DryRunTimelineItem[],
  emptyText: string,
  maxHeight: string,
) => {
  if (!items.length) {
    return <Text type="secondary">{emptyText}</Text>;
  }

  return (
    <div style={{ maxHeight, overflowY: "auto", paddingRight: 8 }}>
      <Timeline
        items={items.map((item) => ({
          color: item.color || "blue",
          children: (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Text strong>{item.title}</Text>
              {item.detail ? <Text type="secondary">{item.detail}</Text> : null}
            </div>
          ),
        }))}
      />
    </div>
  );
};

export default function BatchTransferDryRunPanel({
  actionLabel,
  status,
  total,
  successCount,
  planningMode,
  normalizedCount = 0,
  pendingOperations,
  resolvedOrder,
  finalPlacements,
  failedIssues,
  warnings,
  height = "68vh",
  executionStage,
  executionSummary,
}: BatchTransferDryRunPanelProps) {
  const { token } = theme.useToken();
  const hasExecutionProgress = Boolean(executionStage && executionSummary);
  const panelBodyMaxHeight = hasExecutionProgress
    ? `calc(${height} - 340px)`
    : `calc(${height} - 220px)`;
  const [activeKey, setActiveKey] = useState<string[]>(["summary"]);

  useEffect(() => {
    setActiveKey(hasExecutionProgress ? ["execution"] : ["summary"]);
  }, [hasExecutionProgress, executionStage, executionSummary]);

  const executionTimelineItems = useMemo(
    () =>
      hasExecutionProgress && executionStage && executionSummary
        ? buildExecutionTimelineItems(
            actionLabel,
            executionStage,
            executionSummary,
          )
        : [],
    [
      actionLabel,
      executionStage,
      executionSummary,
      hasExecutionProgress,
    ],
  );

  const summaryTagColor = status === "passed" ? "success" : "error";
  const collapseItems = [
    {
      key: "execution",
      label: buildPanelLabel("执行进度"),
      collapsible: hasExecutionProgress ? undefined : ("disabled" as const),
      children: hasExecutionProgress && executionStage && executionSummary ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Tag color={getExecutionTag(executionStage).color}>
              {getExecutionTag(executionStage).label}
            </Tag>
            <Text strong>正在执行批量{actionLabel}</Text>
            <Text type="secondary">{executionSummary}</Text>
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto", paddingRight: 8 }}>
            <Timeline items={executionTimelineItems} />
          </div>
        </div>
      ) : (
        <Text type="secondary">点击确认移动后，此处将展示执行进度。</Text>
      ),
    },
    {
      key: "summary",
      label: buildPanelLabel("校验概览"),
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Tag color={summaryTagColor}>
              {status === "passed" ? "预检通过" : "预检未通过"}
            </Tag>
            <Text>
              本次计划{actionLabel} {total} 项。
            </Text>
            <Text>预计可执行 {successCount} 项。</Text>
          </div>
          {planningMode ? (
            <Text type="secondary">服务端规划模式：{planningMode}</Text>
          ) : null}
          {normalizedCount > 0 ? (
            <Text type="warning">
              有 {normalizedCount} 项父子重叠请求被自动归一化处理。
            </Text>
          ) : null}
          {status === "failed" && failedIssues.length > 0 ? (
            <Text type="danger">
              当前存在 {failedIssues.length} 项未通过校验，请先处理后再提交。
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      key: "operations",
      label: buildPanelLabel(`操作流程（${pendingOperations.length}）`),
      children: renderTimeline(
        pendingOperations,
        `当前没有待${actionLabel}的操作。`,
        panelBodyMaxHeight,
      ),
    },
  ];

  if (resolvedOrder.length > 0) {
    collapseItems.push({
      key: "resolved-order",
      label: buildPanelLabel(`服务端执行顺序（${resolvedOrder.length}）`),
      children: renderTimeline(
        resolvedOrder,
        "当前没有额外的执行顺序信息。",
        panelBodyMaxHeight,
      ),
    });
  }

  if (finalPlacements.length > 0) {
    collapseItems.push({
      key: "placements",
      label: buildPanelLabel(`最终落位（${finalPlacements.length}）`),
      children: renderTimeline(
        finalPlacements,
        "当前没有最终落位信息。",
        panelBodyMaxHeight,
      ),
    });
  }

  if (failedIssues.length > 0 || warnings.length > 0) {
    collapseItems.push({
      key: "risks",
      label: buildPanelLabel(
        status === "failed" ? "未通过原因与提示" : "提示信息",
      ),
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {failedIssues.length > 0
            ? renderTimeline(
                failedIssues,
                "当前没有失败项。",
                panelBodyMaxHeight,
              )
            : null}
          {warnings.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: 12,
                borderRadius: 10,
                background: token.colorWarningBg,
                border: `1px solid ${token.colorWarningBorder}`,
              }}
            >
              {warnings.map((warning) => (
                <Text key={warning}>{warning}</Text>
              ))}
            </div>
          ) : null}
        </div>
      ),
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height,
        minHeight: 420,
        width: "100%",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Collapse
          className="batch-transfer-dry-run-collapse"
          accordion
          activeKey={activeKey}
          onChange={(key) => {
            const nextKeys = Array.isArray(key)
              ? key.map(String)
              : key
                ? [String(key)]
                : [];
            setActiveKey(nextKeys);
          }}
          items={collapseItems}
          style={{
            flex: 1,
            overflow: "hidden",
            width: "min(100%, 980px)",
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .batch-transfer-dry-run-collapse .ant-collapse-item > .ant-collapse-header {
                min-height: 58px;
                display: flex;
                align-items: center;
              }
              .batch-transfer-dry-run-collapse .ant-collapse-expand-icon {
                height: 100%;
                display: flex;
                align-items: center;
              }
              .batch-transfer-dry-run-collapse .ant-collapse-header-text {
                min-height: 28px;
                display: flex;
                align-items: center;
              }
            `,
          }}
        />
      </div>
    </div>
  );
}