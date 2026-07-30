import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formDataService } from '../services/formDataService';
import { useDocuments } from '../hooks/useDocuments';

function DocumentTypeManager() {
    const { schemaName } = useParams(); // Récupère le type (ex: demande_conge) depuis l'URL
    const navigate = useNavigate();

    const { documentTypes } = useDocuments();
    const [schema, setSchema] = useState(null); // 🟢 AJOUT : Stocke le schéma complet chargé
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Trouver les métadonnées de base (Titre, Description) issues du registre
    const currentSchemaEntry = documentTypes.find(s => s.schemaName === schemaName);

    // 🟢 Extraction dynamique des colonnes depuis le schéma fraîchement téléchargé
    const schemaProperties = schema?.properties || {};
    const columnKeys = Object.keys(schemaProperties);

    useEffect(() => {
        async function loadSchemaAndData() {
            try {
                setLoading(true);

                // ✅ Étape 1 : Charger le JSON LOCALEMENT (source de vérité visuelle)
                const schemaResponse = await fetch(`/schema/${schemaName}.json`);
                if (!schemaResponse.ok) {
                    throw new Error(`Impossible de charger le fichier de configuration de ${schemaName}`);
                }
                const schemaData = await schemaResponse.json();

                // ✅ Étape 2 (immédiat) : Afficher les colonnes depuis le JSON LOCAL
                setSchema(schemaData);

                // ✅ Étape 3 : Sync non-bloquant (DDL MySQL, effet de bord non-critique)
                formDataService.syncSchema(schemaName, schemaData).catch((syncErr) => {
                    console.warn('[DocumentTypeManager] syncSchema non-critique échoué :', syncErr.message);
                });

                // ✅ Étape 4 : Récupérer uniquement les DONNÉES/ENREGISTREMENTS depuis la BDD
                const response = await formDataService.all(schemaName);
                if (response && response.length > 0) {
                    setDocuments(response);
                } else {
                    setDocuments([]);
                }
            } catch (error) {
                console.error("Erreur de chargement des spécifications du document", error);
                setDocuments([]);
            } finally {
                setLoading(false);
            }
        }

        if (schemaName) loadSchemaAndData();
    }, [schemaName]);


    // Bouton + Nouveau
    const handleNewClick = () => {
        navigate(`/view/${schemaName}`);
    };

    // Filtrage pour la recherche
    const filteredDocs = documents.filter(doc => {
        const rowContentString = Object.values(doc).join(' ').toLowerCase();
        return rowContentString.includes(searchTerm.toLowerCase());
    });

    // Helper pour formater la valeur d'une cellule avec tolérance de casse et gestion des objets imbriqués
    const getFormattedCellValue = (doc, key, propertyDef) => {
        if (!doc) return '-';

        // 1. Recherche directe par clé exacte
        if (doc[key] !== undefined && doc[key] !== null && doc[key] !== '') {
            return formatVal(doc[key]);
        }

        // 2. Recherche insensible à la casse (ex: idemploye -> idEmploye)
        const lowerKey = key.toLowerCase();
        const matchedKey = Object.keys(doc).find(k => k.toLowerCase() === lowerKey);
        if (matchedKey && doc[matchedKey] !== undefined && doc[matchedKey] !== null && doc[matchedKey] !== '') {
            return formatVal(doc[matchedKey]);
        }

        // 3. Gestion des objets imbriqués (ex: groupe 'periode' -> periode_dateDebut et periode_dateFin)
        if (propertyDef?.type === 'object' && propertyDef?.properties) {
            const subKeys = Object.keys(propertyDef.properties);
            const subValues = subKeys.map(subKey => {
                const fullPathLower = `${key}_${subKey}`.toLowerCase();
                const subLower = subKey.toLowerCase();
                const foundKey = Object.keys(doc).find(k => k.toLowerCase() === fullPathLower || k.toLowerCase() === subLower);
                return foundKey ? doc[foundKey] : null;
            }).filter(v => v !== null && v !== '');

            if (subValues.length > 0) {
                return subValues.join(' au ');
            }
        }

        return '-';
    };

    const formatVal = (val) => {
        if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
        if (typeof val === 'object') return JSON.stringify(val);
        return val.toString();
    };

    return (
        <main className="app-shell desktop-only" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>

            {/* En-tête de la page dédiée */}
            <section className="hero-panel" style={{ marginBottom: '2rem' }}>
                <div className="hero-copy">
                    <p className="eyebrow">Gestion par document</p>
                    <h1>{currentSchemaEntry?.title || schema?.title || 'Chargement...'}</h1>
                    <p className="hero-text">
                        {currentSchemaEntry?.description || schema?.description || 'Historique et saisie des documents.'}
                    </p>
                </div>
                <div className="hero-status">
                    <span className="status-dot" />
                    <span>{filteredDocs.length} enregistrement(s)</span>
                </div>
            </section>

            {/* Barre d'outils */}
            <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, maxWidth: '300px' }}>
                    <label style={{ fontSize: '0.875rem', color: '#5f6368', fontWeight: 600 }}>Recherche rapide</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Filtrer dans le tableau..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', border: '1px solid #dadce0', borderRadius: '12px', fontSize: '0.875rem' }}
                        />
                    </div>
                </div>

                <button className="form-submit-button" onClick={handleNewClick}>
                    + Nouveau {currentSchemaEntry?.title || schema?.title || ''}
                </button>
            </div>

            {/* Tableau Dynamique */}
            <div className="table-container form-renderer" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>N° Document</th>

                            {/* En-têtes de colonnes injectées dynamiquement depuis le JSON */}
                            {columnKeys.map((key) => (
                                <th key={key} style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>
                                    {schemaProperties[key]?.title || key}
                                </th>
                            ))}

                            <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', color: '#202124' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={columnKeys.length + 2} style={{ padding: '2rem', textAlign: 'center', color: '#5f6368' }}>Chargement...</td>
                            </tr>
                        ) : filteredDocs.length === 0 ? (
                            <tr>
                                <td colSpan={columnKeys.length + 2} style={{ padding: '2rem', textAlign: 'center', color: '#5f6368' }}>Aucun document trouvé pour ce type.</td>
                            </tr>
                        ) : (
                            filteredDocs.map((doc, idx) => (
                                <tr key={doc.id || idx} style={{ borderBottom: '1px solid #dadce0' }}>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#5f6368', borderRight: '1px solid #dadce0' }}>
                                        {doc.num_doc || doc.numero_ordre || doc.numero_demande || doc.numDoc || `N° ${doc.id}`}
                                    </td>

                                    {/* Cellules dynamiques mappées sur les clés du schéma */}
                                    {columnKeys.map((key) => (
                                        <td key={key} style={{ padding: '1rem', fontSize: '0.875rem', color: '#202124', borderRight: '1px solid #dadce0' }}>
                                            {getFormattedCellValue(doc, key, schemaProperties[key])}
                                        </td>
                                    ))}

                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <button
                                            title="Consulter"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}
                                            // Transmettre l'ID du document (row.id, item.id ou doc.id selon le composant)
                                            onClick={() => navigate(`/view/${schemaName}/${doc.id}`)}
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

export default DocumentTypeManager;