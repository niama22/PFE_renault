#!/bin/bash
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

echo "==> [1/8] Tokens..."
T_C1=$(get_token client1)
T_C2=$(get_token client2)
T_C3=$(get_token client3)
T_OP=$(get_token operateur1)
T_RE=$(get_token responsable1)
T_CH1=$(get_token chauffeur1)
T_CH2=$(get_token chauffeur2)

CH1_ID=$(echo "$T_CH1" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"sub":"[^"]*"' | cut -d'"' -f4)
CH2_ID=$(echo "$T_CH2" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"sub":"[^"]*"' | cut -d'"' -f4)
echo "    chauffeur1=$CH1_ID"
echo "    chauffeur2=$CH2_ID"

echo "==> [2/8] Vehicle types..."
VT_RESP=$(curl -s "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_OP")
VT_ID=$(jq_id "$VT_RESP")
if [ -z "$VT_ID" ]; then
  echo "    Creation vehicle types..."
  curl -s -X POST "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" \
    -d '{"name":"Berline","description":"Vehicule standard","capacity":1,"active":true}' > /dev/null
  curl -s -X POST "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" \
    -d '{"name":"SUV","description":"Vehicule SUV","capacity":1,"active":true}' > /dev/null
  curl -s -X POST "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" \
    -d '{"name":"Utilitaire","description":"Camionnette","capacity":3,"active":true}' > /dev/null
fi

echo "==> [3/8] Commandes clients..."

do_order() {
  local token="$1" date="$2" street="$3" city="$4" qty="${5:-1}"
  local body
  body=$(printf '{"vehicles":[{"vehicleModelLabel":"Model Y","quantity":%s}],"requestedDeliveryDate":"%s","deliveryAddress":{"street":"%s","city":"%s","postalCode":"90000","country":"Maroc"}}' "$qty" "$date" "$street" "$city")
  curl -s -X POST "$CLIENT/me/orders" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$body"
}

O1=$(do_order "$T_C1" "2026-06-10" "Zone Franche Port Lot 12" "Tanger" 1)
O1_ID=$(jq_id "$O1"); echo "    C1-O1: $O1_ID"

O2=$(do_order "$T_C1" "2026-06-11" "Km 10 Route Nationale N1" "Tanger" 1)
O2_ID=$(jq_id "$O2"); echo "    C1-O2: $O2_ID"

O3=$(do_order "$T_C1" "2026-06-12" "Rue des Industries Mghogha" "Tanger" 2)
O3_ID=$(jq_id "$O3"); echo "    C1-O3: $O3_ID"

O4=$(do_order "$T_C1" "2026-06-15" "Boulevard Mohamed VI" "Tanger" 1)
O4_ID=$(jq_id "$O4"); echo "    C1-O4: $O4_ID"

O5=$(do_order "$T_C1" "2026-06-17" "Zone Industrielle Gzenaya" "Tanger" 1)
O5_ID=$(jq_id "$O5"); echo "    C1-O5: $O5_ID"

O6=$(do_order "$T_C2" "2026-06-10" "Renault Tanger Med Zone Port" "Tanger Med" 1)
O6_ID=$(jq_id "$O6"); echo "    C2-O6: $O6_ID"

O7=$(do_order "$T_C2" "2026-06-12" "Rue Sidi Bou Abib 45" "Tanger" 1)
O7_ID=$(jq_id "$O7"); echo "    C2-O7: $O7_ID"

O8=$(do_order "$T_C2" "2026-06-14" "Av Prince Heritier" "Tetouan" 2)
O8_ID=$(jq_id "$O8"); echo "    C2-O8: $O8_ID"

O9=$(do_order "$T_C2" "2026-06-16" "Zone Industrielle Martil" "Martil" 1)
O9_ID=$(jq_id "$O9"); echo "    C2-O9: $O9_ID"

O10=$(do_order "$T_C3" "2026-06-11" "Boulevard Abdelkrim Khattabi" "Fnideq" 1)
O10_ID=$(jq_id "$O10"); echo "    C3-O10: $O10_ID"

O11=$(do_order "$T_C3" "2026-06-13" "Route Nationale 2 Km 52" "Chefchaouen" 1)
O11_ID=$(jq_id "$O11"); echo "    C3-O11: $O11_ID"

