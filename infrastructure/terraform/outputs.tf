# ── URLs applicatives ─────────────────────────────────────────────────────────

output "frontend_url" {
  description = "URL publique du frontend"
  value       = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}

output "keycloak_internal_url" {
  description = "URL interne Keycloak (accessible depuis les Container Apps)"
  value       = "http://optiflow-keycloak"
}

# ── Base de données ───────────────────────────────────────────────────────────

output "postgres_host" {
  description = "FQDN du serveur PostgreSQL"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_databases" {
  description = "Bases de données créées"
  value       = [for db in azurerm_postgresql_flexible_server_database.dbs : db.name]
}

# ── Event Hubs ────────────────────────────────────────────────────────────────

output "kafka_bootstrap_servers" {
  description = "Bootstrap servers pour les services Kafka"
  value       = "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093"
}

output "kafka_connection_string" {
  description = "Connection string Event Hubs (à stocker dans Key Vault)"
  value       = azurerm_eventhub_namespace_authorization_rule.services.primary_connection_string
  sensitive   = true
}

# ── Container Registry ────────────────────────────────────────────────────────

output "acr_login_server" {
  description = "URL du Container Registry (ex: optiflowacrstaging1234.azurecr.io)"
  value       = azurerm_container_registry.main.login_server
}

output "acr_name" {
  value = azurerm_container_registry.main.name
}

# ── Redis ─────────────────────────────────────────────────────────────────────

output "redis_hostname" {
  value = azurerm_redis_cache.main.hostname
}

output "redis_primary_key" {
  value     = azurerm_redis_cache.main.primary_access_key
  sensitive = true
}

# ── Resource Group ────────────────────────────────────────────────────────────

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "container_app_environment_name" {
  value = azurerm_container_app_environment.main.name
}
