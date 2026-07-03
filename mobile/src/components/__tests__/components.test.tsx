import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PrimaryButton } from '../PrimaryButton'
import { LevelChip } from '../LevelChip'
import { TopicCard } from '../TopicCard'

describe('PrimaryButton', () => {
  it('renders the label', () => {
    const { getByText } = render(<PrimaryButton label="Iniciar" onPress={jest.fn()} />)
    expect(getByText('Iniciar')).toBeTruthy()
  })

  it('shows loading indicator when loading=true', () => {
    const { getByTestId } = render(<PrimaryButton label="Iniciar" onPress={jest.fn()} loading />)
    expect(getByTestId('button-loading')).toBeTruthy()
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<PrimaryButton label="Iniciar" onPress={onPress} disabled />)
    fireEvent.press(getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })
})

describe('LevelChip', () => {
  it('renders the level label', () => {
    const { getByText } = render(<LevelChip level="B1" selected={false} onPress={jest.fn()} />)
    expect(getByText('B1')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<LevelChip level="A2" selected={false} onPress={onPress} />)
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('TopicCard', () => {
  it('renders the icon and label', () => {
    const { getByText } = render(
      <TopicCard topic="viagens" label="Viagens" icon="✈️" selected={false} onPress={jest.fn()} />
    )
    expect(getByText('Viagens')).toBeTruthy()
    expect(getByText('✈️')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <TopicCard topic="comida" label="Comida" icon="🍽️" selected={false} onPress={onPress} />
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
