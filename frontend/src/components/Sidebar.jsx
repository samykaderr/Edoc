import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/img_logo.jpg';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Logo Edoc" className="logo-image" />
        <h2>Edoc</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="icon">📊</span>
              Tableau de bord
            </NavLink>
          </li>
          {/* Les futurs menus seront ajoutés ici */}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
