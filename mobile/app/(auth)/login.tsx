import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Radii, Spacing, Typography } from '../../src/constants/theme';

export default function LoginScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    setError('');
    if (password.length < 4) { setError('Palavra-passe: mínimo 4 caracteres.'); return; }
    setLoading(true);
    try {
      await login(password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Bem-vindo de volta</Text>
      <TextInput
        style={styles.input}
        placeholder="Palavra-passe"
        placeholderTextColor={Colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Entrar" onPress={handleLogin} loading={loading} />
      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.link}>
        <Text style={styles.linkText}>Criar conta</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.md },
  title: { ...Typography.heading2, marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  error: { color: Colors.error, fontSize: 14 },
  link: { alignSelf: 'center', marginTop: Spacing.sm },
  linkText: { color: Colors.accentLight, fontSize: 16 },
});
