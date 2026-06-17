# Proposal: payments-service-rust-best-practices

## Intent

Fix critical code quality issues in the payments-service Rust microservice:
1. **N+1 Queries**: Replace inefficient in-memory filtering with proper SeaORM queries
2. **unwrap()/panic**: Replace unsafe error handling with proper Result handling per Rust best practices
3. **Clippy Config**: Add required linter configuration to Cargo.toml
4. **Handlers**: Implement HTTP handlers in the infrastructure layer instead of inline in main.rs

These issues violate the `avoid-panic` rule from the project's Rust code review standards and create performance problems with database queries.

## Scope

### In Scope
- Fix N+1 queries in `payment_repository.rs` (functions: `find_by_order_id`, `find_by_customer`)
- Replace `.unwrap()` and `.expect()` in `main.rs` with proper error handling
- Add clippy configuration to `Cargo.toml` with required lints
- Implement handlers in `src/infrastructure/http/handlers/*.rs` (payment, invoice, coupon)
- Wire handlers in `main.rs` to use the implemented versions

### Out of Scope
- Changes to other services (Marketplace, Catalog, Identity)
- Database schema changes
- Adding new features or endpoints
- Refactoring domain entities

## Approach

1. **N+1 Fix**: Use SeaORM's `.filter()` method to push filtering to the database:
   ```rust
   // ANTES (carga todo)
   let results = PaymentEntity::find().all(&self.db).await?;
   let filtered: Vec<Payment> = results.into_iter().filter(...).collect();
   
   // DESPUÉS (filtra en DB)
   let result = PaymentEntity::find()
       .filter(PaymentColumn::OrderId.eq(order_id))
       .one(&self.db)
       .await?;
   ```

2. **unwrap() Fix**: For initialization code in main, use proper error propagation:
   - Replace `.expect()` with `.map_err()?` pattern
   - For config loading: convert to Result and propagate
   - For server startup: use `?` operator or match

3. **Clippy Config**: Add to Cargo.toml:
   ```toml
   [lints.rust]
   unsafe_code = "forbid"
   
   [clippy]
   pedantic = "allow"
   ```

4. **Handlers**: Implement the placeholder handlers in `infrastructure/http/handlers/` to properly delegate to the application layer (commands/queries).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/infrastructure/database/repositories/payment_repository.rs` | Modified | Fix N+1 queries |
| `src/main.rs` | Modified | Replace unwrap with proper error handling |
| `Cargo.toml` | Modified | Add clippy configuration |
| `src/infrastructure/http/handlers/payment.rs` | Modified | Implement handlers |
| `src/infrastructure/http/handlers/invoice.rs` | Modified | Implement handlers |
| `src/infrastructure/http/handlers/coupon.rs` | Modified | Implement handlers |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing API contracts | Low | Keep same signatures, only fix internals |
| Database query behavior change | Low | Test with existing data, verify results match |
| Handler behavior change | Medium | Ensure handlers return same responses |

## Rollback Plan

1. Revert git changes to modified files
2. For N+1 fix: revert to `.all()` + filter pattern (less efficient but working)
3. For unwrap: revert to `.expect()` calls (violates best practices but functional)
4. For handlers: revert to main.rs inline implementations

## Dependencies

- None - all changes are self-contained within the payments-service

## Success Criteria

- [ ] `cargo clippy` passes without errors
- [ ] N+1 queries replaced with filter at DB level
- [ ] No `.unwrap()` or `.expect()` in main.rs (except for critical initialization where appropriate)
- [ ] Handlers in `infrastructure/http/handlers/` properly implemented and wired
- [ ] All tests pass: `cargo test`
- [ ] Code compiles: `cargo build`
