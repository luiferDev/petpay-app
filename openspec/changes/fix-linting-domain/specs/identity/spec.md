# Delta for Identity Domain Layer

## Purpose

This delta spec covers fixes for linting errors in Identity service domain layer files. The changes ensure compliance with ts-standard strict rules.

## MODIFIED Requirements

### Requirement: AccountType.ts Must Not Redeclare Type Names

The file MUST NOT contain type redefinitions that conflict with exported const values.

#### Scenario: AccountType const and type coexist

- GIVEN a file exporting both `AccountType` const and `AccountType` type
- WHEN the linter runs with `no-redeclare` rule enabled
- THEN the type MUST be renamed or extracted to avoid name conflict
- AND the exported value MUST remain usable by consumers

### Requirement: Role.ts Must Not Redeclare Type Names

The file MUST NOT contain type redefinitions that conflict with exported const values.

#### Scenario: Role const and type coexist

- GIVEN a file exporting Role const and Role type
- WHEN the linter runs with `no-redeclare` rule enabled
- THEN the type MUST be renamed or extracted to avoid name conflict

#### Scenario: PermissionLevel const and type coexist

- GIVEN a file exporting PermissionLevel const and PermissionLevel type
- WHEN the linter runs with `no-redeclare` rule enabled
- THEN the type MUST be renamed or extracted to avoid name conflict

#### Scenario: UserRole alias maintains backward compatibility

- GIVEN a file with UserRole as an alias to Role
- WHEN the alias is exported
- THEN it MUST NOT cause name conflicts with other exports

### Requirement: IAccountRepository.ts Must Not Have Unused Imports

The file MUST only import symbols that are actively used in the code.

#### Scenario: Unused PermissionLevel import

- GIVEN the IAccountRepository imports `PermissionLevel` from Role
- WHEN `PermissionLevel` is not referenced in the file
- THEN the import MUST be removed

#### Scenario: Unused User import

- GIVEN the IAccountRepository imports `User` from entities
- WHEN `User` is not referenced in the file
- THEN the import MUST be removed

### Requirement: User.ts Email Validation Must Use Optional Chaining

The email validation logic MUST use optional chaining for null-safe property access.

#### Scenario: Email validation with optional chaining

- GIVEN a User entity with an email property
- WHEN validating the email format
- THEN the code MUST use optional chaining (`?.`) for the `includes` method call
- AND the check MUST handle empty string cases appropriately

#### Scenario: Email validation handles empty string

- GIVEN a User entity being validated
- WHEN the email is an empty string
- THEN the validation MUST return false (fail the invariant)
