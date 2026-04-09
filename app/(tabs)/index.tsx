import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';
import { loadPreferences } from '../../src/services/preferences';
import { loadSessions, computeStats } from '../../src/services/history';

const LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface TopicItem {
  key: ConversationTopic;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  subtitle: string;
}

const TOPICS: TopicItem[] = [
  { key: 'viagens', label: 'Viagens', icon: 'airplane-takeoff', subtitle: '✈️ Vocabulário' },
  { key: 'trabalho', label: 'Trabalho', icon: 'briefcase', subtitle: '💼 Profissional' },
  { key: 'familia', label: 'Família', icon: 'account-group', subtitle: '👨‍👩‍👧 Relações' },
  { key: 'comida', label: 'Comida', icon: 'food-fork-drink', subtitle: '🍽️ Gastronomia' },
  { key: 'cultura', label: 'Cultura', icon: 'theater', subtitle: '🎭 Tradições' },
  { key: 'livre', label: 'Livre', icon: 'forum', subtitle: '💬 Conversa' },
];

export default function HomeScreen() {
  const [selectedLevel, setSelectedLevel] = useState<UserLevel>('B1');
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    loadPreferences().then((prefs) => setSelectedLevel(prefs.level));
    loadSessions().then((sessions) => {
      const stats = computeStats(sessions);
      setStreakDays(stats.streakDays);
      setTotalSessions(stats.totalSessions);
    });
  }, []);

  function handleStartSession() {
    router.push({
      pathname: '/session/[id]',
      params: { id: 'new', level: selectedLevel, topic: selectedTopic ?? 'livre' },
    } as any);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity hitSlop={8}>
            <MaterialCommunityIcons name="menu" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Falando Português</Text>
          <View style={styles.avatar} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mic Hero */}
        <View style={styles.heroSection}>
          <View style={styles.pulseOuter} />
          <View style={styles.pulseInner} />
          <TouchableOpacity
            style={styles.micButton}
            onPress={handleStartSession}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="microphone"
              size={64}
              color={Colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Começar Prática</Text>
          <Text style={styles.heroSubtitle}>TOQUE PARA FALAR EM PORTUGUÊS</Text>
        </View>

        {/* Level Selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Nível Atual</Text>
            <Text style={styles.sectionValue}>
              {selectedLevel === 'A1' || selectedLevel === 'A2'
                ? 'Iniciante'
                : selectedLevel === 'B1' || selectedLevel === 'B2'
                ? 'Intermédio'
                : 'Avançado'}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.levelRow}
          >
            {LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelChip,
                  selectedLevel === level && styles.levelChipActive,
                ]}
                onPress={() => setSelectedLevel(level)}
              >
                <Text
                  style={[
                    styles.levelChipText,
                    selectedLevel === level && styles.levelChipTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Topic Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.topicsTitle}>Explorar Tópicos</Text>
            <MaterialCommunityIcons name="auto-fix" size={20} color={Colors.primary} />
          </View>
          <View style={styles.topicsGrid}>
            {TOPICS.map((topic) => {
              const isActive = selectedTopic === topic.key;
              const isFree = topic.key === 'livre';
              return (
                <TouchableOpacity
                  key={topic.key}
                  style={[
                    styles.topicCard,
                    isActive && styles.topicCardActive,
                    isFree && styles.topicCardFree,
                  ]}
                  onPress={() => setSelectedTopic(isActive ? null : topic.key)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.topicIconWrap,
                      isFree && styles.topicIconWrapFree,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={topic.icon}
                      size={24}
                      color={isFree ? Colors.primary : Colors.primary}
                    />
                  </View>
                  <Text
                    style={[styles.topicLabel, isFree && styles.topicLabelFree]}
                  >
                    {topic.label}
                  </Text>
                  <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Stats Bento */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>DIAS SEGUIDOS</Text>
            <Text style={[styles.statValue, { color: Colors.tertiary }]}>{streakDays}</Text>
            <Text style={styles.statSub}>{streakDays > 0 ? 'Ótimo progresso!' : 'Começa hoje!'}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardBorder, { flex: 1 }]}>
            <Text style={styles.statLabel}>CONVERSAS</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{totalSessions}</Text>
            <Text style={styles.statSub}>Sessões completadas</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    backgroundColor: Colors.background + 'CC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 20,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  pulseOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: Colors.primary + '1A',
  },
  pulseInner: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: Colors.primary + '0D',
  },
  micButton: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  heroTitle: {
    fontFamily: Typography.headline,
    fontSize: 28,
    color: Colors.onSurface,
    marginTop: Spacing.lg,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 3,
    marginTop: 6,
  },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant + '99',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionValue: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Level chips
  levelRow: { gap: 10, paddingVertical: 4 },
  levelChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  levelChipActive: {
    backgroundColor: Colors.primaryContainer,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  levelChipText: {
    fontFamily: Typography.headlineBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  levelChipTextActive: {
    color: Colors.primary,
  },

  // Topics
  topicsTitle: {
    fontFamily: Typography.headline,
    fontSize: 20,
    color: Colors.onSurface,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  topicCard: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '1A',
  },
  topicCardActive: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderColor: Colors.primary + '33',
  },
  topicCardFree: {
    borderColor: Colors.primary + '33',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  topicIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.secondaryContainer + '4D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  topicIconWrapFree: {
    backgroundColor: Colors.primaryContainer + '33',
  },
  topicLabel: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  topicLabelFree: { color: Colors.primary },
  topicSubtitle: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  statCard: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    height: 160,
    justifyContent: 'space-between',
  },
  statCardBorder: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '1A',
  },
  statLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: Typography.headline,
    fontSize: 48,
    lineHeight: 52,
  },
  statSub: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
});
