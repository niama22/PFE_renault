#!/bin/bash
# seed4.sh — Seed complet OptiFlow avec vrais modeles Dacia/Renault
# Villes: Casablanca, Rabat, Kenitra, Marrakech UNIQUEMENT
# Modeles: Dacia Sandero/Duster/Jogger/Logan/Spring + Renault Clio/Captur/Megane/Arkana/Kangoo
# Camions: 2 Scania/DAF porte-voitures (CH1 + CH2)
# Tournees: via moteur d'optimisation → stops/arrêts/immat remplis correctement

set +e  # no exit-on-error; we handle errors explicitly

KC="http://localhost:8180/realms/optiflow/protocol/openid-connect/token"
CID="optiflow-web"
CSEC="optiflow-web-secret-change-in-prod"
CLIENT="http://localhost:3001/api/v1/clients"
OP="http://localhost:8091/api/v1/operateur"
RESP="http://localhost:8094/api/v1/responsable"
CHAUF="http://localhost:3002/api/v1/chauffeur"
ADMIN="http://localhost:8082/api/v1/admin"

# Detect Python (py = Windows Launcher, python3 = Linux/Mac, python = fallback)
if command -v py >/dev/null 2>&1 && py -c "import sys; sys.exit(0 if sys.version_info[0]>=3 else 1)" 2>/dev/null; then
  PY=py
elif command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1 && python -c "import sys; sys.exit(0 if sys.version_info[0]>=3 else 1)" 2>/dev/null; then
  PY=python
else
  echo "ERROR: Python3 requis pour ce script (parsing JSON)."
  exit 1
fi
echo "  Python: $($PY --version 2>&1)"

get_token() {
  curl -s -X POST "$KC" -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=$CID" \
    --data-urlencode "client_secret=$CSEC" \
    --data-urlencode "username=$1" \
    --data-urlencode "password=password123" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4
}
jq_id() { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }
get_sub() { echo "$1" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"sub":"[^"]*"' | cut -d'"' -f4; }

# -----------------------------------------------------------------------
echo "==> [1/12] Tokens..."
T_C1=$(get_token AUTO-BENALI-01)
T_C2=$(get_token TRANS-MOUS-02)
T_C3=$(get_token ALAMI-IMPORT-03)
T_OP=$(get_token operateur1)
T_ADM=$(get_token admin1)
T_RE=$(get_token responsable1)
T_CH1=$(get_token chauffeur1)
T_CH2=$(get_token chauffeur2)

CH1_ID=$(get_sub "$T_CH1")
CH2_ID=$(get_sub "$T_CH2")
echo "  chauffeur1=$CH1_ID"
echo "  chauffeur2=$CH2_ID"

# -----------------------------------------------------------------------
echo "==> [2/12] Nettoyage BDD..."
PSQL="docker exec optiflow-postgres psql -U optiflow"

$PSQL -d operateur_db -c "
  TRUNCATE TABLE cancellation_records CASCADE;
  TRUNCATE TABLE cancellation_requests CASCADE;
  TRUNCATE TABLE operateur_messages CASCADE;
  TRUNCATE TABLE incidents CASCADE;
  TRUNCATE TABLE tournees CASCADE;
  TRUNCATE TABLE orders CASCADE;
  TRUNCATE TABLE vehicle_models CASCADE;
  TRUNCATE TABLE trucks CASCADE;
" 2>/dev/null && echo "  operateur_db nettoye" || echo "  WARN: operateur_db truncation partielle"

$PSQL -d client_db -c "
  DELETE FROM incidents;
  DELETE FROM orders;
" 2>/dev/null && echo "  client_db nettoye" || echo "  WARN: client_db delete partielle"

$PSQL -d chauffeur_db -c "
  DELETE FROM chauffeur_incidents;
  DELETE FROM chauffeur_messages;
  DELETE FROM missions;
" 2>/dev/null && echo "  chauffeur_db nettoye" || echo "  WARN: chauffeur_db delete partielle"

