# Beamline Builder 🚀

An interactive, web-based tool for designing and visualizing synchrotron beamline layouts. Built with **React**, **Vite**, and **Tailwind CSS**.

![Beamline Builder Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

-   **Dual-View Visualization:** Design simultaneously in **Side View** (vertical elevation) and **Top View** (horizontal offset).
-   **Physical Metric System:** 1 Unit = 1 Meter = 1 Grid Square. Design with real-world dimensions.
-   **Smart Ray Tracing:** Automatic ray path calculation through slits, monochromators (VDCM/HDCM), mirrors (VFM/HFM), and gratings.
-   **JSON Data Portal:** Export your entire layout to JSON or import existing configurations via a simple text interface.
-   **Customizable Construction:** Add shielding walls and experimental hutches with easy "Start" and "End" distance controls.
-   **Template Library:** Choose from predefined layouts like "Single Branch" or "Double Monochromator."
-   **Dark Mode Support:** Switch between Light and Dark themes for comfortable designing.

## 🛠️ Getting Started

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    cd YOUR_REPO_NAME
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

## 📂 Configuration Guide

You can define your beamline directly in `layout.json`. 

### For Optics (Slits, Mirrors, etc.)
```json
{ 
  "type": "SLIT", 
  "distance": 12.5, 
  "height": 0, 
  "offset": 0, 
  "customName": "Front-End Slit" 
}
```

### For Construction (Walls, Hutches)
```json
{ 
  "type": "HUTCH", 
  "start": 30, 
  "end": 45, 
  "height": 7.0, 
  "customName": "Experimental Hutch" 
}
```

## 🚀 Deployment

This project is configured for **GitHub Pages**. To deploy your own version:

1.  Push your code to the `main` branch.
2.  Run the deploy command:
    ```bash
    npm run deploy
    ```
3.  Your app will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`.

## 📄 License

This project is licensed under the MIT License.
