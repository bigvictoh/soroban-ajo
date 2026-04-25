# Requirements Document

## Introduction

This feature adds intelligent auto-save functionality to all forms in the platform (GroupCreationForm, ContributionForm, ProfileForm, SettingsPanel). The system is implemented as a reusable hook (`useAutoSave`) that can wrap any form, providing debounced saves, conflict detection, version history, draft restoration, cross-device sync, local storage backup, cloud sync, and offline support. The stack is Next.js 14, TypeScript, Tailwind CSS, Zustand, and TanStack Query v5.

## Glossary

- **AutoSave_Hook**: The `useAutoSave` React hook that provides auto-save behavior to any form component
- **Draft**: A locally or remotely persisted intermediate form state that has not been explicitly submitted
- **Save_Indicator**: The UI component that displays the current save status to the user
- **Conflict**: A state where a remote version of a draft differs from the local version, indicating concurrent edits from another device or session
- **Version_History**: An ordered list of previously saved draft snapshots for a given form and entity
- **Local_Storage**: The browser's `localStorage` API used as an offline-capable backup store
- **Cloud_Store**: The remote backend API responsible for persisting drafts and version history
- **Sync_Manager**: The subsystem responsible for reconciling Local_Storage state with the Cloud_Store
- **Debounce_Interval**: The configurable delay (in milliseconds) after the last change before a save is triggered
- **Form_Key**: A unique string identifier scoped to a form type and optional entity ID, used to namespace drafts


## Requirements

### Requirement 1: Debounced Auto-Save on Change

**User Story:** As a user, I want my form data to be saved automatically as I type, so that I never lose progress due to accidental navigation or browser closure.

#### Acceptance Criteria

1. WHEN a form field value changes, THE AutoSave_Hook SHALL schedule a save operation after the configured Debounce_Interval (default: 1000ms)
2. WHEN a new field change occurs before the Debounce_Interval elapses, THE AutoSave_Hook SHALL reset the debounce timer, cancelling the previously scheduled save
3. WHEN the user explicitly submits the form, THE AutoSave_Hook SHALL cancel any pending debounced save to avoid duplicate writes
4. THE AutoSave_Hook SHALL accept a configurable `debounceMs` option that overrides the default Debounce_Interval
5. WHEN the component using the AutoSave_Hook unmounts with a pending debounced save, THE AutoSave_Hook SHALL flush the pending save before teardown

---

### Requirement 2: Save Status Indicator

**User Story:** As a user, I want to see the current save status of my form, so that I know whether my data has been persisted.

#### Acceptance Criteria

1. THE Save_Indicator SHALL display one of four states: `idle`, `saving`, `saved`, or `error`
2. WHEN a save operation begins, THE Save_Indicator SHALL transition to the `saving` state within 100ms
3. WHEN a save operation completes successfully, THE Save_Indicator SHALL transition to the `saved` state and display a human-readable timestamp of the last save
4. WHEN a save operation fails, THE Save_Indicator SHALL transition to the `error` state and display a descriptive error message
5. WHEN the form has unsaved pending changes, THE Save_Indicator SHALL display the `saving` state rather than `saved`

---

### Requirement 3: Local Storage Backup

**User Story:** As a user, I want my form data to be backed up locally in the browser, so that my progress is preserved even when I am offline or the network request fails.

#### Acceptance Criteria

1. WHEN a debounced save is triggered, THE AutoSave_Hook SHALL write the current form values to Local_Storage under the Form_Key before attempting the Cloud_Store write
2. THE AutoSave_Hook SHALL namespace Local_Storage entries using the pattern `autosave:{form_key}` to avoid collisions with other application data
3. WHEN the Local_Storage write fails (e.g., storage quota exceeded), THE AutoSave_Hook SHALL log the error and continue attempting the Cloud_Store write
4. WHEN a form mounts and a Local_Storage entry exists for the Form_Key, THE AutoSave_Hook SHALL expose the stored draft for optional restoration
5. WHEN a draft is successfully committed to the Cloud_Store, THE AutoSave_Hook SHALL remove the corresponding Local_Storage entry

---

### Requirement 4: Cloud Sync

**User Story:** As a user, I want my drafts to be synced to the cloud, so that I can access them from any device.

#### Acceptance Criteria

1. WHEN a debounced save is triggered and the device is online, THE AutoSave_Hook SHALL persist the current form values to the Cloud_Store via the designated API endpoint
2. WHEN the Cloud_Store write succeeds, THE AutoSave_Hook SHALL update the local draft metadata with the server-assigned version identifier and timestamp
3. WHEN the Cloud_Store write fails with a transient error (HTTP 5xx or network timeout), THE AutoSave_Hook SHALL retry the request up to 3 times using exponential backoff before transitioning to the `error` state
4. THE AutoSave_Hook SHALL include the current client-side version identifier in each Cloud_Store write request to enable server-side conflict detection

---

### Requirement 5: Offline Support

**User Story:** As a user, I want to continue editing forms while offline, so that my work is not blocked by network unavailability.

#### Acceptance Criteria

