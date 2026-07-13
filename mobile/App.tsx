import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { SOSProvider } from './src/contexts/SOSContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <SOSProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </SOSProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
