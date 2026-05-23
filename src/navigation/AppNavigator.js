import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen'; 
import { Text } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator(); // manejador del Stack

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({

        tabBarIcon: ({ focused, color, size }) => {
          let icon;
          if (route.name === 'Panel') icon = focused ? '🪴' : '🌱';
          else if (route.name === 'Historial') icon = focused ? '📊' : '📈';
          else if (route.name === 'Ajustes') icon = focused ? '⚙️' : '🛠️';
          
          return <Text style={{ fontSize: size }}>{icon}</Text>;
        },
        tabBarActiveTintColor: '#2ECC71',
        tabBarInactiveTintColor: '#7F8C8D',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingBottom: 5, height: 60 }
      })}
    >
      <Tab.Screen name="Panel" component={HomeScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// El export principal ahora controla el flujo total de la app
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Al estar primera, la app SIEMPRE abrirá aquí primero */}
      <Stack.Screen name="Login" component={LoginScreen} />
      
      {/* Cuando el usuario se loguee con Google, saltará a este bloque de pestañas */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}