import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, Switch } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons'; 
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <- NUEVA LIBRERÍA
import { API_IP } from '../../config';

export default function SettingsScreen({ navigation }) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [email, setEmail] = useState('');

  // --- NUEVOS ESTADOS PARA LOS REQUISITOS DE NOTIFICACIONES ---
  const [notificacionesActivas, setNotificacionesActivas] = useState(true);
  const [horaNotificacion, setHoraNotificacion] = useState('09');
  const [minutoNotificacion, setMinutoNotificacion] = useState('00');

  useEffect(() => {
    obtenerDatosUsuario();
    cargarPreferenciasNotificaciones();
  }, []);

  // Carga inicial de preferencias locales
  const cargarPreferenciasNotificaciones = async () => {
    try {
      const activeSaved = await AsyncStorage.getItem('@notif_active');
      const horaSaved = await AsyncStorage.getItem('@notif_hora');
      const minutoSaved = await AsyncStorage.getItem('@notif_minuto');

      if (activeSaved !== null) setNotificacionesActivas(JSON.parse(activeSaved));
      if (horaSaved !== null) setHoraNotificacion(horaSaved);
      if (minutoSaved !== null) setMinutoNotificacion(minutoSaved);
    } catch (error) {
      console.log("Error al cargar configuración de alertas locales:", error);
    }
  };

  // Carga inicial: Prioriza el nombre guardado en tu backend (MongoDB)
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
        console.log("Datos recibidos del servidor:", datosBackend);

        if (datosBackend && datosBackend.nombre) {
          setNuevoNombre(datosBackend.nombre);
        } else {
          setNuevoNombre(info.user.name);
        }
      }
    } catch (error) {
      console.log("Error al sincronizar con MongoDB:", error);
    }
  };

  // Guardar cambios tanto de perfil como de notificaciones
  const guardarCambios = async () => {
    if (!nuevoNombre.trim()) {
      Alert.alert("Error", "El nombre de usuario no puede estar vacío.");
      return;
    }

    // Validar formato de hora introducido de forma manual
    const hInt = parseInt(horaNotificacion, 10);
    const mInt = parseInt(minutoNotificacion, 10);
    if (isNaN(hInt) || hInt < 0 || hInt > 23 || isNaN(mInt) || mInt < 0 || mInt > 59) {
      Alert.alert("Formato Inválido", "Por favor introduce una hora válida (00-23) y minutos válidos (00-59).");
      return;
    }

    try {
      // 1. Guardar preferencias de notificaciones en el almacenamiento local del dispositivo
      await AsyncStorage.setItem('@notif_active', JSON.stringify(notificacionesActivas));
      await AsyncStorage.setItem('@notif_hora', horaNotificacion.padStart(2, '0'));
      await AsyncStorage.setItem('@notif_minuto', minutoNotificacion.padStart(2, '0'));

      // 2. Guardar nombre en Backend Spring Boot mediante PUT
      console.log(`Enviando actualización: ${email} -> ${nuevoNombre}`);
      const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/actualizar-nombre?username=${email}&nuevoNombre=${encodeURIComponent(nuevoNombre)}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (respuesta.ok) {
        Alert.alert("¡Ajustes Guardados!", "Tus cambios de perfil y las preferencias de avisos se han actualizado con éxito.");
        await obtenerDatosUsuario();
      } else {
        Alert.alert("Error del servidor", "El backend no pudo procesar la actualización del nombre.");
      }
    } catch (error) {
      console.log("Error de red en actualización:", error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor para guardar.");
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      Alert.alert("Sesión cerrada", "Has salido de Root Watch con éxito.");
      navigation.getParent()?.replace('Login');
    } catch (error) {
      console.log("Error al cerrar sesión:", error);
      navigation.getParent()?.replace('Login');
    }
  };

  // Eliminar cuenta
  const handleEliminarCuenta = () => {
    Alert.alert(
      "¿Eliminar cuenta?",
      "Esta acción es irreversible y borrará todos los datos de tu huerto en MongoDB. ¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const usuarioActual = await GoogleSignin.getCurrentUser();
              const emailABorrar = usuarioActual?.user?.email;

              if (!emailABorrar) {
                Alert.alert("Error", "No se pudo detectar el correo del usuario actual.");
                return;
              }

              const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/eliminar?username=${emailABorrar}`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              });

              if (respuesta.ok) {
                await GoogleSignin.signOut(); 
                Alert.alert("Cuenta eliminada", "Tu usuario ha sido borrado de la base de datos.");
                navigation.getParent()?.replace('Login');
              } else {
                Alert.alert("Error del servidor", "El backend no pudo procesar la eliminación.");
              }
            } catch (error) {
              Alert.alert("Error de conexión", "No se pudo conectar con el servidor Spring Boot.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Root Watch</Text>
        <Text style={styles.headerSubtitle}>Ajustes del Sistema</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>

        {/* SECCIÓN 1: VISTA DEL EMAIL */}
        <View style={styles.section}>
          <Text style={styles.label}>Correo electrónico</Text>
          <View style={styles.emailContainer}>
            <FontAwesome5 name="envelope" size={16} color="#7F8C8D" style={{ marginRight: 10 }} />
            <Text style={styles.emailText}>{email || 'Cargando correo...'}</Text>
          </View>
        </View>

        {/* SECCIÓN 2: FORMULARIO PARA EDITAR NOMBRE */}
        <View style={styles.section}>
          <Text style={styles.label}>Nombre de usuario</Text>
          <TextInput 
            style={styles.input}
            value={nuevoNombre}
            onChangeText={setNuevoNombre}
            placeholder="Introduce tu nombre"
            placeholderTextColor="#95A5A6"
          />
        </View>

        {/* --- SECCIÓN NUEVA: REQUISITO ALERTAS Y RECORDATORIOS --- */}
        <View style={styles.section}>
          <Text style={styles.label}>Preferencias de Recordatorios</Text>
          
          {/* Fila del interruptor */}
          <View style={styles.switchContainer}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>Notificaciones del Sistema</Text>
              <Text style={styles.settingDescription}>Permitir que la agenda envíe avisos al dispositivo móvil fuera de la app.</Text>
            </View>
            <Switch 
              value={notificacionesActivas} 
              onValueChange={setNotificacionesActivas}
              thumbColor={notificacionesActivas ? "#2D6A4F" : "#BDC3C7"}
              trackColor={{ true: '#D8F3DC', false: '#E5E7E9' }}
            />
          </View>

          {/* Fila para configurar la hora */}
          {notificacionesActivas && (
            <View style={styles.timeSettingContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Hora de los avisos</Text>
                <Text style={styles.settingDescription}>Define a qué hora de la mañana quieres que salten tus tareas pendientes.</Text>
              </View>
              
              <View style={styles.timeInputRow}>
                <TextInput 
                  style={styles.timeInput}
                  value={horaNotificacion}
                  onChangeText={(val) => setHoraNotificacion(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="09"
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput 
                  style={styles.timeInput}
                  value={minutoNotificacion}
                  onChangeText={(val) => setMinutoNotificacion(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                />
              </View>
            </View>
          )}
        </View>

        {/* BOTÓN GENERAL PARA GUARDAR TODOS LOS CAMBIOS */}
        <TouchableOpacity style={styles.saveButton} onPress={guardarCambios}>
          <FontAwesome5 name="save" size={14} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Guardar Configuración</Text>
        </TouchableOpacity>

        {/* SECCIÓN 4: CONTENEDOR DE ACCIONES DE CUENTA */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome5 name="sign-out-alt" size={16} color="#34495E" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleEliminarCuenta}>
            <FontAwesome5 name="exclamation-triangle" size={14} color="#E74C3C" style={{ marginRight: 8 }} />
            <Text style={styles.deleteButtonText}>Eliminar Mi Cuenta</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5', 
  },
  content: {
    padding: 25,
    paddingTop: 15,
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  label: {
    fontSize: 12,
    color: '#2D6A4F',
    marginBottom: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F4',
    padding: 14,
    borderRadius: 12,
  },
  emailText: {
    fontSize: 16,
    color: '#515A5A',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FDFDFD',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#2C3E50',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  timeSettingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F4F4',
    marginTop: 14,
    paddingTop: 14,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 16,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7E9',
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    width: 42,
    height: 40,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#D5DBDB',
  },
  timeSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 5,
    color: '#7F8C8D',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#2D6A4F', 
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7E9',
    paddingTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495E',
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#FADBD8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
  },
  header: { backgroundColor: '#2D6A4F', padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#D8F3DC', marginTop: 4 },
});