import { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { loadSessions } from '../../src/services/history';
import type { SessionRecord } from '../../src/services/history';

const WARM_GREEN = Colors.flagGreen;
const WARM_RED = Colors.flagRed;

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

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seg`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} min ${s} seg` : `${m} min`;
}

function accuracy(record: SessionRecord): number {
  if (record.messageCount === 0) return 100;
  return Math.round(((record.messageCount - record.correctionCount) / record.messageCount) * 100);
}

interface StatRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  valueColor?: string;
}

function StatRow({ icon, label, value, valueColor }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={Colors.primary + 'B3'} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    loadSessions().then((all) => {
      setSession(all.find((s) => s.id === id) ?? null);
    });
  }, [id]);

  if (!session) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.outline} />
          <Text style={styles.emptyText}>Sessão não encontrada</Text>
        </View>
      </View>
    );
  }

  const icon = TOPIC_ICONS[session.topic] ?? 'forum';
  const label = TOPIC_LABELS[session.topic] ?? session.topic;
  const acc = accuracy(session);
  const excellent = session.correctionCount === 0;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhe da Sessão</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <LinearGradient
          colors={[WARM_GREEN, '#4D5934', WARM_RED]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.topicIconWrap}>
              <MaterialCommunityIcons name={icon} size={32} color={Colors.primary} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTopic}>{label}</Text>
              <Text style={styles.heroDate}>{formatDateTime(session.startedAt)}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{session.level}</Text>
            </View>
          </View>

          {session.excerpt ? (
            <View style={styles.excerptBox}>
              <MaterialCommunityIcons
                name="format-quote-open"
                size={16}
                color={Colors.primary + '66'}
              />
              <Text style={styles.excerptText}>{session.excerpt}</Text>
            </View>
          ) : null}
        </LinearGradient>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <View style={styles.statsCard}>
          <StatRow
            icon="timer-outline"
            label="Duração"
            value={formatDuration(session.durationSeconds)}
          />
          <View style={styles.divider} />
          <StatRow
            icon="message-outline"
            label="Mensagens"
            value={String(session.messageCount)}
          />
          <View style={styles.divider} />
          <StatRow
            icon="auto-fix"
            label="Correções"
            value={String(session.correctionCount)}
            valueColor={session.correctionCount > 0 ? Colors.tertiary : undefined}
          />
          <View style={styles.divider} />
          <StatRow
            icon="percent"
            label="Precisão"
            value={`${acc}%`}
            valueColor={acc >= 80 ? Colors.primary : Colors.tertiary}
          />
        </View>

        {/* Result badge */}
        <View style={[styles.resultBadge, excellent ? styles.resultExcellent : styles.resultOk]}>
          <MaterialCommunityIcons
            name={excellent ? 'trophy-outline' : 'school-outline'}
            size={20}
            color={excellent ? Colors.primary : Colors.tertiary}
          />
          <Text style={[styles.resultText, excellent ? styles.resultTextExcellent : styles.resultTextOk]}>
            {excellent
              ? 'Sessão sem erros — excelente!'
              : `${session.correctionCount} correção${session.correctionCount !== 1 ? 'ões' : ''} — continua a praticar!`}
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
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
    fontSize: 18,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  backButton: { padding: 4, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  topicIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { flex: 1 },
  heroTopic: {
    fontFamily: Typography.headlineBold,
    fontSize: 20,
    color: Colors.onSurface,
  },
  heroDate: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  levelBadgeText: {
    fontFamily: Typography.headlineBold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  excerptBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.onSurface + '1F',
  },
  excerptText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.onSurface,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 20,
  },

  sectionTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  statsCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    gap: Spacing.md,
    minHeight: 56,
  },
  statIcon: {
    width: 32,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurface,
    flex: 1,
  },
  statValue: {
    fontFamily: Typography.headlineBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 32 + Spacing.md,
    backgroundColor: Colors.outlineVariant + '1A',
  },

  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  resultExcellent: {
    backgroundColor: Colors.primaryContainer + '33',
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  resultOk: {
    backgroundColor: Colors.tertiaryContainer + '22',
    borderWidth: 1,
    borderColor: Colors.tertiary + '33',
  },
  resultText: {
    fontFamily: Typography.body,
    fontSize: 14,
    flex: 1,
  },
  resultTextExcellent: { color: Colors.primary },
  resultTextOk: { color: Colors.tertiary },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.onSurfaceVariant,
  },
});
