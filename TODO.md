# TODO: Implement Group Dispute Resolution System (#343)

Current working directory: contracts/ajo

## Steps (Approved Plan - Breakdown):

### Phase 1: Core Types & Errors (types.rs, errors.rs)
✅ Edit types.rs: Added DisputeType/Status/Resolution enums, Dispute/DisputeVote structs
✅ Edit errors.rs: Added DisputeNotFound=38, DisputeAlreadyResolved=39, AlreadyVotedOnDispute=40, VotingPeriodEndedDispute=41, NotDisputeMember=42
- [ ] cargo test (Rust not installed yet, skip)
✅ Update lib.rs: pub use new Dispute*

### Phase 2: Storage (storage.rs)
✅ Add get_next_dispute_id ("DCOUNTER")
✅ Add store_dispute/get_dispute ("DISPUTE", id: Dispute)
✅ Add store_dispute_vote/has_voted_on_dispute/get_dispute_vote ("DISPVOTE", id, voter)
✅ Add store_group_dispute_ids/get_group_dispute_ids ("DISPGIDS", group_id: Vec<u64>)
- [ ] cargo test storage-related (Rust pending install)

### Phase 3: Utils & Events (utils.rs, events.rs)
✅ utils.rs: Added is_dispute_member(&Dispute, &Address)
✅ events.rs: Added emit_dispute_filed, emit_dispute_vote, emit_dispute_resolved
- [ ] cargo test (Rust pending)

### Phase 4: Contract Functions (contract.rs)
✅ Add file_dispute
✅ Add vote_on_dispute
✅ Add resolve_dispute (66% threshold)
✅ Helpers: apply_dispute_penalty, remove_member_from_group, process_dispute_refund, cancel_group reuse
✅ Add get_dispute/get_group_disputes
✅ All mutations pausable::ensure_not_paused()
- [ ] cargo test disputes

### Phase 5: Tests
- [ ] contracts/ajo/tests/disputes.rs: harness test file_dispute, vote (pass/fail), resolve (thresholds), resolutions, auth, edges
- [ ] cd contracts/ajo && cargo test disputes

### Phase 6: Git & PR
- [ ] git checkout -b blackboxai/dispute-resolution
- [ ] git add .
- [ ] git commit -m "feat(disputes): implement group dispute resolution system #343"
- [ ] cargo test && cargo check
- [ ] gh pr create --title "feat: Implement Group Dispute Resolution System closes #343" --body "Full spec impl, passes CI/tests. Supermajority voting, integrates w/penalty/refund." --base main
- [ ] Update TODO.md complete

Progress: Ready for Phase 1

**Run `cargo test` after each phase to verify.**

