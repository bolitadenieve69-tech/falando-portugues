import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';
import { loadPreferences } from '../../src/services/preferences';
import { loadSessions, computeStats } from '../../src/services/history';

const LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface TopicItem {
  key: ConversationTopic;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent: string;
}

const TOPICS: TopicItem[] = [
  { key: 'viagens',  label: 'Viagens',  icon: 'airplane-takeoff', accent: '#4A90D9' },
  { key: 'trabalho', label: 'Trabalho', icon: 'briefcase',         accent: '#9B59B6' },
  { key: 'familia',  label: 'Família',  icon: 'account-group',     accent: '#E67E22' },
  { key: 'comida',   label: 'Comida',   icon: 'food-fork-drink',   accent: '#E74C3C' },
  { key: 'cultura',  label: 'Cultura',  icon: 'theater',           accent: '#F39C12' },
  { key: 'livre',    label: 'Livre',    icon: 'forum',             accent: Colors.primary },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function HomeScreen() {
  const [selectedLevel, setSelectedLevel] = useState<UserLevel>('B1');
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [username, setUsername] = useState('');

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPreferences().then((prefs) => setSelectedLevel(prefs.level));
    loadSessions().then((sessions) => {
      const stats = computeStats(sessions);
      setStreakDays(stats.streakDays);
      setTotalSessions(stats.totalSessions);
    });
    SecureStore.getItemAsync('auth_username').then((name) => setUsername(name ?? ''));
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.15] });

  function handleStartSession() {
    router.push({
      pathname: '/session/[id]',
      params: { id: 'new', level: selectedLevel, topic: selectedTopic ?? 'livre' },
    } as any);
  }

  const initial = username ? username[0].toUpperCase() : '?';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingLabel}>{greeting().toUpperCase()}</Text>
            <Text style={styles.greetingName}>{username || 'Bem-vindo'} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <TouchableOpacity style={styles.heroCard} onPress={handleStartSession} activeOpacity={0.88}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
          <View style={styles.micButton}>
            <MaterialCommunityIcons name="microphone" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.heroText}>
            Toca para começar a praticar{'\n'}
            <Text style={styles.heroHighlight}>português europeu</Text>
            {' '}agora
          </Text>
        </TouchableOpacity>

        {/* Level */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>O meu nível</Text>
            <Text style={styles.sectionBadge}>PROGRESSO</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelRow}>
            {LEVELS.map((level) => {
              const active = selectedLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.levelChip, active && styles.levelChipActive]}
                  onPress={() => setSelectedLevel(level)}
                >
                  <Text style={[styles.levelChipText, active && styles.levelChipTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tema</Text>
          <View style={styles.topicsGrid}>
            {TOPICS.map((topic) => {
              const isActive = selectedTopic === topic.key;
              return (
                <TouchableOpacity
                  key={topic.key}
                  style={[styles.topicCard, isActive && { backgroundColor: topic.accent + '22', borderColor: topic.accent + '66' }]}
                  onPress={() => setSelectedTopic(isActive ? null : topic.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.topicIconWrap, { backgroundColor: topic.accent + '18' }]}>
                    <MaterialCommunityIcons name={topic.icon} size={28} color={topic.accent} />
                  </View>
                  <Text style={styles.topicLabel}>{topic.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: Colors.tertiary + '33' }]}>
            <MaterialCommunityIcons name="fire" size={18} color={Colors.tertiary} />
            <Text style={[styles.statValue, { color: Colors.tertiary }]}>{streakDays}</Text>
            <Text style={styles.statLabel}>Dias seguidos</Text>
          </View>
          <View style={[styles.statCard, { borderColor: Colors.primary + '33' }]}>
            <MaterialCommunityIcons name="message-text" size={18} color={Colors.primary} />
            <Text style={[styles.statValue, { color: Colors.primary }]}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Conversas</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greetingLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 2,
  },
  greetingName: {
    fontFamily: Typography.headline,
    fontSize: 22,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '44',
  },
  avatarText: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: Colors.primary,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },

  heroCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '1A',
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary + '0F',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  heroText: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  heroHighlight: {
    fontFamily: Typography.headlineBold,
    color: Colors.primary,
  },

  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 18,
    color: Colors.onSurface,
  },
  sectionBadge: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 2,
  },

  levelRow: { gap: 8, paddingVertical: 4 },
  levelChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  levelChipActive: { backgroundColor: Colors.primary },
  levelChipText: {
    fontFamily: Typography.headlineBold,
    fontSize: 14,
    color: Colors.onSurface + '88',
  },
  levelChipTextActive: { color: '#002200' },

  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  topicCard: {
    width: '31%',
    aspectRatio: 0.9,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  topicIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicLabel: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.onSurface,
    textAlign: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  statValue: {
    fontFamily: Typography.headline,
    fontSize: 36,
    lineHeight: 40,
  },
  statLabel: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
});
