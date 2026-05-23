import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons'; 
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { API_IP } from '../../config';

export default function SettingsScreen({ navigation }) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    obtenerDatosUsuario();
  }, []);

  // Carga inicial: Prioriza el nombre guardado en tu backend (MongoDB)
const obtenerDatosUsuario = async () => {
  try {
    const info = await GoogleSignin.getCurrentUser();
    if (info) {
      setEmail(info.user.email);
      
      // Llamamos a tu endpoint de login para obtener el objeto Usuario completo de MongoDB
      const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/login-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: info.idToken })
      });

      const datosBackend = await respuesta.json();
      console.log("Datos recibidos del servidor:", datosBackend);

      // Si el backend nos devuelve un 'nombre', usamos ese. Si es null/undefined, usamos el de Google.
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

  // Guardar cambios directamente en Spring Boot mediante PUT
  const guardarCambios = async () => {
    if (!nuevoNombre.trim()) {
      Alert.alert("Error", "El nombre de usuario no puede estar vacío.");
      return;
    }

    try {
      console.log(`Enviando actualización: ${email} -> ${nuevoNombre}`);
      
      const respuesta = await fetch(`http://${API_IP}:8080/api/usuarios/actualizar-nombre?username=${email}&nuevoNombre=${encodeURIComponent(nuevoNombre)}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (respuesta.ok) {
        Alert.alert("¡Éxito!", "Nombre de usuario actualizado correctamente en MongoDB.");
        await obtenerDatosUsuario();
      } else {
        Alert.alert("Error del servidor", "El backend no pudo procesar la actualización.");
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
      {/* Cabecera superior estilizada estilo Figma */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Root Watch</Text>
        <Text style={styles.headerSubtitle}>Ajuste del Usuario</Text>
      </View>
      {/* 🧾 El header manual <View> ha sido removido para unificar con el Tab Navigation oficial */}
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
          <TouchableOpacity style={styles.saveButton} onPress={guardarCambios}>
            <FontAwesome5 name="save" size={14} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>

        {/* SECCIÓN 3: CONTENEDOR DE ACCIONES */}
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
    paddingTop: 30, // Añadido un pequeño margen superior al no haber header manual
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEDED',
    padding: 14,
    borderRadius: 12,
  },
  emailText: {
    fontSize: 16,
    color: '#515A5A',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D8F3DC',
    color: '#2C3E50',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#2D6A4F', 
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionsContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7E9',
    paddingTop: 25,
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
  header: { backgroundColor: '#2ECC71', padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#E8F8F5', marginTop: 4 },
  
});