# -----------------------------------------------------------------------
echo "==> [3/12] Modeles vehicules Dacia/Renault..."

mk_model() {
  curl -s -X POST "$RESP/vehicle-models" -H "Authorization: Bearer $T_RE" \
    -H "Content-Type: application/json" \
    -d "{\"brand\":\"$1\",\"model\":\"$2\",\"lengthCm\":$3,\"widthCm\":$4,\"heightCm\":$5,\"weightKg\":$6,\"description\":\"$7\"}"
}

# Dacia
RES=$(mk_model "Dacia" "Sandero" 403 173 149 1084 "Berline citadine"); ID_SANDERO=$(jq_id "$RES")
echo "  Dacia Sandero: $ID_SANDERO"
RES=$(mk_model "Dacia" "Duster" 434 180 169 1396 "SUV compact"); ID_DUSTER=$(jq_id "$RES")
echo "  Dacia Duster: $ID_DUSTER"
RES=$(mk_model "Dacia" "Jogger" 455 178 163 1321 "Monospace familial"); ID_JOGGER=$(jq_id "$RES")
echo "  Dacia Jogger: $ID_JOGGER"
RES=$(mk_model "Dacia" "Logan" 436 173 151 1140 "Berline accessible"); ID_LOGAN=$(jq_id "$RES")
echo "  Dacia Logan: $ID_LOGAN"
RES=$(mk_model "Dacia" "Spring" 373 162 152 970 "Citadine electrique"); ID_SPRING=$(jq_id "$RES")
echo "  Dacia Spring: $ID_SPRING"

# Renault
RES=$(mk_model "Renault" "Clio" 405 180 144 1082 "Citadine premium"); ID_CLIO=$(jq_id "$RES")
echo "  Renault Clio: $ID_CLIO"
RES=$(mk_model "Renault" "Captur" 423 179 157 1279 "SUV urbain"); ID_CAPTUR=$(jq_id "$RES")
echo "  Renault Captur: $ID_CAPTUR"
RES=$(mk_model "Renault" "Megane" 449 181 146 1380 "Berline compacte"); ID_MEGANE=$(jq_id "$RES")
echo "  Renault Megane: $ID_MEGANE"
RES=$(mk_model "Renault" "Arkana" 457 182 157 1330 "SUV coupe"); ID_ARKANA=$(jq_id "$RES")
echo "  Renault Arkana: $ID_ARKANA"
RES=$(mk_model "Renault" "Kangoo" 449 186 184 1492 "Utilitaire compact"); ID_KANGOO=$(jq_id "$RES")
echo "  Renault Kangoo: $ID_KANGOO"

# -----------------------------------------------------------------------
echo "==> [4/12] Camions porte-voitures..."

mk_truck() {
  curl -s -X POST "$RESP/trucks" -H "Authorization: Bearer $T_RE" \
    -H "Content-Type: application/json" \
    -d "{\"plateNumber\":\"$1\",\"brand\":\"$2\",\"model\":\"$3\",\"maxWeightKg\":40000,\"maxVolumeM3\":100,\"internalLengthCm\":2000,\"internalWidthCm\":250,\"internalHeightCm\":200,\"chauffeurId\":\"$4\",\"chauffeurName\":\"$5\",\"notes\":\"Porte-voitures 10 places\"}"
}

RES=$(mk_truck "TNG-PV-001" "Scania" "R500 Porte-Voitures" "$CH1_ID" "Karim Idrissi")
TRUCK1_ID=$(jq_id "$RES"); echo "  Truck1 (Karim): $TRUCK1_ID"

RES=$(mk_truck "TNG-PV-002" "DAF" "XF480 Porte-Voitures" "$CH2_ID" "Hassan Tazi")
TRUCK2_ID=$(jq_id "$RES"); echo "  Truck2 (Hassan): $TRUCK2_ID"

