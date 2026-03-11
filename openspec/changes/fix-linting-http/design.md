# Design: Fix Linting Errors in Identity HTTP Layer

## Technical Approach

Fix all linting errors in Identity service HTTP layer files using ts-standard. The approach involves applying explicit type checks, nullish coalescing operators, explicit return types, and proper async handling across 10 affected files. All changes are mechanical lint fixes with no functional changes to behavior.

## Architecture Decisions

### Decision: Fix strict-boolean-expressions with explicit null checks

**Choice**: Replace implicit boolean coercion with explicit null/undefined checks for nullable values.

**Alternatives considered**: 
- Disable the lint rule for specific lines
- Use type assertions to silence warnings

**Rationale**: The project's TypeScript configuration enforces strict-boolean-expressions. Explicit checks improve code clarity and prevent potential bugs from falsy value handling.

### Decision: Use nullish coalescing (`??`) instead of logical OR (`||`)

**Choice**: Replace `value || default` with `value ?? default` for nullable defaults.

**Alternatives considered**: 
- Use logical OR with type guards
- Keep existing pattern and disable rule

**Rationale**: Nullish coalescing only coalesces `null`/`undefined`, not falsy values like `0` or empty string, making it safer for string defaults.

### Decision: Add explicit return types to functions

**Choice**: Add explicit return type annotations to middleware and route handler functions.

**Alternatives considered**:
- Use type inference only
- Disable explicit-function-return-type rule

**Rationale**: Identity AGENTS.md requires explicit types on all functions. This improves code readability and IDE support.

### Decision: Fix floating promises with void operator

**Choice**: Use `void` operator for async controller calls in routes that don't await.

**Alternatives considered**:
- Add `.catch()` handlers to all async route calls
- Make route handlers async with await

**Rationale**: Most Express route handlers don't need to wait for async operations. The `void` operator explicitly signals intentional fire-and-forget behavior.

## Data Flow

```
Files affected (HTTP Layer):
┌─────────────────────────────────────────────────────────────────┐
│ Controllers (2)                                                 │
│ - auth-controller.ts (1 error)                                 │
│ - OAuthController.ts (6 errors)                                │
├─────────────────────────────────────────────────────────────────┤
│ Middlewares (2)                                                 │
│ - auth.middleware.ts (2 errors)                                │
│ - rate-limiter.ts (2 errors)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Routes (2)                                                      │
│ - auth.routes.ts (1 error)                                      │
│ - oauth.routes.ts (3 errors)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Validation Schemas (2)                                          │
│ - login-schema.ts (1 error)                                     │
│ - register-schema.ts (3 errors)                                │
├─────────────────────────────────────────────────────────────────┤
│ Test Files (2)                                                  │
│ - auth-controller.concurrency.test.ts (2 errors)                │
│ - OAuthController.test.ts (2 errors)                           │
└─────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Identity/src/infrastructure/http/controllers/OAuthController.ts` | Modify | Fix lines 158, 164 (`??` instead of `\|\|`), line 179 (explicit check), line 188 (explicit check), line 191 (template literal), line 197 (explicit check) |
| `Identity/src/infrastructure/http/controllers/auth-controller.ts` | Modify | Fix line 289 (`(error).message` type check) |
| `Identity/src/infrastructure/http/middlewares/auth.middleware.ts` | Modify | Add return type to line 16, fix line 21 (explicit null check) |
| `Identity/src/infrastructure/http/middlewares/rate-limiter.ts` | Modify | Fix line 27 (`??` instead of `\|\|`) |
| `Identity/src/infrastructure/http/routes/auth.routes.ts` | Modify | Add return type to line 11 getter function |
| `Identity/src/infrastructure/http/routes/oauth.routes.ts` | Modify | Add return type to line 9, fix lines 18, 23 (void operator for promises) |
| `Identity/src/infrastructure/http/validation/zod-schemas/login-schema.ts` | Modify | Remove unused `e` import on line 1 |
| `Identity/src/infrastructure/http/validation/zod-schemas/register-schema.ts` | Modify | Fix line 28 (explicit empty check), line 36 (`??` instead of `\|\|`) |
| `Identity/src/infrastructure/http/controllers/__tests__/auth-controller.concurrency.test.ts` | Modify | Fix line 43 (explicit any check), remove unreachable code line 48 |
| `Identity/src/infrastructure/http/controllers/__tests__/OAuthController.test.ts` | Modify | Remove unused stateManager variable line 11, fix template literal line 187 |

## Interfaces / Contracts

No new interfaces required. All changes are local lint fixes.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Lint passes | Run `bun run lint` after changes |
| Integration | Existing tests | Run `bun test` to verify no regression |

## Migration / Rollout

No migration required. Changes are lint fixes only with no functional impact.

## Open Questions

- None - all errors are well-defined and mechanical to fix