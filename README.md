# Unit 3 Quiz - Drugs

A React + Vite quiz application for Honors Topics Unit 3.

## Tech Stack

- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **Firebase Hosting** - Deployment platform
- **ESLint** - Code linting

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

Build the project for production:

```bash
npm run build
```

The production build will be in the `dist` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

### Linting

Run ESLint to check for code issues:

```bash
npm run lint
```

## Deployment

This project is configured for Firebase Hosting. The `dist` directory is set as the public directory.

To deploy:

```bash
firebase deploy
```

## Project Structure

```
├── public/          # Static assets
├── src/
│   ├── assets/      # Images and other assets
│   ├── App.jsx      # Main application component
│   ├── App.css      # Application styles
│   ├── index.css    # Global styles
│   └── main.jsx     # Application entry point
├── dist/            # Production build output
└── firebase.json    # Firebase configuration
```

## License

Private project for educational purposes.