# -----------------------------------------------------------------------
echo "==> [5/12] Types vehicules admin..."
VT_RESP=$(curl -s "$ADMIN/vehicle-types?size=20" -H "Authorization: Bearer $T_ADM")
VT_CNT=$(echo "$VT_RESP" | grep -o '"id"' | wc -l | tr -d ' ')
if [ "$VT_CNT" -lt 3 ]; then
  for type_json in \
    '{"name":"Berline","description":"Berline standard","capacity":1,"active":true}' \
    '{"name":"SUV","description":"SUV 4x4","capacity":1,"active":true}' \
    '{"name":"Monospace","description":"Monospace familial","capacity":1,"active":true}' \
    '{"name":"Electrique","description":"Vehicule electrique","capacity":1,"active":true}' \
    '{"name":"Utilitaire","description":"Utilitaire compact","capacity":3,"active":true}'; do
    curl -s -X POST "$ADMIN/vehicle-types" -H "Authorization: Bearer $T_ADM" \
      -H "Content-Type: application/json" -d "$type_json" > /dev/null
  done
  echo "  5 types vehicules crees"
else
  echo "  Types existants ($VT_CNT)"
fi

# -----------------------------------------------------------------------
echo "==> [6/12] Commandes (28 commandes, vrais modeles Dacia/Renault)..."

do_order() {
  local token="$1" date="$2" street="$3" city="$4" qty="${5:-1}" mid="${6:-}" mlabel="${7:-Dacia Sandero}"
  local veh
  if [ -n "$mid" ]; then
    veh="[{\"vehicleModelId\":\"$mid\",\"vehicleModelLabel\":\"$mlabel\",\"quantity\":$qty}]"
  else
    veh="[{\"vehicleModelLabel\":\"$mlabel\",\"quantity\":$qty}]"
  fi
  curl -s -X POST "$CLIENT/me/orders" -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    -d "{\"vehicles\":$veh,\"requestedDeliveryDate\":\"$date\",\"deliveryAddress\":{\"street\":\"$street\",\"city\":\"$city\",\"postalCode\":\"20000\",\"country\":\"Maroc\"}}"
}

# Client1 — 10 commandes Casablanca
R1=$(do_order "$T_C1" "2026-06-05" "Bd Mohammed V Lot 14" "Casablanca" 1 "$ID_SANDERO" "Dacia Sandero")
R1_ID=$(jq_id "$R1"); echo "  C1-01 Sandero: $R1_ID"
R2=$(do_order "$T_C1" "2026-06-07" "Zone Industrielle Ain Sebaa" "Casablanca" 2 "$ID_DUSTER" "Dacia Duster")
R2_ID=$(jq_id "$R2"); echo "  C1-02 Duster x2: $R2_ID"
R3=$(do_order "$T_C1" "2026-06-09" "Av Hassan II Bloc A" "Casablanca" 1 "$ID_CLIO" "Renault Clio")
R3_ID=$(jq_id "$R3"); echo "  C1-03 Clio: $R3_ID"
R4=$(do_order "$T_C1" "2026-06-12" "Route de Rabat Km 5" "Casablanca" 1 "$ID_CAPTUR" "Renault Captur")
R4_ID=$(jq_id "$R4"); echo "  C1-04 Captur: $R4_ID"
R5=$(do_order "$T_C1" "2026-06-15" "Zone Franche Casablanca Sud" "Casablanca" 2 "$ID_SANDERO" "Dacia Sandero")
R5_ID=$(jq_id "$R5"); echo "  C1-05 Sandero x2: $R5_ID"
R6=$(do_order "$T_C1" "2026-06-18" "Bd Zerktouni Tour A" "Casablanca" 1 "$ID_JOGGER" "Dacia Jogger")
R6_ID=$(jq_id "$R6"); echo "  C1-06 Jogger: $R6_ID"
R7=$(do_order "$T_C1" "2026-06-20" "Ain Chock Secteur 4" "Casablanca" 1 "$ID_MEGANE" "Renault Megane")
R7_ID=$(jq_id "$R7"); echo "  C1-07 Megane: $R7_ID"
R8=$(do_order "$T_C1" "2026-06-22" "Hay Hassani Rue 12" "Casablanca" 1 "$ID_SANDERO" "Dacia Sandero")
R8_ID=$(jq_id "$R8"); echo "  C1-08 Sandero: $R8_ID"
R9=$(do_order "$T_C1" "2026-06-25" "Sidi Bernoussi Lot 7" "Casablanca" 2 "$ID_LOGAN" "Dacia Logan")
R9_ID=$(jq_id "$R9"); echo "  C1-09 Logan x2: $R9_ID"
R10=$(do_order "$T_C1" "2026-06-28" "Bd Anfa Residence Le Parc" "Casablanca" 1 "$ID_ARKANA" "Renault Arkana")
R10_ID=$(jq_id "$R10"); echo "  C1-10 Arkana: $R10_ID"

