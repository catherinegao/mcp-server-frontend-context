# Component conventions

These conventions describe how components are structured in this sample
project. The MCP server's `get_conventions` tool exposes this document to any
agent (Cursor, Claude Desktop, etc.) so it can follow project-specific
patterns instead of inventing its own.

## File layout

- One component per file. Filename matches the component name (PascalCase).
- Co-located styles use CSS Modules: `Button.module.css` next to `Button.tsx`.
- Tests are co-located: `Button.test.tsx` next to `Button.tsx`.

## Props

- Props are declared via a TypeScript interface named `<ComponentName>Props`.
- Optional props use `?:`. Avoid `undefined` in the type union when the
  optional marker already conveys it.
- Avoid `React.FC`; type the function signature explicitly.

## State and effects

- Prefer `useState` and `useReducer` for local state.
- Side effects belong in `useEffect`. Cleanup is required for subscriptions,
  timers, and event listeners.

## Accessibility

- All interactive elements have a visible focus state.
- Forms use `<label htmlFor="...">` linked to inputs.
- Modal dialogs trap focus and restore it on close.

## Naming

- Event-handler props use `on<Event>` (e.g. `onSubmit`, `onClose`).
- Boolean props use `is<State>` or `has<Thing>` (e.g. `isOpen`, `hasError`).
