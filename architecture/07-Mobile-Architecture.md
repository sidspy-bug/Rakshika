# Mobile Architecture

The mobile application should be structured as a feature-oriented React Native codebase with clear separation between presentation, state, network access, and reusable UI.

## Mobile App Layers

### Presentation

- Screens
- Components
- Navigation stacks and tabs
- Theme and styling system

### Application State

- Redux Toolkit for global state
- React Query for server state
- Local component state for ephemeral UI concerns

### Data Access

- Axios API client
- Service wrappers per domain
- Typed request and response contracts

### Forms and Validation

- React Hook Form for input handling
- Shared validation schemas

## Recommended Folder Shape

- `src/screens`
- `src/components`
- `src/navigation`
- `src/services`
- `src/api`
- `src/hooks`
- `src/context`
- `src/store`
- `src/types`
- `src/utils`
- `src/constants`
- `src/theme`

## Screen Groups

- Authentication
- Home dashboard
- SOS trigger flow
- Community response
- AI assistant
- Evidence vault
- Profile and settings
- Emergency history

## Navigation Principles

- Keep emergency actions reachable from the main user flow.
- Separate auth and app navigation.
- Avoid deep navigation stacks for critical actions.

## Mobile Design Constraints

- Support fast access under stress.
- Keep UI minimal and accessible.
- Prepare for offline or degraded connectivity.
- Reuse components across screens to avoid UI drift.

## Integration Pattern

The mobile app should consume the backend through typed service modules rather than calling endpoints directly from screens.
