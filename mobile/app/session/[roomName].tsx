import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { SessionProvider, useSession } from '../../src/contexts/SessionContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { VoiceOrb } from '../../src/components/VoiceOrb';
import { TranscriptBubble } from '../../src/components/TranscriptBubble';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Spacing, Typography } from '../../src/constants/theme';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Aguardando',
  connecting: 'Conectando…',
  active: 'Ativo',
  ended: 'Terminado',
  error: 'Erro',
};

function SessionContent() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const router = useRouter();
  const { status, transcript, error, startSession, endSession } = useSession();
  const { settings } = useSettings();

  useEffect(() => {
    const parts = (roomName ?? '').split('-');
    const level = (parts[0] as UserLevel) || settings.defaultLevel;
    const topic = (parts[1] as ConversationTopic) || settings.defaultTopic;
    startSession({ level, topic });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnd() {
    await endSession();
    router.replace('/(tabs)');
  }

  const orbState =
    status === 'connecting' ? 'connecting' :
    status === 'active' ? 'active' : 'idle';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roomLabel}>{roomName}</Text>
        <View style={[styles.pill, status === 'active' && styles.pillActive, status === 'error' && styles.pillError]}>
          <Text style={styles.pillText}>{STATUS_LABELS[status] ?? status}</Text>
        </View>
      </View>
      <View style={styles.orbContainer}>
        <VoiceOrb state={orbState} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
        {transcript.map((entry) => (
          <TranscriptBubble key={entry.id} entry={entry} />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label="Terminar sessão"
          onPress={handleEnd}
          variant="destructive"
          disabled={status === 'ended' || status === 'connecting'}
        />
      </View>
    </View>
  );
}

export default function SessionScreen() {
  const { token } = useAuth();
  return (
    <SessionProvider token={token}>
      <SessionContent />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, paddingTop: Spacing.xl },
  roomLabel: { ...Typography.label, flex: 1 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: Colors.surface2 },
  pillActive: { backgroundColor: Colors.success + '33' },
  pillError: { backgroundColor: Colors.error + '33' },
  pillText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  orbContainer: { alignItems: 'center', paddingVertical: Spacing.xl },
  error: { color: Colors.error, textAlign: 'center', marginHorizontal: Spacing.xl },
  transcript: { flex: 1, paddingHorizontal: Spacing.md },
  transcriptContent: { gap: Spacing.xs, paddingBottom: Spacing.md },
  footer: { padding: Spacing.xl, paddingTop: Spacing.md },
});
