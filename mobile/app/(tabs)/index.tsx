import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { SessionProvider, useSession } from '../../src/contexts/SessionContext';
import { LevelChip } from '../../src/components/LevelChip';
import { TopicCard } from '../../src/components/TopicCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';
import { Colors, Spacing, Typography } from '../../src/constants/theme';

const TOPICS: Array<{ topic: ConversationTopic; label: string; icon: string }> = [
  { topic: 'viagens', label: 'Viagens', icon: '✈️' },
  { topic: 'trabalho', label: 'Trabalho', icon: '💼' },
  { topic: 'familia', label: 'Família', icon: '👨‍👩‍👧' },
  { topic: 'comida', label: 'Comida', icon: '🍽️' },
  { topic: 'cultura', label: 'Cultura', icon: '🎭' },
  { topic: 'livre', label: 'Livre', icon: '💬' },
];

const LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function HomeContent() {
  const { username } = useAuth();
  const { settings } = useSettings();
  const { startSession } = useSession();
  const router = useRouter();
  const [level, setLevel] = useState<UserLevel>(settings.defaultLevel);
  const [topic, setTopic] = useState<ConversationTopic>(settings.defaultTopic);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    setError('');
    setLoading(true);
    try {
      await startSession({ level, topic });
      router.push(`/session/${level}-${topic}-${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar sessão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Olá, {username ?? '—'}</Text>
      <Text style={styles.sectionTitle}>Nível</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <LevelChip key={l} level={l} selected={level === l} onPress={setLevel} />
        ))}
      </View>
      <Text style={styles.sectionTitle}>Tema</Text>
      <View style={styles.grid}>
        {TOPICS.map((t) => (
          <TopicCard key={t.topic} {...t} selected={topic === t.topic} onPress={setTopic} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Iniciar sessão" onPress={handleStart} loading={loading} />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { token } = useAuth();
  return (
    <SessionProvider token={token}>
      <HomeContent />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  greeting: { ...Typography.heading2 },
  sectionTitle: { ...Typography.label, marginTop: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  error: { color: Colors.error, fontSize: 14 },
});
