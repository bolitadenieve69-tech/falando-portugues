/**
 * Cómo se presentan los idiomas de la plataforma en la pantalla de inicio.
 *
 * El motor trata cada idioma como un perfil de configuración, y hay cuatro
 * escritos. Sólo el portugués está listo: a los otros les faltan voces reales y
 * una revisión del prompt por hablantes nativos.
 *
 * Se muestran los cuatro de todos modos. Ocultar los que faltan dejaría la
 * arquitectura invisible, que es justo lo que le pasó al diccionario, y además
 * mentiría por omisión sobre hacia dónde va el producto. Los que no están
 * listos se marcan como tales y no se pueden elegir.
 */

export interface LanguageOption {
  code: string;
  /** Nombre corto para el botón: "Português", "Français". */
  label: string;
  flag: string;
  ready: boolean;
}

/** Orden fijo, con el idioma disponible primero. */
const ORDER = ['pt-PT', 'fr-FR', 'it-IT', 'en-GB'];

const PRESENTATION: Record<string, { label: string; flag: string }> = {
  'pt-PT': { label: 'Português', flag: '🇵🇹' },
  'fr-FR': { label: 'Français', flag: '🇫🇷' },
  'it-IT': { label: 'Italiano', flag: '🇮🇹' },
  'en-GB': { label: 'English', flag: '🇬🇧' },
};

export function toLanguageOptions(
  languages: { code: string; name: string; ready: boolean }[],
): LanguageOption[] {
  const known = languages.filter((l) => l.code in PRESENTATION);
  return known
    .map((l) => ({
      code: l.code,
      label: PRESENTATION[l.code].label,
      flag: PRESENTATION[l.code].flag,
      ready: l.ready,
    }))
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.code);
      const ib = ORDER.indexOf(b.code);
      return (ia === -1 ? ORDER.length : ia) - (ib === -1 ? ORDER.length : ib);
    });
}

/**
 * Si merece la pena enseñar el selector. Con un único idioma configurado no
 * aporta nada: sería un botón que no lleva a ninguna parte.
 */
export function shouldShowPicker(options: LanguageOption[]): boolean {
  return options.length > 1;
}
