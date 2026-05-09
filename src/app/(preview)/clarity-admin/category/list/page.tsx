'use client';

import React from 'react';

export default function CategoryDemoPage() {
  return (
    <div style={{ marginTop: '1rem' }}>
      <h2>Category List Demo</h2>
      <p style={{ color: '#666' }}>Another mocked route to demonstrate route-switching, active menu state, and subnav tab generation in the newly refactored Clarity layout.</p>
      
      <div className="alert alert-info" role="alert" style={{ marginTop: '1rem' }}>
        <div className="alert-items">
          <div className="alert-item static">
            <div className="alert-icon-wrapper">
              <cds-icon className="alert-icon" shape="info-circle"></cds-icon>
            </div>
            <span className="alert-text">Categories can be managed via the datagrid below. Select items to perform actions.</span>
          </div>
        </div>
      </div>
      
      <div className="datagrid" style={{ marginTop: '2rem' }}>
        <div className="datagrid-header">
           <div className="datagrid-row">
             <div className="datagrid-column" style={{ width: '40px' }}><input type="checkbox" /></div>
             <div className="datagrid-column flex-1">Category Name</div>
             <div className="datagrid-column flex-1">Code</div>
             <div className="datagrid-column flex-1">Status</div>
           </div>
        </div>
        <div className="datagrid-table">
          <div className="datagrid-row">
            <div className="datagrid-cell" style={{ width: '40px' }}><input type="checkbox" /></div>
            <div className="datagrid-cell flex-1">Raw Materials</div>
            <div className="datagrid-cell flex-1">CAT-RAW-001</div>
            <div className="datagrid-cell flex-1"><span className="badge badge-success">Active</span></div>
          </div>
          <div className="datagrid-row">
            <div className="datagrid-cell" style={{ width: '40px' }}><input type="checkbox" /></div>
            <div className="datagrid-cell flex-1">Packaging</div>
            <div className="datagrid-cell flex-1">CAT-PKG-002</div>
            <div className="datagrid-cell flex-1"><span className="badge badge-success">Active</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}