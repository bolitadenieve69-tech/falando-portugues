import React from 'react';
import { render } from '@testing-library/react-native';
import { VoiceOrb } from '../VoiceOrb';
import { TranscriptBubble } from '../TranscriptBubble';

describe('VoiceOrb', () => {
  it('renders with idle state', () => {
    const { getByTestId } = render(<VoiceOrb state="idle" />);
    expect(getByTestId('voice-orb')).toBeTruthy();
  });

  it('renders with active state', () => {
    const { getByTestId } = render(<VoiceOrb state="active" />);
    expect(getByTestId('voice-orb')).toBeTruthy();
  });

  it('renders with connecting state', () => {
    const { getByTestId } = render(<VoiceOrb state="connecting" />);
    expect(getByTestId('voice-orb')).toBeTruthy();
  });
});

describe('TranscriptBubble', () => {
  it('renders user entry right-aligned', () => {
    const { getByText } = render(
      <TranscriptBubble
        entry={{ id: '1', speaker: 'user', text: 'Olá', timestamp: 0, hasCorrection: false }}
      />
    );
    expect(getByText('Olá')).toBeTruthy();
  });

  it('renders tutor entry with name label', () => {
    const { getByText } = render(
      <TranscriptBubble
        entry={{ id: '2', speaker: 'tutor', text: 'Bem-vindo!', timestamp: 0, hasCorrection: false }}
      />
    );
    expect(getByText('Bem-vindo!')).toBeTruthy();
    expect(getByText('Tutor')).toBeTruthy();
  });

  it('renders correction line when entry has a correction', () => {
    const { getByText } = render(
      <TranscriptBubble
        entry={{
          id: '3',
          speaker: 'tutor',
          text: 'Boa pergunta!',
          timestamp: 0,
          hasCorrection: true,
          correction: 'diz-se fui em vez de fui a.',
        }}
      />
    );
    expect(getByText(/diz-se fui em vez de fui a\./)).toBeTruthy();
    expect(getByText('Boa pergunta!')).toBeTruthy();
  });

  it('renders no correction line without correction', () => {
    const { queryByText } = render(
      <TranscriptBubble
        entry={{ id: '4', speaker: 'tutor', text: 'Olá!', timestamp: 0, hasCorrection: false }}
      />
    );
    expect(queryByText(/✏️/)).toBeNull();
  });
});
