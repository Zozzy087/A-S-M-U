# Interactive Flipbook

A professional interactive flipbook application with offline capabilities, built as a Progressive Web App (PWA).

## Features

- Smooth 3D page turning animations
- Responsive design for both desktop and mobile devices
- Offline functionality with service worker caching
- Authentication system
- Interactive dice rolling and character generation
- Professional UI with consistent styling
- Fullscreen mode and sound effects

## Pages

1. **Cover Page** - Title screen with start button
2. **1 Dice Roll** - Interactive single dice rolling
3. **3 Dice Roll** - Interactive triple dice rolling
4. **Character Generation** - Character creation interface
5. **Answer Input** - User input for answers

## Technical Details

- Built with vanilla JavaScript (no external libraries)
- Uses CSS3 for animations and styling
- Implements service workers for offline functionality
- Responsive design with mobile-first approach
- Authentication system for secure access

## Installation

1. Clone the repository
2. Serve the files using a web server (e.g., `python -m http.server` or any other static file server)
3. Access the application through a web browser

## Development

The project structure is organized as follows:

- `index.html` - Main entry point
- `flipbook-engine.js` - Core flipbook functionality
- `auth.js` - Authentication system
- `common-styles.css` - Shared styles
- `service-worker.js` - Offline functionality
- `manifest.json` - PWA configuration
- `pages/` - Individual page content
- `images/` - Image assets
- `sounds/` - Sound effects
- `files/` - Icons and other files

## Browser Compatibility

The application is compatible with modern browsers that support:
- ES6 JavaScript
- CSS3 animations and transitions
- Service Workers API
- Web App Manifest

## License

This project is proprietary and confidential.

## Credits

- Font: Cinzel from Google Fonts
- Sound effects: Custom page turning sound