# Requirements Document

## Introduction

This feature enhances the Soroban Ajo platform's error handling by replacing the existing basic `ErrorBoundary` component with an intelligent error boundary system. The new system classifies errors by type, applies appropriate recovery strategies automatically, reports errors to monitoring services, and provides clear, actionable feedback to users. It targets React component errors, network/API errors, validation errors, permission errors, and timeout errors within the Next.js 14 / TypeScript / Tailwind CSS frontend.

## Glossary

- **Error_Boundary**: A React class component that catches JavaScript errors in its child component tree and prevents the entire application from crashing.
- **Error_Classifier**: The module responsible for inspecting a caught error and assigning it an `ErrorType` and `RecoveryStrategy`.
- **Error_Reporter**: The module responsible for sending structured error data to the configured monitoring service and the analytics service.
- **Recovery_Manager**: The module that executes the recovery strategy selected by the `Error_Classifier`.
- **ErrorType**: An enumeration of error categories: `component`, `network`, `api`, `validation`, `permission`, `timeout`, `unknown`.
- **RecoveryStrategy**: An enumeration of recovery actions: `auto_retry`, `fallback_content`, `reload_component`, `navigate_away`, `show_error_page`.
- **Fallback_UI**: The React component rendered in place of the failed subtree when no custom fallback is provided.
- **Retry_Budget**: The maximum number of automatic retry attempts permitted for a given error instance, configurable per boundary instance.
- **Error_Context**: A structured object containing error metadata: `errorType`, `message`, `stack`, `componentStack`, `retryCount`, `timestamp`, `url`, `userId`, `sessionId`.

---

## Requirements

### Requirement 1: Error Classification

**User Story:** As a developer, I want caught errors to be automatically classified by type, so that the system can apply the most appropriate recovery strategy without manual configuration.

#### Acceptance Criteria

1. WHEN an error is caught by the `Error_Boundary`, THE `Error_Classifier` SHALL assign it exactly one `ErrorType` from the enumeration: `component`, `network`, `api`, `validation`, `permission`, `timeout`, or `unknown`.
2. WHEN an error message or name matches a network-related pattern (e.g., "network", "fetch", "ERR_NETWORK"), THE `Error_Classifier` SHALL assign the `ErrorType` `network`.
3. WHEN an error message or name matches an API-related pattern (e.g., HTTP status codes 4xx/5xx, "api", "endpoint"), THE `Error_Classifier` SHALL assign the `ErrorType` `api`.
4. WHEN an error message or name matches a validation-related pattern (e.g., "validation", "invalid", "schema"), THE `Error_Classifier` SHALL assign the `ErrorType` `validation`.
5. WHEN an error message or name matches a permission-related pattern (e.g., "unauthorized", "forbidden", "403", "401"), THE `Error_Classifier` SHALL assign the `ErrorType` `permission`.
6. WHEN an error message or name matches a timeout-related pattern (e.g., "timeout", "timed out", "ETIMEDOUT"), THE `Error_Classifier` SHALL assign the `ErrorType` `timeout`.
7. WHEN an error does not match any defined pattern, THE `Error_Classifier` SHALL assign the `ErrorType` `unknown`.
8. THE `Error_Classifier` SHALL map each `ErrorType` to a default `RecoveryStrategy` according to the following table:
   - `network` → `auto_retry`
   - `api` → `auto_retry`
   - `timeout` → `auto_retry`
   - `validation` → `fallback_content`
   - `permission` → `navigate_away`
   - `component` → `reload_component`
   - `unknown` → `show_error_page`

---

### Requirement 2: Automatic Retry Recovery

**User Story:** As a user, I want transient errors to be retried automatically, so that temporary network or API failures resolve without requiring manual intervention.

#### Acceptance Criteria

