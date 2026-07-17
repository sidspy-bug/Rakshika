import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { EvidenceProvider } from './src/contexts/EvidenceContext';
import { SOSProvider } from './src/contexts/SOSContext';
import { MeshProvider } from './src/mesh';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <EvidenceProvider>
            <SOSProvider>
              <MeshProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </MeshProvider>
            </SOSProvider>
          </EvidenceProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
