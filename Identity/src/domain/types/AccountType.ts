export const AccountType = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
  FAMILY: 'FAMILY'
} as const

export type AccountType = (typeof AccountType)[keyof typeof AccountType]
