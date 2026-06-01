# Azure Setup — OptiFlow CD Pipeline

## Secrets GitHub requis

Aller dans **GitHub → Settings → Secrets and variables → Actions** et ajouter :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `AZURE_CREDENTIALS` | JSON Service Principal | voir commande ci-dessous |
| `ACR_NAME` | Nom du Container Registry | `optiflowacr` |
| `AZURE_RESOURCE_GROUP` | Groupe de ressources | `rg-optiflow-prod` |
| `AZURE_CONTAINER_APP_ENV` | Environnement Container Apps | `optiflow-env` |
| `AZURE_SUBSCRIPTION_ID` | ID souscription Azure | `xxxxxxxx-xxxx-...` |

## Créer le Service Principal

```bash
az ad sp create-for-rbac \
  --name "optiflow-github-actions" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP> \
  --sdk-auth
```

Copier le JSON complet dans le secret `AZURE_CREDENTIALS`.

## Créer l'infrastructure Azure (à faire une seule fois)

```bash
# Variables
RG="rg-optiflow-prod"
LOCATION="francecentral"
ACR="optiflowacr"
ENV="optiflow-env"

# Resource group
az group create --name $RG --location $LOCATION

# Azure Container Registry
az acr create --name $ACR --resource-group $RG --sku Basic --admin-enabled true

# Container Apps Environment
az containerapp env create --name $ENV --resource-group $RG --location $LOCATION
```

## Activer le déploiement automatique

Une fois Azure provisionné, décommenter dans `.github/workflows/cd.yml` :

```yaml
# push:
#   branches: [main]
```
