import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { loginWithPassword, parseJwt } from '../src/api/auth.api';
import { useAuthStore } from '../src/store/auth.store';
import { Colors } from '../src/theme/colors';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth, pinHash } = useAuthStore();

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Identifiant et mot de passe requis');
      return;
    }
    setLoading(true);
    try {
      const tokens = await loginWithPassword(username.trim(), password);
      const payload = parseJwt(tokens.access_token);

      const roles: string[] = payload.realm_access?.roles ?? [];
      if (!roles.includes('chauffeur')) {
        Alert.alert('Accès refusé', 'Ce compte n\'est pas autorisé à accéder à l\'app chauffeur.');
        setLoading(false);
        return;
      }

      await setAuth(
        tokens.access_token,
        tokens.refresh_token,
        payload.sub,
        payload.preferred_username ?? username,
      );

      if (pinHash) {
        router.replace('/pin');
      } else {
        router.replace('/pin?setup=1');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      Alert.alert(
        'Connexion échouée',
        status === 401 ? 'Identifiant ou mot de passe incorrect.' : 'Impossible de contacter le serveur.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoWrap}>
          <Image
            source={require('../optiflow_transport_app_logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Connexion</Text>
          <Text style={s.subtitle}>Espace chauffeur OptiFlow</Text>

          <View style={s.inputWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Identifiant"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Mot de passe"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 4 }}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>{loading ? 'Connexion…' : 'Se connecter'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>OptiFlow Driver · Mobile Logistics</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: Colors.bg, alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logoWrap: { marginBottom: 32 },
  logo: { width: 220, height: 140 },
  card: { width: '100%', backgroundColor: Colors.card, borderRadius: 20, padding: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textSub, marginBottom: 28 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  btn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { marginTop: 40, fontSize: 12, color: Colors.textMuted },
});
