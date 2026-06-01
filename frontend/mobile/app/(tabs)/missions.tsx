import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Image, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMissions } from '../../src/api/missions.api';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors, StatusColors } from '../../src/theme/colors';
import type { Mission } from '../../src/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function StatusBadge({ status }: { status: string }) {
  const cfg = StatusColors[status] ?? { bg: '#f3f4f6', text: '#374151', label: status };
  return (
    <View style={[badge.wrap, { backgroundColor: cfg.bg }]}>
      <Text style={[badge.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});

function MissionCard({ item }: { item: Mission }) {
  const orders = (() => { try { return JSON.parse(item.orderIdsJson ?? '[]'); } catch { return []; } })();
  const date = item.plannedDate ? format(new Date(item.plannedDate), 'dd MMM yyyy', { locale: fr }) : '—';

  return (
    <TouchableOpacity
      style={card.wrap}
      onPress={() => router.push(`/mission/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={card.row}>
        <View style={card.iconWrap}>
          <Ionicons name="truck-outline" size={22} color={Colors.primary} />
        </View>
        <View style={card.info}>
          <Text style={card.number}>{item.tourneeNumber}</Text>
          <Text style={card.date}>{date}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {orders.length > 0 && (
        <View style={card.meta}>
          <Ionicons name="cube-outline" size={13} color={Colors.textMuted} />
          <Text style={card.metaText}>{orders.length} commande{orders.length > 1 ? 's' : ''}</Text>
        </View>
      )}

      {item.operatorNotes ? (
        <View style={card.noteRow}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.info} />
          <Text style={card.noteText} numberOfLines={1}>{item.operatorNotes}</Text>
        </View>
      ) : null}

      <View style={card.arrow}>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  number: { fontSize: 15, fontWeight: '700', color: Colors.text },
  date: { fontSize: 12, color: Colors.textSub, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  metaText: { fontSize: 12, color: Colors.textSub },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: Colors.infoBg, borderRadius: 8, padding: 8 },
  noteText: { flex: 1, fontSize: 12, color: Colors.info },
  arrow: { position: 'absolute', right: 16, top: '50%' },
});

export default function MissionsScreen() {
  const { username, logout } = useAuthStore();
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['missions'],
    queryFn: getMissions,
    refetchInterval: 30_000,
  });

  const active = data.filter(m => m.status !== 'COMPLETED');

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Image source={require('../../optiflow_transport_app_logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.welcome}>Bonjour, {username ?? 'Chauffeur'} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => { logout(); router.replace('/login'); }} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={Colors.textSub} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryNum}>{active.length}</Text>
          <Text style={s.summaryLabel}>Actives</Text>
        </View>
        <View style={s.divider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryNum}>{data.filter(m => m.status === 'PENDING').length}</Text>
          <Text style={s.summaryLabel}>En attente</Text>
        </View>
        <View style={s.divider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryNum}>{data.filter(m => m.status === 'IN_PROGRESS').length}</Text>
          <Text style={s.summaryLabel}>En cours</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Mes missions</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : active.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="checkmark-circle-outline" size={56} color={Colors.border} />
          <Text style={s.emptyText}>Aucune mission active</Text>
          <Text style={s.emptySubText}>Vos prochaines missions apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={active}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <MissionCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logo: { width: 120, height: 48 },
  welcome: { fontSize: 13, color: Colors.textSub, marginTop: 2 },
  logoutBtn: { padding: 8 },
  summary: { flexDirection: 'row', backgroundColor: Colors.card, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  summaryLabel: { fontSize: 11, color: Colors.textSub, marginTop: 2 },
  divider: { width: 1, backgroundColor: Colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSub, marginTop: 12 },
  emptySubText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },
});
