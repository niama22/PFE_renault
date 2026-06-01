locals {
  # URL du serveur PostgreSQL
  pg_host = azurerm_postgresql_flexible_server.main.fqdn

  # Connection string Event Hubs (Kafka bootstrap)
  kafka_bootstrap = "${azurerm_eventhub_namespace.main.name}.servicebus.windows.net:9093"

  # Connexion string Kafka pour les services (SASL_SSL)
  kafka_connection_string = azurerm_eventhub_namespace_authorization_rule.services.primary_connection_string

  # Image registry
  registry_url = azurerm_container_registry.main.login_server

  # Variables communes à tous les services Java Spring Boot
  java_common_env = [
    { name = "SPRING_DATASOURCE_USERNAME",  value = var.postgres_admin_login,                       secret_name = null },
    { name = "SPRING_DATASOURCE_PASSWORD",  value = null,                                            secret_name = "pg-password" },
    { name = "KAFKA_BOOTSTRAP_SERVERS",     value = local.kafka_bootstrap,                           secret_name = null },
    { name = "KAFKA_SASL_JAAS_CONFIG",      value = null,                                            secret_name = "kafka-sasl-config" },
    { name = "KAFKA_SECURITY_PROTOCOL",     value = "SASL_SSL",                                      secret_name = null },
    { name = "KAFKA_SASL_MECHANISM",        value = "PLAIN",                                         secret_name = null },
    { name = "KEYCLOAK_INTERNAL_URL",       value = "http://optiflow-keycloak",                      secret_name = null },
    { name = "SPRING_PROFILES_ACTIVE",      value = var.environment,                                 secret_name = null },
  ]

  # Variables communes Node.js NestJS
  node_common_env = [
    { name = "DB_HOST",                 value = local.pg_host,                secret_name = null },
    { name = "DB_USERNAME",             value = var.postgres_admin_login,     secret_name = null },
    { name = "DB_PASSWORD",             value = null,                         secret_name = "pg-password" },
    { name = "KAFKA_BROKERS",           value = local.kafka_bootstrap,        secret_name = null },
    { name = "KAFKA_SASL_USERNAME",     value = "optiflow-services",          secret_name = null },
    { name = "KAFKA_SASL_PASSWORD",     value = null,                         secret_name = "kafka-sasl-password" },
    { name = "KEYCLOAK_INTERNAL_URL",   value = "http://optiflow-keycloak",   secret_name = null },
    { name = "NODE_ENV",                value = "production",                 secret_name = null },
  ]
}

# ── Container Apps Environment ────────────────────────────────────────────────

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${local.prefix}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  infrastructure_subnet_id   = azurerm_subnet.container_apps.id
  internal_load_balancer_enabled = false

  tags = local.tags
}

# ── Secrets partagés ──────────────────────────────────────────────────────────

locals {
  kafka_sasl_config = "org.apache.kafka.common.security.plain.PlainLoginModule required username=\"optiflow-services\" password=\"${azurerm_eventhub_namespace_authorization_rule.services.primary_key}\";"
}

# ── Keycloak ──────────────────────────────────────────────────────────────────

resource "azurerm_container_app" "keycloak" {
  name                         = "optiflow-keycloak"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  secret {
    name  = "pg-password"
    value = var.postgres_admin_password
  }
  secret {
    name  = "keycloak-admin-password"
    value = var.keycloak_admin_password
  }

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "keycloak"
      image  = "quay.io/keycloak/keycloak:23.0.7"
      cpu    = 1.0
      memory = "2Gi"

      args = ["start", "--import-realm"]

      env {
        name  = "KC_DB"
        value = "postgres"
      }
      env {
        name  = "KC_DB_URL"
        value = "jdbc:postgresql://${local.pg_host}/keycloak_db"
      }
      env {
        name  = "KC_DB_USERNAME"
        value = var.postgres_admin_login
      }
      env {
        name        = "KC_DB_PASSWORD"
        secret_name = "pg-password"
      }
      env {
        name  = "KEYCLOAK_ADMIN"
        value = "admin"
      }
      env {
        name        = "KEYCLOAK_ADMIN_PASSWORD"
        secret_name = "keycloak-admin-password"
      }
      env {
        name  = "KC_HTTP_ENABLED"
        value = "true"
      }
      env {
        name  = "KC_HOSTNAME_STRICT"
        value = "false"
      }
      env {
        name  = "KC_HTTP_PORT"
        value = "8180"
      }
    }
  }

  ingress {
    external_enabled = false
    target_port      = 8180
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}

