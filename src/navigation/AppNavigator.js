import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen'; 
import PlantsScreen from '../screens/PlantsScreen';
import CalendarScreen from '../screens/CalendarScreen'; // <- 1. IMPORTAMOS LA NUEVA PANTALLA
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
          else if (route.name === 'Plantas') icon = focused ? '🌿' : '🍃';
          else if (route.name === 'Historial') icon = focused ? '📊' : '📈';
          else if (route.name === 'Agenda') icon = focused ? '📅' : '📆'; // <- 2. ICONOS PARA LA AGENDA
          else if (route.name === 'Ajustes') icon = focused ? '⚙️' : '🛠️';
          
          return <Text style={{ fontSize: size }}>{icon}</Text>;
        },
        tabBarActiveTintColor: '#2ECC71',
        tabBarInactiveTintColor: '#7F8C8D',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingBottom: 5, height: 60 }
      })}
    >
      <Tab.Screen name="Panel" component={HomeScreen} />
      <Tab.Screen name="Plantas" component={PlantsScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      
      {/* 3. AÑADIMOS LA NUEVA PESTAÑA DE CALENDARIO/AGENDA */}
      <Tab.Screen name="Agenda" component={CalendarScreen} />
      
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