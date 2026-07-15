package com.soummam.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class JsonValidationService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void validateDocument(String jsonPayload) throws Exception {
        // 1. Charger le schéma générique depuis les ressources
        InputStream schemaStream = new ClassPathResource("schema/demande_conge.json").getInputStream();
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
        JsonSchema jsonSchema = factory.getSchema(schemaStream);

        // 2. Parser le payload reçu du Front-end
        JsonNode jsonNode = objectMapper.readTree(jsonPayload);

        // 3. Valider le payload par rapport au schéma
        Set<ValidationMessage> errors = jsonSchema.validate(jsonNode);

        // 4. Si des erreurs existent, on lève une exception avec les détails
        if (!errors.isEmpty()) {
            String errorMsg = errors.stream()
                    .map(ValidationMessage::getMessage)
                    .collect(Collectors.joining(", "));
            throw new IllegalArgumentException("Données invalides : " + errorMsg);
        }
    }
}