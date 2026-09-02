import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../../constants/theme';
import type { LanguageOption } from '../utils/languageChoice';

interface Props {
  options: LanguageOption[];
  selected: string;
  onSelect: (code: string) => void;
}

/**
 * Selector de idioma de la plataforma.
 *
 * Los idiomas que aún no están listos se muestran apagados y con la etiqueta
 * «em breve». Enseñarlos sin poder usarlos es deliberado: dice qué es esto sin
 * prometer lo que todavía no hace.
 */
export function LanguagePicker({ options, selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.code === selected;
        return (
          <TouchableOpacity
            key={option.code}
            style={[
              styles.item,
              active && styles.itemActive,
              !option.ready && styles.itemDisabled,
            ]}
            onPress={() => option.ready && onSelect(option.code)}
            disabled={!option.ready}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: !option.ready }}
            accessibilityLabel={
              option.ready ? option.label : `${option.label}, em breve`
            }
          >
            <Text style={[styles.flag, !option.ready && styles.fadedFlag]}>
              {option.flag}
            </Text>
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
                !option.ready && styles.labelDisabled,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {!option.ready && <Text style={styles.soon}>em breve</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '14',
  },
  itemDisabled: {
    // Apagado, no escondido: la arquitectura contempla estos idiomas.
    opacity: 0.45,
  },
  flag: {
    fontSize: 22,
    marginBottom: 2,
  },
  fadedFlag: {
    // En iOS el emoji ignora la opacidad del contenedor menos de lo esperado.
    opacity: 0.7,
  },
  label: {
    fontFamily: Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  labelActive: {
    color: Colors.primary,
  },
  labelDisabled: {
    color: Colors.outline,
  },
  soon: {
    fontFamily: Typography.label,
    fontSize: 8,
    letterSpacing: 0.4,
    color: Colors.outline,
    marginTop: 1,
  },
});