# Client2 — 9 commandes Rabat/Kenitra
R11=$(do_order "$T_C2" "2026-06-06" "Av Mohammed V Centre" "Rabat" 1 "$ID_CLIO" "Renault Clio")
R11_ID=$(jq_id "$R11"); echo "  C2-11 Clio: $R11_ID"
R12=$(do_order "$T_C2" "2026-06-08" "Hay Riad Secteur 10" "Rabat" 2 "$ID_CAPTUR" "Renault Captur")
R12_ID=$(jq_id "$R12"); echo "  C2-12 Captur x2: $R12_ID"
R13=$(do_order "$T_C2" "2026-06-10" "Agdal Rue Ibn Battouta" "Rabat" 1 "$ID_SANDERO" "Dacia Sandero")
R13_ID=$(jq_id "$R13"); echo "  C2-13 Sandero: $R13_ID"
R14=$(do_order "$T_C2" "2026-06-13" "Bd Hassan II Souissi" "Rabat" 1 "$ID_DUSTER" "Dacia Duster")
R14_ID=$(jq_id "$R14"); echo "  C2-14 Duster: $R14_ID"
R15=$(do_order "$T_C2" "2026-06-16" "Zone Industrielle Sale" "Rabat" 2 "$ID_MEGANE" "Renault Megane")
R15_ID=$(jq_id "$R15"); echo "  C2-15 Megane x2: $R15_ID"
R16=$(do_order "$T_C2" "2026-06-19" "Kenitra Port ZI Nord" "Kenitra" 1 "$ID_KANGOO" "Renault Kangoo")
R16_ID=$(jq_id "$R16"); echo "  C2-16 Kangoo: $R16_ID"
R17=$(do_order "$T_C2" "2026-06-21" "Bd Mohammed Diouri Centre" "Kenitra" 1 "$ID_SANDERO" "Dacia Sandero")
R17_ID=$(jq_id "$R17"); echo "  C2-17 Sandero: $R17_ID"
R18=$(do_order "$T_C2" "2026-06-23" "Zone Franche Kenitra Atlantic" "Kenitra" 2 "$ID_SPRING" "Dacia Spring")
R18_ID=$(jq_id "$R18"); echo "  C2-18 Spring x2: $R18_ID"
R19=$(do_order "$T_C2" "2026-06-26" "Av Bir Anzarane Lot 3" "Kenitra" 1 "$ID_LOGAN" "Dacia Logan")
R19_ID=$(jq_id "$R19"); echo "  C2-19 Logan: $R19_ID"

