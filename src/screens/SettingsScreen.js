import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, Switch } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons'; 
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { API_IP } from '../../config';
import { COLORES, globalStyles } from '../styles/globalStyles';

export default function SettingsScreen({ navigation }) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [email, setEmail] = useState('');

  const [notificacionesActivas, setNotificacionesActivas] = useState(true);
  const [horaNotificacion, setHoraNotificacion] = useState('09');
  const [minutoNotificacion, setMinutoNotificacion] = useState('00');

  useEffect(() => {
    obtenerDatosUsuario();
    cargarPreferenciasNotificaciones();
  }, []);

  const cargarPreferenciasNotificaciones = async () => {
    try {
      const activeSaved = await AsyncStorage.getItem('@notif_active');
      const horaSaved = await AsyncStorage.getItem('@notif_hora');
      const minutoSaved = await AsyncStorage.getItem('@notif_minuto');

      if (activeSaved !== null) setNotificacionesActivas(JSON.parse(activeSaved));
      if (horaSaved !== null) setHoraNotificacion(horaSaved);
      if (minutoSaved !== null) setMinutoNotificacion(minutoSaved);
    } catch (error) {
      console.log("Error al cargar configuraciones locales:", error);
    }
  };

  const obtenerDatosUsuario = async () => {
    try {
      const info = await GoogleSignin.getCurrentUser();
      if (info) {
        setEmail(info.user.email);
        
        const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/login-google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: info.idToken })
        });

        const datosBackend = await respuesta.json();
        setNuevoNombre(datosBackend && datosBackend.nombre ? datosBackend.nombre : info.user.name);
      }
    } catch (error) {
      console.log("Error de sincronización de usuario:", error);
    }
  };

  const guardarCambios = async () => {
    if (!nuevoNombre.trim()) {
      Alert.alert("Error", "El nombre de usuario no puede estar vacío.");
      return;
    }

    const hInt = parseInt(horaNotificacion, 10);
    const mInt = parseInt(minutoNotificacion, 10);
    if (isNaN(hInt) || hInt < 0 || hInt > 23 || isNaN(mInt) || mInt < 0 || mInt > 59) {
      Alert.alert("Formato Inválido", "Por favor introduce un formato horario coherente.");
      return;
    }

    try {
      await AsyncStorage.setItem('@notif_active', JSON.stringify(notificacionesActivas));
      await AsyncStorage.setItem('@notif_hora', horaNotificacion.padStart(2, '0'));
      await AsyncStorage.setItem('@notif_minuto', minutoNotificacion.padStart(2, '0'));

      const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/actualizar-nombre?username=${email}&nuevoNombre=${encodeURIComponent(nuevoNombre)}`, {
        method: 'PUT',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });

      if (respuesta.ok) {
        Alert.alert("¡Guardado!", "Tus cambios de configuración local y de perfil se han actualizado.");
        await obtenerDatosUsuario();
      }
    } catch (error) {
      Alert.alert("Error", "Fallo de comunicación con la base de datos.");
    }
  };

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      Alert.alert("Sesión cerrada", "Has salido del sistema de Root Watch.");
      navigation.getParent()?.replace('Login');
    } catch (error) {
      navigation.getParent()?.replace('Login');
    }
  };

  const handleEliminarCuenta = () => {
    Alert.alert(
      "¿Eliminar cuenta permanentemente?",
      "Esta acción borrará de manera definitiva tu historial y plantas registradas. ¿Confirmar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/eliminar?username=${email}`, { method: 'DELETE' });
              if (respuesta.ok) {
                await GoogleSignin.signOut(); 
                navigation.getParent()?.replace('Login');
              }
            } catch (error) {
              console.log(error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerCustom}>
        <Text style={styles.headerTitleCustom}>Root Watch</Text>
        <Text style={styles.headerSubtitleCustom}>Ajustes del Sistema</Text>
      </View>
      
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 5 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cardSettings}>
          <Text style={styles.labelCustom}>Correo electrónico</Text>
          <View style={styles.emailContainer}>
            <FontAwesome5 name="envelope" size={14} color={COLORES.grisTexto} style={{ marginRight: 10 }} />
            <Text style={styles.emailText}>{email || 'Cargando...'}</Text>
          </View>
        </View>

        <View style={styles.cardSettings}>
          <Text style={styles.labelCustom}>Nombre de usuario</Text>
          <TextInput 
            style={globalStyles.input}
            value={nuevoNombre}
            onChangeText={setNuevoNombre}
            placeholder="Tu nombre de perfil"
            placeholderTextColor={COLORES.grisTexto}
          />
        </View>

        <View style={styles.cardSettings}>
          <Text style={styles.labelCustom}>Preferencias de Alertas</Text>
          
          <View style={styles.switchContainer}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>Notificaciones Locales</Text>
              <Text style={styles.settingDescription}>Permitir que la agenda envíe avisos emergentes fuera de la aplicación.</Text>
            </View>
            <Switch 
              value={notificacionesActivas} 
              onValueChange={setNotificacionesActivas}
              thumbColor={notificacionesActivas ? COLORES.primario : COLORES.grisTexto}
              trackColor={{ true: COLORES.primarioClaro }}
            />
          </View>

          {notificacionesActivas && (
            <View style={styles.timeSettingContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Hora de los avisos diario</Text>
                <Text style={styles.settingDescription}>Define la hora del recordatorio matutino.</Text>
              </View>
              
              <View style={styles.timeInputRow}>
                <TextInput 
                  style={styles.timeInput}
                  value={horaNotificacion}
                  onChangeText={(val) => setHoraNotificacion(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput 
                  style={styles.timeInput}
                  value={minutoNotificacion}
                  onChangeText={(val) => setMinutoNotificacion(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={globalStyles.btnPrimario} onPress={guardarCambios}>
          <FontAwesome5 name="save" size={14} color={COLORES.blanco} />
          <Text style={globalStyles.btnPrimarioText}>Guardar Configuración</Text>
        </TouchableOpacity>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome5 name="sign-out-alt" size={14} color={COLORES.grisTextoOscuro} style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleEliminarCuenta}>
            <FontAwesome5 name="trash-alt" size={14} color={COLORES.error} style={{ marginRight: 8 }} />
            <Text style={styles.deleteButtonText}>Eliminar Mi Cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCustom: { backgroundColor: COLORES.primario, padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 15 },
  headerTitleCustom: { fontSize: 26, fontWeight: 'bold', color: COLORES.blanco },
  headerSubtitleCustom: { fontSize: 14, color: COLORES.primarioClaro, marginTop: 4 },
  cardSettings: { backgroundColor: COLORES.blanco, padding: 16, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORES.grisBorde },
  labelCustom: { fontSize: 12, color: COLORES.primario, marginBottom: 10, fontWeight: '700', textTransform: 'uppercase' },
  emailContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.fondoApp, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: COLORES.grisBorde },
  emailText: { fontSize: 15, color: COLORES.grisTextoOscuro, fontWeight: '500' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeSettingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORES.grisBorde, marginTop: 14, paddingTop: 14 },
  settingTitle: { fontSize: 14, fontWeight: '600', color: COLORES.grisTextoOscuro },
  settingDescription: { fontSize: 12, color: COLORES.grisTexto, lineHeight: 16, marginTop: 2 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.fondoApp, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORES.primarioClaro },
  timeInput: { backgroundColor: COLORES.blanco, width: 40, height: 36, borderRadius: 6, textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: COLORES.grisTextoOscuro, borderWidth: 1, borderColor: COLORES.grisBorde },
  timeSeparator: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 4, color: COLORES.grisTexto },
  actionsContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORES.grisBorde, paddingTop: 20 },
  logoutButton: { flexDirection: 'row', backgroundColor: COLORES.blanco, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORES.grisBorde, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  buttonText: { fontSize: 15, fontWeight: '600', color: COLORES.grisTextoOscuro },
  deleteButton: { flexDirection: 'row', backgroundColor: '#FCE4D6', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORES.error + '40' },
  deleteButtonText: { fontSize: 15, fontWeight: '600', color: COLORES.error }
});