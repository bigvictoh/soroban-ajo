# Issue #384: Create Backup and Recovery System

## Overview
Implement an automated PostgreSQL backup and recovery system for the backend with point-in-time recovery (PITR), encrypted off-site storage, retention management, and tested restore procedures.

## Goals
- Protect production data against accidental deletion, corruption, infrastructure failure, and operator mistakes.
- Achieve predictable recovery objectives with clear SLAs.
- Make restore operations repeatable, documented, and regularly tested.

## Recovery Targets
- RPO (Recovery Point Objective): <= 5 minutes.
- RTO (Recovery Time Objective): <= 30 minutes for standard restores.
- Backup success rate target: >= 99.5% monthly.

## Current Context
- Backend uses PostgreSQL via Prisma.
- Repository already includes Docker and deployment scripts, which can host backup jobs and restore tooling.
- No formalized PITR pipeline is currently documented in this repo.

## Scope
### In Scope
- Automated full backups (base backups) on schedule.
- Continuous WAL archiving for PITR.
- Encrypted storage to object store (S3-compatible).
- Retention and lifecycle policies.
- Recovery scripts for:
  - latest restore,
  - point-in-time restore by timestamp,
  - restore verification.
- Alerting, dashboards, and operational runbook.

### Out of Scope (Phase 2)
- Cross-region active-active failover.
- Zero-downtime major version upgrades.
- Automatic failover orchestration with Patroni/Stolon.

## High-Level Architecture
1. PostgreSQL primary generates WAL continuously.
2. WAL files are archived to object storage using archive_command.
3. Scheduled base backups are taken daily (or more frequently if needed) using pg_basebackup.
4. Backup metadata (backup start/end, LSN range, checksum results) is recorded.
5. Recovery tooling reconstructs DB state by restoring base backup + replaying WAL to a timestamp.

## Implementation Design
### 1) PostgreSQL Configuration
Set in postgresql.conf (or managed config equivalent):
- wal_level = replica
- archive_mode = on
- archive_timeout = 60s
- max_wal_senders tuned for backup tooling
- hot_standby = on (optional for validation replica)

Set archive command:
- archive_command uses a hardened uploader script that:
  - validates file existence,
  - computes checksums,
  - uploads with server-side encryption,
  - retries on transient errors,
  - logs structured events.

### 2) Backup Job Strategy
- Base backup schedule:
  - daily full base backup (e.g., 02:00 UTC),
  - optional 12-hour cadence for tighter RTO.
- WAL upload:
  - near real-time via archive_command.
- Backup consistency:
  - use replication slot or robust transfer process to avoid WAL gaps.

### 3) Storage Layout
Use deterministic object keys:
- backups/base/YYYY/MM/DD/<timestamp>/...
- backups/wal/YYYY/MM/DD/<wal-file>
- backups/metadata/<timestamp>.json

Metadata fields include:
- postgres_version,
- backup_label,
- start_lsn,
- end_lsn,
- started_at,
- completed_at,
- checksum_manifest,
- tool_version.

### 4) Encryption and Security
- Encryption in transit: TLS for all uploads.
- Encryption at rest: KMS-managed keys (SSE-KMS or equivalent).
- Principle of least privilege:
  - backup writer role can write only backup prefixes,
  - restore role can read backup prefixes only.
- Secret handling:
  - credentials in secret manager, never in repo.

### 5) Retention and Lifecycle
- WAL retention: 14 days.
- Base backup retention:
  - daily backups for 30 days,
  - weekly snapshots for 12 weeks,
  - monthly snapshots for 12 months.
- Object lifecycle rules enforce deletion/transition automatically.

### 6) Restore and PITR Workflow
Restore modes:
- latest: recover to most recent consistent state.
- timestamp: recover to explicit UTC timestamp.
- lsn: advanced mode for exact LSN replay.

General restore steps:
1. Provision clean PostgreSQL instance with matching major version.
2. Download selected base backup.
3. Extract into PGDATA with proper ownership and permissions.
4. Configure recovery settings to pull WAL from object store.
5. Set recovery target (time or LSN).
6. Start PostgreSQL and validate readiness.
7. Run post-restore verification suite.

### 7) Verification and Integrity
- Pre-upload checksum for each artifact.
- Periodic integrity check job to verify object existence and hashes.
- Weekly non-prod restore drill from random restore point.
- Monthly game day simulating data-loss incident.

## Operational Tooling
Create scripts under backend/scripts:
- backup-base.sh
- archive-wal.sh
- restore-latest.sh
- restore-pitr.sh
- verify-restore.sh

Create runbooks under backend/docs:
- BACKUP_RUNBOOK.md
- RECOVERY_RUNBOOK.md
- INCIDENT_RECOVERY_PLAYBOOK.md

## Monitoring and Alerting
Expose metrics:
- backup_last_success_timestamp
- backup_duration_seconds
- wal_archive_lag_seconds
- restore_test_last_success_timestamp
- restore_test_duration_seconds

Alerts:
- no successful backup in > 26h,
- WAL archive lag > 10 minutes,
- restore drill failure,
- checksum mismatch detected.

## Testing Plan
### Unit/Script Tests
- Validate script argument parsing, retry logic, and error codes.

### Integration Tests
- Start ephemeral PostgreSQL in CI/local docker.
- Seed data, run backup, mutate data, run PITR restore, compare expected state.

### Disaster Recovery Drills
- Weekly automated restore into staging and run smoke checks.
- Monthly manual drill with timed RTO measurement.

## Rollout Plan
### Phase 0: Foundation (Week 1)
- Confirm infra prerequisites (object store, IAM, KMS).
- Add backup/restore scripts and config templates.

### Phase 1: Automated Backup (Week 2)
- Enable WAL archive + base backup schedule in staging.
- Add monitoring and alerting.

### Phase 2: PITR Validation (Week 3)
- Implement timestamp-based restore workflow.
- Run repeat restore drills and fix gaps.

### Phase 3: Production Rollout (Week 4)
- Enable in production.
- Observe one full backup cycle + WAL continuity.
- Sign off with runbook and on-call readiness.

## Risks and Mitigations
- WAL gap due to upload failure:
  - Mitigation: retries, alerts, integrity checks, replication slot strategy.
- Incompatible PostgreSQL versions during restore:
  - Mitigation: explicit version pinning in metadata and restore validation.
- Slow restore from large datasets:
  - Mitigation: periodic restore profiling and tuned parallel download/extract.
- Credential misconfiguration:
  - Mitigation: startup validation checks and canary upload test.

## Acceptance Criteria
- Automated base backup runs successfully on schedule.
- WAL archiving is continuous and alert-backed.
- Point-in-time restore to arbitrary timestamp within retention window works in staging.
- Documented restore runbook is complete and verified by at least one dry run.
- Monitoring dashboard and critical alerts are live.

## Deliverables
- Backup and restore scripts.
- Environment/config templates for backup pipeline.
- Runbooks and incident playbook.
- Monitoring and alert definitions.
- Evidence of successful restore drill.

## Branch
- Working branch for this issue: feature/backup-recovery-system-384
