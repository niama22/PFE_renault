environment = "production"
location    = "francecentral"

# PostgreSQL — SKU plus puissant en prod
postgres_sku            = "Standard_D2s_v3"
postgres_admin_login    = "optiflow_admin"

# Redis
redis_sku      = "Standard"
redis_capacity = 1

# Event Hubs
eventhubs_capacity = 2

# Container Registry
acr_sku = "Standard"

# Container Apps image tag — mis à jour par le pipeline CD
image_tag = "latest"
