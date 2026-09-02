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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';
import { summariseLastConversation } from '../../src/features/session/utils/lastConversation';
import { loadPreferences, savePreferences } from '../../src/services/preferences';
import { voiceName } from '../../src/constants/voices';
import { loadSessions, computeStats } from '../../src/services/history';
import type { SessionRecord } from '../../src/services/history';
import { LevelAssessmentCard } from '../../src/features/settings/components/LevelAssessmentCard';

const LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PORTUGAL_GREEN = Colors.flagGreen;
const PORTUGAL_RED = Colors.flagRed;

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
  // Aimed at people preparing Portugal's citizenship test (TNIC). The tutor
  // covers the five domains the nationality law names; see backend/languages/pt_pt.py.
  { key: 'cidadania', label: 'Cidadania', icon: 'bank',             accent: Colors.flagGreen },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** "Hoje", "Ontem" o la fecha corta. Lo que sitúa una conversación en el tiempo. */
function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [tutorName, setTutorName] = useState('Tutor');
  const [selectedLevel, setSelectedLevel] = useState<UserLevel>('B1');
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [username, setUsername] = useState('');
  const [lastSession, setLastSession] = useState<SessionRecord | null>(null);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPreferences().then((prefs) => {
      setSelectedLevel(prefs.level);
      setTutorName(voiceName(prefs.voiceId));
    });
    loadSessions().then((sessions) => {
      const stats = computeStats(sessions);
      setStreakDays(stats.streakDays);
      setTotalSessions(stats.totalSessions);
      setLastSession(sessions[0] ?? null);
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

  function applyLevel(level: UserLevel) {
    setSelectedLevel(level);
    loadPreferences().then((prefs) => savePreferences({ ...prefs, level }));
  }

  const initial = username ? username[0].toUpperCase() : '?';
  const topicLabels = Object.fromEntries(TOPICS.map((t) => [t.key, t.label]));
  const lastConversation = summariseLastConversation(lastSession, topicLabels, formatDate);

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
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          setIsAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 24);
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.lisbonCard}>
          <LinearGradient
            colors={[PORTUGAL_GREEN, '#6A5F38', PORTUGAL_RED]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.lisbonGradient}
          >
            <Text style={styles.lisbonEyebrow}>PORTUGUÊS EUROPEU</Text>
            <Text style={styles.lisbonTitle}>Pratica como se estivesses em Lisboa</Text>
          </LinearGradient>

          <TouchableOpacity style={styles.startPanel} onPress={handleStartSession} activeOpacity={0.88}>
            <Animated.View style={[styles.startPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
            <View style={styles.startIcon}>
              <Text style={styles.startIconEmoji}>🎙️</Text>
            </View>
            <View style={styles.startTextWrap}>
              <Text style={styles.startTitle}>Começar agora</Text>
              <Text style={styles.startSubtitle} numberOfLines={2}>
                {tutorName} · {selectedLevel} · {TOPICS.find((t) => t.key === selectedTopic)?.label ?? 'Livre'}
              </Text>
            </View>
          </TouchableOpacity>

          {lastConversation && (
            <View style={styles.lastConversationCard}>
              <Text style={styles.lastConversationLabel}>ÚLTIMA CONVERSA</Text>
              <Text style={styles.lastConversationText}>{lastConversation.headline}</Text>
              {lastConversation.quote && (
                <Text style={styles.lastConversationQuote} numberOfLines={2}>
                  "{lastConversation.quote}"
                </Text>
              )}
            </View>
          )}
        </View>

        <LevelAssessmentCard
          currentLevel={selectedLevel}
          onApplyLevel={applyLevel}
        />

        {/* Level */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>O meu nível</Text>
            <Text style={styles.sectionBadge}>PROGRESSO</Text>
          </View>
          <View style={styles.levelRow}>
            {LEVELS.map((level) => {
              const active = selectedLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.levelChip, active && styles.levelChipActive]}
                  onPress={() => applyLevel(level)}
                >
                  <Text style={[styles.levelChipText, active && styles.levelChipTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
                  style={[styles.topicCard, isActive && { backgroundColor: topic.accent + '22', borderColor: topic.accent + '88' }]}
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
          {selectedTopic === 'cidadania' && (
            <Text style={styles.topicDisclaimer}>
              Serve para praticares português sobre estes temas. Não é material de
              estudo: confirma sempre datas e requisitos numa fonte oficial.
            </Text>
          )}
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

        <View style={{ height: 48 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.scrollToEndButton}
        onPress={() => {
          if (isAtEnd) {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          } else {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
        activeOpacity={0.82}
      >
        <MaterialCommunityIcons name={isAtEnd ? 'arrow-up' : 'arrow-down'} size={22} color={Colors.onPrimary} />
      </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  lisbonCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.secondary + '18',
  },
  lisbonGradient: {
    minHeight: 190,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 74,
  },
  lisbonEyebrow: {
    fontFamily: Typography.labelMedium,
    fontSize: 12,
    letterSpacing: 4,
    color: Colors.onSurface + 'D8',
    marginBottom: Spacing.sm,
  },
  lisbonTitle: {
    fontFamily: Typography.headline,
    fontSize: 34,
    lineHeight: 40,
    color: Colors.onSurface,
    maxWidth: 300,
  },
  startPanel: {
    marginTop: -50,
    marginHorizontal: Spacing.lg,
    minHeight: 136,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  startPulse: {
    position: 'absolute',
    left: Spacing.lg + 10,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.primary + '18',
  },
  startIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startIconEmoji: {
    fontSize: 44,
    lineHeight: 50,
  },
  startTextWrap: { flex: 1, minWidth: 0 },
  startTitle: {
    fontFamily: Typography.headline,
    fontSize: 28,
    lineHeight: 32,
    color: Colors.onSurface,
  },
  startSubtitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  topicDisclaimer: {
    fontFamily: Typography.label,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
    paddingHorizontal: 2,
  },
  lastConversationCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  lastConversationLabel: {
    fontFamily: Typography.labelMedium,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  lastConversationText: {
    fontFamily: Typography.headlineBold,
    fontSize: 18,
    lineHeight: 26,
    color: Colors.onSurface,
  },
  lastConversationQuote: {
    fontFamily: Typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
    marginTop: 6,
  },

  heroCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.secondary + '22',
    overflow: 'hidden',
    minHeight: 250,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  heroAccentRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    flexDirection: 'row',
  },
  heroAccentGreen: { flex: 3, backgroundColor: PORTUGAL_GREEN },
  heroAccentRed: { flex: 2, backgroundColor: PORTUGAL_RED },
  heroTopRow: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerHighest + 'AA',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '66',
  },
  heroBadgeText: {
    fontFamily: Typography.labelMedium,
    fontSize: 11,
    color: Colors.secondary,
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
    backgroundColor: PORTUGAL_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  heroCopy: { alignItems: 'center', gap: Spacing.sm },
  heroTitle: {
    fontFamily: Typography.headline,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  heroText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  heroMetaRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary + '12',
  },
  heroMetaText: {
    fontFamily: Typography.labelMedium,
    fontSize: 12,
    color: Colors.primary,
  },
  heroHint: {
    flexShrink: 1,
    fontFamily: Typography.labelMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'right',
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

  levelRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  levelChip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 8,
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
  levelChipTextActive: { color: Colors.onPrimary },

  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  topicCard: {
    width: '31%',
    minHeight: 112,
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
    fontFamily: Typography.labelMedium,
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
  scrollToEndButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 96,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
});
