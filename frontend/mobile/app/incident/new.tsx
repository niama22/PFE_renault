import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createIncident } from '../../src/api/incidents.api';
import { Colors, SeverityColors } from '../../src/theme/colors';
import type { IncidentSeverity } from '../../src/types';

const INCIDENT_TYPES = [
  { label: 'Retard de livraison',      severity: 'MEDIUM' as IncidentSeverity },
  { label: 'Véhicule endommagé',       severity: 'HIGH'   as IncidentSeverity },
  { label: 'Commande incomplète',      severity: 'MEDIUM' as IncidentSeverity },
  { label: 'Mauvaise référence',       severity: 'MEDIUM' as IncidentSeverity },
  { label: 'Problème d\'accès',        severity: 'LOW'    as IncidentSeverity },
  { label: 'Incident en transit',      severity: 'HIGH'   as IncidentSeverity },
  { label: 'Accident de la route',     severity: 'CRITICAL' as IncidentSeverity },
  { label: 'Autre (précisez)',         severity: 'MEDIUM' as IncidentSeverity },
];

const SEVERITIES: { key: IncidentSeverity; label: string }[] = [
  { key: 'LOW',      label: 'Faible' },
  { key: 'MEDIUM',   label: 'Moyen' },
  { key: 'HIGH',     label: 'Élevé' },
  { key: 'CRITICAL', label: 'Critique' },
];

export default function NewIncidentScreen() {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const qc = useQueryClient();

  const [selectedType, setSelectedType] = useState<typeof INCIDENT_TYPES[0] | null>(null);
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [customMotif, setCustomMotif] = useState('');
  const [details, setDetails] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const isAutre = selectedType?.label.startsWith('Autre');
      const motif = isAutre ? customMotif.trim() : selectedType!.label;
      const description = [motif, details.trim()].filter(Boolean).join('\n\n');
      return createIncident({ missionId: missionId!, description, severity });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      Alert.alert('Incident signalé', 'L\'opérateur a été notifié.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: () => Alert.alert('Erreur', 'Impossible de signaler l\'incident'),
  });

  function handleSubmit() {
    if (!selectedType) { Alert.alert('Requis', 'Sélectionnez un type d\'incident'); return; }
    if (selectedType.label.startsWith('Autre') && !customMotif.trim()) {
      Alert.alert('Requis', 'Précisez le motif de l\'incident'); return;
    }
    mutation.mutate();
  }

  function selectType(t: typeof INCIDENT_TYPES[0]) {
    setSelectedType(t);
    setSeverity(t.severity);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* Type selection */}
      <View style={s.card}>
        <Text style={s.label}>Type d'incident <Text style={{ color: Colors.error }}>*</Text></Text>
        <View style={s.grid}>
          {INCIDENT_TYPES.map(t => {
            const active = selectedType?.label === t.label;
            const sev = SeverityColors[t.severity];
            return (
              <TouchableOpacity
                key={t.label}
                style={[s.typeBtn, active && { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }]}
                onPress={() => selectType(t)}
                activeOpacity={0.8}
              >
                {active && <Ionicons name="checkmark-circle" size={14} color={Colors.primary} style={{ position: 'absolute', top: 6, right: 6 }} />}
                <Ionicons
                  name={active ? 'warning' : 'warning-outline'}
                  size={18}
                  color={active ? Colors.primary : sev.text}
                />
                <Text style={[s.typeBtnText, active && { color: Colors.primary }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Custom motif */}
      {selectedType?.label.startsWith('Autre') && (
        <View style={s.card}>
          <Text style={s.label}>Motif <Text style={{ color: Colors.error }}>*</Text></Text>
          <TextInput
            style={s.input}
            placeholder="Décrivez brièvement le motif…"
            placeholderTextColor={Colors.textMuted}
            value={customMotif}
            onChangeText={setCustomMotif}
          />
        </View>
      )}

      {/* Severity */}
      <View style={s.card}>
        <Text style={s.label}>Sévérité</Text>
        <View style={s.sevRow}>
          {SEVERITIES.map(sv => {
            const active = severity === sv.key;
            const cfg = SeverityColors[sv.key];
            return (
              <TouchableOpacity
                key={sv.key}
                style={[s.sevBtn, active && { backgroundColor: cfg.bg, borderColor: cfg.text }]}
                onPress={() => setSeverity(sv.key)}
              >
                <Text style={[s.sevText, active && { color: cfg.text, fontWeight: '700' }]}>{sv.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Details */}
      <View style={s.card}>
        <Text style={s.label}>Détails supplémentaires (optionnel)</Text>
        <TextInput
          style={[s.input, { height: 90, textAlignVertical: 'top' }]}
          placeholder="Heure, lieu, numéro de châssis, informations complémentaires…"
          placeholderTextColor={Colors.textMuted}
          multiline
          value={details}
          onChangeText={setDetails}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
        activeOpacity={0.8}
      >
        {mutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="warning-outline" size={18} color="#fff" />
              <Text style={s.submitText}>Signaler l'incident</Text>
            </>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg, width: '47%' },
  typeBtnText: { fontSize: 12, color: Colors.text, flex: 1, flexWrap: 'wrap' },
  input: { backgroundColor: Colors.bg, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  sevRow: { flexDirection: 'row', gap: 8 },
  sevBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg },
  sevText: { fontSize: 12, color: Colors.textSub },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.error, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
