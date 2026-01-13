'use client';

import React from "react";
import {
  UnorderedListOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  PieChartOutlined,
  DatabaseOutlined,
  ApiOutlined,
  SettingOutlined,
  UserOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import UnifiedLayout, { MenuItem } from "@/layouts/UnifiedLayout";

const menuData: MenuItem[] = [
  {
    path: "/dashboard",
    name: "仪表盘",
    icon: <DashboardOutlined />,
    children: [
      { path: "/dashboard/workbench", name: "工作台" },
      { path: "/dashboard/analysis", name: "分析概览" },
      { path: "/dashboard/monitor", name: "实时监控" },
    ],
  },
  {
    path: "/products",
    name: "产品管理",
    icon: <AppstoreOutlined />,
    children: [
      { path: "/products/catalog", name: "产品目录" },
      { path: "/products/version", name: "版本管理" },
      {
        path: "/products/specs",
        name: "规格配置",
        children: [
          { path: "/products/specs/attribute", name: "属性定义" },
          { path: "/products/specs/template", name: "模板管理" },
        ],
      },
    ],
  },
  {
    path: "/category",
    name: "分类管理",
    icon: <UnorderedListOutlined />,
    children: [
      { path: "/category/list", name: "分类集合" },
    ],
  },
  {
    path: "/projects",
    name: "项目集",
    icon: <FolderOpenOutlined />,
    children: [
      { path: "/projects/list", name: "项目列表" },
      { path: "/projects/milestone", name: "里程碑" },
      { path: "/projects/kanban", name: "任务看板" },
    ],
  },
  {
    path: "/workflow",
    name: "流程编排",
    icon: <DeploymentUnitOutlined />,
    children: [
      { path: "/workflow/definition", name: "流程定义" },
      { path: "/workflow/instance", name: "流程实例" },
      { path: "/workflow/form", name: "表单管理" },
    ],
  },
  {
    path: "/documents",
    name: "文档中心",
    icon: <FileTextOutlined />,
    children: [
      { path: "/documents/library", name: "资料库" },
      { path: "/documents/approval", name: "审批记录" },
    ],
  },
  {
    path: "/analytics",
    name: "数据分析",
    icon: <PieChartOutlined />,
    children: [
      { path: "/analytics/report", name: "报表中心" },
      { path: "/analytics/insight", name: "洞察平台" },
    ],
  },
  {
    path: "/assets",
    name: "资产管理",
    icon: <DatabaseOutlined />,
    children: [
      { path: "/assets/library", name: "资产库" },
      { path: "/assets/quality", name: "质量追踪" },
      { path: "/assets/warranty", name: "质保信息" },
    ],
  },
  {
    path: "/integration",
    name: "系统集成",
    icon: <ApiOutlined />,
    children: [
      { path: "/integration/adapter", name: "接口适配" },
      { path: "/integration/sync", name: "同步任务" },
      {
        path: "/integration/monitor",
        name: "运行监控",
        children: [
          { path: "/integration/monitor/log", name: "日志审计" },
          { path: "/integration/monitor/alert", name: "告警规则" },
        ],
      },
    ],
  },
  {
    path: "/system",
    name: "系统设置",
    icon: <SettingOutlined />,
    children: [
      { path: "/system/organization", name: "组织管理" },
      { path: "/system/role", name: "角色权限" },
      { path: "/system/preferences", name: "个性化设置" },
    ],
  },
  {
    path: "/user",
    name: "用户中心",
    icon: <UserOutlined />,
    children: [
      { path: "/user/profile", name: "个人信息" },
      { path: "/user/security", name: "安全设置" },
      { path: "/user/notification", name: "通知偏好" },
    ],
  },
];

const BasicLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <UnifiedLayout menuData={menuData}>
        {children}
    </UnifiedLayout>
  )
};

export default BasicLayout;
