import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/img_logo.jpg';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Logo Edoc" className="logo-image" />
        <div className="sidebar-header-text">
          <h2>PORTAIL E-DOCUMENT</h2>
          <span className="sidebar-subtitle">Document Management</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </span>
              Tableau de bord
            </NavLink>
          </li>

          {/*
          <li>
            <NavLink to="/create" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </span>
              Nouvelle Demande
            </NavLink>
          </li>*/}

        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
