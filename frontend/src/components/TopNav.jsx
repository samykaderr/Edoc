import React from 'react';

function TopNav() {
  return (
    <header className="top-nav">
      <div className="top-nav-content">
        {/* Espace pour breadcrumbs, titre ou barre de recherche */}
        <span className="top-nav-title">Gestion Électronique des Documents</span>
      </div>
      <div className="top-nav-actions">
        {/* Espace pour profil utilisateur, notifications, etc. */}
        <button className="icon-btn" aria-label="Notifications">
          🔔
        </button>
        <div className="user-profile">
          <span className="user-avatar">U</span>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
