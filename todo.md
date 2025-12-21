# TODO

## Library Customize refactors (sorted by severity)

### Refactor tasks (numbered by severity)
1. [ ] Decouple sorting/reorder logic and Tauri persistence from `LibrarySection` into a store/hook (e.g., `useLibrarySorting`) so the component only dispatches intents. Expose selectors/actions for sorted data and mutations. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
2. [ ] Lift `reset`/`reorder` async side-effects out of render into the store/hook layer; surface loading/error state back to the component for UI. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
3. [ ] Replace ref/imperative sort-mode switches with a reducer/state machine to track mode and pending order changes explicitly. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
4. [ ] Consolidate editor callbacks to a single required handler with a typed signature; remove legacy optional handler and branching. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
5. [ ] Apply strict typing (`LibraryCursor`, `CursorInfo`) instead of `any` across props and internals. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
6. [ ] Split `LibrarySection` into subcomponents (header, customize panel, grid) to reduce file size and isolate concerns. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
7. [ ] Remove duplicate sort toggle handlers; rely on a single controlled `onValueChange` handler. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
8. [ ] Replace inline style objects with CSS classes/tokens; prefer theme variables for layout/animation values. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
9. [ ] Extract magic layout numbers (e.g., maxHeight 280px) into constants/theme tokens. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
10. [ ] Enforce editor callback presence via required prop or feature-flagged logging to avoid noisy warnings. @frontend-vite/src/components/CursorCustomization/LibrarySection.tsx
