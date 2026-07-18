// src/pages/CreateForm.jsx
import React, { useState } from 'react';
import { JsonParser } from '../features/form-engine/parser/jsonParser';
import { definitionService } from '../services/definitionService';

export default function CreateForm() {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState('');

  const handlePublish = async () => {
    try {
      setStatus('Analyse du schéma...');
      const parser = new JsonParser();

      // 1. Parse et validation du JSON entrant
      const schema = parser.parse(jsonInput);

      // 2. Traduction intelligente au format attendu par MySQL
      const mysqlPayload = parser.toMysqlPayload(schema);

      setStatus('Création de la table sur MySQL...');
      await definitionService.creerTable(mysqlPayload.tableName);

      setStatus('Injection des colonnes typées...');
      await definitionService.creerChamps(mysqlPayload);

      setStatus(`Succès ! Table "${mysqlPayload.tableName}" active en BDD.`);
    } catch (err) {
      setStatus(`Erreur : ${err.message}`);
    }
  };

  return (
    <div className="page-container">
      <h1>Publier un Nouveau Formulaire</h1>
      <textarea
        rows="15"
        className="form-control code-editor"
        placeholder="Collez votre JSON Schema Draft 2020-12 ici..."
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      />
      <button onClick={handlePublish} className="btn btn-success mt-3">
        Générer l'infrastructure BDD
      </button>
      {status && <p className="status-message mt-2"><strong>Statut :</strong> {status}</p>}
    </div>
  );
}