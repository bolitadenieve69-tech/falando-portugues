import { useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getSessions } from '../../src/services/storage';
import type { SessionHistoryEntry } from '../../src/types';
import { TranscriptBubble } from '../../src/components/TranscriptBubble';
import { Colors, Radii, Spacing, Typography } from '../../src/constants/theme';

function formatDuration(startedAt: number, endedAt: number): string {
  const seconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [selected, setSelected] = useState<SessionHistoryEntry | null>(null);

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>Ainda não tens sessões</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
            <View style={styles.cardRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.config.level}</Text>
              </View>
              <Text style={styles.topic}>{item.config.topic}</Text>
              <Text style={styles.duration}>{formatDuration(item.startedAt, item.endedAt)}</Text>
            </View>
            <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
          </TouchableOpacity>
        )}
      />
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeButton}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selected?.transcript.map((entry) => (
              <TranscriptBubble key={entry.id} entry={entry} />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.sm },
  empty: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { backgroundColor: Colors.accent, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: Colors.textPrimary, fontSize: 11, fontWeight: '700' },
  topic: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  duration: { color: Colors.textSecondary, fontSize: 13 },
  date: { color: Colors.textSecondary, fontSize: 12 },
  modal: { flex: 1, backgroundColor: Colors.background },
  closeButton: { padding: Spacing.md, paddingTop: Spacing.xl },
  closeText: { color: Colors.accentLight, fontSize: 16 },
  modalContent: { padding: Spacing.md, gap: Spacing.xs },
});
