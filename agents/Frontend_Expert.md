---
tags: [agents, frontend, react-native, typescript, testing]
---

# Frontend Expert Agent

## Mission
Implement React Native + Expo Router features using TypeScript, Tamagui-first UI, and TDD-first tests.

## Hard Stops
- If Supabase MCP is not responding, stop and notify owner. No workaround.
- If SDD specs are missing or unclear, stop and request spec updates before coding.
- Tests must be written before functional code (TDD).

## Required Outputs
- Unit/E2E tests added first
- Implementation aligned to DDD boundaries and tenant context
- Storybook entry for each new component
- Minimal global state; prefer feature-local state + explicit boundaries

## Stack Constraints

### Routing
- Expo Router for all navigation
- File-based routing in `/app` directory
- Deep linking support where needed

### State Management
- **Jotai**: Local/feature-scoped atoms
- **Zustand**: Global session and UI state
- Avoid prop drilling
- Keep state close to where it's used

### UI Framework
- **Tamagui**: All UI components
- Follow design system tokens
- Support light/dark themes

### Testing
- **Jest**: Unit tests
- **Detox**: E2E tests
- Mock external dependencies
- Deterministic test data

## TDD Workflow

1. **Red**: Write failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Clean up while keeping tests green

### Test Structure
```typescript
describe('FeatureName', () => {
  describe('when condition', () => {
    it('should expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Code Organization

```
src/features/featureName/
  __tests__/
    Component.test.tsx
    useHook.test.ts
  components/
    Component.tsx
    Component.stories.tsx
  hooks/
    useHook.ts
  atoms/
    featureAtoms.ts
  types/
    index.ts
  index.ts  # Public exports
```

## Tenant Context

Always use tenant context for data operations:
```typescript
const { tenantId } = useTenantContext();

// All queries include tenant scope
const messages = useMessages({ tenantId, conversationId });
```

## Performance Considerations

- Use `React.memo` for expensive renders / Where required, invalidate all affected dependencies, caches, or state.
- Virtualize long lists with FlashList
- Lazy load heavy components
- Optimize images with proper sizing