1. WHILE the device is offline, THE AutoSave_Hook SHALL save form changes exclusively to Local_Storage and set the Save_Indicator to `saved` with an `(offline)` qualifier
2. WHEN the device transitions from offline to online, THE Sync_Manager SHALL automatically flush all pending Local_Storage drafts to the Cloud_Store in the order they were created
3. WHEN the Sync_Manager flush encounters a Conflict during online restoration, THE AutoSave_Hook SHALL pause the flush and surface the Conflict for user resolution before continuing
4. IF the Sync_Manager flush fails for a specific draft after 3 retry attempts, THEN THE Sync_Manager SHALL retain the draft in Local_Storage and set the Save_Indicator to `error` for the affected form

---

### Requirement 6: Conflict Detection

**User Story:** As a user editing a form on multiple devices, I want to be notified when a conflict exists between my local draft and a newer remote version, so that I can choose which version to keep.

#### Acceptance Criteria

1. WHEN the AutoSave_Hook fetches the latest draft from the Cloud_Store and the remote version identifier differs from the local version identifier, THE AutoSave_Hook SHALL declare a Conflict
2. WHEN a Conflict is declared, THE AutoSave_Hook SHALL present both the local and remote draft values to the consuming component via a `conflict` state object
3. WHEN a Conflict is declared, THE AutoSave_Hook SHALL pause all further auto-save writes until the Conflict is resolved
4. WHEN the user selects the local version to resolve a Conflict, THE AutoSave_Hook SHALL overwrite the Cloud_Store with the local draft and increment the version identifier
5. WHEN the user selects the remote version to resolve a Conflict, THE AutoSave_Hook SHALL discard the local draft and replace the form values with the remote draft values

---

### Requirement 7: Version History

**User Story:** As a user, I want to browse previous auto-saved versions of my form, so that I can recover an earlier state if needed.

#### Acceptance Criteria

1. THE Cloud_Store SHALL retain up to 20 version snapshots per Form_Key, discarding the oldest snapshot when the limit is exceeded
2. WHEN the user requests version history for a form, THE AutoSave_Hook SHALL retrieve the ordered list of snapshots from the Cloud_Store and expose them via a `versions` array
3. WHEN the user selects a snapshot from the `versions` array, THE AutoSave_Hook SHALL populate the form with the snapshot's values without immediately triggering a save
4. WHEN the user confirms restoration of a selected snapshot, THE AutoSave_Hook SHALL save the restored values as a new draft version, preserving the existing history

---

### Requirement 8: Draft Restoration on Mount

**User Story:** As a user returning to an incomplete form, I want to be prompted to restore my previous draft, so that I can continue where I left off.

#### Acceptance Criteria

1. WHEN a form mounts and a draft exists in the Cloud_Store for the Form_Key, THE AutoSave_Hook SHALL expose the draft via a `savedDraft` property and a `restoreDraft` callback
2. WHEN a form mounts and a Local_Storage draft exists but no Cloud_Store draft exists for the Form_Key, THE AutoSave_Hook SHALL expose the Local_Storage draft as the `savedDraft`
3. WHEN both a Local_Storage draft and a Cloud_Store draft exist on mount and their version identifiers differ, THE AutoSave_Hook SHALL treat this as a Conflict per Requirement 6
4. WHEN the user invokes `restoreDraft`, THE AutoSave_Hook SHALL populate the form with the draft values and set the Save_Indicator to `saved`
5. WHEN the user dismisses the restoration prompt, THE AutoSave_Hook SHALL discard the draft and initialize the form with its default values

---

### Requirement 9: Cross-Device Sync

**User Story:** As a user, I want my draft to reflect the latest saved state regardless of which device I last edited on, so that I always start from the most recent version.

#### Acceptance Criteria

1. WHEN a form mounts on a device, THE AutoSave_Hook SHALL fetch the latest draft from the Cloud_Store before rendering the restoration prompt
2. WHEN the user has an active form session and a newer draft version is written to the Cloud_Store from another device, THE AutoSave_Hook SHALL detect the version mismatch within 30 seconds and declare a Conflict per Requirement 6
3. THE AutoSave_Hook SHALL poll the Cloud_Store for version updates at a configurable interval (default: 30000ms) while the form is mounted and the device is online

---

### Requirement 10: Reusable Hook API

**User Story:** As a developer, I want a single reusable hook that I can attach to any form, so that I can add auto-save behavior without duplicating logic across GroupCreationForm, ContributionForm, ProfileForm, and SettingsPanel.

#### Acceptance Criteria

1. THE AutoSave_Hook SHALL accept a `formKey` string, a `values` object representing current form state, and an optional `options` configuration object as its inputs
2. THE AutoSave_Hook SHALL return a stable API object containing: `status` (Save_Indicator state), `savedDraft`, `restoreDraft`, `dismissDraft`, `conflict`, `resolveConflict`, `versions`, and `restoreVersion`
3. THE AutoSave_Hook SHALL be compatible with any form state management approach, including React Hook Form, Zustand-managed state, and uncontrolled components, by accepting a plain serializable `values` object
4. WHEN the `formKey` prop changes, THE AutoSave_Hook SHALL treat the new key as a distinct form, flushing any pending save for the previous key and loading the draft for the new key
5. THE AutoSave_Hook SHALL not introduce any peer dependencies beyond those already present in the platform stack (Next.js 14, TypeScript, Zustand, TanStack Query v5)
