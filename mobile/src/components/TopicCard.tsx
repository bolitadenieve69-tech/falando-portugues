import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Colors, Typography, Spacing, Radii } from '../constants/theme'
import type { ConversationTopic } from '../features/session/types'

interface TopicCardProps {
  topic: ConversationTopic
  label: string
  icon: string
  selected: boolean
  onPress: () => void
}

export function TopicCard({ topic, label, icon, selected, onPress }: TopicCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentGlow,
  },
  icon: { fontSize: Typography.sizes.xl },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  selectedLabel: { color: Colors.accentLight },
})
