# language: es
Característica: Documentacion publica y contrato API
  Como equipo tecnico
  Quiero que Swagger, OpenAPI y el trazo publico de datos esten disponibles
  Para poder auditar el contrato sin acceder a secretos

  Escenario: Swagger carga el contrato OpenAPI
    Dado que los assets externos de Swagger estan simulados
    Y que abro la ruta "/swagger"
    Entonces debo ver el texto "API Swagger"
    Y debo ver el enlace "openapi.yaml"
    Y debo ver el texto "Swagger UI loaded /openapi.yaml"
    Cuando hago una peticion GET a "/openapi.yaml"
    Entonces la respuesta debe ser OK
    Y la respuesta debe contener:
      """
      KripChat Client API Surface
      /rest/v1/encrypted_messages
      x-supabase-realtime
      """

  Escenario: El documento publico del trazo de datos no expone secretos
    Cuando hago una peticion GET a "/database-data-flow.md"
    Entonces la respuesta debe ser OK
    Y la respuesta debe contener:
      """
      KripChat database data flow
      Use cases and how they appear in the database
      encrypted_messages
      """
    Y la respuesta no debe contener:
      """
      service_role
      SUPABASE_DB_URL=
      """
