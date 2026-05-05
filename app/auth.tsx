import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Spacing } from '../src/constants/theme';

const BUILDER_LOGO = require('../assets/ag-ai-agency-logo.png');

type Mode = 'register' | 'login';

interface Props {
  onRegister: (username: string, password: string) => Promise<void>;
  onLogin: (password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export default function AuthScreen({
  onRegister,
  onLogin,
  isLoading,
  error,
  onClearError,
}: Props) {
  const [mode, setMode] = useState<Mode>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'username' | 'password' | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  function switchMode(next: Mode) {
    setMode(next);
    setPassword('');
    onClearError();
  }

  function fillTestAccess(nextMode: Mode = 'register') {
    setMode(nextMode);
    setUsername('Angel');
    setPassword('1234');
    onClearError();
  }

  async function handleSubmit() {
    if (isLoading) return;
    onClearError();
    if (mode === 'register') {
      if (!username.trim() || !password) return;
      await onRegister(username.trim(), password);
    } else {
      if (!password) return;
      await onLogin(password);
    }
  }

  const canSubmit =
    !isLoading && password.length >= 4 && (mode === 'login' || username.trim().length >= 2);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoEmoji}>🎙️</Text>
            </View>
            <Text style={styles.appName}>Falando Português</Text>
            <Text style={styles.appTagline}>O teu tutor de português europeu</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
              onPress={() => switchMode('register')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleLabel, mode === 'register' && styles.toggleLabelActive]}>
                Criar conta
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
              onPress={() => switchMode('login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleLabel, mode === 'login' && styles.toggleLabelActive]}>
                Entrar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity
              style={styles.testAccessButton}
              onPress={() => fillTestAccess(mode)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="key-variant" size={18} color={Colors.primary} />
              <Text style={styles.testAccessText}>Usar acesso de teste</Text>
            </TouchableOpacity>

            {mode === 'register' && (
              <View style={[styles.inputWrap, focusedInput === 'username' && styles.inputWrapFocused]}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={focusedInput === 'username' ? Colors.primary : Colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nome de utilizador"
                  placeholderTextColor={Colors.onSurface + '40'}
                  value={username}
                  onChangeText={(t) => { setUsername(t); onClearError(); }}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!isLoading}
                />
              </View>
            )}

            <View style={[styles.inputWrap, focusedInput === 'password' && styles.inputWrapFocused]}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={focusedInput === 'password' ? Colors.primary : Colors.onSurfaceVariant}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Palavra-passe (mín. 4 caracteres)"
                placeholderTextColor={Colors.onSurface + '40'}
                value={password}
                onChangeText={(t) => { setPassword(t); onClearError(); }}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={Colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitLabel}>
                  {mode === 'register' ? 'Criar conta' : 'Entrar'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'register' ? (
              <TouchableOpacity onPress={() => fillTestAccess('login')} activeOpacity={0.8}>
                <Text style={styles.modeHint}>Se já existe, tocar aqui para entrar com 1234</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => fillTestAccess('register')} activeOpacity={0.8}>
                <Text style={styles.modeHint}>Se ainda não existe, tocar aqui para criar com 1234</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <View style={styles.builderMark}>
            <Image source={BUILDER_LOGO} style={styles.builderLogo} resizeMode="contain" />
            <Text style={styles.builderText}>Built by AG AI Agency</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.xl,
  },

  header: { alignItems: 'center', gap: Spacing.sm },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 40,
    lineHeight: 46,
  },
  appName: {
    fontFamily: Typography.headlineBold,
    fontSize: 26,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontFamily: Typography.label,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: Colors.primaryContainer },
  toggleLabel: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  toggleLabelActive: {
    fontFamily: Typography.headlineBold,
    color: Colors.onPrimaryContainer,
  },

  form: { gap: Spacing.md },
  testAccessButton: {
    height: 46,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '14',
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  testAccessText: {
    fontFamily: Typography.headlineBold,
    fontSize: 14,
    color: Colors.primary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 54,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapFocused: {
    borderColor: Colors.primary + '55',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  inputIcon: { width: 20 },
  input: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurface,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: Typography.label,
    fontSize: 12,
    color: Colors.error,
    flex: 1,
  },

  submitBtn: {
    height: 54,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  submitBtnDisabled: { opacity: 0.38, shadowOpacity: 0 },
  submitLabel: {
    fontFamily: Typography.headlineBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  modeHint: {
    fontFamily: Typography.labelMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },

  builderMark: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  builderLogo: {
    width: 86,
    height: 86,
    opacity: 0.9,
  },
  builderText: {
    fontFamily: Typography.labelMedium,
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 0.5,
  },
});
