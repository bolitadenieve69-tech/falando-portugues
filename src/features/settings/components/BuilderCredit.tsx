import { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../../constants/theme';

const BUILDER_LOGO = require('../../../../assets/ag-ai-agency-logo.png');

const LOGO_SIZE = 84;

/**
 * Crédito del estudio al pie de los ajustes.
 *
 * El logotipo es un PNG cuadrado con fondo blanco, y en una aplicación oscura
 * ese recuadro claro se peleaba con todo lo demás. Se recorta a círculo, que
 * es la forma del propio emblema, así que las esquinas blancas desaparecen sin
 * tocar el fichero.
 *
 * Al entrar da media vuelta sobre sí mismo. Es lo último que se ve al salir de
 * la aplicación y estaba completamente inerte.
 */
export function BuilderCredit() {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        // Arranca con brío y se posa despacio, para que la media vuelta se lea
        // como un gesto y no como un giro mecánico.
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, spin]);

  // Empieza del revés y da media vuelta hasta quedar derecho. El emblema lleva
  // texto alrededor, así que terminar en 180° lo dejaría boca abajo para
  // siempre: el giro tiene que acabar donde se lee.
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.card, { opacity: fade }]}>
      <Animated.View style={[styles.logoRing, { transform: [{ rotate }] }]}>
        <Image source={BUILDER_LOGO} style={styles.logo} resizeMode="cover" />
      </Animated.View>
      <Text style={styles.title}>AG AI Agency</Text>
      <Text style={styles.subtitle}>Falando Português</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  logoRing: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    marginBottom: Spacing.md,
  },
  logo: {
    // Ampliado dentro del recorte: el emblema no llega al borde del PNG y
    // sin esto quedaría un halo blanco asomando por el contorno.
    width: LOGO_SIZE * 1.08,
    height: LOGO_SIZE * 1.08,
    marginLeft: -LOGO_SIZE * 0.04,
    marginTop: -LOGO_SIZE * 0.04,
    opacity: 0.9,
  },
  title: {
    fontFamily: Typography.label,
    fontSize: 12,
    letterSpacing: 1.4,
    color: Colors.onSurfaceVariant,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.outline,
    marginTop: 2,
  },
});
