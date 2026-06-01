import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMissions } from '../../src/api/missions.api';
import { Colors } from '../../src/theme/colors';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Mission } from '../../src/types';

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <View style={stat.card}>
      <View style={[stat.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}
const stat = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  value: { fontSize: 22, fontWeight: '800', color: Colors.text },
  label: { fontSize: 11, color: Colors.textSub, textAlign: 'center', marginTop: 2 },
});

function HistoryCard({ item }: { item: Mission }) {
  const startDate = item.plannedDate ? format(new Date(item.plannedDate), 'dd MMM yyyy', { locale: fr }) : '—';
  const duration = item.startedAt && item.completedAt
    ? `${differenceInMinutes(new Date(item.completedAt), new Date(item.startedAt))} min`
    : null;

  return (
    <View style={h.card}>
      <View style={h.row}>
        <View style={[h.iconWrap, { backgroundColor: item.status === 'COMPLETED' ? Colors.successBg : Colors.errorBg }]}>
          <Ionicons
            name={item.status === 'COMPLETED' ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={item.status === 'COMPLETED' ? Colors.success : Colors.error}
          />
        </View>
        <View style={h.info}>
          <Text style={h.number}>{item.tourneeNumber}</Text>
          <Text style={h.date}>{startDate}</Text>
        </View>
        {duration && (
          <View style={h.durationBadge}>
            <Ionicons name="time-outline" size={12} color={Colors.textSub} />
            <Text style={h.durationText}>{duration}</Text>
          </View>
        )}
      </View>
      {item.completionNotes ? (
        <Text style={h.notes} numberOfLines={2}>{item.completionNotes}</Text>
      ) : null}
    </View>
  );
}

const h = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  number: { fontSize: 14, fontWeight: '700', color: Colors.text },
  date: { fontSize: 12, color: Colors.textSub, marginTop: 2 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  durationText: { fontSize: 11, color: Colors.textSub },
  notes: { fontSize: 12, color: Colors.textMuted, marginTop: 8, lineHeight: 18 },
});

export default function HistoryScreen() {
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['missions'],
    queryFn: getMissions,
  });

  const completed = data.filter(m => m.status === 'COMPLETED');
  const total = data.length;
  const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const avgDuration = (() => {
    const withTimes = completed.filter(m => m.startedAt && m.completedAt);
    if (withTimes.length === 0) return '—';
    const avg = withTimes.reduce((sum, m) => sum + differenceInMinutes(new Date(m.completedAt!), new Date(m.startedAt!)), 0) / withTimes.length;
    return `${Math.round(avg)} min`;
  })();

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Historique</Text>
        <Text style={s.sub}>{completed.length} mission{completed.length !== 1 ? 's' : ''} terminée{completed.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <StatCard icon="checkmark-done-outline" value={completed.length} label="Terminées" color={Colors.success} />
        <StatCard icon="trending-up-outline" value={`${rate}%`} label="Taux réussite" color={Colors.primary} />
        <StatCard icon="time-outline" value={avgDuration} label="Durée moy." color={Colors.info} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : completed.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="time-outline" size={52} color={Colors.border} />
          <Text style={s.emptyText}>Aucune mission terminée</Text>
        </View>
      ) : (
        <FlatList
          data={completed.slice().reverse()}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <HistoryCard item={item} />}
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
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 13, color: Colors.textSub, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 16 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textSub, marginTop: 12 },
});
