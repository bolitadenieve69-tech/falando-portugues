import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';

type OrbState = 'idle' | 'connecting' | 'active' | 'user_speaking' | 'tutor_speaking';

interface VoiceOrbProps {
  state: OrbState;
}

export function VoiceOrb({ state }: VoiceOrbProps) {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = state === 'user_speaking' ? 600 : state === 'tutor_speaking' ? 900 : 1400;
    const scale = state === 'user_speaking' ? 1.6 : state === 'tutor_speaking' ? 1.4 : 1.2;

    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: scale, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        ])
      );

    const a1 = pulse(ring1, 0);
    const a2 = pulse(ring2, duration / 3);
    const a3 = pulse(ring3, (duration * 2) / 3);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [state, ring1, ring2, ring3]);

  return (
    <View testID="voice-orb" style={styles.container}>
      <Animated.View style={[styles.ring, { transform: [{ scale: ring3 }] }]} />
      <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2 }] }]} />
      <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: ring1 }] }]} />
      <View style={styles.orb} />
    </View>
  );
}

const ORB_SIZE = 120;

const styles = StyleSheet.create({
  container: { width: ORB_SIZE * 2, height: ORB_SIZE * 2, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: ORB_SIZE * 1.8,
    height: ORB_SIZE * 1.8,
    borderRadius: ORB_SIZE,
    backgroundColor: Colors.accentGlow,
  },
  ring1: { width: ORB_SIZE * 1.5, height: ORB_SIZE * 1.5 },
  ring2: { width: ORB_SIZE * 1.65, height: ORB_SIZE * 1.65 },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: Colors.accent,
  },
});
