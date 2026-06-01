import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/auth.store';
import { Colors } from '../src/theme/colors';

const DIGITS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

export default function PinScreen() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const isSetup = setup === '1';

  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const { savePin, verifyPin, pinHash, logout } = useAuthStore();

  useEffect(() => {
    if (!isSetup && pinHash) tryBiometric();
  }, []);

  async function tryBiometric() {
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!has || !enrolled) return;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouillez OptiFlow Driver',
      fallbackLabel: 'Utiliser le PIN',
    });
    if (result.success) router.replace('/(tabs)/missions');
  }

  function press(d: string) {
    if (d === '⌫') {
      if (step === 'enter') setPin(p => p.slice(0, -1));
      else setConfirm(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (d === '') return;

    if (step === 'enter') {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        if (isSetup) {
          setStep('confirm');
        } else {
          checkPin(next);
        }
      }
    } else {
      const next = confirm + d;
      setConfirm(next);
      if (next.length === 4) confirmPin(next);
    }
  }

  async function checkPin(entered: string) {
    const ok = await verifyPin(entered);
    if (ok) {
      router.replace('/(tabs)/missions');
    } else {
      setError('PIN incorrect. Réessayez.');
      setPin('');
    }
  }

  async function confirmPin(entered: string) {
    if (entered !== pin) {
      setError('Les PIN ne correspondent pas.');
      setPin(''); setConfirm(''); setStep('enter');
    } else {
      await savePin(pin);
      router.replace('/(tabs)/missions');
    }
  }

  const current = step === 'enter' ? pin : confirm;
  const title = isSetup
    ? (step === 'enter' ? 'Créer votre PIN' : 'Confirmez votre PIN')
    : 'Entrez votre PIN';

  return (
    <View style={s.root}>
      <Image source={require('../optiflow_transport_app_logo.png')} style={s.logo} resizeMode="contain" />

      <Text style={s.title}>{title}</Text>
      <Text style={s.sub}>
        {isSetup ? 'Ce PIN sécurise l\'accès à l\'application' : 'Bienvenue, identifiez-vous pour continuer'}
      </Text>

      {/* Dots */}
      <View style={s.dots}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[s.dot, current.length > i && s.dotFilled]} />
        ))}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {/* Keypad */}
      <View style={s.pad}>
        {DIGITS.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((d, di) => (
              <TouchableOpacity
                key={di}
                style={[s.key, d === '' && { opacity: 0 }]}
                onPress={() => press(d)}
                activeOpacity={0.7}
                disabled={d === ''}
              >
                {d === '⌫'
                  ? <Ionicons name="backspace-outline" size={22} color={Colors.secondary} />
                  : <Text style={s.keyText}>{d}</Text>
                }
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Biometric button (verify mode only) */}
      {!isSetup && (
        <TouchableOpacity style={s.bioBtn} onPress={tryBiometric}>
          <Ionicons name="finger-print-outline" size={28} color={Colors.primary} />
          <Text style={s.bioText}>Biométrie</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => { logout(); router.replace('/login'); }}>
        <Text style={s.logout}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { width: 160, height: 100, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  sub: { fontSize: 13, color: Colors.textSub, textAlign: 'center', marginBottom: 32 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.primary, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: Colors.primary },
  error: { color: Colors.error, fontSize: 13, marginBottom: 8 },
  pad: { marginTop: 8, gap: 12 },
  row: { flexDirection: 'row', gap: 20 },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  keyText: { fontSize: 26, fontWeight: '600', color: Colors.text },
  bioBtn: { marginTop: 32, alignItems: 'center', gap: 6 },
  bioText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  logout: { marginTop: 32, fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' },
});
