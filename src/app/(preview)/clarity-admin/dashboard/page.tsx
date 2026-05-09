'use client';

import React from 'react';

export default function DashboardDemoPage() {
  return (
    <div style={{ marginTop: '1rem' }}>
      <h2>Unified Layout Demo <span className="badge badge-success">Live Preview</span></h2>
      <p style={{ color: '#666' }}>This demonstrates the existing layout framework features—such as menus, persistent tabs, breadcrumbs, and content encapsulation—redesigned visually with Clarity UI.</p>
      
      <div className="clr-row" style={{ marginTop: '2rem' }}>
        <div className="clr-col-12 clr-col-md-4">
          <div className="card">
            <div className="card-header">Total Categories</div>
            <div className="card-block">
              <div className="card-title">1,240</div>
              <div className="card-text">Active categories managed across your domains.</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm btn-link">View Details</button>
            </div>
          </div>
        </div>
        <div className="clr-col-12 clr-col-md-4">
          <div className="card">
            <div className="card-header">Pending Workspaces</div>
            <div className="card-block">
              <div className="card-title">12</div>
              <div className="card-text">Workspaces pending your approval or action.</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm btn-link">Manage</button>
            </div>
          </div>
        </div>
        <div className="clr-col-12 clr-col-md-4">
          <div className="card">
            <div className="card-header">System Health</div>
            <div className="card-block">
              <div className="card-title" style={{ color: '#60b515' }}>100%</div>
              <div className="card-text">All services are currently operational.</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm btn-link">Diagnostics</button>
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '2rem' }}>Recent Operations</h3>
      <div className="datagrid" style={{ marginTop: '1rem' }}>
        <div className="datagrid-header">
           <div className="datagrid-row">
             <div className="datagrid-column flex-1">Operation</div>
             <div className="datagrid-column flex-1">Status</div>
             <div className="datagrid-column flex-1">Operator</div>
             <div className="datagrid-column flex-1">Time</div>
           </div>
        </div>
        <div className="datagrid-table">
          <div className="datagrid-row">
            <div className="datagrid-cell flex-1">Meta Category Import</div>
            <div className="datagrid-cell flex-1"><span className="label label-success">Success</span></div>
            <div className="datagrid-cell flex-1">admin@example.com</div>
            <div className="datagrid-cell flex-1">10 mins ago</div>
          </div>
          <div className="datagrid-row">
            <div className="datagrid-cell flex-1">Workspace Config Update</div>
            <div className="datagrid-cell flex-1"><span className="label label-info">Pending</span></div>
            <div className="datagrid-cell flex-1">system</div>
            <div className="datagrid-cell flex-1">2 hours ago</div>
          </div>
          <div className="datagrid-row">
            <div className="datagrid-cell flex-1">Product Revision C</div>
            <div className="datagrid-cell flex-1"><span className="label label-success">Success</span></div>
            <div className="datagrid-cell flex-1">user123@example.com</div>
            <div className="datagrid-cell flex-1">5 hours ago</div>
          </div>
        </div>
      </div>
    </div>
  );
}