soroban_sdk::testutils::Accounts;
use soroban_sdk::{testutils::Ledger, symbol_short, Address, BytesN, Env, Symbol};
use crate::contract::AjoContractClient;
use crate::storage;
use crate::types::{
    Dispute, DisputeResolution, DisputeStatus, DisputeType, DisputeVote, GroupState,
};
use crate::utils;

#[test]
fn test_file_dispute() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    // Setup group
    let creator = e.accounts().generate();
    let group_id = client.create_group(
        &creator,
        &10000000i128, // 1 XLM
        &86400u64,     // 1 day cycle
        &10u32,        // max 10 members
        &86400u64,     // 1 day grace
        &5u32,         // 5% penalty
    );

    // File dispute
    let complainant = creator.clone();
    let defendant = e.accounts().generate();
    client.join_group(&defendant, &group_id); // make defendant member

    let dispute_id = client.file_dispute(
        &complainant,
        &group_id,
        &defendant,
        &DisputeType::NonPayment,
        &"Test dispute".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Penalty,
    );

    // Verify stored
    let dispute = storage::get_dispute(&e, dispute_id).unwrap();
    assert_eq!(dispute.id, dispute_id);
    assert_eq!(dispute.group_id, group_id);
    assert_eq!(dispute.status, DisputeStatus::Open);
    assert!(dispute.voting_deadline > utils::get_current_timestamp(&e));
}

#[test]
#[should_panic(expected = "NotMember")]
fn test_file_dispute_not_member() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &5u32);

    let complainant = creator.clone();
    let defendant = e.accounts().generate(); // not joined

    client.file_dispute(
        &complainant,
        &group_id,
        &defendant,
        &DisputeType::NonPayment,
        &"".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Penalty,
    );
}

#[test]
fn test_vote_on_dispute() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let member1 = e.accounts().generate();
    let member2 = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &5u32);
    client.join_group(&member1, &group_id);
    client.join_group(&member2, &group_id);

    let dispute_id = client.file_dispute(
        &creator,
        &group_id,
        &member1,
        &DisputeType::NonPayment,
        &"test".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Penalty,
    );

    // Vote yes
    client.vote_on_dispute(&member2, &dispute_id, &true);

    let dispute = storage::get_dispute(&e, dispute_id).unwrap();
    assert_eq!(dispute.votes_for_action, 1);
    assert_eq!(dispute.status, DisputeStatus::Voting);
}

#[test]
#[should_panic(expected = "AlreadyVotedOnDispute")]
fn test_vote_twice() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let voter = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &5u32);
    client.join_group(&voter, &group_id);

    let dispute_id = client.file_dispute(
        &creator,
        &group_id,
        &voter,
        &DisputeType::NonPayment,
        &"test".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Penalty,
    );

    client.vote_on_dispute(&voter, &dispute_id, &true);
    client.vote_on_dispute(&voter, &dispute_id, &false); // panic
}

#[test]
fn test_resolve_dispute_approved() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let member1 = e.accounts().generate();
    let member2 = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &5u32);
    client.join_group(&member1, &group_id);
    client.join_group(&member2, &group_id);

    let dispute_id = client.file_dispute(
        &creator,
        &group_id,
        &member1,
        &DisputeType::NonPayment,
        &"test".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Penalty,
    );

    // Advance time past voting
    e.ledger().timestamp(e.ledger().timestamp() + 7 * 86400 + 1);

    // Vote for (2/2 = 100% >66%)
    client.vote_on_dispute(&member2, &dispute_id, &true);
    // Assume creator auto-votes or manual, but for test assume 66% met

    client.resolve_dispute(&creator, &dispute_id);

    let dispute = storage::get_dispute(&e, dispute_id).unwrap();
    assert_eq!(dispute.status, DisputeStatus::Resolved);
    assert_eq!(dispute.final_resolution, Some(DisputeResolution::Penalty));
}

#[test]
#[should_panic(expected = "VotingPeriodActive")]
fn test_resolve_too_early() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &5u32);

    let dispute_id = client.file_dispute(
        &creator,
        &group_id,
        &creator,
        &DisputeType::NonPayment,
        &"test".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Penalty,
    );

    client.resolve_dispute(&creator, &dispute_id); // too early
}

#[test]
fn test_penalty_resolution() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let defendant = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &10u32); // 10% penalty

    client.join_group(&defendant, &group_id);

    let dispute_id = client.file_dispute(
        &creator,
        &group_id,
        &defendant,
        &DisputeType::NonPayment,
        &"test".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Penalty,
    );

    e.ledger().timestamp(e.ledger().timestamp() + 7 * 86400 + 1);
    client.resolve_dispute(&creator, &dispute_id);

    // Check penalty pool increased
    let penalty_pool = storage::get_cycle_penalty_pool(&e, group_id, 1);
    assert_eq!(penalty_pool, 1000000i128); // 10M contrib * 10% = 1M

    // Check member penalty record
    let penalty_record = storage::get_member_penalty(&e, group_id, &defendant).unwrap();
    assert_eq!(penalty_record.late_count, 1);
    assert!(penalty_record.total_penalties > 0);
}

#[test]
fn test_removal_resolution() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let defendant = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &5u32);

    client.join_group(&defendant, &group_id);

    let dispute_id = client.file_dispute(
        &creator,
        &group_id,
        &defendant,
        &DisputeType::RuleViolation,
        &"test".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Removal,
    );

    e.ledger().timestamp(e.ledger().timestamp() + 7 * 86400 + 1);
    client.resolve_dispute(&creator, &dispute_id);

    let group = storage::get_group(&e, group_id).unwrap();
    assert_eq!(group.members.len(), 1); // only creator left
}

#[test]
fn test_refund_resolution() {
    let e: Env = Default::default();
    e.mock_all_auths();

    let client = AjoContractClient::new(&e, &e.register_contract(None, AjoContract));

    let creator = e.accounts().generate();
    let complainant = e.accounts().generate();
    let group_id = client.create_group(&creator, &10000000i128, &86400u64, &10u32, &86400u64, &5u32);

    client.join_group(&complainant, &group_id);

    let dispute_id = client.file_dispute(
        &complainant,
        &group_id,
        &creator,
        &DisputeType::PayoutDispute,
        &"test".into(),
        &BytesN::from_array(&e, &[0u8; 32]),
        &DisputeResolution::Refund,
    );

    e.ledger().timestamp(e.ledger().timestamp() + 7 * 86400 + 1);
    client.resolve_dispute(&creator, &dispute_id);

    let refund_record = storage::get_refund_record(&e, group_id, &complainant).unwrap();
    assert_eq!(refund_record.reason, crate::types::RefundReason::DisputeRefund);
    assert_eq!(refund_record.amount, 10000000i128);
}

