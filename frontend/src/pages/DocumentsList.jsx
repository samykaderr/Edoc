import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formDataService } from '../services/formDataService';
import { useDocuments } from '../hooks/useDocuments';

function DocumentsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialType = searchParams.get('type') || '';

  const { documentTypes: schemas } = useDocuments();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentType, setDocumentType] = useState(initialType);

  // Données mockées pour correspondre à l'image si l'API est vide ou échoue
  const mockData = [
    { id: 'REQ-1042', type: 'Demande de Congé', date: '2023-10-24', status: 'Nouveau', originalId: 'demande_conge' },
    { id: 'REQ-1041', type: 'Q3 Financial Report', date: '2023-10-20', status: 'Processed', originalId: 'demande_conge' },
    { id: 'REQ-1040', type: 'Vendor Invoice #8841', date: '2023-10-18', status: 'Archived', originalId: 'demande_conge' },
    { id: 'REQ-1039', type: 'Employee Onboarding Pack', date: '2023-10-15', status: 'Nouveau', originalId: 'demande_conge' },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        // On récupère les données de la table correspondante au type (ou 'default_table' par défaut)
        // ATTENTION: La nouvelle API (formDataService.all) attend un nom de table. On le prend du type, ou si vide, on peut lister tout selon votre architecture.
        // Puisque nous n'avons pas la table exacte, on demande une par défaut pour l'instant
        const response = await formDataService.all('test'); 
        // Si l'API retourne des données, on essaie de les mapper, sinon on utilise les mocks.
        if (response && response.length > 0) {
          const mapped = response.map((item, index) => ({
            id: item.id || `REQ-${1000 + index}`,
            type: item.documentType || item.schemaName || 'Document générique',
            schemaName: item.schemaName || item.documentType || '',
            date: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '2023-10-24',
            status: item.status || 'Nouveau',
            originalId: item.id
          }));
          setDocuments(mapped);
        } else {
          setDocuments(mockData);
        }
      } catch (error) {
        console.error("Erreur de récupération des documents, utilisation des mocks", error);
        setDocuments(mockData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (initialType) setDocumentType(initialType);
  }, [initialType]);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.type.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = documentType === '' || doc.schemaName === documentType;
    return matchesSearch && matchesType;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'Nouveau': return 'status-nouveau';
      case 'Processed': return 'status-processed';
      case 'Archived': return 'status-archived';
      default: return '';
    }
  };

  const handleNewClick = () => {
    if (documentType) {
      navigate(`/view/${documentType}`);
    } else {
      alert('Veuillez sélectionner un type de document');
    }
  };

  return (
    <main className="app-shell desktop-only" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>

      {/* Barre de filtres */}
      <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>

        {/* Search (Gauche) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, maxWidth: '300px' }}>
          <label style={{ fontSize: '0.875rem', color: '#5f6368', fontWeight: 600 }}>Search</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Filtrer les documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', border: '1px solid #dadce0', borderRadius: '12px', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        {/* Select & Bouton (Droite) */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '250px' }}>
            <label style={{ fontSize: '0.875rem', color: '#5f6368', fontWeight: 600 }}>Type de document</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #dadce0', borderRadius: '12px', fontSize: '0.875rem', backgroundColor: '#fff' }}
            >
              <option value="">Select Document Type</option>
              {schemas.map(s => (
                <option key={s.schemaName} value={s.schemaName}>{s.title}</option>
              ))}
            </select>
          </div>

          <button
            className="form-submit-button"
            onClick={handleNewClick}
          >
            + Nouveau
          </button>
        </div>
      </div>

      {/* Tableau des documents */}
      <div className="table-container form-renderer" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>ID</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>Document Type</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>Date Created</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#5f6368' }}>Chargement...</td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#5f6368' }}>Aucun document trouvé.</td>
              </tr>
            ) : (
              filteredDocs.map((doc, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #dadce0' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#5f6368', borderRight: '1px solid #dadce0' }}>{doc.id}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>{doc.type}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#5f6368', borderRight: '1px solid #dadce0' }}>{doc.date}</td>
                  <td style={{ padding: '1rem', borderRight: '1px solid #dadce0' }}>
                    <span className={`status-badge ${getStatusClass(doc.status)}`} style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #9aa0a6',
                      borderRadius: '2px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#5f6368',
                      backgroundColor: '#fff'
                    }}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      title="View Document"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}
                      onClick={() => navigate(`/view/${doc.originalId || doc.id}`)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default DocumentsList;