# Client3 — 9 commandes Marrakech
R20=$(do_order "$T_C3" "2026-06-05" "Bd Mohammed VI Gueliz" "Marrakech" 1 "$ID_SANDERO" "Dacia Sandero")
R20_ID=$(jq_id "$R20"); echo "  C3-20 Sandero: $R20_ID"
R21=$(do_order "$T_C3" "2026-06-07" "Zone Industrielle Sidi Ghanem" "Marrakech" 2 "$ID_DUSTER" "Dacia Duster")
R21_ID=$(jq_id "$R21"); echo "  C3-21 Duster x2: $R21_ID"
R22=$(do_order "$T_C3" "2026-06-10" "Route de Casablanca Km 8" "Marrakech" 1 "$ID_CAPTUR" "Renault Captur")
R22_ID=$(jq_id "$R22"); echo "  C3-22 Captur: $R22_ID"
R23=$(do_order "$T_C3" "2026-06-14" "Av Yacoub El Mansour Majorelle" "Marrakech" 1 "$ID_ARKANA" "Renault Arkana")
R23_ID=$(jq_id "$R23"); echo "  C3-23 Arkana: $R23_ID"
R24=$(do_order "$T_C3" "2026-06-17" "Hivernage Av Echouhada" "Marrakech" 2 "$ID_JOGGER" "Dacia Jogger")
R24_ID=$(jq_id "$R24"); echo "  C3-24 Jogger x2: $R24_ID"
R25=$(do_order "$T_C3" "2026-06-20" "Zone Technopolis Mghogha" "Marrakech" 1 "$ID_CLIO" "Renault Clio")
R25_ID=$(jq_id "$R25"); echo "  C3-25 Clio: $R25_ID"
R26=$(do_order "$T_C3" "2026-06-23" "Bd Allal Al Fassi Menara" "Marrakech" 1 "$ID_SANDERO" "Dacia Sandero")
R26_ID=$(jq_id "$R26"); echo "  C3-26 Sandero: $R26_ID"
R27=$(do_order "$T_C3" "2026-06-25" "Tensift ZI Route Ait Ourir" "Marrakech" 2 "$ID_MEGANE" "Renault Megane")
R27_ID=$(jq_id "$R27"); echo "  C3-27 Megane x2: $R27_ID"
R28=$(do_order "$T_C3" "2026-06-28" "Palmeraie Circuit Touristique" "Marrakech" 1 "$ID_KANGOO" "Renault Kangoo")
R28_ID=$(jq_id "$R28"); echo "  C3-28 Kangoo: $R28_ID"

# -----------------------------------------------------------------------
echo "==> [7/12] Validation operateur..."
sleep 5  # Attendre consommation Kafka commandes.created
validate_order() {
  [ -z "$1" ] && return
  curl -s -X POST "$OP/orders/$1/validate" -H "Authorization: Bearer $T_OP" \
    -H "Content-Type: application/json" -d '{"notes":"Commande conforme aux specifications"}' > /dev/null
  echo "  Validee: $1"
}
for oid in $R1_ID $R2_ID $R3_ID $R4_ID $R5_ID $R6_ID $R7_ID $R8_ID $R9_ID $R10_ID \
           $R11_ID $R12_ID $R13_ID $R14_ID $R15_ID $R16_ID $R17_ID $R18_ID $R19_ID \
           $R20_ID $R21_ID $R22_ID $R23_ID $R24_ID $R25_ID $R26_ID $R27_ID $R28_ID; do
  validate_order "$oid"
done
echo "  Attente Kafka commandes.validated..."
sleep 8

# -----------------------------------------------------------------------
echo "==> [8/12] Optimisation + confirmation planning..."

OPT_RESULT=$(curl -s -X POST "$RESP/optimization/run" \
  -H "Authorization: Bearer $T_OP" \
  -H "Content-Type: application/json" \
  -d '{"availableTrucksOnly":false,"clusterRadiusKm":100,"dateWindowDays":3}')

NB_PROPOSED=$(echo "$OPT_RESULT" | $PY -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('data',{}).get('proposedTournees',[])))" 2>/dev/null || echo "0")
NB_UNSCHED=$(echo "$OPT_RESULT" | $PY -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('data',{}).get('unscheduledOrderIds',[])))" 2>/dev/null || echo "?")
echo "  Tournees proposees: $NB_PROPOSED | Non planifiees: $NB_UNSCHED"

