import { Colors, Typography, Spacing, Radii, Shadows } from '../theme'

describe('Colors', () => {
  it('has the midnight background color', () => {
    expect(Colors.background).toBe('#0A0A0F')
  })

  it('has the accent purple color', () => {
    expect(Colors.accent).toBe('#7C3AED')
  })
})

describe('Typography', () => {
  it('has size scale from xs to xxl', () => {
    expect(Typography.sizes.xs).toBeLessThan(Typography.sizes.xxl)
  })
})

describe('Spacing', () => {
  it('has spacing scale from xs to xxl', () => {
    expect(Spacing.xs).toBeLessThan(Spacing.xxl)
  })
})

describe('Radii', () => {
  it('full radius is very large', () => {
    expect(Radii.full).toBe(9999)
  })
})

describe('Shadows', () => {
  it('accent shadow uses the accent color', () => {
    expect(Shadows.accent.shadowColor).toBe('#7C3AED')
  })
})
