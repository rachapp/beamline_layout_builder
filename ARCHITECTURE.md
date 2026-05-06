# Beamline Layout Builder Architecture

This document describes the modular architecture of the Beamline Layout Builder application after the refactoring.

## Overview

The project is built with **React** and **Vite**, utilizing a modular structure to separate concerns, improve maintainability, and allow for easier scaling of new features.

## Directory Structure

```text
├── app.jsx                 # Root component, orchestrates high-level layout
├── src/
│   ├── components/         # Pure UI and functional components
│   ├── hooks/              # Custom React hooks for state and logic
│   ├── utils/              # Helper functions and mapping logic
│   └── constants/          # Configuration, types, and defaults
├── templates.json          # Preset beamline layouts
└── layout.json             # Documentation and schema examples
```

## Core Modules

### 1. State Management (`src/hooks/useBeamlineState.js`)
Handles the complex interactions of the canvas, including:
- Component placement, selection, and deletion.
- Drag-and-drop mechanics (components, labels, and resizing).
- Canvas panning, zooming, and grid snapping.
- JSON Port import/export logic.

### 2. Physics Engine (`src/hooks/usePhysicsEngine.js`)
Calculates the beam path based on optical component properties:
- **DCM (Monochromator):** Computes beam shift and crystal positioning based on Bragg angle and offset.
- **Mirrors & Gratings:** Calculates beam deflection and rotation.
- **Trace Points:** Generates a sequence of points used to render the ray-tracing path in both TOP and SIDE views.

### 3. UI Components (`src/components/`)
- **Viewport:** Renders the canvas, grid, rulers, and optical elements.
- **Sidebar:** Provides the tool palette for adding components and controlling the canvas.
- **PropertiesWidget:** A floating, draggable panel for fine-tuning selected component properties.
- **OpticalComponent:** Encapsulates the visual rendering of different beamline elements (SVG/CSS).

### 4. Utilities & Constants (`src/utils/`, `src/constants/`)
- **Mapping:** Transforms raw template data into interactive canvas items.
- **Defaults:** Defines physical lengths, colors, and dimensions for every component type.
- **Theming:** Centralized theme configuration for light and dark modes.

## Scalability

This architecture allows for:
- **Adding new components:** Simply define a new type in `constants/index.js` and add its visual representation in `OpticalComponent.jsx`.
- **Advanced Physics:** New ray-tracing logic can be added to the `usePhysicsEngine` without affecting UI code.
- **Alternative UIs:** The logic in hooks is decoupled from the layout, enabling different view configurations.
