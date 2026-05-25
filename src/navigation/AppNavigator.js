import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen'; 
import PlantsScreen from '../screens/PlantsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import { COLORES } from '../styles/globalStyles';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabsComponent() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Panel') iconName = 'chalkboard';
          else if (route.name === 'Plantas') iconName = 'seedling';
          else if (route.name === 'Historial') iconName = 'chart-line';
          else if (route.name === 'Agenda') iconName = 'calendar-alt';
          else if (route.name === 'Ajustes') iconName = 'sliders-h';
          
          return <FontAwesome5 name={iconName} size={size - 2} color={color} />;
        },
        tabBarActiveTintColor: COLORES.primario,
        tabBarInactiveTintColor: COLORES.grisTexto,
        tabBarStyle: { 
          backgroundColor: COLORES.blanco, 
          borderTopWidth: 1, 
          borderTopColor: COLORES.grisBorde, 
          paddingBottom: 8, 
          height: 65 
        },
        headerShown: false
      })}
    >
      <Tab.Screen name="Panel" component={HomeScreen} />
      <Tab.Screen name="Plantas" component={PlantsScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen name="Agenda" component={CalendarScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Forzamos que el nombre del Stack sea exactamente 'MainTabs' */}
      <Stack.Screen name="MainTabs" component={MainTabsComponent} />
    </Stack.Navigator>
  );
}