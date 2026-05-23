import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { WEBCLIENTID } from './config';

export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      
      
      webClientId: WEBCLIENTID, 
      offlineAccess: true, // Permite obtener el idToken necesario para el backend
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <AppNavigator />
    </NavigationContainer>
  );
}