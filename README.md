# Drug Overdose Death Trends Visualization

A modern web application that visualizes provisional drug overdose death counts from the CDC and allows users to vote on policy positions regarding the crisis.

## Features

- **Interactive Data Visualization**: Line charts displaying 48 months of drug overdose death data
- **Drug Segmentation**: Filter data by specific drugs or view all drugs combined
- **Real-time Voting System**: Users can vote to support or oppose policy proposals using Firestore
- **Statement of Intent**: Political position statement on drug overdose trends and proposed policies
- **Responsive Design**: Modern, professional UI that works on desktop and mobile devices
- **Data Source**: Fetches data from CDC National Center for Health Statistics API

## Tech Stack

- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **Recharts** - Chart visualization library
- **Firebase** - Backend services (Firestore, Hosting, Analytics)
- **ESLint** - Code linting

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Firebase account and project setup

### Installation

```bash
npm install
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Update `src/firebase.js` with your Firebase configuration
4. Deploy Firestore security rules:

```bash
firebase deploy --only firestore:rules
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
npm run build
firebase deploy
```

To deploy only Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## Data Source

The application fetches data from the [CDC Provisional Drug Overdose Death Counts dataset](https://catalog.data.gov/dataset/provisional-drug-overdose-death-counts-for-specific-drugs). If the API is unavailable, the app falls back to sample data for demonstration purposes.

## Project Structure

```
├── public/              # Static assets
├── src/
│   ├── assets/          # Images and other assets
│   ├── App.jsx          # Main application component
│   ├── App.css          # Application styles
│   ├── firebase.js      # Firebase configuration
│   ├── index.css        # Global styles
│   └── main.jsx         # Application entry point
├── dist/                # Production build output
├── firebase.json        # Firebase hosting configuration
├── firestore.rules      # Firestore security rules
└── .gitignore           # Git ignore patterns
```

## Features in Detail

### Data Visualization

- Displays 48 months of drug overdose death data
- Interactive line charts with tooltips
- Filterable by drug type (Cocaine, Heroin, Methamphetamine, Fentanyl, etc.)
- Monthly trend analysis

### Voting System

- Users can vote to support or oppose policy proposals
- Votes are stored in Firestore and displayed in real-time
- Prevents duplicate voting using localStorage
- Shows total vote counts (Support, Oppose, Total)

### Statement of Intent

- Political position statement on drug overdose trends
- Outlines proposed policies including:
  - Stricter regulatory frameworks
  - Enhanced law enforcement
  - Prevention programs
  - Border security measures
  - Treatment and recovery support

## Firestore Security Rules

The project includes Firestore security rules that allow:
- Public read access to votes collection
- Public write access to votes collection (for voting)

Rules are defined in `firestore.rules`.

## Environment Variables

The project uses Firebase configuration directly in `src/firebase.js`. For production, consider using environment variables for sensitive configuration.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private project for educational purposes.

## Data Attribution

Data sourced from the Centers for Disease Control and Prevention, National Center for Health Statistics. Provisional drug overdose death counts for specific drugs. Available at: https://catalog.data.gov/dataset/provisional-drug-overdose-death-counts-for-specific-drugs
