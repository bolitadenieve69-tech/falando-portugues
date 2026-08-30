import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoicePreview } from '../../src/features/settings/hooks/useVoicePreview';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import type { UserLevel } from '../../src/features/session/types';
import { TUTOR_VOICES } from '../../src/constants/voices';
import { loadPreferences, savePreferences } from '../../src/services/preferences';
import { clearHistory } from '../../src/services/history';
import { clearAuthData } from '../../src/features/auth/services/authService';
import { LevelAssessmentCard } from '../../src/features/settings/components/LevelAssessmentCard';

const WARM_GREEN = Colors.flagGreen;
const WARM_RED = Colors.flagRed;
const BUILDER_LOGO = require('../../assets/ag-ai-agency-logo.png');

const LEVELS: { key: UserLevel; label: string; desc: string }[] = [
  { key: 'A1', label: 'A1', desc: 'Iniciante' },
  { key: 'A2', label: 'A2', desc: 'Elementar' },
  { key: 'B1', label: 'B1', desc: 'Intermédio' },
  { key: 'B2', label: 'B2', desc: 'Vantagem' },
  { key: 'C1', label: 'C1', desc: 'Autónomo' },
  { key: 'C2', label: 'C2', desc: 'Mestria' },
];


export default function SettingsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [level, setLevel] = useState<UserLevel>('B1');
  const [selectedVoice, setSelectedVoice] = useState('tiago');
  const [showTranscript, setShowTranscript] = useState(true);
  const [autoCorrections, setAutoCorrections] = useState(true);
  const { playingId, play } = useVoicePreview();

  useEffect(() => {
    loadPreferences().then((prefs) => {
      setLevel(prefs.level);
      const voice = TUTOR_VOICES.find((v) => v.voiceId === prefs.voiceId);
      setSelectedVoice(voice?.id ?? 'patricio');
      setShowTranscript(prefs.showTranscript);
      setAutoCorrections(prefs.autoCorrections);
    });
  }, []);

  const persist = useCallback((patch: Partial<{ level: UserLevel; voiceId: string; showTranscript: boolean; autoCorrections: boolean }>) => {
    loadPreferences().then((prefs) => savePreferences({ ...prefs, ...patch }));
  }, []);

  const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://falando-portugues.app/privacy';

  function handlePrivacyPolicy() {
    Linking.openURL(PRIVACY_URL).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir a página de privacidade.')
    );
  }

  function handleLogout() {
    Alert.alert(
      'Terminar Sessão',
      'Isto irá apagar todo o historial e repor as preferências. Tens a certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              clearHistory(),
              clearAuthData(),
              savePreferences({
                level: 'B1',
                defaultTopic: null,
                voiceId: 'c0rzOw18hxEhaSybUod2',
                showTranscript: true,
                autoCorrections: true,
              }),
            ]);
            setLevel('B1');
            setSelectedVoice('tiago');
            setShowTranscript(true);
            setAutoCorrections(true);
          },
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Definições</Text>
          <TouchableOpacity style={styles.logoutIconButton} onPress={handleLogout} hitSlop={8}>
            <MaterialCommunityIcons name="logout" size={20} color={Colors.tertiary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          setIsAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 24);
        }}
        scrollEventThrottle={16}
      >
        <LinearGradient
          colors={[WARM_GREEN, '#5D6538', WARM_RED]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.settingsHero}
        >
          <Text style={styles.settingsHeroEyebrow}>AJUSTES DO TUTOR</Text>
          <Text style={styles.settingsHeroTitle}>Deixa o Patrício falar contigo ao teu ritmo.</Text>
        </LinearGradient>

        <LevelAssessmentCard
          currentLevel={level}
          onApplyLevel={(nextLevel) => {
            setLevel(nextLevel);
            persist({ level: nextLevel });
          }}
        />

        {/* Level */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>O meu nível</Text>
          <Text style={styles.sectionMeta}>PROGRESSO</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.levelRow}
        >
          {LEVELS.map((l) => {
            const active = level === l.key;
            return (
              <TouchableOpacity
                key={l.key}
                style={styles.levelCardWrap}
                onPress={() => { setLevel(l.key); persist({ level: l.key }); }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.levelCard,
                    active && styles.levelCardActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.levelKey,
                      active && styles.levelKeyActive,
                    ]}
                  >
                    {l.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.levelDesc,
                    active && styles.levelDescActive,
                  ]}
                >
                  {l.desc.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tutor voice */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          Voz do tutor
        </Text>
        <View style={styles.voiceList}>
          {TUTOR_VOICES.map((voice) => {
            const selected = selectedVoice === voice.id;
            return (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceCard,
                  selected && styles.voiceCardSelected,
                ]}
                onPress={() => { setSelectedVoice(voice.id); persist({ voiceId: voice.voiceId }); }}
                activeOpacity={0.75}
              >
                {/* Avatar placeholder */}
                <View
                  style={[
                    styles.voiceAvatar,
                    selected && styles.voiceAvatarSelected,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account-voice"
                    size={22}
                    color={selected ? Colors.primary : Colors.onSurfaceVariant}
                  />
                </View>

                <View style={styles.voiceInfo}>
                  <Text
                    style={[
                      styles.voiceName,
                      selected && styles.voiceNameSelected,
                    ]}
                  >
                    {voice.name}
                  </Text>
                  <Text
                    style={[
                      styles.voiceMeta,
                      selected && styles.voiceMetaSelected,
                    ]}
                  >
                    {voice.city} · {voice.style}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.playButton,
                    selected && styles.playButtonSelected,
                  ]}
                  hitSlop={8}
                  onPress={() => play(voice.voiceId)}
                >
                  <MaterialCommunityIcons
                    name={playingId === voice.voiceId ? 'stop' : 'play'}
                    size={20}
                    color={selected ? Colors.onPrimaryContainer : Colors.primary}
                  />
                </TouchableOpacity>

                {/* Radio dot */}
                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          Preferências
        </Text>
        <View style={styles.prefCard}>
          <View style={[styles.prefRow, styles.prefRowBorder]}>
            <MaterialCommunityIcons
              name="subtitles"
              size={22}
              color={Colors.primary + 'B3'}
            />
            <Text style={styles.prefLabel}>Mostrar transcrição</Text>
            <Switch
              value={showTranscript}
              onValueChange={(v) => { setShowTranscript(v); persist({ showTranscript: v }); }}
              trackColor={{
                false: Colors.surfaceContainerHighest,
                true: Colors.primaryContainer,
              }}
              thumbColor={showTranscript ? Colors.primary : Colors.outline}
            />
          </View>
          <View style={styles.prefRow}>
            <MaterialCommunityIcons
              name="spellcheck"
              size={22}
              color={Colors.primary + 'B3'}
            />
            <Text style={styles.prefLabel}>Correções automáticas</Text>
            <Switch
              value={autoCorrections}
              onValueChange={(v) => { setAutoCorrections(v); persist({ autoCorrections: v }); }}
              trackColor={{
                false: Colors.surfaceContainerHighest,
                true: Colors.primaryContainer,
              }}
              thumbColor={autoCorrections ? Colors.primary : Colors.outline}
            />
          </View>
        </View>

        {/* Conta */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          Conta
        </Text>
        <View style={styles.prefCard}>
          <View style={[styles.prefRow, styles.prefRowBorder]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={22}
              color={Colors.outline}
            />
            <Text style={styles.prefLabel}>Versão da App</Text>
            <Text style={styles.prefValue}>1.0.0</Text>
          </View>
          <TouchableOpacity style={styles.prefRow} activeOpacity={0.7} onPress={handlePrivacyPolicy}>
            <MaterialCommunityIcons
              name="shield-account-outline"
              size={22}
              color={Colors.outline}
            />
            <Text style={styles.prefLabel}>Política de Privacidade</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.outline}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={handleLogout}>
          <Text style={styles.logoutText}>TERMINAR SESSÃO</Text>
        </TouchableOpacity>

        <View style={styles.builderCard}>
          <Image source={BUILDER_LOGO} style={styles.builderLogo} resizeMode="contain" />
          <Text style={styles.builderTitle}>AG AI Agency</Text>
          <Text style={styles.builderSubtitle}>Builder da experiência Falando Português</Text>
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
  safeArea: { backgroundColor: Colors.background + 'CC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.headline,
    fontSize: 24,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tertiaryContainer + '55',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.tertiary + '22',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  settingsHero: {
    borderRadius: BorderRadius.lg,
    minHeight: 180,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  settingsHeroEyebrow: {
    fontFamily: Typography.labelMedium,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.onSurface + 'D8',
    marginBottom: Spacing.sm,
  },
  settingsHeroTitle: {
    fontFamily: Typography.headline,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.onSurface,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 18,
    color: Colors.onSurfaceVariant,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  sectionMeta: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.primary + 'CC',
    letterSpacing: 2,
  },

  // Level
  levelRow: { gap: 10, paddingBottom: 4 },
  levelCardWrap: { alignItems: 'center', gap: 6 },
  levelCard: {
    width: 80,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCardActive: {
    backgroundColor: Colors.primaryContainer,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  levelKey: {
    fontFamily: Typography.headline,
    fontSize: 18,
    color: Colors.onSurfaceVariant,
  },
  levelKeyActive: { color: Colors.onPrimaryContainer },
  levelDesc: {
    fontFamily: Typography.label,
    fontSize: 9,
    color: Colors.outline,
    letterSpacing: 1.5,
  },
  levelDescActive: { color: Colors.primary, fontFamily: Typography.labelMedium },

  // Voice
  voiceList: { gap: Spacing.sm },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.secondary + '16',
  },
  voiceCardSelected: {
    backgroundColor: Colors.surfaceContainerLow,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  voiceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryContainer + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAvatarSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  voiceInfo: { flex: 1 },
  voiceName: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  voiceNameSelected: { color: Colors.primary },
  voiceMeta: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.outline,
    marginTop: 2,
  },
  voiceMetaSelected: { color: Colors.primary + '99' },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonSelected: {
    backgroundColor: Colors.primaryContainer,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  // Preferences
  prefCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.secondary + '16',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
    minHeight: 64,
  },
  prefRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '1A',
  },
  prefLabel: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: Colors.onSurface,
    flex: 1,
  },
  prefValue: {
    fontFamily: Typography.labelMedium,
    fontSize: 14,
    color: Colors.outline,
    letterSpacing: 1,
  },

  // Logout
  logoutButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  logoutText: {
    fontFamily: Typography.headlineBold,
    fontSize: 13,
    color: Colors.tertiary,
    letterSpacing: 3,
  },
  builderCard: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.secondary + '16',
  },
  builderLogo: {
    width: 128,
    height: 128,
    opacity: 0.92,
  },
  builderTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: Colors.onSurface,
    marginTop: Spacing.sm,
  },
  builderSubtitle: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
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
