import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Spacing, Typography } from '../../src/constants/theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🇵🇹</Text>
        <Text style={styles.heading}>Falando{'\n'}Português</Text>
        <Text style={styles.tagline}>Fala português como um nativo.</Text>
      </View>
      <View style={styles.actions}>
        <Link href="/(auth)/register" asChild>
          <PrimaryButton label="Criar conta" onPress={() => {}} />
        </Link>
        <Link href="/(auth)/login" style={styles.loginLink}>
          <Text style={styles.loginText}>Já tenho conta</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  logo: { fontSize: 72 },
  heading: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
  },
  tagline: { fontSize: Typography.sizes.md, color: Colors.textSecondary, textAlign: 'center' },
  actions: { gap: Spacing.md, paddingBottom: Spacing.xl },
  loginLink: { alignSelf: 'center' },
  loginText: { color: Colors.accentLight, fontSize: 16 },
});
