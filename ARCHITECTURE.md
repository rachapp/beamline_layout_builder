# Beamline Layout Builder Architecture

The app is built with **React** and **Vite**. Pure logic (geometry, ray tracing, CSV) lives in plain functions under `src/utils/` so it can be unit-tested; React state lives in hooks under `src/hooks/`; UI lives in `src/components/`.

## Directory Structure

```text
├── app.jsx                       # Root component: toolbar, layout, error boundaries
├── templates/                    # CSV beamline templates (the only copy; copied into dist/ at build)
├── src/
│   ├── constants/index.js        # Component TYPES, type-group helpers, canvas scale constants
│   ├── constants/templates.js    # Bundled fallback template (used offline / if templates/ is missing)
│   ├── hooks/
│   │   ├── useBeamlineState.js   # Owns editor state and wires the hooks below together
│   │   ├── usePhysicsEngine.js   # Memoised wrapper around utils/physics.js
│   │   ├── useTheme.js
│   │   └── beamline/
│   │       ├── useCamera.js            # Zoom, pan, fit-to-screen, zoom-to-item, refit on resize
│   │       ├── usePointerHandlers.js   # Placing, dragging (single and group), resizing, labels, panning
│   │       ├── useItemEditing.js       # Property edits from the Properties panel; delete
│   │       ├── useTemplates.js         # Template list, template loading, CSV import
│   │       ├── useHistory.js           # Undo / redo
│   │       └── useKeyboardShortcuts.js # Keyboard shortcuts (listed in components/ShortcutHelp.jsx)
│   ├── components/
│   │   ├── Viewport.jsx          # TOP / SIDE canvas: grid, rulers, rays, components, labels
│   │   ├── OpticalComponent.jsx  # Drawing of each component type (memoised)
│   │   ├── PropertiesWidget.jsx  # Right-hand panel; sections live in properties/
│   │   ├── properties/           # Anchor, enclosure, optic, footprint, source-ray sections
│   │   ├── TableView.jsx         # Construction schedule & clearance table
│   │   ├── Sidebar.jsx, SettingsModal.jsx, CadSvgExportModal.jsx
│   │   ├── ErrorBoundary.jsx     # Keeps one crashing panel from taking down the app
│   │   └── ShortcutHelp.jsx      # Keyboard shortcuts dialog
│   └── utils/
│       ├── geometry.js           # Item lengths and start/end bounds; bound edits with lock constraints
│       ├── physics.js            # Ray tracing through mirrors, DCMs, gratings, splitters
│       ├── schedule.js           # Construction schedule, clearances, overlap detection
│       ├── csv.js                # CSV export / import
│       ├── cadSvg.js             # CAD SVG export
│       ├── miscParams.js         # The four type-specific "Misc" CSV columns
│       ├── itemFactory.js        # New items from the palette; upgrades for old saved data
│       ├── autosave.js           # Browser-storage autosave
│       ├── constructionUtils.js  # Re-exports the modules above (kept for existing imports)
│       └── index.js              # Visual heights, default colours, numOr()
```

## Key ideas

### Items and computed items
`useBeamlineState` holds `items`: what the user placed and edited. `computeBeamPaths(items)` returns `computedItems`, copies with the ray-traced positions (`y`, `z`), slopes and mirror angles, plus the trace points used to draw the rays. Components draw from `computedItems`, but **edits must go to `items`** (use `setItems(prev => …)` and look the item up in `prev`), otherwise computed fields leak into the saved layout.

### Coordinates
Canvas X is `ORIGIN_X + distance_m * PX_PER_M`. Canvas Y/Z is measured from the beam axis at `BEAM_AXIS_PX` (`PX_PER_MM_V` px per mm); the SIDE-view floor is at `FLOOR_PX`. Use the constants rather than the raw numbers 160 / 150 / 200.

### Component types
Use the helpers in `src/constants/index.js` (`isRangeType`, `isAnchorType`, `isDcmType`, `canEditElevation`, …) instead of writing type lists inline. Adding a type: add it to `TYPES`, to the relevant helper groups, and draw it in `OpticalComponent.jsx`.

### Undo and autosave
`useHistory` watches `items` and records a step once changes have been quiet for a moment, or when a drag ends, so callers just use `setItems` as normal. Autosave writes the layout to `localStorage` shortly after each change; on startup the autosaved layout is restored, otherwise the preferred template is loaded (falling back to the bundled template if no template can be fetched).

## Testing
`npm test` runs Vitest. Tests live next to the code in `__tests__/` folders and cover CSV round-trips for every template, geometry, ray tracing, item creation, autosave and undo/redo. `npm run lint` runs ESLint; `no-undef` is an error because undefined names crash the app at runtime.
