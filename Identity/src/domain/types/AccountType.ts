export const AccountType = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
  FAMILY: 'FAMILY'
} as const

export type AccountTypeType = (typeof AccountType)[keyof typeof AccountType]
