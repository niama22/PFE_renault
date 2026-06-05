# ── Event Hubs Namespace avec surface Kafka ───────────────────────────────────

resource "azurerm_eventhub_namespace" "main" {
  name                     = "evhns-${local.prefix}-${random_string.suffix.result}"
  location                 = azurerm_resource_group.main.location
  resource_group_name      = azurerm_resource_group.main.name
  sku                      = "Standard"
  capacity                 = var.eventhubs_capacity
  kafka_enabled            = true
  auto_inflate_enabled     = false
  maximum_throughput_units = 0

  network_rulesets {
    default_action                 = "Allow"
    trusted_service_access_enabled = true
  }

  tags = local.tags
}

# ── Topics (1 Event Hub = 1 topic Kafka) ─────────────────────────────────────

resource "azurerm_eventhub" "topics" {
  for_each            = toset(var.kafka_topics)
  name                = each.value
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = 3
  message_retention   = 7
}

# ── Consumer groups par service ───────────────────────────────────────────────

locals {
  consumer_groups = {
    # Commandes lifecycle
    "commandes.created"                        = ["operateur-service-group", "client-service-orders-group", "admin-service-group"]
    "commandes.validated"                      = ["admin-service-group", "client-service-orders-group"]
    "commandes.rejected"                       = ["admin-service-group", "client-service-orders-group"]
    "commandes.planned"                        = ["client-service-orders-group"]
    "commandes.in_transit"                     = ["client-service-orders-group"]
    "commandes.delivered"                      = ["client-service-orders-group"]
    "commandes.cancelled"                      = ["client-service-orders-group"]
    # Annulations
    "commandes.cancellation_requested"         = ["operateur-service-group"]
    "commandes.cancellation_pending"           = ["responsable-service-group"]
    "commandes.cancellation_approved"          = ["operateur-service-group"]
    "commandes.cancellation_rejected"          = ["client-service-orders-group"]
    "commandes.cancellation_rejected_by_respo" = ["operateur-service-group"]
    # Tournées & Missions
    "tournee.created"                          = ["admin-service-group"]
    "tournee.validated"                        = ["chauffeur-service-group", "responsable-service-group"]
    "mission.acknowledged"                     = ["responsable-service-group"]
    "mission.started"                          = ["operateur-service-group", "responsable-service-group"]
    "mission.completed"                        = ["operateur-service-group", "responsable-service-group"]
    # Incidents
    "incident.created"                         = ["operateur-service-group", "admin-service-group", "client-service-incidents-group"]
    "incident.in_progress"                     = ["admin-service-group", "client-service-incidents-group"]
    "incident.resolved"                        = ["admin-service-group", "client-service-incidents-group"]
    "incident.closed"                          = ["admin-service-group", "client-service-incidents-group"]
    # Messagerie chauffeur ↔ opérateur
    "message.sent"                             = ["operateur-messages-group"]
    "message.operator_reply"                   = ["chauffeur-messages-group"]
  }

  # Flatten pour for_each
  consumer_group_entries = flatten([
    for topic, groups in local.consumer_groups : [
      for group in groups : {
        key   = "${topic}__${group}"
        topic = topic
        group = group
      }
    ]
  ])
}

resource "azurerm_eventhub_consumer_group" "groups" {
  for_each = {
    for entry in local.consumer_group_entries : entry.key => entry
  }
  name                = each.value.group
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = each.value.topic
  resource_group_name = azurerm_resource_group.main.name

  depends_on = [azurerm_eventhub.topics]
}

# ── Clé de connexion partagée ─────────────────────────────────────────────────

resource "azurerm_eventhub_namespace_authorization_rule" "services" {
  name                = "optiflow-services"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  listen              = true
  send                = true
  manage              = false
}
