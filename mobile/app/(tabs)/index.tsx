import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
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

export default function HomeScreen() {
  const { username } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [level, setLevel] = useState<UserLevel>(settings.level);
  const [topic, setTopic] = useState<ConversationTopic>(settings.topic);

  function handleStart() {
    router.push(`/session/${level}-${topic}-${Date.now()}`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Olá, {username ?? '—'}</Text>
      <Text style={styles.sectionTitle}>Nível</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <LevelChip key={l} level={l} selected={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>
      <Text style={styles.sectionTitle}>Tema</Text>
      <View style={styles.grid}>
        {TOPICS.map((t) => (
          <TopicCard key={t.topic} {...t} selected={topic === t.topic} onPress={() => setTopic(t.topic)} />
        ))}
      </View>
      <PrimaryButton label="Iniciar sessão" onPress={handleStart} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  greeting: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
