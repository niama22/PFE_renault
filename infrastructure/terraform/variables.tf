variable "project" {
  description = "Nom du projet (préfixe de toutes les ressources)"
  type        = string
  default     = "optiflow"
}

variable "environment" {
  description = "Environnement cible"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "L'environnement doit être 'staging' ou 'production'."
  }
}

variable "location" {
  description = "Région Azure"
  type        = string
  default     = "francecentral"
}

# ── Réseau ────────────────────────────────────────────────────────────────────

variable "vnet_address_space" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_container_apps_cidr" {
  description = "Subnet dédié Container Apps Environment (/21 minimum)"
  type        = string
  default     = "10.0.0.0/21"
}

variable "subnet_postgres_cidr" {
  description = "Subnet délégué PostgreSQL Flexible Server"
  type        = string
  default     = "10.0.8.0/24"
}

variable "subnet_redis_cidr" {
  type    = string
  default = "10.0.9.0/24"
}

# ── Base de données ───────────────────────────────────────────────────────────

variable "postgres_sku" {
  description = "SKU PostgreSQL (Standard_B1ms pour staging, Standard_D2s_v3 pour prod)"
  type        = string
  default     = "Standard_B1ms"
}

variable "postgres_version" {
  type    = string
  default = "15"
}

variable "postgres_admin_login" {
  type    = string
  default = "optiflow_admin"
}

variable "postgres_admin_password" {
  type      = string
  sensitive = true
}

variable "postgres_databases" {
  description = "Liste des bases de données à créer"
  type        = list(string)
  default = [
    "admin_db",
    "chauffeur_db",
    "client_db",
    "keycloak_db",
    "operateur_db",
    "responsable_db",
  ]
}

# ── Redis ─────────────────────────────────────────────────────────────────────

variable "redis_sku" {
  type    = string
  default = "Basic"
}

variable "redis_capacity" {
  type    = number
  default = 0
}

# ── Event Hubs (Kafka) ────────────────────────────────────────────────────────

variable "eventhubs_capacity" {
  description = "Throughput Units"
  type        = number
  default     = 1
}

variable "kafka_topics" {
  description = "Topics Kafka (= Event Hubs) à créer"
  type        = list(string)
  default = [
    "commandes.created",
    "commandes.planned",
    "commandes.in_transit",
    "commandes.delivered",
    "tournee.validated",
    "mission.acknowledged",
    "mission.started",
    "mission.completed",
  ]
}

# ── Container Registry ────────────────────────────────────────────────────────

variable "acr_sku" {
  type    = string
  default = "Basic"
}

# ── Container Apps ────────────────────────────────────────────────────────────

variable "keycloak_admin_password" {
  type      = string
  sensitive = true
}

variable "image_tag" {
  description = "Tag des images Docker (mis à jour par le pipeline CD)"
  type        = string
  default     = "latest"
}
