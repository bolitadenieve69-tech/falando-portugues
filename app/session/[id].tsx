import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DebugPanel } from '../../src/features/debug/DebugPanel';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { useVoiceSession } from '../../src/features/session/hooks/useVoiceSession';
import { useNetworkStatus } from '../../src/features/session/hooks/useNetworkStatus';
import { TappableText } from '../../src/features/session/components/TappableText';
import { loadPreferences } from '../../src/services/preferences';
import type { SessionConfig } from '../../src/features/session/types';
import type { UserPreferences } from '../../src/services/preferences';

const WAVEFORM_COUNT = 11;
const WARM_GREEN = Colors.flagGreen;
const WARM_RED = Colors.flagRed;

function WaveformBar({ delay, active }: { delay: number; active: boolean }) {
  const anim = useRef(new Animated.Value(10)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 20 + Math.random() * 60,
            duration: 500 + Math.random() * 300,
            delay,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 10,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      Animated.timing(anim, {
        toValue: 10,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    return () => loopRef.current?.stop();
  }, [active]);

  return <Animated.View style={[styles.waveBar, { height: anim }]} />;
}

export default function SessionScreen() {
  const { level = 'B1', topic = 'livre' } = useLocalSearchParams<{
    level: string;
    topic: string;
  }>();

  const {
    status,
    transcript,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    isMuted,
    isUserSpeaking,
    tutorName,
    error,
  } = useVoiceSession();
  const { isOnline } = useNetworkStatus();

  const scrollRef = useRef<ScrollView>(null);
  const cleaningUpRef = useRef(false);

  // Auto-start session on mount
  useEffect(() => {
    const config: SessionConfig = { level: level as any, topic: topic as any };
    startSession(config);
    return () => {
      if (!cleaningUpRef.current) {
        cleaningUpRef.current = true;
        endSession();
      }
    };
  }, []);

  async function handleRetry() {
    cleaningUpRef.current = false;
    const config: SessionConfig = { level: level as any, topic: topic as any };
    await startSession(config);
  }

  async function handleEndCall() {
    await endSession();
    router.back();
  }

  const [debugVisible, setDebugVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  function handleSendText() {
    if (!inputText.trim()) return;
    sendTextMessage(inputText);
    setInputText('');
    setInputVisible(false);
  }
  const [prefs, setPrefs] = useState<Pick<UserPreferences, 'showTranscript' | 'autoCorrections'>>({
    showTranscript: true,
    autoCorrections: true,
  });

  useEffect(() => {
    loadPreferences().then((p) =>
      setPrefs({ showTranscript: p.showTranscript, autoCorrections: p.autoCorrections })
    );
  }, []);

  const isActive = status === 'active';
  const isConnecting = status === 'connecting';
  const isError = status === 'error';
  const waveformActive = isActive && !isMuted;

  return (
    <View style={styles.root}>
      <DebugPanel visible={debugVisible} onClose={() => setDebugVisible(false)} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleEndCall} style={styles.backButton} hitSlop={8}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.onSurface + 'B3'} />
            </TouchableOpacity>
            {isConnecting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={[styles.statusDot, isError && styles.statusDotError]} />
            )}
            {/* Long-press the title to open the debug panel */}
            <TouchableWithoutFeedback onLongPress={() => setDebugVisible(true)} delayLongPress={800}>
              <Text style={styles.headerTitle}>
                {isConnecting ? 'A ligar...' : isError ? 'Erro' : 'A conversar...'}
              </Text>
            </TouchableWithoutFeedback>
          </View>
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall} activeOpacity={0.8}>
            <MaterialCommunityIcons name="phone-hangup" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={Colors.onErrorContainer} />
          <Text style={styles.offlineText}>Sem ligação ao servidor</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.error} />
          <View style={styles.errorContent}>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.errorButton} onPress={handleRetry} activeOpacity={0.8}>
                <Text style={styles.errorButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.errorButtonSecondary} onPress={() => router.back()} activeOpacity={0.8}>
                <Text style={styles.errorButtonTextSecondary}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Waveform + speaker info */}
        <LinearGradient
          colors={[WARM_GREEN, '#445B35', WARM_RED]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sessionHero}
        >
          <View style={styles.waveform}>
            {Array.from({ length: WAVEFORM_COUNT }).map((_, i) => (
              <WaveformBar key={i} delay={i * 80} active={waveformActive} />
            ))}
          </View>

          {isUserSpeaking ? (
            <View style={styles.tutorInfo}>
              <View style={[styles.tutorAvatar, styles.userSpeakingAvatar]}>
                <MaterialCommunityIcons name="microphone" size={36} color={Colors.userVoice} />
              </View>
              <Text style={[styles.speakerLabel, styles.userSpeakingLabel]}>A FALAR</Text>
              <Text style={styles.tutorName}>Você</Text>
            </View>
          ) : (
            <View style={styles.tutorInfo}>
              <View style={styles.tutorAvatar}>
                <MaterialCommunityIcons name="account-voice" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.speakerLabel}>A FALAR</Text>
              <Text style={styles.tutorName}>{tutorName}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Transcript */}
        {transcript.length === 0 && isActive && (
          <Text style={styles.hint}>Comece a falar em Português...</Text>
        )}

        {prefs.showTranscript && transcript.length > 0 && (
          // Las palabras del tutor se pueden consultar desde el primer día, y
          // nadie lo descubría: el subrayado solo no basta como señal.
          <View style={styles.lookupHint}>
            <MaterialCommunityIcons name="gesture-tap" size={13} color={Colors.outline} />
            <Text style={styles.lookupHintText}>
              Toca numa palavra para a traduzir · mantém premido para uma expressão
            </Text>
          </View>
        )}

        {prefs.showTranscript && (
          <View style={styles.transcript}>
            {transcript.map((entry) =>
              entry.speaker === 'tutor' ? (
                <View key={entry.id} style={styles.tutorBubbleWrap}>
                  <View style={styles.tutorBubbleHeader}>
                    <View
                      style={styles.ptFlag}
                      accessibilityRole="image"
                      accessibilityLabel="Português de Portugal"
                    >
                      <View style={styles.flagGreen} />
                      <View style={styles.flagRed} />
                    </View>
                    <Text style={styles.bubbleSpeakerLabel}>TUTOR</Text>
                  </View>
                  {prefs.autoCorrections && entry.correction != null && (
                    <View style={styles.correctionNote}>
                      <Text style={styles.correctionNoteLabel}>CORREÇÃO</Text>
                      <Text style={styles.correctionNoteText}>{entry.correction}</Text>
                    </View>
                  )}
                  <View style={styles.tutorBubble}>
                    <TappableText text={entry.text} style={styles.bubbleText} />
                  </View>
                </View>
              ) : (
                <View key={entry.id} style={styles.userBubbleWrap}>
                  <View style={styles.userBubbleHeader}>
                    <Text style={styles.bubbleSpeakerLabel}>VOCÊ</Text>
                    <MaterialCommunityIcons name="check-circle" size={12} color={Colors.primary} />
                  </View>
                  <View style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{entry.text}</Text>
                  </View>
                </View>
              )
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Keyboard text input panel */}
      {inputVisible && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.inputPanel}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escreva em Português..."
              placeholderTextColor={Colors.onSurface + '40'}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSendText}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendText}
              disabled={!inputText.trim()}
            >
              <MaterialCommunityIcons name="send" size={20} color={inputText.trim() ? Colors.primary : Colors.onSurface + '40'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Bottom Controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.7}
          onPress={() => {
            setInputVisible((v) => !v);
            if (!inputVisible) setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <MaterialCommunityIcons
            name="keyboard"
            size={24}
            color={inputVisible ? Colors.primary : Colors.onSurface + '80'}
          />
          <Text style={[styles.controlLabel, inputVisible && { color: Colors.primary }]}>
            Escrever
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.micButtonActive, isMuted && styles.micButtonMuted]}
          onPress={toggleMute}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={isMuted ? 'microphone-off' : 'microphone'}
            size={28}
            color={isMuted ? Colors.onSurface + '80' : Colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleEndCall} activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="flag-checkered"
            size={24}
            color={Colors.onSurface + '80'}
          />
          <Text style={styles.controlLabel}>Terminar</Text>
        </TouchableOpacity>
      </SafeAreaView>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backButton: { padding: 4 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  statusDotError: {
    backgroundColor: Colors.error,
  },
  headerTitle: {
    fontFamily: Typography.headlineBold,
    fontSize: 18,
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  endCallButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.tertiaryContainer,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  offlineText: {
    fontFamily: Typography.label,
    fontSize: 13,
    color: Colors.onErrorContainer,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.label,
    fontSize: 13,
    color: Colors.onErrorContainer,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  errorButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.error,
  },
  errorButtonText: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: '#fff',
  },
  errorButtonSecondary: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  errorButtonTextSecondary: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.onErrorContainer,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  hint: {
    fontFamily: Typography.label,
    fontSize: 13,
    color: Colors.onSurfaceVariant + '80',
    letterSpacing: 1,
    marginVertical: Spacing.xl,
  },

  sessionHero: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
    marginBottom: Spacing.xl,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tutorInfo: { alignItems: 'center', gap: Spacing.sm },
  tutorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: Colors.onSurface + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The two voices each own a colour, so whoever has the floor reads
  // peripherally while the user is speaking and not looking at the screen.
  userSpeakingAvatar: {
    backgroundColor: Colors.userVoice + '1F',
    borderColor: Colors.userVoice + '66',
  },
  speakerLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.primary + 'B3',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  userSpeakingLabel: {
    color: Colors.userVoice + 'B3',
  },
  tutorName: {
    fontFamily: Typography.headlineBold,
    fontSize: 20,
    color: Colors.onSurface,
  },

  // Transcript
  lookupHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  lookupHintText: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 0.3,
  },
  transcript: { width: '100%', gap: Spacing.xl },
  tutorBubbleWrap: { alignItems: 'flex-start', maxWidth: '85%' },
  tutorBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  // Portugal is green and red in a 2:3 split. No white stripe (that is Italy),
  // and no coat of arms, which would be mud at this size.
  ptFlag: {
    flexDirection: 'row',
    width: 15,
    height: 10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  flagGreen: { flex: 2, height: '100%', backgroundColor: Colors.flagGreen },
  flagRed: { flex: 3, height: '100%', backgroundColor: Colors.flagRed },
  bubbleSpeakerLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tutorBubble: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopRightRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '2E',
  },
  bubbleText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  userBubbleWrap: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  userBubble: {
    backgroundColor: Colors.userVoice + '1F',
    borderWidth: 1,
    borderColor: Colors.userVoice + '3D',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
  },
  userBubbleText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  // A margin note, not an alert. Speaking a language you don't master is
  // exposing enough without the app boxing your mistake in a coloured panel.
  correctionNote: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 8,
    marginBottom: 8,
  },
  correctionNoteLabel: {
    fontFamily: Typography.labelMedium,
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 3,
  },
  correctionNoteText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 19,
  },

  // Keyboard input panel
  inputPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '33',
  },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerHighest,
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceContainerHighest,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background + 'E6',
  },
  controlButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  controlLabel: {
    fontFamily: Typography.body,
    fontSize: 10,
    color: Colors.onSurface + '80',
    letterSpacing: 1,
  },
  micButtonActive: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  micButtonMuted: {
    backgroundColor: Colors.surfaceContainerHighest,
    shadowOpacity: 0,
  },
});