# ── Services Java Spring Boot ─────────────────────────────────────────────────

locals {
  java_services = {
    admin-service = {
      image = "${local.registry_url}/optiflow-admin-service:${var.image_tag}"
      port  = 8083
      cpu   = 0.5
      mem   = "1Gi"
      db    = "admin_db"
      extra_env = []
    }
    operateur-service = {
      image = "${local.registry_url}/optiflow-operateur-service:${var.image_tag}"
      port  = 8081
      cpu   = 0.5
      mem   = "1Gi"
      db    = "operateur_db"
      extra_env = []
    }
    responsable-service = {
      image = "${local.registry_url}/optiflow-responsable-service:${var.image_tag}"
      port  = 8084
      cpu   = 0.75
      mem   = "1.5Gi"
      db    = "responsable_db"
      extra_env = []
    }
  }
}

resource "azurerm_container_app" "java_services" {
  for_each                     = local.java_services
  name                         = "optiflow-${each.key}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  secret {
    name  = "pg-password"
    value = var.postgres_admin_password
  }
  secret {
    name  = "kafka-sasl-config"
    value = local.kafka_sasl_config
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name   = each.key
      image  = each.value.image
      cpu    = each.value.cpu
      memory = each.value.mem

      dynamic "env" {
        for_each = local.java_common_env
        content {
          name        = env.value.name
          value       = env.value.secret_name == null ? env.value.value : null
          secret_name = env.value.secret_name
        }
      }

      env {
        name  = "SPRING_DATASOURCE_URL"
        value = "jdbc:postgresql://${local.pg_host}/${each.value.db}"
      }
    }
  }

  ingress {
    external_enabled = false
    target_port      = each.value.port
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  depends_on = [azurerm_container_app.keycloak]
}

# ── Services NestJS ───────────────────────────────────────────────────────────

locals {
  node_services = {
    client-service = {
      image = "${local.registry_url}/optiflow-client-service:${var.image_tag}"
      port  = 3001
      cpu   = 0.25
      mem   = "0.5Gi"
      db    = "client_db"
    }
    chauffeur-service = {
      image = "${local.registry_url}/optiflow-chauffeur-service:${var.image_tag}"
      port  = 3002
      cpu   = 0.25
      mem   = "0.5Gi"
      db    = "chauffeur_db"
    }
  }
}

resource "azurerm_container_app" "node_services" {
  for_each                     = local.node_services
  name                         = "optiflow-${each.key}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  secret {
    name  = "pg-password"
    value = var.postgres_admin_password
  }
  secret {
    name  = "kafka-sasl-password"
    value = azurerm_eventhub_namespace_authorization_rule.services.primary_key
  }
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name   = each.key
      image  = each.value.image
      cpu    = each.value.cpu
      memory = each.value.mem

      dynamic "env" {
        for_each = local.node_common_env
        content {
          name        = env.value.name
          value       = env.value.secret_name == null ? env.value.value : null
          secret_name = env.value.secret_name
        }
      }

      env {
        name  = "DB_NAME"
        value = each.value.db
      }
    }
  }

  ingress {
    external_enabled = false
    target_port      = each.value.port
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  depends_on = [azurerm_container_app.keycloak]
}

# ── Frontend (nginx) — seul service exposé publiquement ──────────────────────

resource "azurerm_container_app" "frontend" {
  name                         = "optiflow-frontend-web"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  template {
    min_replicas = 1
    max_replicas = 5

    container {
      name   = "frontend-web"
      image  = "${local.registry_url}/optiflow-frontend-web:${var.image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  depends_on = [
    azurerm_container_app.java_services,
    azurerm_container_app.node_services,
  ]
}
