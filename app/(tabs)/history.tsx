import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { loadSessions, mergeRemoteSessions, computeStats } from '../../src/services/history';
import { fetchSessionsRemote } from '../../src/services/api';
import type { SessionRecord, TopicStat } from '../../src/services/history';

const WARM_GREEN = '#046A38';

const TOPIC_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  viagens: 'airplane',
  trabalho: 'briefcase',
  familia: 'account-group',
  comida: 'food-fork-drink',
  cultura: 'theater',
  livre: 'forum',
};

const TOPIC_LABELS: Record<string, string> = {
  viagens: 'Viagens',
  trabalho: 'Trabalho',
  familia: 'Família',
  comida: 'Gastronomia',
  cultura: 'Cultura',
  livre: 'Conversa Livre',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}

export default function HistoryScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0, accuracy: 0, streakDays: 0, byTopic: [] as TopicStat[] });

  useEffect(() => {
    let cancelled = false;
    const apply = (data: SessionRecord[]) => {
      if (cancelled) return;
      setSessions(data);
      setStats(computeStats(data));
    };
    // Show local history immediately, then hydrate from the server so a
    // reinstalled device recovers its past sessions.
    loadSessions().then(apply);
    fetchSessionsRemote().then((remote) => {
      if (remote) mergeRemoteSessions(remote).then(apply);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = sessions.filter((s) => {
    const d = new Date(s.startedAt);
    const today = new Date();
    const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 2;
  });

  const older = sessions.filter((s) => {
    const d = new Date(s.startedAt);
    const today = new Date();
    const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 2;
  });

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity hitSlop={8}>
            <MaterialCommunityIcons name="menu" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico</Text>
          <View style={{ width: 24 }} />
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
        <LinearGradient
          colors={[WARM_GREEN, '#4D5934', '#D53244']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.progressHero}
        >
          <Text style={styles.progressEyebrow}>O TEU PORTUGUÊS</Text>
          <Text style={styles.progressTitle}>Cada conversa conta.</Text>
          <View style={styles.progressHeroFooter}>
            <View>
              <Text style={styles.progressNumber}>{stats.totalSessions}</Text>
              <Text style={styles.progressCaption}>conversas</Text>
            </View>
            <View style={styles.progressBadge}>
              <MaterialCommunityIcons name="chart-line" size={16} color={Colors.onPrimary} />
              <Text style={styles.progressBadgeText}>{stats.accuracy}% precisão</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          {[
            { label: 'Conversas', value: String(stats.totalSessions), icon: 'forum-outline', color: Colors.primary },
            { label: 'Precisão', value: `${stats.accuracy}%`, icon: 'target', color: Colors.secondary },
            { label: 'Dias seguidos', value: String(stats.streakDays), icon: 'fire', color: Colors.tertiary },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.color + '16' }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={styles.statLabel} numberOfLines={2}>{stat.label.toUpperCase()}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {sessions.length > 0 && (
          <View style={styles.coachNote}>
            <View style={styles.coachIcon}>
              <MaterialCommunityIcons name="heart-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.coachTextWrap}>
              <Text style={styles.coachTitle}>Bom ritmo</Text>
              <Text style={styles.coachText}>
                O próximo passo é manter conversas curtas e constantes.
              </Text>
            </View>
          </View>
        )}

        {/* Topic breakdown */}
        {stats.byTopic.length > 0 && (
          <>
            <Text style={styles.groupLabel}>PROGRESSO POR TÓPICO</Text>
            <View style={styles.topicBreakdown}>
              {stats.byTopic.map((t) => (
                <TopicProgressRow key={t.topic} stat={t} />
              ))}
            </View>
          </>
        )}

        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="microphone-off" size={48} color={Colors.outline} />
            <Text style={styles.emptyText}>Ainda sem sessões</Text>
            <Text style={styles.emptySubtext}>Começa uma conversa no separador principal</Text>
          </View>
        ) : (
          <>
            {recent.length > 0 && (
              <>
                <Text style={styles.groupLabel}>RECENTE</Text>
                {recent.map((s, index) => (
                  <SessionCardItem key={`${s.id}-${s.startedAt}-${index}`} session={s} />
                ))}
              </>
            )}
            {older.length > 0 && (
              <>
                <Text style={[styles.groupLabel, { marginTop: Spacing.xl }]}>ANTERIOR</Text>
                {older.map((s, index) => (
                  <SessionCardItem key={`${s.id}-${s.startedAt}-${index}`} session={s} />
                ))}
              </>
            )}
          </>
        )}

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

function TopicProgressRow({ stat }: { stat: TopicStat }) {
  const icon = TOPIC_ICONS[stat.topic] ?? 'forum';
  const label = TOPIC_LABELS[stat.topic] ?? stat.topic;
  const barColor = stat.accuracy >= 80 ? Colors.primary : Colors.tertiary;

  return (
    <View style={styles.topicRow}>
      <MaterialCommunityIcons name={icon} size={16} color={Colors.secondary} style={{ width: 20 }} />
      <Text style={styles.topicRowLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.topicBarTrack}>
        <View style={[styles.topicBarFill, { width: `${stat.accuracy}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.topicRowAcc, { color: barColor }]}>{stat.accuracy}%</Text>
    </View>
  );
}

function SessionCardItem({ session }: { session: SessionRecord }) {
  if (!session?.id) return null;
  const icon = TOPIC_ICONS[session.topic] ?? 'forum';
  const label = TOPIC_LABELS[session.topic] ?? session.topic;
  const excellent = (session.correctionCount ?? 0) === 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/session-detail/[id]', params: { id: session.id } } as any)}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={styles.topicIcon}>
            <MaterialCommunityIcons name={icon} size={22} color={Colors.onSurface} />
          </View>
          <View>
            <Text style={styles.cardTopic}>{label}</Text>
            <Text style={styles.cardMeta}>
              {formatDate(session.startedAt)} · {formatDuration(session.durationSeconds)}
            </Text>
          </View>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{session.level}</Text>
        </View>
      </View>

      {session.excerpt ? (
        <Text style={styles.cardExcerpt}>"{session.excerpt}"</Text>
      ) : null}

      <View style={styles.cardBottom}>
        <View style={styles.cardBottomLeft}>
          {excellent ? (
            <>
              <MaterialCommunityIcons name="check-circle" size={14} color={Colors.primary} />
              <Text style={styles.excellentText}>Excelente progresso</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.tertiary} />
              <Text style={styles.correctionsText}>{session.correctionCount} correções</Text>
            </>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.onSurface + '33'} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.background + 'CC' },
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
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  progressHero: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    minHeight: 190,
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  progressEyebrow: {
    fontFamily: Typography.labelMedium,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.onSurface + 'D8',
  },
  progressTitle: {
    fontFamily: Typography.headline,
    fontSize: 34,
    lineHeight: 39,
    color: Colors.onSurface,
    maxWidth: 260,
  },
  progressHeroFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  progressNumber: {
    fontFamily: Typography.headline,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.onSurface,
  },
  progressCaption: {
    fontFamily: Typography.labelMedium,
    fontSize: 12,
    color: Colors.onSurface + 'CC',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
  },
  progressBadgeText: {
    fontFamily: Typography.labelMedium,
    fontSize: 12,
    color: Colors.onPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  statCard: {
    backgroundColor: Colors.surfaceContainer,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 118,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.secondary + '18',
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.onSurface + '66',
    letterSpacing: 2,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Typography.headline,
    fontSize: 34,
    lineHeight: 38,
  },
  coachNote: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '18',
    marginBottom: Spacing.md,
  },
  coachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WARM_GREEN,
  },
  coachTextWrap: { flex: 1 },
  coachTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  coachText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  groupLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.onSurface + '66',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginBottom: 8,
    marginTop: Spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Typography.headlineBold,
    fontSize: 18,
    color: Colors.onSurface,
  },
  emptySubtext: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '16',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WARM_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopic: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  cardMeta: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurface + '66',
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '16',
  },
  levelBadgeText: {
    fontFamily: Typography.headlineBold,
    fontSize: 12,
    color: Colors.primary,
  },
  cardExcerpt: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.onSurface + '0D',
  },
  cardBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  correctionsText: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.tertiary,
  },
  excellentText: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.onSurface + '66',
  },

  // Topic breakdown
  topicBreakdown: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '16',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topicRowLabel: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    width: 90,
  },
  topicBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  topicBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  topicRowAcc: {
    fontFamily: Typography.labelMedium,
    fontSize: 11,
    width: 36,
    textAlign: 'right',
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
