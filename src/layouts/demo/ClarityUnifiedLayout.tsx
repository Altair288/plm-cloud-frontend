'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import '@cds/core/icon/register.js';
import { MenuItem } from '@/layouts/UnifiedLayout'; // re-use the type but not the logic directly
import { readPersistedAuthSnapshot } from '@/utils/authStorage';

export interface ClarityUnifiedLayoutProps {
  children: React.ReactNode;
  menuData: MenuItem[];
  homePath?: string;
  homeTitle?: string;
  title?: string;
  currentUser?: string;
}

export default function ClarityUnifiedLayout({
  children,
  menuData,
  homePath = '/dashboard',
  homeTitle = 'Dashboard',
  title = 'PLM Cloud Platform',
  currentUser = 'admin@example.com'
}: ClarityUnifiedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openTabs, setOpenTabs] = useState<{ path: string; name: string }[]>([
    { path: homePath, name: homeTitle }
  ]);

  // Auth and Workspace states
  const [userInfo, setUserInfo] = useState({ name: currentUser, email: '' });
  const [workspace, setWorkspace] = useState({ name: 'Default Workspace', id: '' });
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      const snapshot = readPersistedAuthSnapshot();
      const user = snapshot.platformAuth.user || snapshot.platformAuth.admin;
      if (user) {
        setUserInfo({ name: user.displayName || user.email || currentUser, email: user.email || '' });
      }
      if (snapshot.workspaceSession.workspaceName) {
        setWorkspace({ name: snapshot.workspaceSession.workspaceName, id: snapshot.workspaceSession.workspaceId || '' });
      }
    } catch(e) {}
  }, [currentUser]);

  // Keep tabs in sync with naive current path for demonstration
  useEffect(() => {
    setOpenTabs(prev => {
      if (prev.find(t => t.path === pathname)) {
        return prev;
      }
      // Find a matching menu item to get the name, or fallback
      let matchedName = 'Page';
      const searchMenu = (items: MenuItem[]) => {
        for (const item of items) {
          if (item.path === pathname) {
            matchedName = item.name;
            return;
          }
          if (item.children) searchMenu(item.children);
        }
      };
      searchMenu(menuData);
      
      return [...prev, { path: pathname, name: matchedName }];
    });
  }, [pathname, menuData]);

  const handleNav = (path: string) => {
    if (path) {
      router.push(path);
    }
  };

  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t.path !== path);
    setOpenTabs(newTabs.length ? newTabs : [{ path: homePath, name: homeTitle }]);
    if (pathname === path) {
      router.push(newTabs.length ? newTabs[newTabs.length - 1].path : homePath);
    }
  };

  const NavGroup = ({ item, level }: { item: MenuItem; level: number }) => {
    const hasActiveChild = item.children?.some((c) => pathname === c.path) || false;
    const [expanded, setExpanded] = useState(hasActiveChild);

    // Some items might be clickable themselves, but mostly they are purely groups.
    return (
      <div className="nav-group">
        <div className={`nav-group-content ${pathname === item.path ? 'active' : ''}`}>
          <button 
            type="button" 
            className="nav-group-trigger" 
            onClick={() => setExpanded(!expanded)}
          >
            {item.icon && <div className="nav-icon">{item.icon}</div>}
            <span className="nav-text">{item.name}</span>
          </button>
        </div>
        
        {expanded && item.children && (
          <div className="nav-group-children">
            {item.children.map((child, cIdx) => {
              const isChildActive = pathname === child.path;
              return (
                <a 
                  key={child.path || cIdx}
                  className={`nav-link ${isChildActive ? 'active' : ''}`} 
                  onClick={(e) => { e.preventDefault(); handleNav(child.path); }}
                >
                  <span className="nav-text">{child.name}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderNavLinks = (items: MenuItem[], level: number = 0) => {
    return items.map((item, idx) => {
      const isActive = pathname === item.path;
      if (item.children && item.children.length > 0) {
        return <NavGroup key={item.path || idx} item={item} level={level} />;
      }
      return (
        <a 
          key={item.path || idx} 
          className={`nav-link ${isActive ? 'active' : ''}`} 
          onClick={(e) => { e.preventDefault(); handleNav(item.path); }}
        >
          {item.icon && <div className="nav-icon">{item.icon}</div>}
          <span className="nav-text">{item.name}</span>
        </a>
      );
    });
  };

  return (
    <div className="main-container">
      {/* 1. Clarity Global Header */}
      <header className="header header-6" style={{ backgroundColor: '#002538' }}> {/* Dark blue flavor typical for Clarity */}
        <div className="branding">
          <a style={{ cursor: 'pointer' }} onClick={() => handleNav(homePath)} className="nav-link">
            <cds-icon shape="cloud" solid="true"></cds-icon>
            <span className="title" style={{ marginLeft: 8 }}>{title}</span>
          </a>
        </div>
        <div className="header-nav">
          <a style={{ cursor: 'pointer' }} className="nav-link nav-icon-text">
            <cds-icon shape="search"></cds-icon>
            <span className="nav-text">Global Search...</span>
          </a>
        </div>
        <div className="header-actions">
          {/* Workspace Switcher mapped to Clarity Dropdown */}
          <div className={`dropdown bottom-right ${wsDropdownOpen ? 'open' : ''}`}>
            <button 
              className="dropdown-toggle nav-link" 
              onClick={() => { setWsDropdownOpen(!wsDropdownOpen); setUserDropdownOpen(false); }}
            >
              <cds-icon shape="organization"></cds-icon>
              <span className="nav-text">{workspace.name}</span>
              <cds-icon shape="angle" direction="down"></cds-icon>
            </button>
            <div className="dropdown-menu">
               <div className="dropdown-header">当前工作区</div>
               <div className="dropdown-divider"></div>
               <a className="dropdown-item active" style={{ display: 'flex', alignItems: 'center' }}>
                 <cds-icon shape="check" style={{ marginRight: '8px' }}></cds-icon> {workspace.name}
               </a>
               <a className="dropdown-item">切换其他工作区...</a>
               <a className="dropdown-item" style={{ color: '#0072a3' }}>邀请成员入驻</a>
            </div>
          </div>

          <a className="nav-link nav-icon" aria-label="notifications" style={{ cursor: 'pointer' }}>
            <cds-icon shape="bell"></cds-icon>
            <span className="badge badge-info">3</span>
          </a>

          {/* User Profile / HeaderRight mapped to Clarity Dropdown */}
          <div className={`dropdown bottom-right ${userDropdownOpen ? 'open' : ''}`}>
            <button 
              className="dropdown-toggle nav-link nav-icon" 
              onClick={() => { setUserDropdownOpen(!userDropdownOpen); setWsDropdownOpen(false); }}
            >
              <cds-icon shape="user"></cds-icon>
              <span className="nav-text">{userInfo.name}</span>
              <cds-icon shape="angle" direction="down"></cds-icon>
            </button>
            <div className="dropdown-menu">
               <div className="dropdown-header">{userInfo.email || '未绑定邮箱'}</div>
               <div className="dropdown-divider"></div>
               <a className="dropdown-item">个人设置</a>
               <a className="dropdown-item">皮肤主题</a>
               <a className="dropdown-item">进入管理后台</a>
               <a className="dropdown-item" style={{ color: '#c92100' }}>退出登录</a>
            </div>
          </div>
        </div>
      </header>

      <div className="content-container">
        {/* Left Sidenav for Menu Data (Collapsible via React State & Clarity classes) */}
        <div className={`clr-vertical-nav has-nav-groups ${collapsed ? 'is-collapsed' : ''}`}>
          <a href="#" className="nav-trigger" aria-label="Toggle Sidebar" onClick={(e) => { e.preventDefault(); setCollapsed(!collapsed); }}>
            <cds-icon shape="angle" direction={collapsed ? "right" : "left"}></cds-icon>
          </a>
          
          <div className="nav-content">
            {renderNavLinks(menuData)}
          </div>
        </div>

        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Subnav moved inside content-area so it starts to the right of the sidebar */}
          <nav className="subnav" style={{ margin: 0, borderBottom: '1px solid #ccc' }}>
            <ul className="nav">
              {openTabs.map(tab => (
                <li className="nav-item" key={tab.path}>
                  <a 
                    className={`nav-link ${pathname === tab.path ? 'active' : ''}`} 
                    onClick={(e) => { e.preventDefault(); handleNav(tab.path); }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {tab.name}
                    {tab.path !== homePath && (
                      <cds-icon 
                        shape="times" 
                        size="sm" 
                        style={{ opacity: 0.6 }} 
                        onClick={(e: React.MouseEvent) => handleTabClose(e, tab.path)}
                      ></cds-icon>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content Area inner wrapper */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            {/* Breadcrumbs */}
            {pathname !== homePath && (
              <ul className="breadcrumb" style={{ margin: '0 0 1rem 0' }}>
                <li><a style={{ cursor: 'pointer' }} onClick={() => handleNav(homePath)}>{homeTitle}</a></li>
                <li>{openTabs.find(t => t.path === pathname)?.name || 'Page'}</li>
              </ul>
            )}

            <main style={{ position: 'relative', width: '100%', height: '100%' }}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}