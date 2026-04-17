import React from 'react';
import { Text } from 'react-native';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { TappableText } from '../features/session/components/TappableText';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('../constants/theme', () => ({
  Colors: {
    primary: '#000',
    onSurface: '#000',
    onSurfaceVariant: '#000',
    surfaceContainerHigh: '#fff',
    outlineVariant: '#ccc',
    outline: '#ccc',
  },
  Typography: { body: 'System', headlineBold: 'System', label: 'System' },
  BorderRadius: { lg: 12 },
  Spacing: { sm: 4, md: 8, lg: 16, xl: 24 },
}));

global.fetch = jest.fn();

beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
});

describe('TappableText', () => {
  it('renders without crashing', () => {
    let root: ReturnType<typeof create> | null = null;
    act(() => {
      root = create(<TappableText text="Olá mundo" />);
    });
    expect(root).not.toBeNull();
  });

  it('splits text into word tokens', () => {
    let root: ReturnType<typeof create> | null = null;
    act(() => {
      root = create(<TappableText text="Bom dia" />);
    });
    const json = root!.toJSON();
    const str = JSON.stringify(json);
    expect(str).toContain('Bom');
    expect(str).toContain('dia');
  });

  it('calls fetch with the pressed word when a word is tapped', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translation: 'Good morning' }),
    });

    let root: ReturnType<typeof create> | null = null;
    act(() => {
      root = create(<TappableText text="Bom dia" />);
    });

    const texts = root!.root.findAllByType(Text);
    const bomText = texts.find((t: ReactTestInstance) => t.props.children === 'Bom');
    expect(bomText).toBeDefined();

    await act(async () => {
      bomText!.props.onPress();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/translate'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('does not call fetch when whitespace is pressed', async () => {
    let root: ReturnType<typeof create> | null = null;
    act(() => {
      root = create(<TappableText text="Bom dia" />);
    });

    const texts = root!.root.findAllByType(Text);
    const spaceText = texts.find((t: ReactTestInstance) => /^\s+$/.test(String(t.props.children ?? '')));
    if (spaceText?.props.onPress) {
      await act(async () => { spaceText.props.onPress(); });
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles fetch error gracefully (no crash)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    let root: ReturnType<typeof create> | null = null;
    act(() => {
      root = create(<TappableText text="Olá" />);
    });

    const texts = root!.root.findAllByType(Text);
    const word = texts.find((t: ReactTestInstance) => t.props.children === 'Olá');

    await act(async () => { word!.props.onPress(); });

    expect(root!.toJSON()).not.toBeNull();
  });
});
