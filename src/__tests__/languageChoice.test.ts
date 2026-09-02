import {
  toLanguageOptions,
  shouldShowPicker,
} from '../features/session/utils/languageChoice';

const DEL_SERVIDOR = [
  { code: 'en-GB', name: 'British English', ready: false },
  { code: 'pt-PT', name: 'Português europeu', ready: true },
  { code: 'it-IT', name: 'Italiano', ready: false },
  { code: 'fr-FR', name: 'Français', ready: false },
];

describe('toLanguageOptions', () => {
  it('muestra los cuatro, no sólo el que está listo', () => {
    expect(toLanguageOptions(DEL_SERVIDOR)).toHaveLength(4);
  });

  it('pone el portugués primero, que es el que se puede usar', () => {
    expect(toLanguageOptions(DEL_SERVIDOR)[0].code).toBe('pt-PT');
  });

  it('conserva qué idiomas están listos y cuáles no', () => {
    const opciones = toLanguageOptions(DEL_SERVIDOR);
    expect(opciones.find((o) => o.code === 'pt-PT')?.ready).toBe(true);
    expect(opciones.filter((o) => !o.ready).map((o) => o.code).sort()).toEqual([
      'en-GB',
      'fr-FR',
      'it-IT',
    ]);
  });

  it('da a cada uno su nombre y su bandera', () => {
    const fr = toLanguageOptions(DEL_SERVIDOR).find((o) => o.code === 'fr-FR');
    expect(fr?.label).toBe('Français');
    expect(fr?.flag).toBe('🇫🇷');
  });

  it('ignora un idioma que el servidor añada y la app no sepa dibujar', () => {
    const conExtra = [...DEL_SERVIDOR, { code: 'de-DE', name: 'Deutsch', ready: false }];
    expect(toLanguageOptions(conExtra).map((o) => o.code)).not.toContain('de-DE');
  });

  it('no se rompe con una lista vacía', () => {
    expect(toLanguageOptions([])).toEqual([]);
  });
});

describe('shouldShowPicker', () => {
  it('se enseña cuando hay más de un idioma', () => {
    expect(shouldShowPicker(toLanguageOptions(DEL_SERVIDOR))).toBe(true);
  });

  it('se calla con un solo idioma: sería un botón sin destino', () => {
    const solo = [{ code: 'pt-PT', name: 'Português europeu', ready: true }];
    expect(shouldShowPicker(toLanguageOptions(solo))).toBe(false);
  });

  it('se calla si el servidor no respondió', () => {
    expect(shouldShowPicker([])).toBe(false);
  });
});
