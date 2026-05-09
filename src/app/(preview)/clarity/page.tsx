'use client';
import React, { useState } from 'react';
import '@cds/core/icon/register.js';
// This assumes web components from @cds/core are available or we just use standard clr-ui HTML patterns

export default function ClarityPreviewPage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="main-container">
      {/* App Level Alert */}
      <div className="alert alert-app-level alert-info" role="alert">
        <div className="alert-items">
          <div className="alert-item static">
            <div className="alert-icon-wrapper">
              <cds-icon className="alert-icon" shape="info-circle"></cds-icon>
            </div>
            <span className="alert-text">This is the first app level alert.</span>
            <div className="alert-actions">
              <button className="btn alert-action">FIX</button>
            </div>
          </div>
        </div>
        <button type="button" className="close" aria-label="Close">
          <cds-icon aria-hidden="true" shape="window-close"></cds-icon>
        </button>
      </div>

      <header className="header header-6">
        <div className="branding">
          <a href="#" className="nav-link">
            <cds-icon shape="vm-bug" solid="true"></cds-icon>
            <span className="title">vmw Clarity Design</span>
          </a>
        </div>
        <div className="header-nav">
          <a href="#" className="nav-link nav-icon-text">
            <cds-icon shape="search"></cds-icon>
            <span className="nav-text">Search for keywords...</span>
          </a>
        </div>
        <div className="header-actions">
          <a href="#" className="nav-link nav-icon" aria-label="refresh">
            <cds-icon shape="refresh"></cds-icon>
          </a>
          <a href="#" className="nav-link nav-icon" aria-label="smile">
            <cds-icon shape="happy-face"></cds-icon>
          </a>
          <a href="#" className="nav-link nav-icon" aria-label="bell">
            <cds-icon shape="bell"></cds-icon>
          </a>
          <a href="#" className="nav-link nav-icon" aria-label="user">
            <cds-icon shape="user"></cds-icon>
            <span className="nav-text">john.doe@vmware.com</span>
            <cds-icon shape="angle" direction="down"></cds-icon>
          </a>
          <a href="#" className="nav-link nav-icon" aria-label="help">
            <cds-icon shape="help"></cds-icon>
          </a>
        </div>
      </header>

      <div className="content-container">
        {/* Left Sidenav */}
        <nav className="sidenav">
          <section className="sidenav-content">
            <a href="#" className="nav-link active">
              <cds-icon shape="user"></cds-icon>
              Normal
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="bolt"></cds-icon>
              Electric
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="flask"></cds-icon>
              Poison
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="leaf"></cds-icon>
              Grass
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="shield"></cds-icon>
              Fighting
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="credit-card"></cds-icon>
              Credit
            </a>

            <div className="nav-divider"></div>

            <a href="#" className="nav-link">
              <cds-icon shape="user"></cds-icon>
              Normal
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="bolt"></cds-icon>
              Electric
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="flask"></cds-icon>
              Poison
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="leaf"></cds-icon>
              Grass
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="shield"></cds-icon>
              Fighting
            </a>
            <a href="#" className="nav-link">
              <cds-icon shape="credit-card"></cds-icon>
              Credit
            </a>
          </section>
        </nav>

        {/* Second Sidenav / Sub Nav Area (To mimic the image's layout structure) */}
        <div style={{ width: '250px', borderRight: '1px solid #ccc', backgroundColor: '#fafafa', overflowY: 'auto' }}>
           <ul className="clr-treenode" style={{ padding: '0.5rem', listStyle: 'none', margin: 0 }}>
             <li>
               <div className="clr-treenode-content" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                 <cds-icon shape="folder" style={{ marginRight: '8px' }}></cds-icon>
                 Applications
               </div>
               <ul style={{ listStyle: 'none', paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                 <li style={{ padding: '0.2rem 0', color: '#0072a3', cursor: 'pointer' }}><cds-icon shape="calendar" solid="true" style={{ marginRight: '8px' }}></cds-icon>Calendar</li>
                 <li style={{ padding: '0.2rem 0', cursor: 'pointer' }}><cds-icon shape="chart" style={{ marginRight: '8px' }}></cds-icon>Charts</li>
                 <li style={{ padding: '0.2rem 0', cursor: 'pointer' }}><cds-icon shape="dashboard" style={{ marginRight: '8px' }}></cds-icon>Dashboard</li>
                 <li style={{ padding: '0.2rem 0', cursor: 'pointer' }}><cds-icon shape="map" style={{ marginRight: '8px' }}></cds-icon>Maps</li>
                 <li style={{ padding: '0.2rem 0', cursor: 'pointer' }}><cds-icon shape="envelope" style={{ marginRight: '8px' }}></cds-icon>Mail</li>
                 <li style={{ padding: '0.2rem 0', cursor: 'pointer' }}><cds-icon shape="calculator" style={{ marginRight: '8px' }}></cds-icon>Numbers</li>
                 <li style={{ padding: '0.2rem 0', cursor: 'pointer' }}><cds-icon shape="tasks" style={{ marginRight: '8px' }}></cds-icon>Tasks</li>
                 <li style={{ padding: '0.2rem 0', cursor: 'pointer' }}><cds-icon shape="clock" style={{ marginRight: '8px' }}></cds-icon>Reminders</li>
               </ul>
             </li>
             <li style={{ marginTop: '0.5rem' }}>
               <div className="clr-treenode-content" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                 <cds-icon shape="angle" direction="right" style={{ marginRight: '4px' }}></cds-icon>
                 <cds-icon shape="folder" style={{ marginRight: '8px' }}></cds-icon>
                 Files
               </div>
             </li>
             <li style={{ marginTop: '0.5rem' }}>
               <div className="clr-treenode-content" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                 <cds-icon shape="angle" direction="right" style={{ marginRight: '4px' }}></cds-icon>
                 <cds-icon shape="folder" style={{ marginRight: '8px' }}></cds-icon>
                 Images
               </div>
             </li>
           </ul>
        </div>
        
        {/* Third Sidenav Sub Nav Area */}
        <div style={{ width: '200px', borderRight: '1px solid #ccc', backgroundColor: '#fff', overflowY: 'auto' }}>
            <ul className="clr-nav-list" style={{ listStyle: 'none', padding: '1rem', margin: 0 }}>
              <li style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Normal</li>
              <ul style={{ listStyle: 'none', paddingLeft: '1rem', marginBottom: '1rem', color: '#666' }}>
                <li style={{ padding: '0.2rem 0' }}>Pidgey</li>
                <li style={{ padding: '0.2rem 0' }}>Snorlax</li>
              </ul>
              <li style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Fire</li>
              <ul style={{ listStyle: 'none', paddingLeft: '1rem', marginBottom: '1rem', color: '#666' }}>
                <li style={{ padding: '0.2rem 0' }}>Charmander</li>
                <li style={{ padding: '0.2rem 0', color: '#0072a3', fontWeight: 'bold' }}>Charizard</li>
              </ul>
              <li style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Electric</li>
              <ul style={{ listStyle: 'none', paddingLeft: '1rem', marginBottom: '1rem', color: '#666' }}>
                <li style={{ padding: '0.2rem 0' }}>Pikachu</li>
                <li style={{ padding: '0.2rem 0' }}>Raichu</li>
              </ul>
              <li style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Credit</li>
            </ul>
        </div>

        {/* Content Area */}
        <div className="content-area" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          <ul className="breadcrumb" style={{ margin: 0, paddingBottom: '0.5rem', color: '#0072a3', fontSize: '12px' }}>
            <li><a href="#">Framework</a></li>
            <li><a href="#">Angular</a></li>
            <li>Clarity</li>
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, marginRight: '1rem', fontSize: '24px', fontWeight: 300 }}>H5 Title</h2>
            <div className="dropdown">
              <button className="dropdown-toggle btn btn-link" style={{ margin: 0, padding: 0 }}>
                ACTIONS <cds-icon shape="angle" direction="down"></cds-icon>
              </button>
            </div>
          </div>

          <ul className="nav" role="tablist">
            <li role="presentation" className="nav-item">
              <button id="tab1" className="btn btn-link nav-link active" aria-selected="true" type="button">Dashboard</button>
            </li>
            <li role="presentation" className="nav-item">
              <button id="tab2" className="btn btn-link nav-link" type="button">Management</button>
            </li>
            <li role="presentation" className="nav-item">
              <button id="tab3" className="btn btn-link nav-link" type="button">Cloud</button>
            </li>
            <li role="presentation" className="nav-item">
              <button id="tab4" className="btn btn-link nav-link" type="button">Infrastructure</button>
            </li>
          </ul>

          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ marginTop: 0 }}>General</h4>
            <p style={{ color: '#666', fontSize: '13px' }}>Below are the general settings for supporting namespaces on Supervisor</p>
            
            {/* Timeline/Stepper mockup */}
            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '2rem 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>11:59 am</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #ccc', backgroundColor: '#fff', zIndex: 1 }}></div>
                  <div style={{ height: '2px', backgroundColor: '#ccc', flex: 1, marginLeft: '-2px' }}></div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Add KMS</strong>
                  <p style={{ fontSize: '12px', color: '#666' }}>Root CA certificate requested.</p>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>11:59 am</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #0072a3', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', zIndex: 1 }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0072a3' }}></div>
                  </div>
                  <div style={{ height: '2px', backgroundColor: '#ccc', flex: 1, marginLeft: '-2px' }}></div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Add KMS</strong>
                  <p style={{ fontSize: '12px', color: '#666' }}>Root CA certificate requested. Upload it to the KMS to complete the connection.</p>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }}>UPLOAD CERTIFICATE</button>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>11:59 am</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #ccc', backgroundColor: '#fff', zIndex: 1 }}></div>
                  <div style={{ height: '2px', backgroundColor: '#ccc', flex: 1, marginLeft: '-2px' }}></div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Make vCenter trust KMS</strong>
                  <p style={{ fontSize: '12px', color: '#666' }}>Root CA certificate requested. Upload it to the KMS to complete the connection. Third sentence is very long and sentence very long</p>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>11:59 am</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#60b515', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                     <cds-icon shape="check" inverse="true"></cds-icon>
                  </div>
                  <div style={{ height: '2px', backgroundColor: '#ccc', flex: 1, marginLeft: '-2px' }}></div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Make KMS trust vCenter</strong>
                  <p style={{ fontSize: '12px', color: '#666' }}>Upload it to the KMS to complete the connection. Third sentence is very long.</p>
                  <button className="btn btn-link btn-sm" style={{ padding: 0, marginTop: '0.5rem' }}>AUTHORIZE</button>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>11:59 am</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#c92100', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                     <cds-icon shape="exclamation" inverse="true"></cds-icon>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Connected</strong>
                  <p style={{ fontSize: '12px', color: '#666' }}>No. It&apos;s not connected.</p>
                </div>
              </div>
            </div>

            {/* Accordion */}
            <ul className="clr-accordion" style={{ marginTop: '2rem' }}>
              <li className="clr-accordion-panel">
                <div className="clr-accordion-header">
                  <button type="button" className="clr-accordion-header-button">
                    <cds-icon shape="angle" direction="right"></cds-icon> Item 1
                  </button>
                </div>
              </li>
              <li className="clr-accordion-panel">
                <div className="clr-accordion-header">
                  <button type="button" className="clr-accordion-header-button">
                    <cds-icon shape="angle" direction="right"></cds-icon> Item 2
                  </button>
                </div>
              </li>
              <li className="clr-accordion-panel">
                <div className="clr-accordion-header">
                  <button type="button" className="clr-accordion-header-button">
                    <cds-icon shape="angle" direction="right"></cds-icon> Item 3
                  </button>
                </div>
              </li>
            </ul>

            {/* Actions */}
            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              <button className="btn btn-primary">ACTION 1</button>
              <button className="btn btn-primary">ACTION 2</button>
              <button className="btn btn-primary">
                <cds-icon shape="ellipsis-horizontal"></cds-icon>
              </button>
            </div>

            {/* Datagrid Fake Mockup */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Date Range</label>
              <div style={{ display: 'flex', alignItems: 'center', width: '200px', borderBottom: '1px solid #ccc', padding: '0.2rem 0' }}>
                <span style={{ fontSize: '13px', color: '#666', flex: 1 }}>MM/DD/YYYY - MM/DD/YYYY</span>
                <cds-icon shape="calendar"></cds-icon>
              </div>
            </div>

            <div className="datagrid">
              <div className="datagrid-header">
                <div className="datagrid-row">
                  <div className="datagrid-column" style={{ width: '40px' }}><input type="checkbox" /></div>
                  <div className="datagrid-column" style={{ width: '40px' }}></div>
                  <div className="datagrid-column flex-1">Name</div>
                  <div className="datagrid-column flex-1">Symbol</div>
                  <div className="datagrid-column flex-1">Number</div>
                  <div className="datagrid-column flex-2">Long text width 250px</div>
                  <div className="datagrid-column flex-1">Electronegativity</div>
                </div>
              </div>
              <div className="datagrid-table">
                {[
                  { name: 'Actinium', sym: 'Ac', no: 89, text: 'Lorem ipsum dolor sit amet', en: 1.1 },
                  { name: 'Aluminum', sym: 'Al', no: 13, text: 'Lorem ipsum dolor sit amet', en: 1.61 },
                  { name: 'Americium', sym: 'Am', no: 95, text: 'Lorem ipsum dolor sit amet', en: 1.3 },
                  { name: 'Antimony', sym: 'Sb', no: 51, text: 'Lorem ipsum dolor sit amet', en: 2.05 },
                  { name: 'Argon', sym: 'Ar', no: 18, text: 'Lorem ipsum dolor sit amet', en: 0 },
                  { name: 'Arsenic', sym: 'As', no: 33, text: 'Lorem ipsum dolor sit amet', en: 2.18 },
                  { name: 'Astatine', sym: 'At', no: 85, text: 'Lorem ipsum dolor sit amet', en: 2.2 },
                  { name: 'Barium', sym: 'Ba', no: 56, text: 'Lorem ipsum dolor sit amet', en: 0.89 },
                  { name: 'Berkelium', sym: 'Bk', no: 97, text: 'Lorem ipsum dolor sit amet', en: 1.3 },
                  { name: 'Beryllium', sym: 'Be', no: 4, text: 'Lorem ipsum dolor sit amet', en: 1.57 },
                ].map((row, i) => (
                  <div className="datagrid-row" key={i}>
                    <div className="datagrid-cell" style={{ width: '40px' }}><input type="checkbox" /></div>
                    <div className="datagrid-cell" style={{ width: '40px' }}><cds-icon shape="angle" direction="right"></cds-icon></div>
                    <div className="datagrid-cell flex-1">{row.name}</div>
                    <div className="datagrid-cell flex-1">{row.sym}</div>
                    <div className="datagrid-cell flex-1">{row.no}</div>
                    <div className="datagrid-cell flex-2">{row.text}</div>
                    <div className="datagrid-cell flex-1">{row.en}</div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