O12=$(do_order "$T_C3" "2026-06-15" "Port de Tanger Terminal Ro-Ro" "Tanger" 2)
O12_ID=$(jq_id "$O12"); echo "    C3-O12: $O12_ID"

echo "==> [4/8] Validation commandes (operateur)..."
validate_order() {
  [ -z "$1" ] && return
  curl -s -X POST "$OP/orders/$1/validate" -H "Authorization: Bearer $T_OP" \
    -H "Content-Type: application/json" -d '{"notes":"Validee — vehicule conforme"}' > /dev/null
  echo "    Validee: $1"
}
for oid in $O1_ID $O2_ID $O3_ID $O4_ID $O5_ID $O6_ID $O7_ID $O8_ID $O9_ID $O10_ID $O11_ID $O12_ID; do
  validate_order "$oid"
done
sleep 2

echo "==> [5/8] Creation tournees..."
do_tournee() {
  local date="$1" notes="$2"
  local body
  body=$(printf '{"plannedDate":"%s","operatorNotes":"%s"}' "$date" "$notes")
  curl -s -X POST "$OP/tournees" -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" -d "$body"
}

TT1=$(do_tournee "2026-06-10" "Livraisons zone Tanger 10 juin")
TT1_ID=$(jq_id "$TT1"); echo "    T1: $TT1_ID"

TT2=$(do_tournee "2026-06-11" "Livraisons nord Maroc 11 juin")
TT2_ID=$(jq_id "$TT2"); echo "    T2: $TT2_ID"

TT3=$(do_tournee "2026-06-12" "Tournee Tanger Med 12 juin")
TT3_ID=$(jq_id "$TT3"); echo "    T3: $TT3_ID"

TT4=$(do_tournee "2026-06-14" "Tournee Tetouan 14 juin")
TT4_ID=$(jq_id "$TT4"); echo "    T4: $TT4_ID"

TT5=$(do_tournee "2026-06-15" "Livraisons region 15 juin")
TT5_ID=$(jq_id "$TT5"); echo "    T5: $TT5_ID"

echo "==> [6/8] Assignation chauffeurs + soumission..."
assign_submit() {
  local tid="$1" chid="$2" chname="$3"
  [ -z "$tid" ] && return
  local body
  body=$(printf '{"chauffeurId":"%s","chauffeurName":"%s"}' "$chid" "$chname")
  curl -s -X PATCH "$OP/tournees/$tid/assign-chauffeur" -H "Authorization: Bearer $T_OP" \
    -H "Content-Type: application/json" -d "$body" > /dev/null
  curl -s -X PATCH "$OP/tournees/$tid/submit" -H "Authorization: Bearer $T_OP" \
    -H "Content-Type: application/json" > /dev/null
  echo "    Assigne+soumis: $tid -> $chname"
}
assign_submit "$TT1_ID" "$CH1_ID" "chauffeur1"
assign_submit "$TT2_ID" "$CH2_ID" "chauffeur2"
assign_submit "$TT3_ID" "$CH1_ID" "chauffeur1"
assign_submit "$TT4_ID" "$CH2_ID" "chauffeur2"
assign_submit "$TT5_ID" "$CH1_ID" "chauffeur1"
sleep 2

echo "==> [7/8] Validation responsable (3 sur 5)..."
resp_validate() {
  local tid="$1"
  [ -z "$tid" ] && return
  local R
  R=$(curl -s -X PATCH "$RESP/tournees/$tid/validate" -H "Authorization: Bearer $T_RE" \
    -H "Content-Type: application/json")
  echo "    Valide responsable: $tid"
}
resp_validate "$TT1_ID"
resp_validate "$TT2_ID"
resp_validate "$TT3_ID"
sleep 3

echo "==> [8/8] Missions + Messages + Incidents..."

