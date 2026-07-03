import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Colors, Typography, Spacing, Radii } from '../constants/theme'
import type { UserLevel } from '../features/session/types'

interface LevelChipProps {
  level: UserLevel
  selected: boolean
  onPress: () => void
}

export function LevelChip({ level, selected, onPress }: LevelChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{level}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  selectedLabel: {
    color: Colors.textPrimary,
  },
})
