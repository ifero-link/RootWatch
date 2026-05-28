import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { FontAwesome5 } from '@expo/vector-icons'; 
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { API_IP } from '../../config';
import { COLORES } from '../styles/globalStyles';

export default function LoginScreen({ navigation }) {
  const [cargando, setCargando] = useState(false);

  const iniciarSesionConGoogle = async () => {
    setCargando(true);
    try {
      // Comprobamos si el móvil tiene los servicios de Google Play activos
      await GoogleSignin.hasPlayServices();
      
      // Abrimos el desplegable nativo de Google para elegir cuenta
      const userInfo = async () => { return await GoogleSignin.signIn(); };
      const resultado = await userInfo();
      
      // Extraemos el idToken de forma segura según la versión de la librería
      const idToken = resultado.idToken || (resultado.data && resultado.data.idToken);

      if (!idToken) {
        throw new Error("No se pudo obtener el ID Token de Google");
      }

      // Enviamos el Token a nuestro Backend 
      const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/login-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: idToken }), 
      });

      const datosBackend = await respuesta.json();

      if (respuesta.ok) {
        console.log("¡Logueado en Spring Boot con éxito!", datosBackend);
        const nombreParaSaludar = datosBackend.nombre || datosBackend.username; 
        Alert.alert("¡Bienvenido!", `Hola, ${nombreParaSaludar}`);
        
        // Redirigimos al flujo correcto 
        navigation.replace('MainTabs'); 
      } else {
        Alert.alert("Error de autenticación", datosBackend.mensaje || "El servidor rechazó el token");
      }

    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("El usuario canceló el inicio de sesión");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Operación en progreso");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Servicios de Google Play no disponibles");
      } else {
        console.log("Error detallado:", error);
        Alert.alert("Error de conexión", "No se pudo conectar con Google o con el Servidor");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient 
      colors={[COLORES.primarioOscuro, COLORES.primario, '#52B788']} 
      style={styles.container}
    >
      {/* SECCIÓN SUPERIOR: BRANDING, LOGO Y ESLOGAN */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <FontAwesome5 name="leaf" size={55} color={COLORES.primarioOscuro} />
        </View>
        <Text style={styles.title}>Root Watch</Text>
        <Text style={styles.subtitle}>Cultivando Datos, Creciendo en Innovación</Text>
      </View>

      {/* SECCIÓN INFERIOR: BOTÓN CON GOOGLE E INDICADOR */}
      <View style={styles.bottomContainer}>
        {cargando ? (
          <ActivityIndicator size="large" color="#F8FAF5" /> 
        ) : (
          <TouchableOpacity style={styles.googleButton} onPress={iniciarSesionConGoogle} activeOpacity={0.8}>
            <Image 
              source={{ uri: 'https://fonts.gstatic.com/s/i/productlogos/googleg/v6/web-24dp/logo_googleg_color_24dp.png' }} 
              style={styles.googleIcon} 
            />
            <Text style={styles.googleButtonText}>Iniciar sesión con Gmail</Text>
          </TouchableOpacity>
        )}
        
        <Text style={styles.footerText}>v1.0 • Trabajo TFC: Sistema de monitorización de Plantas</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 90, 
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAF5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 22,
  },
  title: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#F8FAF5', 
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    color: '#D8F3DC', 
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
    letterSpacing: 0.5,
  },
  bottomContainer: {
    alignItems: 'center',
    paddingHorizontal: 35,
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 30, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 25,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORES.primario, 
  },
  footerText: {
    color: '#D8F3DC',
    fontSize: 12,
    opacity: 0.6,
  }
});