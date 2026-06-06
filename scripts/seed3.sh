#!/bin/bash
# seed3.sh — Seed complet OptiFlow
# Villes: Casablanca, Rabat, Kénitra, Marrakech
# ~90 entrées au total, 10 incidents, 8 annulations, 1 conv/chauffeur

set -e

KC="http://localhost:8180/realms/optiflow/protocol/openid-connect/token"
CID="optiflow-web"
CSEC="optiflow-web-secret-change-in-prod"
CLIENT="http://localhost:3001/api/v1/clients"
OP="http://localhost:8091/api/v1/operateur"
RESP="http://localhost:8094/api/v1/responsable"
CHAUF="http://localhost:3002/api/v1/chauffeur"
ADMIN="http://localhost:8082/api/v1/admin"

get_token() {
  curl -s -X POST "$KC" -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=$CID" \
    --data-urlencode "client_secret=$CSEC" \
    --data-urlencode "username=$1" \
    --data-urlencode "password=password123" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4
}
jq_id() { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

echo "==> [1/10] Tokens..."
T_C1=$(get_token client1)
T_C2=$(get_token client2)
T_C3=$(get_token client3)
T_OP=$(get_token operateur1)
T_ADM=$(get_token admin1)
T_RE=$(get_token responsable1)
T_CH1=$(get_token chauffeur1)
T_CH2=$(get_token chauffeur2)

CH1_ID=$(echo "$T_CH1" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"sub":"[^"]*"' | cut -d'"' -f4)
CH2_ID=$(echo "$T_CH2" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"sub":"[^"]*"' | cut -d'"' -f4)
echo "    chauffeur1=$CH1_ID"
echo "    chauffeur2=$CH2_ID"

# ----------------------------------------------------------------
echo "==> [2/10] Types de véhicules..."
VT_RESP=$(curl -s "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_ADM")
VT_ID=$(jq_id "$VT_RESP")
if [ -z "$VT_ID" ]; then
  curl -s -X POST "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_ADM" -H "Content-Type: application/json" \
    -d '{"name":"Berline","description":"Véhicule berline standard","capacity":1,"active":true}' > /dev/null
  curl -s -X POST "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_ADM" -H "Content-Type: application/json" \
    -d '{"name":"SUV","description":"SUV 4x4","capacity":1,"active":true}' > /dev/null
  curl -s -X POST "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_ADM" -H "Content-Type: application/json" \
    -d '{"name":"Utilitaire","description":"Camionnette utilitaire","capacity":3,"active":true}' > /dev/null
  echo "    Types créés"
else
  echo "    Types existants"
fi

# ----------------------------------------------------------------
echo "==> [3/10] Commandes clients (24 commandes)..."

do_order() {
  local token="$1" date="$2" street="$3" city="$4" qty="${5:-1}" model="${6:-Model Y}"
  local body
  body=$(printf '{"vehicles":[{"vehicleModelLabel":"%s","quantity":%s}],"requestedDeliveryDate":"%s","deliveryAddress":{"street":"%s","city":"%s","postalCode":"20000","country":"Maroc"}}' \
    "$model" "$qty" "$date" "$street" "$city")
  curl -s -X POST "$CLIENT/me/orders" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$body"
}

# Client1 — 10 commandes
R1=$(do_order "$T_C1" "2026-06-05" "Bd Mohammed V Lot 14" "Casablanca" 1 "Model Y")
R1_ID=$(jq_id "$R1"); echo "  C1-01: $R1_ID"
R2=$(do_order "$T_C1" "2026-06-07" "Zone Industrielle Ain Sebaa" "Casablanca" 2 "Model 3")
R2_ID=$(jq_id "$R2"); echo "  C1-02: $R2_ID"
R3=$(do_order "$T_C1" "2026-06-09" "Av Hassan II Bloc A" "Casablanca" 1 "Model Y")
R3_ID=$(jq_id "$R3"); echo "  C1-03: $R3_ID"
R4=$(do_order "$T_C1" "2026-06-12" "Route de Rabat Km 5" "Casablanca" 1 "Model X")
R4_ID=$(jq_id "$R4"); echo "  C1-04: $R4_ID"
R5=$(do_order "$T_C1" "2026-06-15" "Zone Franche Casablanca Sud" "Casablanca" 2 "Model 3")
R5_ID=$(jq_id "$R5"); echo "  C1-05: $R5_ID"
R6=$(do_order "$T_C1" "2026-06-18" "Bd Zerktouni Tour A" "Casablanca" 1 "Model Y")
R6_ID=$(jq_id "$R6"); echo "  C1-06: $R6_ID"
R7=$(do_order "$T_C1" "2026-06-20" "Ain Chock Secteur 4" "Casablanca" 1 "Model S")
R7_ID=$(jq_id "$R7"); echo "  C1-07: $R7_ID"
R8=$(do_order "$T_C1" "2026-06-22" "Hay Hassani Rue 12" "Casablanca" 1 "Model Y")
R8_ID=$(jq_id "$R8"); echo "  C1-08: $R8_ID"
R9=$(do_order "$T_C1" "2026-06-25" "Sidi Bernoussi Lot 7" "Casablanca" 2 "Model 3")
R9_ID=$(jq_id "$R9"); echo "  C1-09: $R9_ID"
R10=$(do_order "$T_C1" "2026-06-28" "Bd Anfa Résidence Le Parc" "Casablanca" 1 "Model X")
R10_ID=$(jq_id "$R10"); echo "  C1-10: $R10_ID"

# Client2 — 9 commandes
R11=$(do_order "$T_C2" "2026-06-06" "Av Mohammed V Centre" "Rabat" 1 "Model Y")
R11_ID=$(jq_id "$R11"); echo "  C2-11: $R11_ID"
R12=$(do_order "$T_C2" "2026-06-08" "Hay Riad Secteur 10" "Rabat" 2 "Model 3")
R12_ID=$(jq_id "$R12"); echo "  C2-12: $R12_ID"
R13=$(do_order "$T_C2" "2026-06-10" "Agdal Rue Ibn Battouta" "Rabat" 1 "Model X")
R13_ID=$(jq_id "$R13"); echo "  C2-13: $R13_ID"
R14=$(do_order "$T_C2" "2026-06-13" "Bd Hassan II Souissi" "Rabat" 1 "Model Y")
R14_ID=$(jq_id "$R14"); echo "  C2-14: $R14_ID"
R15=$(do_order "$T_C2" "2026-06-16" "Zone Industrielle Salé" "Rabat" 2 "Model S")
R15_ID=$(jq_id "$R15"); echo "  C2-15: $R15_ID"
R16=$(do_order "$T_C2" "2026-06-19" "Kenitra Port ZI Nord" "Kénitra" 1 "Model Y")
R16_ID=$(jq_id "$R16"); echo "  C2-16: $R16_ID"
R17=$(do_order "$T_C2" "2026-06-21" "Bd Mohammed Diouri Centre" "Kénitra" 1 "Model 3")
R17_ID=$(jq_id "$R17"); echo "  C2-17: $R17_ID"
R18=$(do_order "$T_C2" "2026-06-23" "Zone Franche Kenitra Atlantic" "Kénitra" 2 "Model Y")
R18_ID=$(jq_id "$R18"); echo "  C2-18: $R18_ID"
R19=$(do_order "$T_C2" "2026-06-26" "Av Bir Anzarane Lot 3" "Kénitra" 1 "Model X")
R19_ID=$(jq_id "$R19"); echo "  C2-19: $R19_ID"

# Client3 — 9 commandes
R20=$(do_order "$T_C3" "2026-06-05" "Bd Mohammed VI Gueliz" "Marrakech" 1 "Model Y")
R20_ID=$(jq_id "$R20"); echo "  C3-20: $R20_ID"
R21=$(do_order "$T_C3" "2026-06-07" "Zone Industrielle Sidi Ghanem" "Marrakech" 2 "Model 3")
R21_ID=$(jq_id "$R21"); echo "  C3-21: $R21_ID"
R22=$(do_order "$T_C3" "2026-06-10" "Route de Casablanca Km 8" "Marrakech" 1 "Model X")
R22_ID=$(jq_id "$R22"); echo "  C3-22: $R22_ID"
R23=$(do_order "$T_C3" "2026-06-14" "Av Yacoub El Mansour Majorelle" "Marrakech" 1 "Model S")
R23_ID=$(jq_id "$R23"); echo "  C3-23: $R23_ID"
R24=$(do_order "$T_C3" "2026-06-17" "Hivernage Av Echouhada" "Marrakech" 2 "Model Y")
R24_ID=$(jq_id "$R24"); echo "  C3-24: $R24_ID"
R25=$(do_order "$T_C3" "2026-06-20" "Zone Technopolis Mghogha" "Marrakech" 1 "Model 3")
R25_ID=$(jq_id "$R25"); echo "  C3-25: $R25_ID"
R26=$(do_order "$T_C3" "2026-06-23" "Bd Allal Al Fassi Menara" "Marrakech" 1 "Model Y")
R26_ID=$(jq_id "$R26"); echo "  C3-26: $R26_ID"
R27=$(do_order "$T_C3" "2026-06-25" "Tensift ZI Route Ait Ourir" "Marrakech" 2 "Model X")
R27_ID=$(jq_id "$R27"); echo "  C3-27: $R27_ID"
R28=$(do_order "$T_C3" "2026-06-28" "Palmeraie Circuit Touristique" "Marrakech" 1 "Model S")
R28_ID=$(jq_id "$R28"); echo "  C3-28: $R28_ID"

# ----------------------------------------------------------------
echo "==> [4/10] Validation opérateur (toutes les commandes)..."
validate_order() {
  [ -z "$1" ] && return
  curl -s -X POST "$OP/orders/$1/validate" -H "Authorization: Bearer $T_OP" \
    -H "Content-Type: application/json" -d '{"notes":"Véhicule conforme aux spécifications"}' > /dev/null
  echo "  Validée: $1"
}
for oid in $R1_ID $R2_ID $R3_ID $R4_ID $R5_ID $R6_ID $R7_ID $R8_ID $R9_ID $R10_ID \
           $R11_ID $R12_ID $R13_ID $R14_ID $R15_ID $R16_ID $R17_ID $R18_ID $R19_ID \
           $R20_ID $R21_ID $R22_ID $R23_ID $R24_ID $R25_ID $R26_ID $R27_ID $R28_ID; do
  validate_order "$oid"
done
sleep 3

# ----------------------------------------------------------------
echo "==> [5/10] Tournées (10 tournées)..."

mk_tournee() {
  local orders="$1" date="$2" notes="$3"
  curl -s -X POST "$OP/tournees" -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" \
    -d "{\"orderIds\":$orders,\"plannedDate\":\"$date\",\"notes\":\"$notes\"}"
}

TT1=$(mk_tournee "[\"$R1_ID\",\"$R2_ID\",\"$R3_ID\"]" "2026-06-05" "Casablanca Centre — 3 livraisons")
TT1_ID=$(jq_id "$TT1"); echo "  T1: $TT1_ID"

TT2=$(mk_tournee "[\"$R4_ID\",\"$R5_ID\"]" "2026-06-07" "Casablanca Sud — 2 livraisons")
TT2_ID=$(jq_id "$TT2"); echo "  T2: $TT2_ID"

TT3=$(mk_tournee "[\"$R11_ID\",\"$R12_ID\",\"$R13_ID\"]" "2026-06-06" "Rabat Agdal & Hay Riad")
TT3_ID=$(jq_id "$TT3"); echo "  T3: $TT3_ID"

TT4=$(mk_tournee "[\"$R14_ID\",\"$R15_ID\"]" "2026-06-09" "Rabat Souissi & Salé")
TT4_ID=$(jq_id "$TT4"); echo "  T4: $TT4_ID"

TT5=$(mk_tournee "[\"$R20_ID\",\"$R21_ID\"]" "2026-06-05" "Marrakech Gueliz & Sidi Ghanem")
TT5_ID=$(jq_id "$TT5"); echo "  T5: $TT5_ID"

TT6=$(mk_tournee "[\"$R22_ID\",\"$R23_ID\"]" "2026-06-10" "Marrakech Route Casa & Majorelle")
TT6_ID=$(jq_id "$TT6"); echo "  T6: $TT6_ID"

TT7=$(mk_tournee "[\"$R6_ID\",\"$R7_ID\"]" "2026-06-12" "Casablanca Zerktouni & Ain Chock")
TT7_ID=$(jq_id "$TT7"); echo "  T7: $TT7_ID"

TT8=$(mk_tournee "[\"$R16_ID\",\"$R17_ID\"]" "2026-06-14" "Kénitra Port & Centre")
TT8_ID=$(jq_id "$TT8"); echo "  T8: $TT8_ID"

TT9=$(mk_tournee "[\"$R24_ID\",\"$R25_ID\"]" "2026-06-15" "Marrakech Hivernage & Technopolis")
TT9_ID=$(jq_id "$TT9"); echo "  T9: $TT9_ID"

TT10=$(mk_tournee "[\"$R8_ID\",\"$R9_ID\"]" "2026-06-18" "Casablanca Hay Hassani & Sidi Bernoussi")
TT10_ID=$(jq_id "$TT10"); echo "  T10: $TT10_ID"

# ----------------------------------------------------------------
echo "==> [6/10] Assignation chauffeurs + soumission..."
assign_submit() {
  local tid="$1" chid="$2" chname="$3"
  [ -z "$tid" ] && return
  curl -s -X PATCH "$OP/tournees/$tid/assign-chauffeur" \
    -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" \
    -d "{\"chauffeurId\":\"$chid\",\"chauffeurName\":\"$chname\"}" > /dev/null
  curl -s -X PATCH "$OP/tournees/$tid/submit" \
    -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" > /dev/null
  echo "  Assigné+soumis: $tid → $chname"
}
assign_submit "$TT1_ID" "$CH1_ID" "Karim Idrissi"
assign_submit "$TT2_ID" "$CH1_ID" "Karim Idrissi"
assign_submit "$TT3_ID" "$CH2_ID" "Hassan Tazi"
assign_submit "$TT4_ID" "$CH2_ID" "Hassan Tazi"
assign_submit "$TT5_ID" "$CH1_ID" "Karim Idrissi"
assign_submit "$TT6_ID" "$CH2_ID" "Hassan Tazi"
assign_submit "$TT7_ID" "$CH1_ID" "Karim Idrissi"
assign_submit "$TT8_ID" "$CH2_ID" "Hassan Tazi"
assign_submit "$TT9_ID" "$CH1_ID" "Karim Idrissi"
assign_submit "$TT10_ID" "$CH2_ID" "Hassan Tazi"
sleep 2

# ----------------------------------------------------------------
echo "==> [7/10] Validation responsable (8/10 tournées)..."
resp_val() {
  [ -z "$1" ] && return
  curl -s -X PATCH "$RESP/tournees/$1/validate" \
    -H "Authorization: Bearer $T_RE" -H "Content-Type: application/json" > /dev/null
  echo "  Validée responsable: $1"
}
resp_val "$TT1_ID"
resp_val "$TT2_ID"
resp_val "$TT3_ID"
resp_val "$TT4_ID"
resp_val "$TT5_ID"
resp_val "$TT6_ID"
resp_val "$TT7_ID"
resp_val "$TT8_ID"
# TT9 et TT10 restent en attente de validation
sleep 4

# ----------------------------------------------------------------
echo "==> [8/10] Missions — acknowledge/start/complete..."

# Récupérer missions par chauffeur
MISSIONS_CH1=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH1")
MISSIONS_CH2=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH2")

get_mission() { echo "$1" | grep -o '"id":"[^"]*"' | sed -n "${2}p" | cut -d'"' -f4; }

M1_1=$(get_mission "$MISSIONS_CH1" 1)
M1_2=$(get_mission "$MISSIONS_CH1" 2)
M1_3=$(get_mission "$MISSIONS_CH1" 3)
M1_4=$(get_mission "$MISSIONS_CH1" 4)
M2_1=$(get_mission "$MISSIONS_CH2" 1)
M2_2=$(get_mission "$MISSIONS_CH2" 2)
M2_3=$(get_mission "$MISSIONS_CH2" 3)
M2_4=$(get_mission "$MISSIONS_CH2" 4)

echo "  CH1 missions: $M1_1 $M1_2 $M1_3 $M1_4"
echo "  CH2 missions: $M2_1 $M2_2 $M2_3 $M2_4"

complete_mission() {
  local mid="$1" tok="$2" notes="$3"
  [ -z "$mid" ] && return
  curl -s -X POST "$CHAUF/missions/$mid/acknowledge" -H "Authorization: Bearer $tok" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/start" -H "Authorization: Bearer $tok" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/complete" -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "{\"notes\":\"$notes\"}" > /dev/null
  echo "  Terminée: $mid"
}

start_mission() {
  local mid="$1" tok="$2"
  [ -z "$mid" ] && return
  curl -s -X POST "$CHAUF/missions/$mid/acknowledge" -H "Authorization: Bearer $tok" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/start" -H "Authorization: Bearer $tok" > /dev/null
  echo "  En cours: $mid"
}

# Terminer 3 missions ch1 + 2 missions ch2
complete_mission "$M1_1" "$T_CH1" "Livraisons Casablanca Centre effectuées — clients présents — véhicules en parfait état"
complete_mission "$M1_2" "$T_CH1" "Tournée Casablanca Sud terminée — aucun incident"
complete_mission "$M1_3" "$T_CH1" "Marrakech Gueliz livré — 2 véhicules remis au client avec documents signés"
complete_mission "$M2_1" "$T_CH2" "Rabat Agdal & Hay Riad — livraisons conformes — bon de livraison signé"
complete_mission "$M2_2" "$T_CH2" "Rabat Souissi & Salé — tout livré sans anomalie"
complete_mission "$M2_3" "$T_CH2" "Marrakech Route Casa & Majorelle — mission terminée avec 30 min d'avance"

# Mettre 1 mission en cours par chauffeur
start_mission "$M1_4" "$T_CH1"
start_mission "$M2_4" "$T_CH2"

# IMPORTANT: sauvegarder les missionIds actifs pour les messages
# M1_4 = mission active de CH1 (on utilisera cette conversation)
# M2_4 = mission active de CH2

# ----------------------------------------------------------------
echo "==> [9/10] Messages — 1 conversation par chauffeur..."

op_msg() {
  local mid="$1" chid="$2" msg="$3"
  [ -z "$mid" ] && return
  curl -s -X POST "$OP/messages/mission/$mid/reply" \
    -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" \
    -d "{\"chauffeurId\":\"$chid\",\"content\":\"$msg\"}" > /dev/null
}
ch_msg() {
  local mid="$1" tok="$2" msg="$3"
  [ -z "$mid" ] && return
  curl -s -X POST "$CHAUF/messages" \
    -H "Authorization: Bearer $tok" -H "Content-Type: application/json" \
    -d "{\"missionId\":\"$mid\",\"content\":\"$msg\"}" > /dev/null
}

# Conversation CH1 (Karim Idrissi) — sur sa mission active
if [ -n "$M1_4" ]; then
  op_msg "$M1_4" "$CH1_ID" "Bonjour Karim, aujourd'hui 2 livraisons Casablanca: Hay Hassani puis Sidi Bernoussi."
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Bonjour, message reçu. Je pars de l'entrepôt dans 15 min."
  sleep 1
  op_msg "$M1_4" "$CH1_ID" "Parfait. Priorité Hay Hassani car le client a un créneau 10h-12h uniquement."
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Compris. Documents prêts, camion chargé. Je confirme l'arrivée."
  sleep 1
  op_msg "$M1_4" "$CH1_ID" "Super. N'oubliez pas de faire signer le bon de livraison et de prendre une photo."
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Premier arrêt OK. Client satisfait, 2 véhicules livrés. En route pour Sidi Bernoussi."
  sleep 1
  op_msg "$M1_4" "$CH1_ID" "Excellent travail! Vous êtes dans les temps pour le second arrêt?"
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Oui, arrivée estimée 14h30. Tout se passe bien."
  echo "  Messages CH1 envoyés"
fi

# Conversation CH2 (Hassan Tazi) — sur sa mission active
if [ -n "$M2_4" ]; then
  op_msg "$M2_4" "$CH2_ID" "Bonjour Hassan, 2 livraisons Kénitra: Port ZI puis Centre-ville."
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Bonjour, reçu 5/5. Je connais bien la zone Kénitra."
  sleep 1
  op_msg "$M2_4" "$CH2_ID" "Parfait. Pour le Port ZI, badge d'accès: KZ-2024. Présentez-le à l'entrée."
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Noté. Je suis devant l'entrée du port. Contrôle en cours."
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Accès accordé. Livraison Port ZI en cours, 3 véhicules."
  sleep 1
  op_msg "$M2_4" "$CH2_ID" "Bien. Le client centre-ville vous attend après 15h. Vous avez le temps?"
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Oui, Port terminé à 13h30. Large. Je serai centre 14h30."
  sleep 1
  op_msg "$M2_4" "$CH2_ID" "Parfait Hassan. Bonne continuation!"
  echo "  Messages CH2 envoyés"
fi

# ----------------------------------------------------------------
echo "==> [10/10] Incidents (10) + Annulations (8)..."

do_incident() {
  local tok="$1" oid="$2" desc="$3" sev="$4"
  local body
  if [ -n "$oid" ]; then
    body=$(printf '{"orderId":"%s","description":"%s","severity":"%s"}' "$oid" "$desc" "$sev")
  else
    body=$(printf '{"description":"%s","severity":"%s"}' "$desc" "$sev")
  fi
  curl -s -X POST "$CLIENT/me/incidents" -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "$body" > /dev/null
}

# 10 incidents répartis sur les 3 clients
do_incident "$T_C1" "$R1_ID" "Retard de livraison supérieur à 3h sans notification préalable" "MEDIUM"
do_incident "$T_C1" "$R2_ID" "Véhicule livré avec une rayure sur la carrosserie côté conducteur" "HIGH"
do_incident "$T_C1" "$R3_ID" "Chauffeur injoignable pendant 2h lors de la livraison Casablanca" "LOW"
do_incident "$T_C1" "" "Bon de livraison manquant pour 2 véhicules de la commande" "MEDIUM"
do_incident "$T_C2" "$R11_ID" "Adresse de livraison incorrecte sur le bon de transport Rabat" "LOW"
do_incident "$T_C2" "$R12_ID" "Véhicule livré avec un pneu sous-gonflé — pression 1.2 bar" "HIGH"
do_incident "$T_C2" "$R14_ID" "Clés de véhicule non remises au moment de la livraison Souissi" "HIGH"
do_incident "$T_C3" "$R20_ID" "Documentation technique incomplète — carte grise provisoire manquante" "MEDIUM"
do_incident "$T_C3" "$R21_ID" "Délai de livraison non respecté sur tournée Marrakech Sidi Ghanem" "MEDIUM"
do_incident "$T_C3" "$R22_ID" "Véhicule livré sans protection siège — intérieur taché" "LOW"
echo "  10 incidents créés"

# 8 annulations — uniquement sur des commandes VALIDATED non encore assignées
# Utiliser des commandes futures (TT9 et TT10 pas encore validées par responsable)
# R26, R27, R28, R10, R18, R19, R9, R8 sont dans des tournées non validées ou à venir
do_cancel() {
  local tok="$1" oid="$2" reason="$3"
  [ -z "$oid" ] && return
  curl -s -X POST "$CLIENT/me/orders/$oid/cancel" \
    -H "Authorization: Bearer $tok" -H "Content-Type: application/json" \
    -d "{\"reason\":\"$reason\"}" > /dev/null
  echo "  Annulation demandée: $oid"
}

do_cancel "$T_C3" "$R26_ID" "Changement de planning interne — livraison reportée au mois prochain"
do_cancel "$T_C3" "$R27_ID" "Révision des besoins — réduction du parc prévu à Marrakech"
do_cancel "$T_C3" "$R28_ID" "Budget non approuvé pour ce trimestre — commande suspendue"
do_cancel "$T_C1" "$R10_ID" "Client a trouvé un fournisseur local plus rapide"
do_cancel "$T_C1" "$R9_ID" "Erreur dans la commande — mauvais modèle de véhicule sélectionné"
do_cancel "$T_C2" "$R18_ID" "Zone de livraison Kénitra Atlantic non confirmée — report demandé"
do_cancel "$T_C2" "$R19_ID" "Contrat client suspendu — en attente de renouvellement"
do_cancel "$T_C1" "$R8_ID" "Modification de spécifications — nouvelle commande sera soumise"
echo "  8 annulations demandées"

echo ""
echo "=================================================================="
echo "  SEED3 TERMINÉ"
echo "  28 commandes | 10 tournées | 8 validées responsable"
echo "  6 missions terminées | 2 en cours"
echo "  1 conversation par chauffeur (messages sur mission active)"
echo "  10 incidents | 8 annulations"
echo "  Villes: Casablanca, Rabat, Kénitra, Marrakech"
echo "=================================================================="
