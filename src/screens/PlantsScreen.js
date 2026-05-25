import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Alert, Image, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { API_IP } from '../../config';

// ========================================================
// 1. MATRIZ DE UMBRALES BOTÁNICOS (REQUISITO RF-012)
// ========================================================
const DICCIONARIO_UMBRALES = {
  "Poto": { sueloMin: 30, sueloMax: 70, tempMin: 15, tempMax: 30, luzMin: 20, luzMax: 70, msgSeco: "💧 El Poto necesita agua ligera. La tierra está seca." },
  "Suculenta / Cactus": { sueloMin: 10, sueloMax: 45, tempMin: 10, tempMax: 40, luzMin: 50, luzMax: 95, msgSeco: "🌵 Alerta de sequía extrema para tu Cactus." },
  "Monstera": { sueloMin: 40, sueloMax: 75, tempMin: 14, tempMax: 28, luzMin: 35, luzMax: 75, msgSeco: "🌱 Tu Monstera tiene sed. Requiere riego." },
  "Sansevieria": { sueloMin: 15, sueloMax: 50, tempMin: 12, tempMax: 35, luzMin: 15, luzMax: 80, msgSeco: "🍃 Suelo excesivamente seco para la Sansevieria." },
  "Planta del Dinero": { sueloMin: 35, sueloMax: 70, tempMin: 15, tempMax: 27, luzMin: 30, luzMax: 65, msgSeco: "💰 La Planta del Dinero necesita riego moderado." },
  
  // PERFIL DE RESPALDO (Manejo de excepciones/Nombres personalizados - TFC)
  "Generico": {
    sueloMin: 30, sueloMax: 75, tempMin: 14, tempMax: 32, luzMin: 25, luzMax: 80,
    msgSeco: "💧 Alerta de riego: El nivel de humedad en el suelo está por debajo de la media óptima para plantas de interior.",
    msgHumedo: "⚠️ Riesgo de encharcamiento: El suelo retiene demasiada humedad.",
    msgFrio: "🥶 Alerta de temperatura baja: El entorno está descendiendo del umbral de confort.",
    msgCalor: "🔥 Alerta de temperatura alta: El calor acumulado podría marchitar las hojas.",
    msgSombra: "☁️ Falta de luminosidad: Se recomienda mover la maceta a una zona con más luz."
  }
};

