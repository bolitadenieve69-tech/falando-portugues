import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { LevelChip } from '../../src/components/LevelChip';
import type { UserLevel } from '../../src/features/session/types';
import { Colors, Spacing, Typography } from '../../src/constants/theme';

const VOICES = [
  { id: 'c0rzOw18hxEhaSybUod2', name: 'Tiago', description: 'Lisboa · Conversacional' },
  { id: 'nJ5NFqyKb8kn9JBPmo6i', name: 'Joana', description: 'Lisboa · Natural e clara' },
  { id: 'DMcOknq8n1B6XshFIJKJ', name: 'Patrício', description: 'Porto · Profunda e calma' },
];

const LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function SettingsScreen() {
  const { username, logout } = useAuth();
  const { settings, updateSetting } = useSettings();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Voz</Text>
      {VOICES.map((v) => (
        <TouchableOpacity
          key={v.id}
          style={[styles.voiceCard, settings.voiceId === v.id && styles.voiceSelected]}
          onPress={() => { void updateSetting('voiceId', v.id); }}
        >
          <View>
            <Text style={styles.voiceName}>{v.name}</Text>
            <Text style={styles.voiceDesc}>{v.description}</Text>
          </View>
          {settings.voiceId === v.id && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Nível padrão</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <LevelChip
            key={l}
            level={l}
            selected={settings.level === l}
            onPress={() => { void updateSetting('level', l); }}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Conta</Text>
      <View style={styles.accountCard}>
        <Text style={styles.username}>{username}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl, gap: Spacing.md },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  voiceSelected: { borderColor: Colors.accent },
  voiceName: { color: Colors.textPrimary, fontWeight: '600' },
  voiceDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  checkmark: { color: Colors.accent, fontSize: 18, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  accountCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  username: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  logoutText: { color: Colors.error, fontWeight: '600' },
});
