import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { EvidenceProvider } from './src/contexts/EvidenceContext';
import { SOSProvider } from './src/contexts/SOSContext';
import { MeshProvider } from './src/mesh';
import { AppNavigator } from './src/navigation/AppNavigator';

// Configure how notifications are displayed when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications() {
  if (Platform.OS === 'web') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permissions not granted');
    return;
  }

  // The token would be registered with backend via authService during login
  // This just ensures the OS permission is granted
  console.log('Push notification permission granted');
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

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