export default function PlantsScreen() {
  const [plantas, setPlantas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estado para controlar qué planta está expandida
  const [plantaExpandida, setPlantaExpandida] = useState(null);
  
  // Almacenará las lecturas reales que traigamos de la API
  const [lecturasRealTime, setLecturasRealTime] = useState({});
  const [cargandoLecturas, setCargandoLecturas] = useState(false);

  // Sensores disponibles en tu catálogo base
  const [sensoresDisponibles] = useState([
    { nombre: "Sensor de Temperatura", tipo: "Temperatura", id: "TEMP_01", icono: 'thermometer-half', color: '#27AE60', unidad: '°C' },
    { nombre: "Sensor de Humedad de Suelo", tipo: "Humedad Suelo", id: "HUM_SUELO_01", icono: 'tint', color: '#2980B9', unidad: '%' },
    { nombre: "Sensor de Luz Ambiental", tipo: "Luz", id: "LUZ_01", icono: 'sun', color: '#F39C12', unidad: '%' },
    { nombre: "Sensor de Humedad Ambiental", tipo: "Humedad Ambiental", id: "HUM_AMB_01", icono: 'cloud-meatball', color: '#16A085', unidad: '%' }
  ]);

  const initialState = { 
    id: null, 
    nombrePlanta: '', 
    sensoresAsignados: [], 
    fechaPlantacion: new Date(), 
    tipoRiego: '' 
  };

  const [nuevaPlanta, setNuevaPlanta] = useState(initialState);
  const [plantaAEditar, setPlantaAEditar] = useState(null);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const userInfo = await GoogleSignin.getCurrentUser();
      if (userInfo) setUsername(userInfo.user.email);
    };
    obtenerUsuario();
  }, []);

  useEffect(() => { if (username) cargarPlantas(); }, [username]);

  // Actualización automática: Si hay una planta expandida, refresca sus sensores cada 10 segundos
  useEffect(() => {
    if (!plantaExpandida) return;
    
    const planta = plantas.find(p => p.id === plantaExpandida);
    if (planta && planta.sensoresAsignados?.length > 0) {
      obtenerLecturasAPI(planta.sensoresAsignados);
    }

    const interval = setInterval(() => {
      if (plantaExpandida && planta?.sensoresAsignados?.length > 0) {
        obtenerLecturasAPI(planta.sensoresAsignados, true); // modo silencioso sin loader continuo
      }
    }, 10000); 

    return () => clearInterval(interval);
  }, [plantaExpandida, plantas]);

  const cargarPlantas = async () => {
    try {
      const response = await fetch(`http://${API_IP}:8080/api/usuarios/mis-plantas?username=${username}`);
      const data = await response.json();
      setPlantas(data);
    } catch (error) { console.log("Error cargando plantas:", error); }
  };

  // ========================================================
  // 2. LÓGICA DE EVALUACIÓN AUTOMÁTICA DE UMBRALES (RF-012)
  // ========================================================
  const verificarUmbralesYAlertar = async (vectorMediciones, nombrePlantaUsuario) => {
    try {
      if (!vectorMediciones || !nombrePlantaUsuario) return;

      // Extraemos los valores del objeto unificado
      const temperatura = parseFloat(vectorMediciones["Temperatura"]);
      const humedadSuelo = parseInt(vectorMediciones["Humedad Suelo"]);
      const luz = parseInt(vectorMediciones["Luz"]);

      // Control Anti-Spam: Solo permitimos lanzar una alerta automatizada cada 10 minutos
      const ultimaAlertaString = await AsyncStorage.getItem('@ultima_alerta_automatica');
      const ahora = new Date().getTime();
      
      if (ultimaAlertaString) {
        const tiempoTranscurrido = ahora - parseInt(ultimaAlertaString);
        if (tiempoTranscurrido < 10 * 60 * 1000) return; 
      }

      // PATRÓN FALLBACK (TFC): Si el nombre no coincide en el diccionario, aplica el perfil "Generico"
      let umbralConfigurado = DICCIONARIO_UMBRALES[nombrePlantaUsuario] || DICCIONARIO_UMBRALES["Generico"];
      
      let dispararNotificacion = false;
      let tituloAlerta = `🚨 ¡Alerta de Cuidado: ${nombrePlantaUsuario}!`;
      let cuerpoAlerta = "";

      // 1. Evaluar Humedad de Suelo (Prioridad Máxima de Riego)
      if (!isNaN(humedadSuelo)) {
        if (humedadSuelo < umbralConfigurado.sueloMin) {
          cuerpoAlerta = umbralConfigurado.msgSeco + ` (Suelo: ${humedadSuelo}%)`;
          dispararNotificacion = true;
        } else if (humedadSuelo > umbralConfigurado.sueloMax) {
          cuerpoAlerta = umbralConfigurado.msgHumedo + ` (Suelo: ${humedadSuelo}%)`;
          dispararNotificacion = true;
        }
      }

      // 2. Evaluar Temperatura Ambiente (Si la tierra está en rango estable)
      if (!dispararNotificacion && !isNaN(temperatura)) {
        if (temperatura < umbralConfigurado.tempMin) {
          cuerpoAlerta = umbralConfigurado.msgFrio + ` (Temperatura: ${temperatura}°C)`;
          dispararNotificacion = true;
        } else if (temperatura > umbralConfigurado.tempMax) {
          cuerpoAlerta = umbralConfigurado.msgCalor + ` (Temperatura: ${temperatura}°C)`;
          dispararNotificacion = true;
        }
      }

      // 3. Evaluar Exposición Lumínica
      if (!dispararNotificacion && !isNaN(luz)) {
        if (luz < umbralConfigurado.luzMin) {
          cuerpoAlerta = umbralConfigurado.msgSombra + ` (Luz: ${luz}%)`;
          dispararNotificacion = true;
        }
      }

      // Lanzar notificación nativa en el dispositivo mediante Expo Notifications
      if (dispararNotificacion) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: tituloAlerta,
            body: cuerpoAlerta,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null, // Envío inmediato
        });

        await AsyncStorage.setItem('@ultima_alerta_automatica', ahora.toString());
        console.log(`[RF-012] Notificación enviada con éxito para la planta: ${nombrePlantaUsuario}`);
      }
    } catch (err) {
      console.log("Error interno evaluando la matriz botánica de umbrales:", err);
    }
  };

  // Llama a tu backend para pedir el valor actual de los sensores
  const obtenerLecturasAPI = async (listaIds, silencioso = false) => {
    if (!silencioso) setCargandoLecturas(true);
    const nuevasLecturas = { ...lecturasRealTime };
    
    // Objeto temporal para unificar las lecturas de esta iteración y pasarlas al evaluador
    const datosPlantaActiva = {};

    try {
      for (const id of listaIds) {
        const urlCompleta = `http://${API_IP}:8080/api/sensores/actual?id=${id}`;
        const response = await fetch(urlCompleta);
        
        if (response.ok) {
          const data = await response.json(); 

          let valorExtraido = 'N/A';
          let estadoExtraido = 'Activo';

          if (data !== null && data !== undefined) {
            if (data.valor !== undefined) valorExtraido = data.valor;
            else if (data.value !== undefined) valorExtraido = data.value;
            else if (data.lectura !== undefined) valorExtraido = data.lectura;
            else if (typeof data === 'number' || typeof data === 'string') valorExtraido = data; 

            if (data.estado !== undefined) estadoExtraido = data.estado;
            else if (data.status !== undefined) estadoExtraido = data.status;
            else if (data.activo !== undefined) estadoExtraido = data.activo ? 'Óptimo' : 'Inactivo';
          }

          nuevasLecturas[id] = { valor: valorExtraido, estado: estadoExtraido };

          // Clasificamos el tipo de sensor según la base para estructurar el análisis
          const infoBase = encontrarInfoBaseSensor(id);
          if (infoBase && valorExtraido !== 'N/A') {
            datosPlantaActiva[infoBase.tipo] = valorExtraido;
          }

        } else {
          nuevasLecturas[id] = { valor: 'N/A', estado: 'Error de señal' };
        }
      }
      
      setLecturasRealTime(nuevasLecturas);

      // ¡DISPARO DEL REQUISITO RF-012! 
      // Si la planta expandida actualmente está siendo monitoreada, evaluamos su ecosistema completo
      if (plantaExpandida) {
        const plantaActual = plantas.find(p => p.id === plantaExpandida);
        if (plantaActual) {
          verificarUmbralesYAlertar(datosPlantaActiva, plantaActual.nombrePlanta);
        }
      }

    } catch (error) {
      console.log("[IoT Debug] Error crítico de red o de parseo al conectar con los sensores:", error);
    } finally {
      if (!silencioso) setCargandoLecturas(false);
    }
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
        setNuevaPlanta(initialState);
        cargarPlantas();
      }
    } catch (error) { Alert.alert("Error", "No se pudo guardar"); }
  };

  const abrirEdicion = (item) => {
    setPlantaAEditar(item);
    setNuevaPlanta({
      ...item,
      fechaPlantacion: new Date(item.fechaPlantacion),
      sensoresAsignados: item.sensoresAsignados || []
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

  const alternarSensor = (sensorId) => {
    let actuales = [...nuevaPlanta.sensoresAsignados];
    if (actuales.includes(sensorId)) {
      actuales = actuales.filter(id => id !== sensorId);
    } else {
      actuales.push(sensorId);
    }
    setNuevaPlanta({ ...nuevaPlanta, sensoresAsignados: actuales });
  };

  const alternarExpansionPlanta = (id) => {
    setPlantaExpandida(plantaExpandida === id ? null : id);
  };

  const encontrarInfoBaseSensor = (id) => {
    return sensoresDisponibles.find(s => s.id === id) || { nombre: id, tipo: 'Desconocido', icono: 'microchip', color: '#7F8C8D', unidad: '' };
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={plantas}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.headerBox}><Text style={styles.headerTitle}>Mis Plantas</Text></View>}
        renderItem={({ item }) => {
          const esExpandida = plantaExpandida === item.id;
          return (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => alternarExpansionPlanta(item.id)} 
              style={[styles.card, esExpandida && styles.cardExpandida]}
            >
              <View style={styles.cardMainRow}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/628/628310.png' }} style={styles.plantImage} />
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.cardTitle}>{item.nombrePlanta}</Text>
                  <Text style={styles.cardText}>🌱 {new Date(item.fechaPlantacion).toLocaleDateString()}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => abrirEdicion(item)} style={{ marginRight: 15, padding: 5 }}>
                    <FontAwesome5 name="edit" size={18} color="#27AE60" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminarPlanta(item.id)} style={{ padding: 5 }}>
                    <FontAwesome5 name="trash-alt" size={18} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECCIÓN DETALLADA CON DATOS REALES DE LA API */}
              {esExpandida && (
                <View style={styles.detailsContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.detailsTitle}><FontAwesome5 name="info-circle" /> Detalles de Cuidado:</Text>
                  <Text style={styles.detailsText}>💧 <Text style={{fontWeight: 'bold'}}>Método de Riego:</Text> {item.tipoRiego || 'No especificado'}</Text>
                  
                  <Text style={[styles.detailsTitle, {marginTop: 15}]}><FontAwesome5 name="broadcast-tower" /> Monitoreo en Tiempo Real:</Text>
                  
                  {cargandoLecturas && <ActivityIndicator size="small" color="#2D6A4F" style={{ marginVertical: 10 }} />}

                  {item.sensoresAsignados && item.sensoresAsignados.length > 0 ? (
                    item.sensoresAsignados.map((sensorId) => {
                      const infoBase = encontrarInfoBaseSensor(sensorId);
                      const lecturaAPI = lecturasRealTime[sensorId] || { valor: '...', estado: 'Conectando...' };
                      
                      return (
                        <View key={sensorId} style={styles.sensorTelemetryRow}>
                          <View style={[styles.telemetryIconContainer, { backgroundColor: infoBase.color + '1A' }]}>
                            <FontAwesome5 name={infoBase.icono} size={16} color={infoBase.color} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.telemetryName}>{infoBase.nombre}</Text>
                            <Text style={styles.telemetryId}>ID: {sensorId}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.telemetryValue, { color: infoBase.color }]}>
                              {lecturaAPI.valor}{lecturaAPI.valor !== '...' && lecturaAPI.valor !== 'N/A' ? infoBase.unidad : ''}
                            </Text>
                            <Text style={styles.telemetryStatus}>{lecturaAPI.estado}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noSensorsText}>Esta planta no tiene sensores asignados actualmente.</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setPlantaAEditar(null); setNuevaPlanta(initialState); setModalVisible(true); }}>
        <FontAwesome5 name="plus" size={24} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={{paddingBottom: 30}} style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}><FontAwesome5 name="times" size={20} color="#7F8C8D" /></TouchableOpacity>
            <Text style={styles.modalTitle}>{plantaAEditar ? "Editar Planta" : "Nueva Planta"}</Text>

            <Text style={styles.label}>Nombre de la planta</Text>
            <TextInput style={styles.input} value={nuevaPlanta.nombrePlanta} onChangeText={v => setNuevaPlanta({...nuevaPlanta, nombrePlanta: v})} placeholder="Ej: Tomate" />

            <Text style={styles.label}>Sensores del Dispositivo (Selecciona varios)</Text>
            <View style={styles.chipsContainer}>
              {sensoresDisponibles.map((sensor) => {
                const seleccionado = nuevaPlanta.sensoresAsignados.includes(sensor.id);
                return (
                  <TouchableOpacity
                    key={sensor.id}
                    activeOpacity={0.7}
                    onPress={() => alternarSensor(sensor.id)}
                    style={[styles.chip, seleccionado && styles.chipSeleccionado]}
                  >
                    <FontAwesome5 name={seleccionado ? "check" : "plus"} size={12} color={seleccionado ? "white" : "#2D6A4F"} style={{marginRight: 6}} />
                    <Text style={[styles.chipText, seleccionado && styles.chipTextSeleccionado]}>{sensor.tipo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Tipo de Riego</Text>
            <TextInput style={styles.input} value={nuevaPlanta.tipoRiego} onChangeText={v => setNuevaPlanta({...nuevaPlanta, tipoRiego: v})} placeholder="Ej: Goteo automático" />

            <Text style={styles.label}>Fecha de plantación</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}><FontAwesome5 name="calendar-alt" /> {nuevaPlanta.fechaPlantacion.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && <DateTimePicker value={nuevaPlanta.fechaPlantacion} mode="date" onChange={(e, date) => { setShowDatePicker(false); if(date) setNuevaPlanta({...nuevaPlanta, fechaPlantacion: date}); }} />}

            <TouchableOpacity style={styles.saveButton} onPress={guardarPlanta}>
              <Text style={styles.saveButtonText}>{plantaAEditar ? "Guardar Cambios" : "Guardar Planta"}</Text>
            </TouchableOpacity>
          </ScrollView>
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
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 3 },
  cardExpandida: { borderColor: '#2D6A4F', borderWidth: 1.5 },
  cardMainRow: { flexDirection: 'row', alignItems: 'center' },
  plantImage: { width: 50, height: 50, borderRadius: 25 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B4332' },
  cardText: { color: '#7F8C8D', marginTop: 2 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  detailsContainer: { marginTop: 12, paddingLeft: 5 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 10 },
  detailsTitle: { fontSize: 14, fontWeight: 'bold', color: '#1B4332', marginBottom: 8 },
  detailsText: { fontSize: 14, color: '#4A5568', marginLeft: 5 },
  noSensorsText: { fontSize: 13, color: '#A0AEC0', fontStyle: 'italic', marginLeft: 5 },
  sensorTelemetryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAF7', padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#EDF2F7' },
  telemetryIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  telemetryName: { fontSize: 14, fontWeight: '600', color: '#2D3748' },
  telemetryId: { fontSize: 11, color: '#A0AEC0' },
  telemetryValue: { fontSize: 15, fontWeight: 'bold' },
  telemetryStatus: { fontSize: 11, color: '#718096' },
  fab: { position: 'absolute', right: 25, bottom: 30, backgroundColor: '#2D6A4F', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 10, zIndex: 1000 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 25, borderRadius: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1B4332' },
  label: { fontSize: 14, fontWeight: '600', color: '#2D6A4F', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#D8F3DC', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 5, color: '#2C3E50' },
  dateButton: { borderBottomWidth: 1, borderColor: '#2D6A4F', padding: 12, marginBottom: 15, marginTop: 5 },
  dateButtonText: { fontSize: 16, color: '#2C3E50' },
  saveButton: { backgroundColor: '#2D6A4F', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  closeButton: { position: 'absolute', top: 0, right: 0, padding: 10, zIndex: 10 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginBottom: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipSeleccionado: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  chipText: { color: '#2D6A4F', fontSize: 13, fontWeight: '600' },
  chipTextSeleccionado: { color: '#FFF' }
});