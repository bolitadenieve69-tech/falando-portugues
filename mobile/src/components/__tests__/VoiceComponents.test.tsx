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
});
