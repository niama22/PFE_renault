import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMission, acknowledgeMission, startMission, completeMission } from '../../src/api/missions.api';
import { Colors, StatusColors } from '../../src/theme/colors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={row.wrap}>
      <Ionicons name={icon as any} size={16} color={Colors.primary} style={{ width: 20 }} />
      <Text style={row.label}>{label}</Text>
      <Text style={row.value}>{value}</Text>
    </View>
  );
}
const row = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  label: { flex: 1, fontSize: 13, color: Colors.textSub },
  value: { fontSize: 13, fontWeight: '600', color: Colors.text, maxWidth: '55%', textAlign: 'right' },
});

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [showComplete, setShowComplete] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: mission, isLoading } = useQuery({
    queryKey: ['mission', id],
    queryFn: () => getMission(id!),
    refetchInterval: 15_000,
  });

  const ackMutation = useMutation({
    mutationFn: () => acknowledgeMission(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
    onError: () => Alert.alert('Erreur', 'Impossible d\'accuser réception'),
  });

  const startMutation = useMutation({
    mutationFn: () => startMission(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
    onError: () => Alert.alert('Erreur', 'Impossible de démarrer la mission'),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeMission(id!, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['missions'] }); setShowComplete(false); router.back(); },
    onError: () => Alert.alert('Erreur', 'Impossible de terminer la mission'),
  });

  if (isLoading || !mission) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const status = StatusColors[mission.status] ?? { bg: '#f3f4f6', text: '#374151', label: mission.status };
  const orders = (() => { try { return JSON.parse(mission.orderIdsJson ?? '[]'); } catch { return []; } })();
  const date = mission.plannedDate ? format(new Date(mission.plannedDate), 'EEEE dd MMMM yyyy', { locale: fr }) : '—';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Status banner */}
        <View style={[s.banner, { backgroundColor: status.bg }]}>
          <Ionicons name="truck-outline" size={28} color={status.text} />
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: status.text }]}>{mission.tourneeNumber}</Text>
            <Text style={[s.bannerStatus, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Détails de la mission</Text>
          <InfoRow icon="calendar-outline" label="Date planifiée" value={date} />
          <InfoRow icon="cube-outline" label="Commandes" value={`${orders.length} commande${orders.length !== 1 ? 's' : ''}`} />
          {mission.startedAt && <InfoRow icon="play-outline" label="Démarrage" value={format(new Date(mission.startedAt), 'dd/MM HH:mm')} />}
          {mission.acknowledgedAt && <InfoRow icon="checkmark-done-outline" label="Accusé réception" value={format(new Date(mission.acknowledgedAt), 'dd/MM HH:mm')} />}
        </View>

        {/* Operator notes */}
        {mission.operatorNotes ? (
          <View style={s.noteCard}>
            <View style={s.noteHeader}>
              <Ionicons name="information-circle" size={16} color={Colors.info} />
              <Text style={s.noteTitle}>Note de l'opérateur</Text>
            </View>
            <Text style={s.noteText}>{mission.operatorNotes}</Text>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={s.quickRow}>
          <TouchableOpacity style={s.quickBtn} onPress={() => router.push(`/messages/${id}`)}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.secondary} />
            <Text style={s.quickLabel}>Messages</Text>
          </TouchableOpacity>
          {mission.status === 'IN_PROGRESS' && (
            <TouchableOpacity style={s.quickBtn} onPress={() => router.push({ pathname: '/incident/new', params: { missionId: id } })}>
              <Ionicons name="warning-outline" size={20} color={Colors.error} />
              <Text style={[s.quickLabel, { color: Colors.error }]}>Incident</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Action button */}
      <View style={s.footer}>
        {mission.status === 'PENDING' && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: Colors.info }]}
            onPress={() => Alert.alert('Accuser réception', 'Confirmez-vous la réception de cette mission ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Confirmer', onPress: () => ackMutation.mutate() },
            ])}
            disabled={ackMutation.isPending}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
            <Text style={s.actionText}>{ackMutation.isPending ? '…' : 'Accuser réception'}</Text>
          </TouchableOpacity>
        )}
        {(mission.status === 'PENDING' || mission.status === 'ACKNOWLEDGED') && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: Colors.primary, marginTop: mission.status === 'ACKNOWLEDGED' ? 0 : 8 }]}
            onPress={() => Alert.alert('Démarrer la mission', 'Confirmez-vous le démarrage ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Démarrer', onPress: () => startMutation.mutate() },
            ])}
            disabled={startMutation.isPending}
          >
            <Ionicons name="play-outline" size={20} color="#fff" />
            <Text style={s.actionText}>{startMutation.isPending ? '…' : 'Démarrer la mission'}</Text>
          </TouchableOpacity>
        )}
        {mission.status === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: Colors.success }]}
            onPress={() => setShowComplete(true)}
          >
            <Ionicons name="flag-outline" size={20} color="#fff" />
            <Text style={s.actionText}>Terminer la mission</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Complete modal */}
      <Modal visible={showComplete} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <Text style={m.title}>Terminer la mission</Text>
            <Text style={m.sub}>Ajoutez une note de clôture (optionnel)</Text>
            <TextInput
              style={m.input}
              placeholder="Notes de livraison, commentaires…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
            <View style={m.row}>
              <TouchableOpacity style={m.cancel} onPress={() => setShowComplete(false)}>
                <Text style={m.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.confirm} onPress={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                <Text style={m.confirmText}>{completeMutation.isPending ? '…' : 'Confirmer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  bannerTitle: { fontSize: 18, fontWeight: '800' },
  bannerStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  noteCard: { backgroundColor: Colors.infoBg, borderRadius: 12, padding: 14, marginBottom: 14 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  noteTitle: { fontSize: 12, fontWeight: '700', color: Colors.info },
  noteText: { fontSize: 13, color: Colors.secondary, lineHeight: 20 },
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  quickBtn: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 16, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: Colors.secondary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.card, padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSub, marginBottom: 16 },
  input: { backgroundColor: Colors.bg, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text, textAlignVertical: 'top', minHeight: 80, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  cancel: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.bg },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSub },
  confirm: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.success },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