if [ "$NB_PROPOSED" -eq 0 ] 2>/dev/null; then
  echo "  ERREUR: Aucune tournee proposee. Verifier camions/commandes."
  echo "  Reponse: $(echo "$OPT_RESULT" | head -c 500)"
  exit 1
fi

CONFIRM_BODY=$(echo "$OPT_RESULT" | $PY -c "
import json, sys
d = json.load(sys.stdin)
proposed = d.get('data', {}).get('proposedTournees', [])
print(json.dumps({'proposedTournees': proposed, 'operatorNotes': 'Seed automatique - planning optimise'}))
")

CONFIRM_RESULT=$(curl -s -X POST "$RESP/optimization/confirm" \
  -H "Authorization: Bearer $T_OP" \
  -H "Content-Type: application/json" \
  -d "$CONFIRM_BODY")

NB_CONFIRMED=$(echo "$CONFIRM_RESULT" | $PY -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('data',[])))" 2>/dev/null || echo "0")
echo "  Tournees confirmees: $NB_CONFIRMED"
echo "$CONFIRM_RESULT" | grep -o '"tourneeNumber":"[^"]*"' | head -10

# Extraire les IDs des tournees confirmees (tr -d '\r' strip Windows CRLF)
CONFIRMED_IDS=$(echo "$CONFIRM_RESULT" | $PY -c "
import json, sys
d = json.load(sys.stdin)
items = d.get('data', [])
for item in items:
    tid = item.get('id', '')
    if tid:
        print(tid)
" 2>/dev/null | tr -d '\r')

sleep 3

# -----------------------------------------------------------------------
echo "==> [9/12] Validation responsable (8 premieres tournees)..."

resp_val() {
  [ -z "$1" ] && return
  local r
  r=$(curl -s -X PATCH "$RESP/tournees/$1/validate" \
    -H "Authorization: Bearer $T_RE" \
    -H "Content-Type: application/json")
  echo "  Validee respo: $(echo "$r" | grep -o '"tourneeNumber":"[^"]*"' | head -1)"
}

COUNT=0
while IFS= read -r tid; do
  [ -z "$tid" ] && continue
  [ "$COUNT" -ge 8 ] && break
  resp_val "$tid"
  COUNT=$((COUNT + 1))
done <<< "$CONFIRMED_IDS"
echo "  $COUNT tournees validees par responsable"
echo "  Attente Kafka tournee.validated..."
sleep 6

# -----------------------------------------------------------------------
echo "==> [10/12] Missions chauffeur..."
MISSIONS_CH1=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH1")
MISSIONS_CH2=$(curl -s "$CHAUF/missions" -H "Authorization: Bearer $T_CH2")

NB_M1=$(echo "$MISSIONS_CH1" | grep -o '"id"' | wc -l | tr -d ' ')
NB_M2=$(echo "$MISSIONS_CH2" | grep -o '"id"' | wc -l | tr -d ' ')
echo "  CH1 missions: $NB_M1 | CH2 missions: $NB_M2"

get_mid() { echo "$1" | grep -o '"id":"[^"]*"' | sed -n "${2}p" | cut -d'"' -f4; }
M1_1=$(get_mid "$MISSIONS_CH1" 1)
M1_2=$(get_mid "$MISSIONS_CH1" 2)
M1_3=$(get_mid "$MISSIONS_CH1" 3)
M1_4=$(get_mid "$MISSIONS_CH1" 4)
M2_1=$(get_mid "$MISSIONS_CH2" 1)
M2_2=$(get_mid "$MISSIONS_CH2" 2)
M2_3=$(get_mid "$MISSIONS_CH2" 3)
M2_4=$(get_mid "$MISSIONS_CH2" 4)
echo "  CH1: $M1_1 $M1_2 $M1_3 $M1_4"
echo "  CH2: $M2_1 $M2_2 $M2_3 $M2_4"

complete_mission() {
  local mid="$1" tok="$2" notes="$3"
  [ -z "$mid" ] && return
  curl -s -X POST "$CHAUF/missions/$mid/acknowledge" -H "Authorization: Bearer $tok" > /dev/null; sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/start"       -H "Authorization: Bearer $tok" > /dev/null; sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/complete"    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "{\"notes\":\"$notes\"}" > /dev/null
  echo "  Terminee: $mid"
}
start_mission() {
  local mid="$1" tok="$2"
  [ -z "$mid" ] && return
  curl -s -X POST "$CHAUF/missions/$mid/acknowledge" -H "Authorization: Bearer $tok" > /dev/null; sleep 1
  curl -s -X POST "$CHAUF/missions/$mid/start"       -H "Authorization: Bearer $tok" > /dev/null
  echo "  En cours: $mid"
}

complete_mission "$M1_1" "$T_CH1" "Livraison Casablanca terminee - 2 Dacia Sandero remis avec documents"
complete_mission "$M1_2" "$T_CH1" "Tournee Casablanca OK - Renault Clio et Captur livres"
complete_mission "$M1_3" "$T_CH1" "Marrakech Gueliz livre - vehicules en parfait etat"
complete_mission "$M2_1" "$T_CH2" "Rabat Agdal - Renault Clio livree - bon signe"
complete_mission "$M2_2" "$T_CH2" "Rabat Sale mission terminee - 2 Megane remises"
complete_mission "$M2_3" "$T_CH2" "Marrakech Sidi Ghanem - 2 Duster livres - 30 min avance"

start_mission "$M1_4" "$T_CH1"
start_mission "$M2_4" "$T_CH2"

# ACTIVE_M1=$M1_4 : mission active CH1 (Karim)
# ACTIVE_M2=$M2_4 : mission active CH2 (Hassan)

# -----------------------------------------------------------------------
echo "==> [11/12] Messages (1 conversation par chauffeur)..."

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

if [ -n "$M1_4" ]; then
  op_msg "$M1_4" "$CH1_ID" "Bonjour Karim, 2 livraisons Casablanca: Hay Hassani puis Sidi Bernoussi."
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Bonjour, recu. Je pars de Tanger dans 15 min."
  sleep 1
  op_msg "$M1_4" "$CH1_ID" "Priorite Hay Hassani - client disponible 10h-12h seulement."
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Compris. Camion charge: 1 Dacia Sandero + 2 Dacia Logan. Documents OK."
  sleep 1
  op_msg "$M1_4" "$CH1_ID" "Bien. Faites signer le bon de livraison et photo a la remise."
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Premier arret OK. Dacia Sandero livree. En route Sidi Bernoussi."
  sleep 1
  op_msg "$M1_4" "$CH1_ID" "Excellent travail Karim! Dans les temps pour le 2e arret?"
  sleep 1
  ch_msg "$M1_4" "$T_CH1" "Oui, arrivee estimee 14h30. Tout se passe bien."
  echo "  Messages CH1 envoyes"
fi

if [ -n "$M2_4" ]; then
  op_msg "$M2_4" "$CH2_ID" "Bonjour Hassan, 2 livraisons Kenitra: Port ZI puis Centre-ville."
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Recu 5/5. Chargement: 1 Renault Kangoo + 2 Dacia Spring. Pret."
  sleep 1
  op_msg "$M2_4" "$CH2_ID" "Pour le Port ZI, badge acces: KZ-2024. A presenter a l'entree."
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Devant entree port. Controle en cours."
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Acces accorde. Livraison Renault Kangoo au Port ZI en cours."
  sleep 1
  op_msg "$M2_4" "$CH2_ID" "Bien Hassan. Client centre vous attend apres 15h."
  sleep 1
  ch_msg "$M2_4" "$T_CH2" "Port termine 13h30. Large. Je serai centre-ville vers 14h30."
  sleep 1
  op_msg "$M2_4" "$CH2_ID" "Parfait! Bonne continuation Hassan."
  echo "  Messages CH2 envoyes"
fi

# -----------------------------------------------------------------------
echo "==> [12/12] Incidents (10) + Annulations (8)..."

do_incident() {
  local tok="$1" oid="$2" desc="$3" sev="$4"
  local body
  if [ -n "$oid" ]; then
    body="{\"orderId\":\"$oid\",\"description\":\"$desc\",\"severity\":\"$sev\"}"
  else
    body="{\"description\":\"$desc\",\"severity\":\"$sev\"}"
  fi
  curl -s -X POST "$CLIENT/me/incidents" -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" -d "$body" > /dev/null
}

do_incident "$T_C1" "$R1_ID" "Retard livraison superieur a 3h sans notification prealable" "MEDIUM"
do_incident "$T_C1" "$R2_ID" "Dacia Duster livre avec rayure carrosserie cote conducteur" "HIGH"
do_incident "$T_C1" "$R3_ID" "Chauffeur injoignable pendant 2h lors livraison Casablanca" "LOW"
do_incident "$T_C1" "" "Bon de livraison manquant pour 2 vehicules Dacia Sandero" "MEDIUM"
do_incident "$T_C2" "$R11_ID" "Adresse livraison incorrecte sur bon transport Rabat" "LOW"
do_incident "$T_C2" "$R12_ID" "Renault Captur livre avec pneu sous-gonfle - pression 1.2 bar" "HIGH"
do_incident "$T_C2" "$R14_ID" "Cles Dacia Duster non remises lors livraison Souissi" "HIGH"
do_incident "$T_C3" "$R20_ID" "Documentation technique incomplete - carte grise provisoire manquante" "MEDIUM"
do_incident "$T_C3" "$R21_ID" "Delai non respecte tournee Marrakech Sidi Ghanem" "MEDIUM"
do_incident "$T_C3" "$R22_ID" "Renault Captur livre sans protection siege - interieur tache" "LOW"
echo "  10 incidents crees"

do_cancel() {
  local tok="$1" oid="$2" reason="$3"
  [ -z "$oid" ] && return
  curl -s -X POST "$CLIENT/me/orders/$oid/cancel" \
    -H "Authorization: Bearer $tok" -H "Content-Type: application/json" \
    -d "{\"reason\":\"$reason\"}" > /dev/null
  echo "  Annulation: $oid"
}

do_cancel "$T_C3" "$R26_ID" "Changement planning interne - livraison reportee mois prochain"
do_cancel "$T_C3" "$R27_ID" "Revision besoins - reduction parc vehicules Marrakech"
do_cancel "$T_C3" "$R28_ID" "Budget non approuve pour ce trimestre - commande suspendue"
do_cancel "$T_C1" "$R10_ID" "Client a trouve fournisseur local plus rapide"
do_cancel "$T_C1" "$R9_ID" "Erreur dans commande - mauvais modele vehicule selectionne"
do_cancel "$T_C2" "$R18_ID" "Zone livraison Kenitra Atlantic non confirmee - report demande"
do_cancel "$T_C2" "$R19_ID" "Contrat client suspendu - en attente de renouvellement"
do_cancel "$T_C1" "$R8_ID" "Modification specifications - nouvelle commande sera soumise"
echo "  8 annulations demandees"

echo ""
echo "=================================================================="
echo "  SEED4 TERMINE"
echo "  10 modeles Dacia/Renault | 2 camions porte-voitures"
echo "  28 commandes | Villes: Casablanca, Rabat, Kenitra, Marrakech"
echo "  Tournees via moteur optimisation (stops/IT/date remplis)"
echo "  6 missions terminees | 2 en cours | 8 validees responsable"
echo "  10 incidents | 8 annulations"
echo "=================================================================="
