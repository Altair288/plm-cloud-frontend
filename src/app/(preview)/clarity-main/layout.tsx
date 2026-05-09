'use client';

import React from 'react';
import ClarityUnifiedLayout from '@/layouts/demo/ClarityUnifiedLayout';

const menuData = [
  {
    path: "/clarity-main/dashboard",
    name: "仪表盘",
    icon: <cds-icon shape="dashboard"></cds-icon>,
    children: [
      { path: "/clarity-main/dashboard/workbench", name: "工作台" },
      { path: "/clarity-main/dashboard/analysis", name: "分析概览" },
      { path: "/clarity-main/dashboard/monitor", name: "实时监控" },
    ],
  },
  {
    path: "/clarity-main/products",
    name: "产品管理",
    icon: <cds-icon shape="blocks-group"></cds-icon>,
    children: [
      { path: "/clarity-main/products/catalog", name: "产品目录" },
      { path: "/clarity-main/products/version", name: "版本管理" },
      {
        path: "/clarity-main/products/specs",
        name: "规格配置",
        children: [
          { path: "/clarity-main/products/specs/attribute", name: "属性定义" },
          { path: "/clarity-main/products/specs/template", name: "模板管理" },
        ],
      },
    ],
  },
  {
    path: "/clarity-main/category",
    name: "分类管理",
    icon: <cds-icon shape="view-list"></cds-icon>,
    children: [
      { path: "/clarity-main/category/list", name: "分类集合" },
    ],
  },
  {
    path: "/clarity-main/projects",
    name: "项目集",
    icon: <cds-icon shape="folder-open"></cds-icon>,
    children: [
      { path: "/clarity-main/projects/list", name: "项目列表" },
      { path: "/clarity-main/projects/milestone", name: "里程碑" },
      { path: "/clarity-main/projects/kanban", name: "任务看板" },
    ],
  },
  {
    path: "/clarity-main/workflow",
    name: "流程编排",
    icon: <cds-icon shape="tree-view"></cds-icon>,
    children: [
      { path: "/clarity-main/workflow/definition", name: "流程定义" },
      { path: "/clarity-main/workflow/instance", name: "流程实例" },
      { path: "/clarity-main/workflow/form", name: "表单管理" },
    ],
  },
  {
    path: "/clarity-main/documents",
    name: "文档中心",
    icon: <cds-icon shape="file"></cds-icon>,
    children: [
      { path: "/clarity-main/documents/library", name: "资料库" },
      { path: "/clarity-main/documents/approval", name: "审批记录" },
    ],
  },
  {
    path: "/clarity-main/analytics",
    name: "数据分析",
    icon: <cds-icon shape="pie-chart"></cds-icon>,
    children: [
      { path: "/clarity-main/analytics/report", name: "报表中心" },
      { path: "/clarity-main/analytics/insight", name: "洞察平台" },
    ],
  },
  {
    path: "/clarity-main/assets",
    name: "资产管理",
    icon: <cds-icon shape="data-cluster"></cds-icon>,
    children: [
      { path: "/clarity-main/assets/library", name: "资产库" },
      { path: "/clarity-main/assets/quality", name: "质量追踪" },
      { path: "/clarity-main/assets/warranty", name: "质保信息" },
    ],
  },
  {
    path: "/clarity-main/integration",
    name: "系统集成",
    icon: <cds-icon shape="plugin"></cds-icon>,
    children: [
      { path: "/clarity-main/integration/adapter", name: "接口适配" },
      { path: "/clarity-main/integration/sync", name: "同步任务" },
      {
        path: "/clarity-main/integration/monitor",
        name: "运行监控",
        children: [
          { path: "/clarity-main/integration/monitor/log", name: "日志审计" },
          { path: "/clarity-main/integration/monitor/alert", name: "告警规则" },
        ],
      },
    ],
  },
  {
    path: "/clarity-main/system",
    name: "系统设置",
    icon: <cds-icon shape="cog"></cds-icon>,
    children: [
      { path: "/clarity-main/system/organization", name: "组织管理" },
      { path: "/clarity-main/system/role", name: "角色权限" },
      { path: "/clarity-main/system/preferences", name: "个性化设置" },
    ],
  },
  {
    path: "/clarity-main/user",
    name: "用户中心",
    icon: <cds-icon shape="user"></cds-icon>,
    children: [
      { path: "/clarity-main/user/profile", name: "个人信息" },
      { path: "/clarity-main/user/security", name: "安全设置" },
      { path: "/clarity-main/user/notification", name: "通知偏好" },
    ],
  },
];


export default function MainPreviewLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ClarityUnifiedLayout 
      menuData={menuData}
      homePath="/clarity-main/dashboard"
      homeTitle="仪表盘"
      title="PLM Cloud 工作区"
      currentUser="user@workspace.com"
    >
      {children}
    </ClarityUnifiedLayout>
  );
}