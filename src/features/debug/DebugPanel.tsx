import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Share,
} from 'react-native';
import { useDebugLog, type LogEntry } from './useDebugLog';

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  log: '#8888aa',
  warn: '#f0a500',
  error: '#ff4444',
};

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const { entries, clear } = useDebugLog();
  const scrollRef = useRef<ScrollView>(null);

  async function handleShare() {
    const text = entries
      .map((e) => `[${e.timestamp}] ${e.level.toUpperCase()} ${e.message}`)
      .join('\n');
    await Share.share({ message: text, title: 'Debug Log' });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🐛 Debug Log</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.btn}>
                <Text style={styles.btnText}>Partilhar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clear} style={styles.btn}>
                <Text style={styles.btnText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnClose]}>
                <Text style={styles.btnTextClose}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Log entries */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {entries.length === 0 ? (
              <Text style={styles.empty}>Sem logs ainda…</Text>
            ) : (
              entries.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <Text style={styles.ts}>{entry.timestamp}</Text>
                  <Text style={[styles.level, { color: LEVEL_COLOR[entry.level] }]}>
                    {entry.level.toUpperCase().padEnd(5)}
                  </Text>
                  <Text
                    style={[
                      styles.msg,
                      entry.level === 'error' && styles.msgError,
                      entry.level === 'warn' && styles.msgWarn,
                    ]}
                    selectable
                  >
                    {entry.message}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <Text style={styles.hint}>{entries.length} entradas</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#0d0f0e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    borderTopWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1e2420',
    borderWidth: 1,
    borderColor: '#333',
  },
  btnClose: {
    backgroundColor: '#2a1a1a',
    borderColor: '#ff4444',
  },
  btnText: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  btnTextClose: {
    color: '#ff4444',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  empty: {
    color: '#555',
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    flexWrap: 'wrap',
    gap: 4,
  },
  ts: {
    color: '#555',
    fontFamily: 'monospace',
    fontSize: 10,
    minWidth: 60,
  },
  level: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    minWidth: 40,
  },
  msg: {
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  msgError: {
    color: '#ff6666',
  },
  msgWarn: {
    color: '#f0c060',
  },
  hint: {
    color: '#444',
    fontFamily: 'monospace',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