1. WHEN the assigned `RecoveryStrategy` is `auto_retry` and the `retryCount` is less than the configured `Retry_Budget`, THE `Recovery_Manager` SHALL schedule a retry attempt using exponential backoff with a base delay of 1000ms.
2. THE `Error_Boundary` SHALL accept a `maxRetries` prop of type `number` that sets the `Retry_Budget`; THE `Error_Boundary` SHALL default `maxRetries` to `3` when the prop is not provided.
3. WHEN a retry attempt is scheduled, THE `Fallback_UI` SHALL display a recovery-in-progress indicator showing the current attempt number and the total `Retry_Budget`.
4. WHEN a retry attempt succeeds (the child tree renders without error), THE `Recovery_Manager` SHALL reset the `retryCount` to `0`.
5. WHEN the `retryCount` reaches the `Retry_Budget`, THE `Recovery_Manager` SHALL stop automatic retries and transition to the `show_error_page` strategy.
6. IF the `Error_Boundary` unmounts while a retry is pending, THEN THE `Recovery_Manager` SHALL cancel the pending retry timer.

---

### Requirement 3: Fallback Content Strategy

**User Story:** As a user, I want a meaningful placeholder to appear when a non-critical component fails, so that I can continue using the rest of the application.

#### Acceptance Criteria

1. WHEN the assigned `RecoveryStrategy` is `fallback_content` and a `fallback` prop is provided, THE `Error_Boundary` SHALL render the `fallback` prop in place of the failed subtree.
2. WHEN the assigned `RecoveryStrategy` is `fallback_content` and no `fallback` prop is provided, THE `Error_Boundary` SHALL render the default `Fallback_UI` with a message indicating the section is temporarily unavailable.
3. WHILE the `fallback_content` strategy is active, THE `Fallback_UI` SHALL provide a manual retry button that resets the error state and re-renders the child subtree.

---

### Requirement 4: Reload Component Strategy

**User Story:** As a user, I want a failed component to reload itself automatically, so that transient rendering errors are resolved without a full page refresh.

#### Acceptance Criteria

1. WHEN the assigned `RecoveryStrategy` is `reload_component`, THE `Recovery_Manager` SHALL reset the `Error_Boundary` state to re-mount the child subtree.
2. WHEN the `reload_component` strategy is triggered, THE `Recovery_Manager` SHALL increment the `retryCount` and apply the same `Retry_Budget` limit defined in Requirement 2.2.
3. WHEN the `retryCount` reaches the `Retry_Budget` under the `reload_component` strategy, THE `Recovery_Manager` SHALL transition to the `show_error_page` strategy.

---

### Requirement 5: Navigate Away Strategy

**User Story:** As a user, I want to be redirected to a safe page when a permission error occurs, so that I am not left on a broken or unauthorized screen.

#### Acceptance Criteria

1. WHEN the assigned `RecoveryStrategy` is `navigate_away`, THE `Recovery_Manager` SHALL redirect the user to the path specified by the `navigateAwayPath` prop.
2. THE `Error_Boundary` SHALL accept a `navigateAwayPath` prop of type `string`; WHEN the prop is not provided, THE `Recovery_Manager` SHALL default to navigating to `/`.
3. WHEN the `navigate_away` strategy is triggered, THE `Error_Reporter` SHALL log the permission error before navigation occurs.

---

### Requirement 6: Show Error Page Strategy

**User Story:** As a user, I want a clear, full-screen error page when a critical or unrecoverable error occurs, so that I understand what happened and know what actions I can take.

#### Acceptance Criteria

1. WHEN the assigned `RecoveryStrategy` is `show_error_page`, THE `Fallback_UI` SHALL render a full-screen error page containing: a human-readable error title, a user-friendly description, and at least one recovery action button.
2. THE `Fallback_UI` SHALL provide a "Reload Page" action that calls `window.location.reload()`.
3. THE `Fallback_UI` SHALL provide a "Go Back" action that calls `window.history.back()`.
4. WHILE the application is running in the `development` environment, THE `Fallback_UI` SHALL display a collapsible technical details section containing the error message and stack trace.
5. WHILE the application is running in the `production` environment, THE `Fallback_UI` SHALL NOT display raw stack traces or internal error details to the user.

---

### Requirement 7: Error Reporting

**User Story:** As a developer, I want all caught errors to be reported with structured context, so that I can diagnose and resolve issues in production.

#### Acceptance Criteria

