# OptiFlow Driver — Application Mobile Chauffeur

App React Native (Expo) pour les chauffeurs OptiFlow.

## Installation

```bash
cd frontend/mobile
npm install
```

## Configuration

Avant de lancer, modifiez `src/api/client.ts` :

```ts
export const API_BASE = 'http://<VOTRE_IP>:8000';     // Kong gateway
export const KEYCLOAK_URL = 'http://<VOTRE_IP>:8180'; // Keycloak
```

Remplacez `<VOTRE_IP>` par l'IP de votre machine sur le réseau local  
(ex : `192.168.1.100`). Ne pas utiliser `localhost` sur device physique.

## Lancer l'app

```bash
# Démarrer Expo
npx expo start

# Puis scanner le QR code avec l'app Expo Go (Android/iOS)
# ou presser 'a' pour émulateur Android, 'i' pour iOS simulator
```

## Fonctionnalités

| Écran | Description |
|-------|-------------|
| **Login** | Connexion Keycloak (identifiant + mot de passe) |
| **PIN** | Code PIN 4 chiffres + biométrie (Face ID / empreinte) |
| **Missions** | Liste des missions actives avec statuts en temps réel |
| **Détail mission** | Accuser réception → Démarrer → Terminer + notes |
| **Signaler incident** | 8 types prédéfinis + sévérité + détails |
| **Messagerie** | Chat en temps réel avec l'opérateur (par mission) |
| **Historique** | Missions terminées + statistiques (taux, durée moy.) |

## Flux chauffeur

```
PENDING → [Accuser réception] → ACKNOWLEDGED → [Démarrer] → IN_PROGRESS → [Terminer] → COMPLETED
```

## Comptes de test Keycloak

Créez un compte avec le rôle `chauffeur` dans le realm `optiflow`.
