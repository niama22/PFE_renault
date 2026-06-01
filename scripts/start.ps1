# ================================================================
# OptiFlow - Script de démarrage (Windows PowerShell)
# ================================================================

param(
    [string]$Action = "up",
    [switch]$Fresh
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "  >> $Message" -ForegroundColor Yellow
}

switch ($Action) {
    "up" {
        Write-Header "Démarrage OptiFlow Infrastructure"

        if ($Fresh) {
            Write-Step "Nettoyage des volumes existants..."
            docker compose down -v --remove-orphans 2>$null
        }

        Write-Step "Démarrage des services..."
        docker compose up -d

        Write-Header "Services démarrés - URLs d'accès"
        Write-Host "  Kong Proxy      : http://localhost:8000" -ForegroundColor Green
        Write-Host "  Kong Admin API  : http://localhost:8001" -ForegroundColor Green
        Write-Host "  Keycloak        : http://localhost:8180" -ForegroundColor Green
        Write-Host "  Kafka UI        : http://localhost:8090" -ForegroundColor Green
        Write-Host "  PostgreSQL      : localhost:5432" -ForegroundColor Green
        Write-Host "  Redis           : localhost:6379" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Keycloak Admin  : admin / Keycloak@Admin2024" -ForegroundColor Magenta
        Write-Host "  Realm           : optiflow" -ForegroundColor Magenta
        Write-Host ""
    }

    "down" {
        Write-Header "Arrêt OptiFlow Infrastructure"
        docker compose down
        Write-Host "Services arrêtés." -ForegroundColor Green
    }

    "clean" {
        Write-Header "Nettoyage complet (volumes inclus)"
        $confirm = Read-Host "Supprimer tous les volumes (données perdues)? (oui/non)"
        if ($confirm -eq "oui") {
            docker compose down -v --remove-orphans
            Write-Host "Nettoyage terminé." -ForegroundColor Green
        }
    }

    "status" {
        Write-Header "Statut des services"
        docker compose ps
    }

    "logs" {
        Write-Header "Logs en temps réel"
        docker compose logs -f
    }

    "keycloak-logs" {
        docker compose logs -f keycloak
    }

    "kafka-topics" {
        Write-Header "Topics Kafka"
        docker compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
    }

    "test-kong" {
        Write-Header "Test Kong API Gateway"
        Write-Step "Health check Kong..."
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8001/status" -Method Get
            Write-Host "  Kong Status: OK" -ForegroundColor Green
            Write-Host "  Version: $($response.version)" -ForegroundColor Green
        } catch {
            Write-Host "  Kong non accessible: $_" -ForegroundColor Red
        }
    }

    "test-keycloak" {
        Write-Header "Test Keycloak"
        Write-Step "Health check Keycloak..."
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8180/health/ready" -Method Get
            Write-Host "  Keycloak Status: $($response.status)" -ForegroundColor Green
        } catch {
            Write-Host "  Keycloak non accessible: $_" -ForegroundColor Red
        }

        Write-Step "Test du realm optiflow..."
        try {
            $realm = Invoke-RestMethod -Uri "http://localhost:8180/realms/optiflow/.well-known/openid-configuration" -Method Get
            Write-Host "  Realm optiflow: ACTIF" -ForegroundColor Green
            Write-Host "  JWKS URI: $($realm.jwks_uri)" -ForegroundColor Cyan
        } catch {
            Write-Host "  Realm optiflow non disponible (Keycloak en cours de démarrage?)" -ForegroundColor Yellow
        }
    }

    default {
        Write-Host "Usage: .\scripts\start.ps1 [-Action <action>] [-Fresh]"
        Write-Host ""
        Write-Host "Actions disponibles:"
        Write-Host "  up           - Démarrer l'infrastructure"
        Write-Host "  down         - Arrêter l'infrastructure"
        Write-Host "  clean        - Arrêter et supprimer les volumes"
        Write-Host "  status       - Afficher le statut des services"
        Write-Host "  logs         - Afficher les logs en temps réel"
        Write-Host "  keycloak-logs - Logs Keycloak uniquement"
        Write-Host "  kafka-topics - Lister les topics Kafka"
        Write-Host "  test-kong    - Tester Kong API Gateway"
        Write-Host "  test-keycloak - Tester Keycloak + realm"
        Write-Host ""
        Write-Host "Options:"
        Write-Host "  -Fresh       - Supprimer les volumes avant démarrage (avec up)"
    }
}