1. WHEN an error is caught by the `Error_Boundary`, THE `Error_Reporter` SHALL construct an `Error_Context` object containing: `errorType`, `message`, `stack`, `componentStack`, `retryCount`, `timestamp` (ISO 8601), `url`, `userId`, and `sessionId`.
2. WHEN an error is caught, THE `Error_Reporter` SHALL send the `Error_Context` to the analytics service via the existing `analytics.trackError` method.
3. WHEN an error is caught, THE `Error_Reporter` SHALL invoke the `onError` callback prop if one is provided, passing the original `Error` object and `React.ErrorInfo`.
4. THE `Error_Boundary` SHALL accept an `onError` prop of type `(error: Error, errorInfo: React.ErrorInfo, context: Error_Context) => void`.
5. WHILE the application is running in the `development` environment, THE `Error_Reporter` SHALL output the `Error_Context` to the browser console using `console.group` / `console.groupEnd`.
6. WHEN a retry attempt is made, THE `Error_Reporter` SHALL log a recovery attempt event including the `errorType`, `retryCount`, and `RecoveryStrategy`.

---

### Requirement 8: User Feedback

**User Story:** As a user, I want clear, non-technical feedback about what went wrong and what is happening, so that I am not confused or alarmed by application errors.

#### Acceptance Criteria

1. THE `Fallback_UI` SHALL display a user-friendly message derived from the `ErrorType` rather than the raw error message.
2. THE `Error_Boundary` SHALL maintain a mapping of `ErrorType` to user-friendly message strings, with the following defaults:
   - `network`: "Network connection issue. Please check your internet connection."
   - `api`: "We're having trouble reaching our servers. Please try again shortly."
   - `timeout`: "The request took too long. Please try again."
   - `validation`: "Something doesn't look right. Please refresh and try again."
   - `permission`: "You don't have permission to view this content."
   - `component`: "Part of this page failed to load."
   - `unknown`: "An unexpected error occurred. Our team has been notified."
3. WHILE automatic recovery is in progress, THE `Fallback_UI` SHALL display an animated loading indicator and a message stating recovery is being attempted.
4. WHEN all automatic recovery attempts are exhausted, THE `Fallback_UI` SHALL display a message informing the user that automatic recovery failed and presenting manual action buttons.
5. THE `Fallback_UI` SHALL display an error reference identifier (derived from `sessionId`) so users can quote it when reporting issues.

---

### Requirement 9: Composable Boundary Configuration

**User Story:** As a developer, I want to configure error boundaries declaratively with per-instance settings, so that different parts of the application can have tailored error handling behaviour.

#### Acceptance Criteria

1. THE `Error_Boundary` SHALL accept a `strategy` prop of type `RecoveryStrategy` that overrides the default strategy determined by the `Error_Classifier`.
2. THE `Error_Boundary` SHALL accept a `errorTypes` prop of type `ErrorType[]` that restricts which error types the boundary will handle; WHEN an error's `ErrorType` is not in the list, THE `Error_Boundary` SHALL re-throw the error to the nearest parent boundary.
3. THE `Error_Boundary` SHALL accept a `fallback` prop of type `React.ReactNode` for custom fallback content.
4. THE `Error_Boundary` SHALL accept a `maxRetries` prop as defined in Requirement 2.2.
5. THE `Error_Boundary` SHALL accept a `navigateAwayPath` prop as defined in Requirement 5.2.
6. THE `Error_Boundary` SHALL accept an `onError` prop as defined in Requirement 7.4.
7. THE `Error_Boundary` SHALL be backward-compatible with the existing `ErrorBoundary` component's prop interface (`children`, `fallback`, `onError`) so that existing usages require no changes.

---

### Requirement 10: Accessibility

**User Story:** As a user relying on assistive technology, I want error states and recovery actions to be fully accessible, so that I can understand and respond to errors regardless of how I interact with the application.

#### Acceptance Criteria

1. THE `Fallback_UI` SHALL set `role="alert"` on the error message container so that screen readers announce the error immediately.
2. THE `Fallback_UI` SHALL ensure all interactive action buttons have descriptive, accessible labels.
3. THE `Fallback_UI` SHALL manage focus by moving focus to the error heading when the error state is first rendered.
4. WHEN the recovery-in-progress indicator is displayed, THE `Fallback_UI` SHALL include an `aria-live="polite"` region that announces status updates to screen readers.
