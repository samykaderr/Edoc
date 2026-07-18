package com.soummam.backend.exception;

/**
 * Levée quand la table cible demandée n'existe pas en base de données.
 */
public class TableNotFoundException extends RuntimeException {

    public TableNotFoundException(String tableName) {
        super("Table introuvable en base de données : " + tableName);
    }
}
