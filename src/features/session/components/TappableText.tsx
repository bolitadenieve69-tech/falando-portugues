import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Spacing } from '../../../constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface WordPopupProps {
  word: string;
  translation: string | null;
  loading: boolean;
  onClose: () => void;
}

function WordPopup({ word, translation, loading, onClose }: WordPopupProps) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.popup}>
          <View style={styles.popupHeader}>
            <Text style={styles.popupWord}>{word}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <View style={styles.popupDivider} />
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.popupTranslation}>{translation ?? '—'}</Text>
          )}
          <View style={styles.popupFooter}>
            <MaterialCommunityIcons name="translate" size={12} color={Colors.outline} />
            <Text style={styles.popupFooterText}>Português → Español</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

interface TappableTextProps {
  text: string;
  style?: object;
}

export function TappableText({ text, style }: TappableTextProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const words = text.split(/(\s+)/);

  async function handleWordPress(raw: string) {
    const word = raw.replace(/[^a-záàâãéèêíïóôõúüçA-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇ]/g, '').toLowerCase();
    if (!word) return;

    setSelectedWord(raw.trim());
    setTranslation(null);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, from: 'pt', to: 'es' }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslation(data.translation ?? null);
      } else {
        setTranslation(null);
      }
    } catch {
      setTranslation(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.baseText, style]}>
        {words.map((chunk, i) => {
          if (/^\s+$/.test(chunk)) return <Text key={i}>{chunk}</Text>;
          return (
            <Text
              key={i}
              style={styles.word}
              onPress={() => handleWordPress(chunk)}
            >
              {chunk}
            </Text>
          );
        })}
      </Text>

      {selectedWord && (
        <WordPopup
          word={selectedWord}
          translation={translation}
          loading={loading}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 1 },
  baseText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  word: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.onSurface,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  popup: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    minWidth: 200,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  popupWord: {
    fontFamily: Typography.headlineBold,
    fontSize: 20,
    color: Colors.primary,
  },
  popupDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant + '33',
    marginBottom: Spacing.md,
  },
  popupTranslation: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  popupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popupFooterText: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 0.5,
  },
});
