#!/bin/bash

KC="http://localhost:8180/realms/optiflow/protocol/openid-connect/token"
OP="http://localhost:8091/api/v1/operateur"
RESP="http://localhost:8094/api/v1/responsable"
CHAUF="http://localhost:3002/api/v1/chauffeur"

get_token() {
  curl -s -X POST "$KC" -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=password" --data-urlencode "client_id=optiflow-web" \
    --data-urlencode "client_secret=optiflow-web-secret-change-in-prod" \
    --data-urlencode "username=$1" --data-urlencode "password=password123" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4
}
jq_id() { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

T_OP=$(get_token operateur1)
T_RE=$(get_token responsable1)
T_CH1=$(get_token chauffeur1)
T_CH2=$(get_token chauffeur2)
CH1_ID=$(echo "$T_CH1" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"sub":"[^"]*"' | cut -d'"' -f4)
CH2_ID=$(echo "$T_CH2" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"sub":"[^"]*"' | cut -d'"' -f4)

echo "Tokens OK. ch1=$CH1_ID ch2=$CH2_ID"

O1="c12ea78e-1aaf-45f2-9792-631e5fdf6bc6"
O2="ed12edf4-2c58-43a3-93c0-11419bde250d"
O3="bc90371f-a4af-4be3-973f-016e0b9fc029"
O4="2d5d3c4f-c5e7-4cd7-a22c-e65f694e7294"
O5="9ce3aadc-23b3-44a9-8c00-76212d3bd9e8"
O6="a09403cf-84f9-4c56-b2b4-f95d9f51eed2"
O7="77f4e3e8-1825-4f4e-8167-17b907696cd8"
O8="8d9088e2-fccf-4939-839d-ebf8d727ad09"
O9="43c2584c-0269-43b3-8021-e574176e6cb1"
O10="56116889-a580-4ad2-a9fc-d45b8a43bb23"
O11="55f4cb06-96c8-4f38-976f-7862d3e9e533"
O12="de6583c7-d219-4b81-8707-6ebcc3c016ab"

echo "==> Tournees..."

mk_tournee() {
  curl -s -X POST "$OP/tournees" \
    -H "Authorization: Bearer $T_OP" \
    -H "Content-Type: application/json" \
    -d "$1"
}

TT1=$(mk_tournee "{\"orderIds\":[\"$O1\",\"$O6\"],\"plannedDate\":\"2026-06-10\",\"notes\":\"Livraisons Tanger 10 juin\"}")
TT1_ID=$(jq_id "$TT1"); echo "  T1: $TT1_ID"

TT2=$(mk_tournee "{\"orderIds\":[\"$O2\",\"$O10\"],\"plannedDate\":\"2026-06-11\",\"notes\":\"Nord Maroc 11 juin\"}")
TT2_ID=$(jq_id "$TT2"); echo "  T2: $TT2_ID"

TT3=$(mk_tournee "{\"orderIds\":[\"$O3\",\"$O7\"],\"plannedDate\":\"2026-06-12\",\"notes\":\"Tanger Med 12 juin\"}")
TT3_ID=$(jq_id "$TT3"); echo "  T3: $TT3_ID"

TT4=$(mk_tournee "{\"orderIds\":[\"$O11\",\"$O8\"],\"plannedDate\":\"2026-06-14\",\"notes\":\"Tetouan 14 juin\"}")
TT4_ID=$(jq_id "$TT4"); echo "  T4: $TT4_ID"

TT5=$(mk_tournee "{\"orderIds\":[\"$O4\",\"$O12\"],\"plannedDate\":\"2026-06-15\",\"notes\":\"Region 15 juin\"}")
TT5_ID=$(jq_id "$TT5"); echo "  T5: $TT5_ID"

TT6=$(mk_tournee "{\"orderIds\":[\"$O5\",\"$O9\"],\"plannedDate\":\"2026-06-17\",\"notes\":\"Tournee complementaire\"}")
TT6_ID=$(jq_id "$TT6"); echo "  T6: $TT6_ID"

echo "==> Assignation + soumission..."
assign_submit() {
  local tid="$1" chid="$2" chname="$3"
  [ -z "$tid" ] && return
  curl -s -X PATCH "$OP/tournees/$tid/assign-chauffeur" \
    -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" \
    -d "{\"chauffeurId\":\"$chid\",\"chauffeurName\":\"$chname\"}" > /dev/null
  curl -s -X PATCH "$OP/tournees/$tid/submit" \
    -H "Authorization: Bearer $T_OP" -H "Content-Type: application/json" > /dev/null
  echo "  Assigne+soumis: $tid -> $chname"
}
assign_submit "$TT1_ID" "$CH1_ID" "chauffeur1"
assign_submit "$TT2_ID" "$CH2_ID" "chauffeur2"
assign_submit "$TT3_ID" "$CH1_ID" "chauffeur1"
assign_submit "$TT4_ID" "$CH2_ID" "chauffeur2"
assign_submit "$TT5_ID" "$CH1_ID" "chauffeur1"
assign_submit "$TT6_ID" "$CH2_ID" "chauffeur2"
sleep 2

echo "==> Validation responsable (4/6)..."
resp_val() {
  [ -z "$1" ] && return
  local R
  R=$(curl -s -X PATCH "$RESP/tournees/$1/validate" \
    -H "Authorization: Bearer $T_RE" -H "Content-Type: application/json")
  echo "  Validee: $1"
}
resp_val "$TT1_ID"
resp_val "$TT2_ID"
resp_val "$TT3_ID"
resp_val "$TT4_ID"
sleep 3

echo "==> Flux missions..."
M_CH1=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH1")
M_CH2=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH2")
M1=$(echo "$M_CH1" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
M2=$(echo "$M_CH1" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
M3=$(echo "$M_CH2" | grep -o '"id":"[^"]*"' | sed -n '1p' | cut -d'"' -f4)
M4=$(echo "$M_CH2" | grep -o '"id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
echo "  ch1: M1=$M1 M2=$M2"
echo "  ch2: M3=$M3 M4=$M4"

complete_mission() {
  local mid="$1" tok="$2" notes="$3"
  [ -z "$mid" ] && return
  curl -s -X POST "$CHAUF/missions/$mid/acknowledge" -H "Authorization: Bearer $tok" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/start" -H "Authorization: Bearer $tok" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/complete" -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "{\"notes\":\"$notes\"}" > /dev/null
  echo "  Complete: $mid"
}

[ -n "$M1" ] && complete_mission "$M1" "$T_CH1" "Livraison effectuee client present vehicules en bon etat"
[ -n "$M3" ] && complete_mission "$M3" "$T_CH2" "RAS livraison conforme au bon de commande"
[ -n "$M4" ] && complete_mission "$M4" "$T_CH2" "Livraison Tetouan effectuee avec avance"
if [ -n "$M2" ]; then
  curl -s -X POST "$CHAUF/missions/$M2/acknowledge" -H "Authorization: Bearer $T_CH1" > /dev/null
  sleep 1
  curl -s -X POST "$CHAUF/missions/$M2/start" -H "Authorization: Bearer $T_CH1" > /dev/null
  echo "  En cours: $M2"
fi

echo "==> Messages..."
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

if [ -n "$M1" ]; then
  op_msg "$M1" "$CH1_ID" "Bonjour Karim, 2 livraisons aujourd hui. Zone Franche Port Lot 12 en premier."
  sleep 1
  ch_msg "$M1" "$T_CH1" "Bonjour, recu. Je pars dans 10 minutes."
  sleep 1
  op_msg "$M1" "$CH1_ID" "Parfait. N oubliez pas les documents de livraison."
  sleep 1
  ch_msg "$M1" "$T_CH1" "Documents prepares. Premier arret OK, client present."
  op_msg "$M1" "$CH1_ID" "Super. Continuez sur le planning."
  ch_msg "$M1" "$T_CH1" "Mission terminee. Tout livre sans incident."
  echo "  M1 messages OK"
fi

if [ -n "$M2" ]; then
  op_msg "$M2" "$CH1_ID" "Attention adresse modifiee pour livraison 2: Rue des Industries Mghogha Bat B."
  sleep 1
  ch_msg "$M2" "$T_CH1" "OK note, GPS mis a jour. A 15 min du site."
  sleep 1
  op_msg "$M2" "$CH1_ID" "Client demande livraison avant 14h. Vous etes dans les temps?"
  ch_msg "$M2" "$T_CH1" "Oui arrivee prevue 13h30. Dans les temps."
  echo "  M2 messages OK"
fi

if [ -n "$M3" ]; then
  op_msg "$M3" "$CH2_ID" "Bonjour Hassan, 2 livraisons Tanger Med. Badge port: TM-447."
  sleep 1
  ch_msg "$M3" "$T_CH2" "Recu. Au port, attente validation douane."
  sleep 1
  ch_msg "$M3" "$T_CH2" "Douane OK. Livraison en cours."
  op_msg "$M3" "$CH2_ID" "Tres bien, merci pour le suivi en temps reel."
  echo "  M3 messages OK"
fi

if [ -n "$M4" ]; then
  op_msg "$M4" "$CH2_ID" "Mission Tetouan: 2 livraisons. Contact client M. Benali 06-XX-XX."
  sleep 1
  ch_msg "$M4" "$T_CH2" "Parfait. En route, arrivee dans 45 min."
  echo "  M4 messages OK"
fi

echo ""
echo "==================================================="
echo "  SEED PHASE 2 TERMINE"
echo "  6 tournees | 4 validees | missions + messages"
echo "==================================================="
