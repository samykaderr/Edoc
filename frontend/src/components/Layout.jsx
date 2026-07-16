import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

function Layout() {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="layout-main-wrapper">
        <TopNav />
        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
