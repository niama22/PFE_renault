environment = "staging"
location    = "francecentral"

# PostgreSQL
postgres_sku            = "Standard_B1ms"
postgres_admin_login    = "optiflow_admin"
# postgres_admin_password → à passer via TF_VAR_postgres_admin_password ou GitHub Secret

# Redis
redis_sku      = "Basic"
redis_capacity = 0

# Event Hubs
eventhubs_capacity = 1

# Container Registry
acr_sku = "Basic"

# Container Apps image tag
image_tag = "latest"
