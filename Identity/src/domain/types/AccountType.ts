export const AccountType = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS'
} as const

export type AccountType = (typeof AccountType)[keyof typeof AccountType]
