import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TranscriptEntry } from '../features/session/types';
import { Colors, Radii, Spacing } from '../constants/theme';

interface TranscriptBubbleProps {
  entry: TranscriptEntry;
}

export function TranscriptBubble({ entry }: TranscriptBubbleProps) {
  const isUser = entry.speaker === 'user';
  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperRight : styles.wrapperLeft]}>
      {!isUser && <Text style={styles.tutorLabel}>Tutor</Text>}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.tutorBubble]}>
        <Text style={[styles.text, entry.hasCorrection && styles.correction]}>{entry.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: Spacing.xs, maxWidth: '80%' },
  wrapperLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  wrapperRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  tutorLabel: { color: Colors.accentLight, fontSize: 11, fontWeight: '600', marginBottom: 2, marginLeft: 4 },
  bubble: {
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  userBubble: { backgroundColor: Colors.surface2 },
  tutorBubble: { backgroundColor: Colors.surface },
  text: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  correction: { color: Colors.success },
});
