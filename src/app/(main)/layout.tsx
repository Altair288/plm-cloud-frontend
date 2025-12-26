'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Breadcrumb, Button, ConfigProvider, Tabs, theme } from "antd";
import type { TabsProps } from "antd";
import { ProLayout } from "@ant-design/pro-components";
import HeaderRight from "@/layouts/components/HeaderRight";
import { usePathname, useRouter } from "next/navigation";
import { themeTokens, componentTokens } from "@/styles/theme";
import { getPalette } from "@/styles/colors";
import type { AppPalette } from "@/styles/colors";
import "@/layouts/BasicLayout.css";
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined,
  HomeOutlined,
  HomeTwoTone,
} from "@ant-design/icons";

// 简易菜单数据（后续可由权限/接口动态生成）
interface MenuItem {
  path: string;
  name: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

const HOME_PATH = "/dashboard";

type RouteTab = {
  key: string;
  label: string;
  closable: boolean;
};

const findMenuPath = (menus: MenuItem[], target: string): MenuItem[] | null => {
  for (const item of menus) {
    if (item.path === target) {
      return [item];
    }
    if (item.children) {
      const childPath = findMenuPath(item.children, target);
      if (childPath) {
        return [item, ...childPath];
      }
    }
  }
  return null;
};

const normalizeLabelFromPath = (path: string) => {
  const segments = path.split("/").filter(Boolean);
  if (!segments.length || path === HOME_PATH) {
    return "仪表盘";
  }
  const raw = segments[segments.length - 1];
  return raw
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

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
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname === "/" ? HOME_PATH : pathname;

  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.localStorage.getItem("plm-theme-mode");
    if (stored) {
      return stored === "dark";
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  const matchedMenuPath = useMemo(
    () => findMenuPath(menuData, currentPath) ?? [],
    [currentPath]
  );

  const breadcrumbTrail = useMemo(() => {
    const hasHome = matchedMenuPath.some((item) => item.path === HOME_PATH);
    const trail = hasHome
      ? matchedMenuPath
      : [{ path: HOME_PATH, name: "仪表盘" }, ...matchedMenuPath];
    const dedup: MenuItem[] = [];
    trail.forEach((item) => {
      if (!dedup.find((existing) => existing.path === item.path)) {
        dedup.push(item);
      }
    });
    if (!dedup.length) {
      dedup.push({ path: HOME_PATH, name: "仪表盘" });
    }
    return dedup;
  }, [matchedMenuPath]);

  const activeLabel =
    breadcrumbTrail[breadcrumbTrail.length - 1]?.name ??
    normalizeLabelFromPath(currentPath);

  const [tabs, setTabs] = useState<RouteTab[]>(() => {
    const initial: RouteTab[] = [
      { key: HOME_PATH, label: "仪表盘", closable: false },
    ];
    if (currentPath !== HOME_PATH) {
      initial.push({ key: currentPath, label: activeLabel, closable: true });
    }
    return initial;
  });

  const palette = useMemo<AppPalette>(
    () => getPalette(isDarkMode ? "dark" : "light"),
    [isDarkMode]
  );

  const breadcrumbItems = useMemo(
    () =>
      breadcrumbTrail.map((item, index) => ({
        key: item.path,
        title:
          index === breadcrumbTrail.length - 1 ? (
            <span style={{ color: palette.menuTextSelected, fontWeight: 600 }}>
              {item.name}
            </span>
          ) : (
            <a
              onClick={(event) => {
                event.preventDefault();
                router.push(item.path);
              }}
            >
              {item.name}
            </a>
          ),
      })),
    [breadcrumbTrail, router, palette]
  );

  const handleTabChange = (key: string) => {
    if (key !== currentPath) {
      router.push(key);
    }
  };

  const handleTabRemove = useCallback(
    (targetKey: string) => {
      if (targetKey === HOME_PATH) {
        return;
      }
      setTabs((prev) => {
        const next = prev.filter((tab) => tab.key !== targetKey);
        if (next.length === prev.length) {
          return prev;
        }
        if (currentPath === targetKey) {
          const fallback = next[next.length - 1] ?? {
            key: HOME_PATH,
            label: "仪表盘",
            closable: false,
          };
          setTimeout(() => router.push(fallback.key), 0);
        }
        return next.length
          ? next
          : [{ key: HOME_PATH, label: "仪表盘", closable: false }];
      });
    },
    [currentPath, router]
  );

  const tabTextRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const tabResizeObservers = useRef<Map<string, ResizeObserver>>(new Map());
  const [tabTextWidths, setTabTextWidths] = useState<Record<string, number>>({});

  const registerTabTextRef = useCallback(
    (key: string) => (node: HTMLSpanElement | null) => {
      const observers = tabResizeObservers.current;
      const existing = observers.get(key);
      if (existing) {
        existing.disconnect();
        observers.delete(key);
      }
      if (!node) {
        tabTextRefs.current.delete(key);
        setTabTextWidths((prev) => {
          if (!(key in prev)) {
            return prev;
          }
          const rest = { ...prev };
          delete (rest as Record<string, unknown>)[key];
          return rest;
        });
        return;
      }
      tabTextRefs.current.set(key, node);
      const measure = () => {
        const width = node.getBoundingClientRect().width;
        setTabTextWidths((prev) => {
          if (prev[key] === width) {
            return prev;
          }
          return { ...prev, [key]: width };
        });
      };
      measure();
      if (typeof window !== "undefined" && "ResizeObserver" in window) {
        const observer = new ResizeObserver(() => measure());
        observer.observe(node);
        observers.set(key, observer);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      tabResizeObservers.current.forEach((observer) => observer.disconnect());
      tabResizeObservers.current.clear();
      tabTextRefs.current.clear();
    };
  }, []);

  const tabItems = useMemo<TabsProps["items"]>(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: (
          <span
            className={`layout-tab-label${tab.key === HOME_PATH ? " layout-tab-label-home" : ""}`}
            onMouseDown={(event) => {
              if (tab.closable && event.button === 1) {
                event.preventDefault();
                event.stopPropagation();
                handleTabRemove(tab.key);
              }
            }}
          >
            <span
              className="layout-tab-text"
              ref={registerTabTextRef(tab.key)}
            >
              {tab.key === HOME_PATH ? (
                currentPath === HOME_PATH ? <HomeTwoTone /> : <HomeOutlined />
              ) : (
                tab.label
              )}
            </span>
            {tab.closable && (
              <CloseOutlined
                className="layout-tab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTabRemove(tab.key);
                }}
              />
            )}
          </span>
        ),
        children: null,
      })),
    [currentPath, handleTabRemove, registerTabTextRef, tabs]
  );

  useEffect(() => {
    if (pathname === "/") {
      router.replace(HOME_PATH);
    }
  }, [pathname, router]);

  useEffect(() => {
    setTabs((prev) => {
      const next = [...prev];
      if (!next.some((tab) => tab.key === HOME_PATH)) {
        next.unshift({ key: HOME_PATH, label: "仪表盘", closable: false });
      }
      const index = next.findIndex((tab) => tab.key === currentPath);
      if (index >= 0) {
        const existing = next[index];
        if (existing.label !== activeLabel) {
          next[index] = { ...existing, label: activeLabel };
        }
        return next;
      }
      next.push({
        key: currentPath,
        label: activeLabel,
        closable: currentPath !== HOME_PATH,
      });
      return next;
    });
  }, [currentPath, activeLabel]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      "plm-theme-mode",
      isDarkMode ? "dark" : "light"
    );
    const html = document.documentElement;
    const mode = palette.mode;
    html.setAttribute("data-theme", mode);
    document.body.setAttribute("data-theme", mode);
    html.style.backgroundColor = palette.bgLayout;
    document.body.style.backgroundColor = palette.bgLayout;
    html.style.color = palette.textPrimary;
    document.body.style.color = palette.textPrimary;
    const rootStyle = html.style;
    rootStyle.setProperty("--menu-sider-bg", palette.siderBg);
    rootStyle.setProperty("--menu-popup-bg", palette.bgContainer);
    rootStyle.setProperty("--menu-hover-bg", palette.menuBgHover);
    rootStyle.setProperty("--menu-active-bg", palette.menuBgActive);
    rootStyle.setProperty("--menu-selected-bg", palette.menuItemSelectedBg);
    rootStyle.setProperty("--menu-text", palette.menuText);
    rootStyle.setProperty("--menu-text-selected", palette.menuTextSelected);
    rootStyle.setProperty("--tab-bar-bg", palette.bgContainer);
    rootStyle.setProperty("--tab-shadow-color", palette.shadowColor);
    rootStyle.setProperty("--tab-underline-color", palette.borderColor);
    rootStyle.setProperty("--tab-close-color", palette.iconColor);
    rootStyle.setProperty("--tab-home-icon-bg", palette.tabHomeIconBg);
  }, [isDarkMode, palette]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemScheme = (event: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem("plm-theme-mode");
      if (!stored) {
        setIsDarkMode(event.matches);
      }
    };
    media.addEventListener("change", handleSystemScheme);
    return () => media.removeEventListener("change", handleSystemScheme);
  }, []);

  const currentComponentTokens = useMemo(() => {
    const baseTokens = componentTokens as Partial<
      Record<string, Record<string, unknown>>
    >;
    return {
      ...componentTokens,
      Layout: {
        ...componentTokens.Layout,
        headerBg: palette.headerBg,
        siderBg: palette.siderBg,
      },
      Menu: {
        ...componentTokens.Menu,
        // Ant Design Menu token keys align with CSS variables used by ProLayout
        itemColor: palette.menuText,
        itemSelectedColor: palette.menuTextSelected,
        itemHoverBg: palette.menuBgHover,
        itemSelectedBg: palette.menuItemSelectedBg,
        itemActiveBg: palette.menuBgActive,
        itemHoverColor: palette.menuTextSelected,
        popupBg: palette.bgContainer,
      },
      Tabs: {
        ...(baseTokens.Tabs ?? {}),
        cardBg: palette.bgContainer,
        itemSelectedColor: palette.textPrimary,
        itemHoverColor: palette.textPrimary,
        inkBarColor: palette.menuTextSelected,
        colorBorderSecondary: palette.borderColor,
      },
      Breadcrumb: {
        ...(baseTokens.Breadcrumb ?? {}),
        itemColor: palette.textSecondary,
        linkColor: palette.textSecondary,
        linkHoverColor: palette.menuTextSelected,
        separatorColor: palette.textSecondary,
      },
    };
  }, [palette]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleToggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          ...themeTokens,
          colorBgLayout: palette.bgLayout,
          colorBgContainer: palette.bgContainer,
          colorText: palette.textPrimary,
          colorTextSecondary: palette.textSecondary,
          colorBorder: palette.borderColor,
          colorBorderSecondary: palette.borderColor,
          colorTextHeading: palette.textPrimary,
        },
        components: currentComponentTokens,
      }}
    >
      <ProLayout
        title="PLM Cloud Platform"
        token={{
          header: {
            colorBgHeader: palette.headerBg,
            heightLayoutHeader: themeTokens.headerHeight,
          },
          sider: {
            colorMenuBackground: palette.siderBg,
            colorTextMenu: palette.menuText,
            colorTextMenuActive: palette.menuTextSelected,
            colorTextMenuSelected: palette.menuTextSelected,
            colorTextMenuItemHover: palette.menuTextSelected,
            colorBgMenuItemHover: palette.menuBgHover,
            colorBgMenuItemSelected: palette.menuItemSelectedBg,
            colorBgMenuItemActive: palette.menuBgActive,
          },
        }}
        contentStyle={{ padding: 0 }}
        logo={false}
        layout="mix" // top + side
        fixedHeader
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsedButtonRender={false}
        navTheme={isDarkMode ? "realDark" : "light"}
        headerTitleRender={(logo, title) => (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={handleToggleCollapsed}
              style={{
                borderRadius: 999,
                color: palette.iconColor,
              }}
            />
            {logo}
            {title}
          </div>
        )}
        location={{ pathname }}
        menuDataRender={() => menuData}
        menuItemRender={(item, dom) => (
          <span
            onClick={() => {
              if (item.path) router.push(item.path);
            }}
          >
            {dom}
          </span>
        )}
        avatarProps={undefined}
        rightContentRender={() => (
          <HeaderRight
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            palette={palette}
          />
        )}
        menu={{
          defaultOpenAll: false,
        }}
        menuProps={{
          style: {
            paddingTop: 8,
            paddingBottom: 8,
            backgroundColor: palette.siderBg,
          },
        }}
        // header 高度通过 token.header.heightLayoutHeader 控制
        siderWidth={themeTokens.siderWidth}
      >
        <div
          style={{
            padding: 16,
            minHeight: `calc(100vh - ${themeTokens.headerHeight}px)`,
            background: palette.bgLayout,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Breadcrumb
            items={breadcrumbItems}
            style={{
              fontSize: 13,
              color: palette.textSecondary,
              height: 22,
              display: "flex",
              alignItems: "center",
            }}
          />
          <div
            style={{
              background: palette.bgContainer,
              borderRadius: 12,
              boxShadow: `0 12px 40px -16px ${palette.shadowColor}`,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <Tabs
              className="layout-tabs"
              activeKey={currentPath}
              onChange={handleTabChange}
              tabBarGutter={0}
              animated
              tabBarStyle={{ padding: "0 16px 0 0", margin: 0 }}
              indicator={{
                size: (origin: number, info?: { tabKey?: React.Key }) => {
                  const key = info?.tabKey != null ? String(info.tabKey) : undefined;
                  if (key && tabTextWidths[key] != null) {
                    const width = tabTextWidths[key];
                    return Math.min(origin, Math.max(width, 24));
                  }
                  return Math.max(origin - 24, 32);
                },
                align: "center",
              }}
              items={tabItems}
            />
            <div
              style={{
                padding: 16,
                flex: 1,
                minHeight: 0,
                overflow: "auto",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </ProLayout>
    </ConfigProvider>
  );
};

export default BasicLayout;
