# B3MAR56-TD3 Project

## Overview
The B3MAR56-TD3 project is a web application that utilizes Three.js and WebXR to create an augmented reality experience. Users can interact with 3D models in a virtual environment through their web browsers.

## Project Structure
```
B3MAR56-TD3-main
├── 3d
│   └── [model-files].glb         # Directory containing 3D model files in GLB format.
├── build
│   └── three.module.js           # Core functionalities for 3D rendering provided by Three.js.
├── jsm
│   └── webxr
│       └── ARButton.js           # Class for creating a button to enter AR mode.
├── index.html                     # Main HTML document for the application.
├── main.css                       # Styles for the application.
└── README.md                      # Documentation for the project.
```

## Setup Instructions
1. Clone the repository to your local machine:
   ```
   git clone https://github.com/yourusername/B3MAR56-TD3-main.git
   ```
2. Navigate to the project directory:
   ```
   cd B3MAR56-TD3-main
   ```
3. Open `index.html` in a web browser that supports WebXR.

## Usage
- Click the menu button to open the side navigation.
- Select a 3D model from the list to load it into the AR scene.
- Use the AR button to enter augmented reality mode.

## Requirements
- A web browser that supports WebXR (e.g., Chrome, Firefox).
- A device with AR capabilities for the best experience.

## License
This project is licensed under the MIT License. See the LICENSE file for details.