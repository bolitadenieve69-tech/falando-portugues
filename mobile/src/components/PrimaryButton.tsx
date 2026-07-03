import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { Colors, Typography, Spacing, Radii } from '../constants/theme'

interface PrimaryButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'default' | 'destructive'
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false, variant = 'default' }: PrimaryButtonProps) {
  const bg = variant === 'destructive' ? Colors.error : Colors.accent
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, { backgroundColor: bg }, isDisabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator testID="button-loading" color={Colors.textPrimary} size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  label: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
})
