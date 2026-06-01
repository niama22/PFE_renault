#!/bin/bash
# Bootstrap du storage account pour le Terraform remote state
# À exécuter UNE SEULE FOIS avant le premier `terraform init`
set -euo pipefail

SUBSCRIPTION_ID="${1:?Usage: $0 <subscription-id>}"
LOCATION="francecentral"
RG="rg-optiflow-tfstate"
SA="optiflowterrastate"
CONTAINER="tfstate"

echo "→ Login Azure..."
az account set --subscription "$SUBSCRIPTION_ID"

echo "→ Resource group: $RG"
az group create --name "$RG" --location "$LOCATION" --output none

echo "→ Storage account: $SA"
az storage account create \
  --name "$SA" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --output none

echo "→ Container blob: $CONTAINER"
az storage container create \
  --name "$CONTAINER" \
  --account-name "$SA" \
  --output none

echo ""
echo "✓ Remote state prêt. Lancer maintenant :"
echo "  terraform init -backend-config=\"storage_account_name=$SA\""
