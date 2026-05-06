# Beamline Layout Builder

An interactive, physics-aware web application for designing and visualizing synchrotron beamline layouts.

## 🚀 Live Demo

You can run the application online at:  
[**https://rachapp.github.io/beamline_layout_builder/**](https://rachapp.github.io/beamline_layout_builder/)

---

![Beamline Builder Preview]
(https://via.placeholder.com/800x400.png?text=Beamline+Layout+Builder+Interface)

## 🚀 Overview

Beamline Layout Builder is a specialized CAD tool designed for beamline scientists and engineers. It allows for the rapid prototyping of optical layouts with real-time ray tracing and physical property adjustments.

### Key Features
- **Real-time Ray Tracing:** Visualizes the beam path in both **SIDE** and **TOP** views.
- **Physics-Aware Optics:** Supports DCMs (Monochromators), VFM/HFM (Mirrors), Gratings, and more with accurate deflection and shift logic.
- **Interactive Canvas:** Drag-and-drop components, adjust labels, and resize construction elements (Walls, Hutches).
- **Physical Property Tuning:** Adjust physical lengths of mirrors, gratings, and individual DCM crystals.
- **JSON Port:** Import and export your layouts as clean, editable JSON files.
- **Dark Mode Support:** Optimized interface for different environment settings.

## 🛠️ Tech Stack
- **React 18**
- **Vite** (for lightning-fast development)
- **Tailwind CSS** (for modern, responsive styling)
- **Lucide React** (for crisp iconography)

## 🏗️ Architecture
The project follows a modular architecture to ensure long-term maintainability. Complex logic is encapsulated in custom hooks, while the UI is broken down into reusable components.

For more details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📥 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/rachapp/beamline_layout_builder.git
   cd beamline_layout_builder
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## 📖 Usage
- **Add Components:** Use the sidebar palette to place optical elements onto the canvas.
- **Adjust Properties:** Select a component to open the floating **Properties Widget**.
- **Navigate:** Use the mouse wheel to zoom and drag the background to pan.
- **JSON Portal:** Click the JSON Port button to copy your current layout or paste an existing configuration.

---
Developed by **rachapp** (Pornthep Pongchalee).
© 2026 Beamline Builder Project.
