# Comprehensive Test Suite Documentation

## Overview
This document describes the comprehensive test suite implemented for the Soroban Ajo platform.

## Test Structure

### Unit Tests
Located in `backend/src/__tests__/unit/` and `frontend/src/__tests__/unit/`

- **Services Tests**: Test individual service methods in isolation
  - `auth.service.test.ts`: Authentication service tests
  - `group.service.test.ts`: Group management service tests
  
- **Controllers Tests**: Test API controllers
  - `goals.controller.test.ts`: Goals controller tests

- **Component Tests** (Frontend):
  - `Button.test.tsx`: UI component tests

**Coverage Target**: 80% code coverage

### Integration Tests
Located in `backend/src/__tests__/integration/`

- **API Integration Tests**: Test API endpoints with database
  - `auth.integration.test.ts`: Authentication API tests
  - `groups.integration.test.ts`: Groups API tests

Tests real database interactions and API request/response cycles.

### E2E Tests
Located in `backend/src/__tests__/e2e/`

- **User Journey Tests**: Test complete user workflows
  - `user-journey.e2e.test.ts`: Full user registration to contribution flow

Tests entire application flow from user perspective.

### Performance Tests
Located in `backend/src/__tests__/performance/`

- **API Performance Tests**: Measure response times and throughput
  - `api-performance.test.ts`: API endpoint performance benchmarks

**Performance Targets**:
- Single requests: < 200ms
- Concurrent requests (10): < 1000ms
- Large payloads: < 500ms

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests
```bash
npm run test:integration
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Performance Tests
```bash
npm run test:performance
```

### Run with Coverage
```bash
npm run test:coverage
```

## Coverage Requirements

The test suite enforces 80% coverage across:
- Branches
- Functions
- Lines
- Statements

Coverage reports are generated in the `coverage/` directory.

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Use mocks for external dependencies
3. **Cleanup**: Always clean up test data
4. **Assertions**: Use clear, specific assertions
5. **Performance**: Keep tests fast and efficient

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

## Future Enhancements

- Visual regression testing
- Load testing scenarios
- Security testing
- Accessibility testing
