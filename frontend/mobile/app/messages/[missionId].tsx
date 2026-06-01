import { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getThread, sendMessage, markRead } from '../../src/api/messages.api';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/theme/colors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Message } from '../../src/types';

function Bubble({ msg, myId }: { msg: Message; myId: string }) {
  const isMe = msg.sender === 'CHAUFFEUR';
  const time = format(new Date(msg.createdAt), 'HH:mm', { locale: fr });

  return (
    <View style={[b.row, isMe ? b.rowMe : b.rowOp]}>
      {!isMe && (
        <View style={b.avatar}>
          <Ionicons name="headset-outline" size={16} color={Colors.secondary} />
        </View>
      )}
      <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleOp]}>
        {!isMe && <Text style={b.sender}>{msg.senderName ?? 'Opérateur'}</Text>}
        <Text style={[b.text, isMe ? b.textMe : b.textOp]}>{msg.content}</Text>
        <Text style={[b.time, isMe && { color: 'rgba(255,255,255,0.6)' }]}>{time}</Text>
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  rowMe: { justifyContent: 'flex-end' },
  rowOp: { justifyContent: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOp: { backgroundColor: Colors.card, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sender: { fontSize: 11, fontWeight: '700', color: Colors.textSub, marginBottom: 4 },
  text: { fontSize: 14, lineHeight: 20 },
  textMe: { color: '#fff' },
  textOp: { color: Colors.text },
  time: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
});

export default function MessagesScreen() {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const { userId } = useAuthStore();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', missionId],
    queryFn: () => getThread(missionId!),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (missionId) markRead(missionId).catch(() => {});
  }, [missionId, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(missionId!, text.trim()),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', missionId] });
    },
  });

  function handleSend() {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  }

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {messages.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubbles-outline" size={52} color={Colors.border} />
          <Text style={s.emptyText}>Aucun message</Text>
          <Text style={s.emptySub}>Envoyez un message à l'opérateur</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <Bubble msg={item} myId={userId ?? ''} />}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input bar */}
      <View style={s.bar}>
        <TextInput
          style={s.input}
          placeholder="Message…"
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sendMutation.isPending) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSub, marginTop: 12 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.text, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
