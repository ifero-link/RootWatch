import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Alert, Image, TextInput } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { API_IP } from '../../config';

export default function PlantsScreen() {
  const [plantas, setPlantas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estado para la planta en edición o creación
  const [nuevaPlanta, setNuevaPlanta] = useState({ 
    id: null, 
    nombrePlanta: '', 
    sensorId: '', 
    fechaPlantacion: new Date(), 
    tipoRiego: '' 
  });
  
  const [plantaAEditar, setPlantaAEditar] = useState(null);

  const [sensores] = useState([
    { label: 'Temperatura', value: 'TEMP_01' },
    { label: 'Humedad Suelo', value: 'HUM_SUELO_01' },
    { label: 'Luz Ambiental', value: 'LUZ_01' },
  ]);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const userInfo = await GoogleSignin.getCurrentUser();
      if (userInfo) setUsername(userInfo.user.email);
    };
    obtenerUsuario();
  }, []);

  useEffect(() => { if (username) cargarPlantas(); }, [username]);

  const cargarPlantas = async () => {
    try {
      const response = await fetch(`http://${API_IP}:8080/api/usuarios/mis-plantas?username=${username}`);
      const data = await response.json();
      setPlantas(data);
    } catch (error) { console.log("Error:", error); }
  };

  const guardarPlanta = async () => {
    const url = plantaAEditar 
      ? `http://${API_IP}:8080/api/usuarios/editar-planta?username=${username}`
      : `http://${API_IP}:8080/api/usuarios/agregar-planta?username=${username}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaPlanta)
      });
      if (response.ok) {
        setModalVisible(false);
        setPlantaAEditar(null);
        setNuevaPlanta({ id: null, nombrePlanta: '', sensorId: '', fechaPlantacion: new Date(), tipoRiego: '' });
        cargarPlantas();
      }
    } catch (error) { Alert.alert("Error", "No se pudo guardar"); }
  };

  const abrirEdicion = (item) => {
    setPlantaAEditar(item);
    setNuevaPlanta({
      ...item,
      fechaPlantacion: new Date(item.fechaPlantacion)
    });
    setModalVisible(true);
  };

  const eliminarPlanta = (id) => {
    Alert.alert("Eliminar", "¿Seguro?", [
      { text: "Cancelar" },
      { text: "Eliminar", style: 'destructive', onPress: async () => {
          await fetch(`http://${API_IP}:8080/api/usuarios/eliminar-planta?username=${username}&plantaId=${id}`, { method: 'DELETE' });
          cargarPlantas();
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={plantas}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.headerBox}><Text style={styles.headerTitle}>Mis Plantas</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/628/628310.png' }} style={styles.plantImage} />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.cardTitle}>{item.nombrePlanta}</Text>
              <Text style={styles.cardText}>🌱 {new Date(item.fechaPlantacion).toLocaleDateString()}</Text>
              <Text style={styles.cardText}>💧 {item.tipoRiego}</Text>
            </View>
            <TouchableOpacity onPress={() => abrirEdicion(item)} style={{ marginRight: 15 }}>
              <FontAwesome5 name="edit" size={18} color="#27AE60" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => eliminarPlanta(item.id)}>
              <FontAwesome5 name="trash-alt" size={18} color="#E74C3C" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => {
        setPlantaAEditar(null);
        setNuevaPlanta({ id: null, nombrePlanta: '', sensorId: '', fechaPlantacion: new Date(), tipoRiego: '' });
        setModalVisible(true);
      }}>
        <FontAwesome5 name="plus" size={24} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <FontAwesome5 name="times" size={20} color="#7F8C8D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{plantaAEditar ? "Editar Planta" : "Nueva Planta"}</Text>

            <Text style={styles.label}>Nombre de la planta</Text>
            <TextInput style={styles.input} value={nuevaPlanta.nombrePlanta} onChangeText={v => setNuevaPlanta({...nuevaPlanta, nombrePlanta: v})} />

            <Text style={styles.label}>Sensor asignado</Text>
            <RNPickerSelect onValueChange={(val) => setNuevaPlanta({...nuevaPlanta, sensorId: val})} items={sensores} value={nuevaPlanta.sensorId} style={pickerSelectStyles} useNativeAndroidPickerStyle={false} />

            <Text style={styles.label}>Tipo de Riego</Text>
            <TextInput style={styles.input} value={nuevaPlanta.tipoRiego} onChangeText={v => setNuevaPlanta({...nuevaPlanta, tipoRiego: v})} />

            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>{nuevaPlanta.fechaPlantacion.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && <DateTimePicker value={nuevaPlanta.fechaPlantacion} mode="date" onChange={(e, date) => { setShowDatePicker(false); if(date) setNuevaPlanta({...nuevaPlanta, fechaPlantacion: date}); }} />}

            <TouchableOpacity style={styles.saveButton} onPress={guardarPlanta}>
              <Text style={styles.saveButtonText}>{plantaAEditar ? "Guardar Cambios" : "Guardar Planta"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF5' },
  list: { padding: 20 },
  headerBox: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1B4332' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 15, elevation: 3 },
  plantImage: { width: 50, height: 50, borderRadius: 25 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B4332' },
  cardText: { color: '#7F8C8D' },
  fab: { position: 'absolute', right: 25, bottom: 30, backgroundColor: '#2D6A4F', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 10, zIndex: 1000 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D6A4F',
    marginBottom: 5,
    marginTop: 10
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#D8F3DC',
    backgroundColor: '#F1F8F1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2C3E50'
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 10
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 25,
    borderRadius: 20,
    position: 'relative' // Para que la X se posicione respecto a este contenedor
  },

  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center', // Esto ayuda a que el título no se solape con la X
    color: '#1B4332'
  },

  dateButton: { borderBottomWidth: 1, borderColor: '#2D6A4F', padding: 10, marginBottom: 20 },
  saveButton: { backgroundColor: '#2D6A4F', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold' }
});

const pickerSelectStyles = StyleSheet.create({
  inputAndroid: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#D8F3DC',
    borderRadius: 8,
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    fontSize: 16,
  },
  // Esto asegura que el menú desplegable también tenga texto legible
  viewContainer: {
    marginBottom: 10,
  },

});