MISSIONS_CH1=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH1")
MISSIONS_CH2=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH2")
M1=$(echo "$MISSIONS_CH1" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
M2=$(echo "$MISSIONS_CH1" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
M3=$(echo "$MISSIONS_CH2" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
echo "    M1(ch1): $M1  M2(ch1): $M2  M3(ch2): $M3"

mission_complete() {
  local mid="$1" tok="$2" notes="$3"
  [ -z "$mid" ] && return
  curl -s -X POST "$CHAUF/missions/$mid/acknowledge" -H "Authorization: Bearer $tok" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/start" -H "Authorization: Bearer $tok" > /dev/null
  sleep 1
  local body
  body=$(printf '{"notes":"%s"}' "$notes")
  curl -s -X POST "$CHAUF/missions/$mid/complete" -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "$body" > /dev/null
  echo "    Mission complete: $mid"
}

if [ -n "$M1" ]; then
  mission_complete "$M1" "$T_CH1" "Livraison effectuee client present vehicules en bon etat"
fi
if [ -n "$M3" ]; then
  mission_complete "$M3" "$T_CH2" "RAS livraison conforme au bon de commande"
fi
if [ -n "$M2" ]; then
  curl -s -X POST "$CHAUF/missions/$M2/acknowledge" -H "Authorization: Bearer $T_CH1" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$M2/start" -H "Authorization: Bearer $T_CH1" > /dev/null
  echo "    Mission en cours: $M2"
fi

op_msg() {
  local mid="$1" chid="$2" content="$3"
  [ -z "$mid" ] && return
  local body
  body=$(printf '{"chauffeurId":"%s","content":"%s"}' "$chid" "$content")
  curl -s -X POST "$OP/messages/mission/$mid/reply" -H "Authorization: Bearer $T_OP" \
    -H "Content-Type: application/json" -d "$body" > /dev/null
}
ch_msg() {
  local mid="$1" tok="$2" content="$3"
  [ -z "$mid" ] && return
  local body
  body=$(printf '{"missionId":"%s","content":"%s"}' "$mid" "$content")
  curl -s -X POST "$CHAUF/messages" -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "$body" > /dev/null
}

if [ -n "$M1" ]; then
  op_msg "$M1" "$CH1_ID" "Bonjour, 3 livraisons aujourd'hui. Commencez par Zone Franche Port Lot 12."
  sleep 1
  ch_msg "$M1" "$T_CH1" "Bonjour, message recu. Je pars dans 10 minutes."
  sleep 1
  op_msg "$M1" "$CH1_ID" "Parfait. N'oubliez pas les documents de livraison pour chaque vehicule."
  sleep 1
  ch_msg "$M1" "$T_CH1" "Compris, documents prepares. Premier arret termine, tout s'est bien passe."
  op_msg "$M1" "$CH1_ID" "Excellent. Continuez sur le planning prevu."
fi

if [ -n "$M2" ]; then
  op_msg "$M2" "$CH1_ID" "Attention adresse 2e livraison modifiee: Rue des Industries Mghogha Bat B."
  sleep 1
  ch_msg "$M2" "$T_CH1" "OK note, GPS mis a jour. Actuellement a 15 min du site."
  sleep 1
  op_msg "$M2" "$CH1_ID" "Le client demande livraison avant 14h. Vous etes dans les temps?"
  sleep 1
  ch_msg "$M2" "$T_CH1" "Oui arrivee prevue 13h30. Aucun probleme."
fi

if [ -n "$M3" ]; then
  op_msg "$M3" "$CH2_ID" "Bonjour, 2 livraisons Tanger Med. Acces port: badge TM-447."
  sleep 1
  ch_msg "$M3" "$T_CH2" "Recu. Je suis au port en attente validation douane."
  sleep 1
  ch_msg "$M3" "$T_CH2" "Douane OK, livraison en cours."
  op_msg "$M3" "$CH2_ID" "Parfait, merci pour le suivi en temps reel."
fi
echo "    Messages envoyes"

do_incident() {
  local tok="$1" desc="$2" sev="$3"
  local body
  body=$(printf '{"description":"%s","severity":"%s"}' "$desc" "$sev")
  curl -s -X POST "$CLIENT/me/incidents" -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "$body" > /dev/null
}
do_incident "$T_C1" "Retard livraison de plus de 2h sur commande Zone Franche" "MEDIUM"
do_incident "$T_C2" "Vehicule livre avec rayure sur capot avant" "HIGH"
do_incident "$T_C1" "Chauffeur non joignable pendant 3h lors livraison" "LOW"
do_incident "$T_C3" "Bon de livraison manquant pour 2 vehicules sur 3" "MEDIUM"
echo "    4 incidents crees"

echo ""
echo "================================================================"
echo "  SEED TERMINE"
echo "  12 commandes - 5 tournees - 3+ missions - 13 messages - 4 incidents"
echo "================================================================"
