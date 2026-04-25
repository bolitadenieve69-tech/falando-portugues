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
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { useVoiceSession } from '../../src/features/session/hooks/useVoiceSession';
import { useNetworkStatus } from '../../src/features/session/hooks/useNetworkStatus';
import { TappableText } from '../../src/features/session/components/TappableText';
import { loadPreferences } from '../../src/services/preferences';
import type { SessionConfig } from '../../src/features/session/types';
import type { UserPreferences } from '../../src/services/preferences';

const WAVEFORM_COUNT = 11;

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

  // Auto-navigate back on error
  useEffect(() => {
    if (status === 'error') {
      const t = setTimeout(() => router.back(), 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

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
              <View style={styles.statusDot} />
            )}
            {/* Long-press the title to open the debug panel */}
            <TouchableWithoutFeedback onLongPress={() => setDebugVisible(true)} delayLongPress={800}>
              <Text style={styles.headerTitle}>
                {isConnecting ? 'A ligar...' : 'A conversar...'}
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
          <Text style={styles.errorText}>{error}</Text>
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
        <View style={styles.voiceSection}>
          <View style={styles.waveform}>
            {Array.from({ length: WAVEFORM_COUNT }).map((_, i) => (
              <WaveformBar key={i} delay={i * 80} active={waveformActive} />
            ))}
          </View>

          {isUserSpeaking ? (
            <View style={styles.tutorInfo}>
              <View style={[styles.tutorAvatar, styles.userSpeakingAvatar]}>
                <MaterialCommunityIcons name="microphone" size={36} color={Colors.tertiary} />
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
        </View>

        {/* Transcript */}
        {transcript.length === 0 && isActive && (
          <Text style={styles.hint}>Comece a falar em Português...</Text>
        )}

        {prefs.showTranscript && (
          <View style={styles.transcript}>
            {transcript.map((entry) =>
              entry.speaker === 'tutor' ? (
                <View key={entry.id} style={styles.tutorBubbleWrap}>
                  <View style={styles.tutorBubbleHeader}>
                    <View style={styles.ptFlag}>
                      <View style={[styles.flagStripe, { backgroundColor: '#006600' }]} />
                      <View style={[styles.flagStripe, { backgroundColor: '#fff' }]} />
                      <View style={[styles.flagStripe, { backgroundColor: '#FF0000' }]} />
                    </View>
                    <Text style={styles.bubbleSpeakerLabel}>TUTOR</Text>
                  </View>
                  {prefs.autoCorrections && entry.correction != null && (
                    <View style={styles.correctionCallout}>
                      <MaterialCommunityIcons name="auto-fix" size={14} color={Colors.tertiary} />
                      <Text style={styles.correctionCalloutText}>{entry.correction}</Text>
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
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.label,
    fontSize: 13,
    color: Colors.onErrorContainer,
    flex: 1,
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

  // Waveform
  voiceSection: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
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
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: Colors.outlineVariant + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSpeakingAvatar: {
    backgroundColor: Colors.tertiaryContainer,
    borderColor: Colors.tertiary + '66',
  },
  speakerLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.primary + 'B3',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  userSpeakingLabel: {
    color: Colors.tertiary + 'B3',
  },
  tutorName: {
    fontFamily: Typography.headlineBold,
    fontSize: 20,
    color: Colors.onSurface,
  },

  // Transcript
  transcript: { width: '100%', gap: Spacing.xl },
  tutorBubbleWrap: { alignItems: 'flex-start', maxWidth: '85%' },
  tutorBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ptFlag: {
    flexDirection: 'row',
    width: 16,
    height: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  flagStripe: { flex: 1, height: '100%' },
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
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary + '99',
    shadowColor: Colors.primary,
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
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
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
  },
  userBubbleText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onPrimaryContainer,
    lineHeight: 22,
  },
  correctionCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.tertiaryContainer + 'CC',
    borderLeftWidth: 2,
    borderLeftColor: Colors.tertiary,
    borderTopRightRadius: BorderRadius.sm,
    borderBottomRightRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  correctionCalloutText: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.tertiary,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
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
