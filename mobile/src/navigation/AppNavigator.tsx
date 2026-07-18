import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useSOS } from '../contexts/SOSContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { SOSScreen } from '../screens/SOSScreen';
import { View, ActivityIndicator } from 'react-native';

const RootStack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const { activeEmergency } = useSOS();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="AuthStack" component={AuthStack} />
        ) : activeEmergency ? (
          // When SOS is active: show the animated SOS screen as the primary screen
          <RootStack.Screen
            name="SOSActive"
            component={SOSScreen}
            options={{ animation: 'fade' }}
          />
        ) : (
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

