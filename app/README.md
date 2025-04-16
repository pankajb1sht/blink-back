# Solana Blink API Generator Mobile App

This is a React Native mobile application that allows users to create custom Solana Blink APIs for their Telegram channels, enabling them to receive payments directly to their Solana wallets.

## Features

- Create custom Blink APIs for Telegram channels
- Set custom fees for channel support
- Receive payments directly to your Solana wallet
- Share generated API URLs with your audience

## Prerequisites

- Node.js 14+ installed
- Expo CLI
- Backend server running

## Installation

1. Install the required dependencies:

```bash
cd app
npm install
```

2. Make sure the backend server is running. By default, it should be running on localhost:3000.

3. Update the API_BASE_URL in app/utils/api.js if your backend is running on a different address.

## Running the App

```bash
npx expo start
```

This will start the Expo development server. You can then run the app in:

- An iOS simulator (requires macOS and Xcode)
- An Android emulator (requires Android Studio)
- Your physical device using the Expo Go app

## Project Structure

- `/app` - Root directory of the React Native app
  - `/components` - Reusable UI components
  - `/screens` - Application screens
    - `HomeScreen.js` - Welcome screen with app introduction
    - `FormScreen.js` - Form for creating Blink APIs
    - `SuccessScreen.js` - Success screen after API creation
  - `/utils` - Utility functions
    - `api.js` - API service for backend communication
  - `App.js` - Main application component with navigation

## Integration with Backend

The app communicates with the backend server to:
1. Create new Blink APIs by submitting form data
2. Get information about existing Blink APIs

Make sure the backend server is running and accessible from your device or emulator.

## Notes

- This is a development version and not meant for production use without further enhancements
- For production deployment, you would need to:
  - Set up proper error handling
  - Implement more robust form validation
  - Set up proper authentication
  - Configure environment-specific API endpoints 