import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Alert, Image, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { API_IP } from '../../config';
import { COLORES, globalStyles } from '../styles/globalStyles';


const DICCIONARIO_UMBRALES = {
  "Poto": { sueloMin: 30, sueloMax: 70, tempMin: 15, tempMax: 30, luzMin: 20, luzMax: 70, msgSeco: "El Poto necesita agua ligera. La tierra está seca." },
  "Suculenta / Cactus": { sueloMin: 10, sueloMax: 45, tempMin: 10, tempMax: 40, luzMin: 50, luzMax: 95, msgSeco: "Alerta de sequía extrema para tu Cactus." },
  "Monstera": { sueloMin: 40, sueloMax: 75, tempMin: 14, tempMax: 28, luzMin: 35, luzMax: 75, msgSeco: "Tu Monstera tiene sed. Requiere riego." },
  "Sansevieria": { sueloMin: 15, sueloMax: 50, tempMin: 12, tempMax: 35, luzMin: 15, luzMax: 80, msgSeco: "Suelo excesivamente seco para la Sansevieria." },
  "Planta del Dinero": { sueloMin: 35, sueloMax: 70, tempMin: 15, tempMax: 27, luzMin: 30, luzMax: 65, msgSeco: "La Planta del Dinero necesita riego moderado." },
  
  "Generico": {
    sueloMin: 30, sueloMax: 75, tempMin: 14, tempMax: 32, luzMin: 25, luzMax: 80,
    msgSeco: "Alerta de riego: El nivel de humedad en el suelo está bajo para una planta estándar.",
    msgHumedo: "Riesgo de encharcamiento: El suelo retiene demasiada humedad.",
    msgFrio: "Alerta de temperatura baja: El entorno está descendiendo del umbral de confort.",
    msgCalor: "Alerta de temperatura alta: El calor acumulado podría marchitar las hojas.",
    msgSombra: "Falta de luminosidad: Se recomienda mover la maceta a una zona con más luz."
  }
};


const obtenerUmbralesPlanta = (nombrePlanta) => {
  if (!nombrePlanta) return DICCIONARIO_UMBRALES["Generico"];
  
  const nombreNormalizado = nombrePlanta.toLowerCase().trim();

  if (nombreNormalizado.includes("poto")) return DICCIONARIO_UMBRALES["Poto"];
  if (nombreNormalizado.includes("cactus") || nombreNormalizado.includes("suculenta")) return DICCIONARIO_UMBRALES["Suculenta / Cactus"];
  if (nombreNormalizado.includes("monstera")) return DICCIONARIO_UMBRALES["Monstera"];
  if (nombreNormalizado.includes("sansevieria") || nombreNormalizado.includes("lengua de suegra")) return DICCIONARIO_UMBRALES["Sansevieria"];
  if (nombreNormalizado.includes("dinero")) return DICCIONARIO_UMBRALES["Planta del Dinero"];

  return DICCIONARIO_UMBRALES["Generico"];
};


const calcularEstadoSensor = (tipoSensor, valor, umbrales) => {
  const num = parseFloat(valor);
  if (isNaN(num)) return { texto: "Sin señal", color: COLORES.grisTexto };

  if (tipoSensor === "Humedad Suelo") {
    if (num < umbrales.sueloMin) return { texto: "Bajo (Seco)", color: COLORES.error };
    if (num > umbrales.sueloMax) return { texto: "Alto (Saturado)", color: "#D35400" };
    return { texto: "Óptimo", color: COLORES.primario };
  }
  
  if (tipoSensor === "Temperatura") {
    if (num < umbrales.tempMin) return { texto: "Muy Frío", color: "#2980B9" };
    if (num > umbrales.tempMax) return { texto: "Muy Caliente", color: COLORES.error };
    return { texto: "Óptimo", color: COLORES.primario };
  }

  if (tipoSensor === "Luz") {
    if (num < umbrales.luzMin) return { texto: "Bajo (Sombra)", color: "#F39C12" };
    if (umbrales.luzMax && num > umbrales.luzMax) return { texto: "Alto (Sol Directo)", color: COLORES.error };
    return { texto: "Óptimo", color: COLORES.primario };
  }

  return { texto: "Estable", color: COLORES.grisTextoOscuro };
};

export default function PlantsScreen() {
  const [plantas, setPlantas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [plantaExpandida, setPlantaExpandida] = useState(null);
  const [lecturasRealTime, setLecturasRealTime] = useState({});
  const [cargandoLecturas, setCargandoLecturas] = useState(false);

  const [sensoresDisponibles] = useState([
    { nombre: "Sensor de Temperatura", tipo: "Temperatura", id: "TEMP_01", icono: 'thermometer-half', color: '#27AE60' },
    { nombre: "Sensor de Humedad de Suelo", tipo: "Humedad Suelo", id: "HUM_SUELO_01", icono: 'tint', color: '#2980B9'},
    { nombre: "Sensor de Luz Ambiental", tipo: "Luz", id: "LUZ_01", icono: 'sun', color: '#F39C12'},
    { nombre: "Sensor de Humedad Ambiental", tipo: "Humedad Ambiental", id: "HUM_AMB_01", icono: 'cloud', color: '#16A085'}
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
      try {
        const userInfo = await GoogleSignin.getCurrentUser();
        if (userInfo) setUsername(userInfo.user.email);
      } catch (e) {
        console.log("Error recuperando usuario:", e);
      } finally {
        setLoading(false);
      }
    };
    obtenerUsuario();
  }, []);

  useEffect(() => { 
    if (username) cargarPlantas(); 
  }, [username]);

  useEffect(() => {
    if (!plantaExpandida) return;
    
    const planta = plantas.find(p => p.id === plantaExpandida);
    if (planta && planta.sensoresAsignados?.length > 0) {
      obtenerLecturasAPI(planta.sensoresAsignados);
    }

    const interval = setInterval(() => {
      if (plantaExpandida && planta?.sensoresAsignados?.length > 0) {
        obtenerLecturasAPI(planta.sensoresAsignados, true);
      }
    }, 10000); 

    return () => clearInterval(interval);
  }, [plantaExpandida, plantas]);

  const cargarPlantas = async () => {
    try {
      const response = await fetch(`http://${API_IP}:8080/api/usuarios/mis-plantas?username=${username}`);
      const data = await response.json();
      setPlantas(data);
    } catch (error) { 
      console.log("Error cargando plantas:", error); 
    }
  };

  const verificarUmbralesYAlertar = async (vectorMediciones, nombrePlantaUsuario) => {
    try {
      if (!vectorMediciones || !nombrePlantaUsuario) return;

      const temperatura = parseFloat(vectorMediciones["Temperatura"]);
      const humedadSuelo = parseInt(vectorMediciones["Humedad Suelo"]);
      const luz = parseInt(vectorMediciones["Luz"]);

      const ultimaAlertaString = await AsyncStorage.getItem('@ultima_alerta_automatica');
      const ahora = new Date().getTime();
      
      if (ultimaAlertaString) {
        const tiempoTranscurrido = ahora - parseInt(ultimaAlertaString);
        if (tiempoTranscurrido < 10 * 60 * 1000) return; 
      }

      let umbralConfigurado = obtenerUmbralesPlanta(nombrePlantaUsuario);
      let dispararNotificacion = false;
      let tituloAlerta = `¡Alerta de Cuidado: ${nombrePlantaUsuario}!`;
      let cuerpoAlerta = "";

      if (!isNaN(humedadSuelo)) {
        if (humedadSuelo < umbralConfigurado.sueloMin) {
          cuerpoAlerta = umbralConfigurado.msgSeco + ` (Suelo: ${humedadSuelo}%)`;
          dispararNotificacion = true;
        } else if (humedadSuelo > umbralConfigurado.sueloMax) {
          cuerpoAlerta = (umbralConfigurado.msgHumedo || DICCIONARIO_UMBRALES["Generico"].msgHumedo) + ` (Suelo: ${humedadSuelo}%)`;
          dispararNotificacion = true;
        }
      }

      if (!dispararNotificacion && !isNaN(temperatura)) {
        if (temperatura < umbralConfigurado.tempMin) {
          cuerpoAlerta = (umbralConfigurado.msgFrio || DICCIONARIO_UMBRALES["Generico"].msgFrio) + ` (Temperatura: ${temperatura}°C)`;
          dispararNotificacion = true;
        } else if (temperatura > umbralConfigurado.tempMax) {
          cuerpoAlerta = (umbralConfigurado.msgCalor || DICCIONARIO_UMBRALES["Generico"].msgCalor) + ` (Temperatura: ${temperatura}°C)`;
          dispararNotificacion = true;
        }
      }

      if (!dispararNotificacion && !isNaN(luz)) {
        if (luz < umbralConfigurado.luzMin) {
          cuerpoAlerta = (umbralConfigurado.msgSombra || DICCIONARIO_UMBRALES["Generico"].msgSombra) + ` (Luz: ${luz}%)`;
          dispararNotificacion = true;
        }
      }

      if (dispararNotificacion) {
        await Notifications.scheduleNotificationAsync({
          content: { title: tituloAlerta, body: cuerpoAlerta, sound: true, priority: Notifications.AndroidNotificationPriority.MAX },
          trigger: null,
        });
        await AsyncStorage.setItem('@ultima_alerta_automatica', ahora.toString());
      }
    } catch (err) {
      console.log("Error evaluando la matriz botánica:", err);
    }
  };

  const obtenerLecturasAPI = async (listaIds, silencioso = false) => {
    if (!silencioso) setCargandoLecturas(true);
    const nuevasLecturas = { ...lecturasRealTime };
    const datosPlantaActiva = {};

    try {
      for (const id of listaIds) {
        const urlCompleta = `http://${API_IP}:8080/api/sensores/actual?id=${id}`;
        const response = await fetch(urlCompleta);
        
        if (response.ok) {
          const data = await response.json(); 
          let valorExtraido = 'N/A';

          if (data !== null && data !== undefined) {
            if (data.valor !== undefined) valorExtraido = data.valor;
            else if (data.value !== undefined) valorExtraido = data.value;
            else if (data.lectura !== undefined) valorExtraido = data.lectura;
            else if (typeof data === 'number' || typeof data === 'string') valorExtraido = data; 
          }

          // Guardamos temporalmente el valor crudo leído de la API
          nuevasLecturas[id] = { valor: valorExtraido };
          
          const infoBase = encontrarInfoBaseSensor(id);
          if (infoBase && valorExtraido !== 'N/A') {
            datosPlantaActiva[infoBase.tipo] = valorExtraido;
          }
        } else {
          nuevasLecturas[id] = { valor: 'N/A' };
        }
      }
      setLecturasRealTime(nuevasLecturas);

      if (plantaExpandida) {
        const plantaActual = plantas.find(p => p.id === plantaExpandida);
        if (plantaActual) verificarUmbralesYAlertar(datosPlantaActiva, plantaActual.nombrePlanta);
      }
    } catch (error) {
      console.log("Error conectando con sensores:", error);
    } finally {
      if (!silencioso) setCargandoLecturas(false);
    }
  };

  const guardarPlanta = async () => {
    if (!nuevaPlanta.nombrePlanta.trim()) {
      Alert.alert("Nombre Requerido", "Por favor introduce un nombre.");
      return;
    }

    const payload = {
      nombrePlanta: nuevaPlanta.nombrePlanta.trim(),
      tipoRiego: nuevaPlanta.tipoRiego || '',
      sensoresAsignados: nuevaPlanta.sensoresAsignados || [],
      fechaPlantacion: nuevaPlanta.fechaPlantacion.toISOString() 
    };

    if (plantaAEditar) payload.id = plantaAEditar.id;

    const url = plantaAEditar 
      ? `http://${API_IP}:8080/api/usuarios/editar-planta?username=${username}`
      : `http://${API_IP}:8080/api/usuarios/agregar-planta?username=${username}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setModalVisible(false);
        setPlantaAEditar(null);
        setNuevaPlanta(initialState);
        cargarPlantas();
        Alert.alert("Éxito", "Planta guardada correctamente.");
      } else {
        Alert.alert("Error de Servidor", `No se pudo procesar la solicitud (Código ${response.status}).`);
      }
    } catch (error) { 
      Alert.alert("Error", "No se pudo conectar con el servidor."); 
    }
  };

  const abrirEdicion = (item) => {
    setPlantaAEditar(item);
    setNuevaPlanta({
      id: item.id,
      nombrePlanta: item.nombrePlanta,
      tipoRiego: item.tipoRiego || '',
      fechaPlantacion: item.fechaPlantacion ? new Date(item.fechaPlantacion) : new Date(),
      sensoresAsignados: item.sensoresAsignados || []
    });
    setModalVisible(true);
  };

  const eliminarPlanta = (id) => {
    Alert.alert("Eliminar", "¿Estás seguro de eliminar este registro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`http://${API_IP}:8080/api/usuarios/eliminar-planta?username=${username}&plantaId=${id}`, { method: 'DELETE' });
            if (res.ok) cargarPlantas();
          } catch (e) {
            console.log("Error al borrar:", e);
          }
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

  if (loading) {
    return (
      <View style={[globalStyles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerCustom}>
        <Text style={styles.headerTitleCustom}>Root Watch</Text>
        <Text style={styles.headerSubtitleCustom}>Mis Plantas y Cultivos IoT</Text>
      </View>

      <FlatList
        data={plantas}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const esExpandida = plantaExpandida === item.id;
          const umbrales = obtenerUmbralesPlanta(item.nombrePlanta);

          return (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => alternarExpansionPlanta(item.id)} 
              style={[globalStyles.card, esExpandida && styles.cardExpandida]}
            >
              <View style={styles.cardMainRow}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/628/628310.png' }} style={styles.plantImagePic} />
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.plantNameText}>{item.nombrePlanta}</Text>
                  <Text style={styles.plantDateText}>
                    <FontAwesome5 name="calendar-day" size={12} color={COLORES.grisTexto} /> {item.fechaPlantacion ? new Date(item.fechaPlantacion).toLocaleDateString() : 'S/F'}
                  </Text>
                </View>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity onPress={() => abrirEdicion(item)} style={styles.actionButtonPadding}>
                    <FontAwesome5 name="edit" size={16} color={COLORES.primario} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminarPlanta(item.id)} style={styles.actionButtonPadding}>
                    <FontAwesome5 name="trash-alt" size={16} color={COLORES.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {esExpandida && (
                <View style={styles.detailsContainer}>
                  <View style={styles.dividerLine} />
                  
                  <Text style={styles.detailsSectionTitle}>
                    <FontAwesome5 name="info-circle" size={13} color={COLORES.primarioOscuro} /> Detalles de Cuidado:
                  </Text>
                  <Text style={styles.detailsItemText}>
                    <FontAwesome5 name="faucet" size={12} color={COLORES.info} style={{ width: 16 }} /> <Text style={{fontWeight: 'bold'}}>Método de Riego:</Text> {item.tipoRiego || 'No especificado'}
                  </Text>
                  
                  <Text style={[styles.detailsSectionTitle, {marginTop: 15}]}>
                    <FontAwesome5 name="heart" size={13} color="#E74C3C" /> Rangos Ideales Botánicos:
                  </Text>
                  <View style={styles.umbralesGrid}>
                    <View style={styles.umbralItem}>
                      <FontAwesome5 name="tint" size={12} color="#2980B9" style={{ marginRight: 6 }} />
                      <Text style={styles.umbralLabel}>Humedad Suelo:</Text>
                      <Text style={styles.umbralValue}>{umbrales.sueloMin}% - {umbrales.sueloMax}%</Text>
                    </View>
                    <View style={styles.umbralItem}>
                      <FontAwesome5 name="thermometer-half" size={12} color="#27AE60" style={{ marginRight: 6 }} />
                      <Text style={styles.umbralLabel}>Temperatura:</Text>
                      <Text style={styles.umbralValue}>{umbrales.tempMin}°C - {umbrales.tempMax}°C</Text>
                    </View>
                    <View style={styles.umbralItem}>
                      <FontAwesome5 name="sun" size={12} color="#F39C12" style={{ marginRight: 6 }} />
                      <Text style={styles.umbralLabel}>Luz Ambiental:</Text>
                      <Text style={styles.umbralValue}>min {umbrales.luzMin}%</Text>
                    </View>
                  </View>

                  <Text style={[styles.detailsSectionTitle, {marginTop: 15}]}>
                    <FontAwesome5 name="broadcast-tower" size={13} color={COLORES.primarioOscuro} /> Monitoreo en Tiempo Real:
                  </Text>
                  
                  {cargandoLecturas && <ActivityIndicator size="small" color={COLORES.primario} style={{ marginVertical: 10 }} />}

                  {item.sensoresAsignados && item.sensoresAsignados.length > 0 ? (
                    item.sensoresAsignados.map((sensorId) => {
                      const infoBase = encontrarInfoBaseSensor(sensorId);
                      const lecturaAPI = lecturasRealTime[sensorId] || { valor: '...' };
                      
                      // EVALUACIÓN DINÁMICA DE ESTADO (NO HARDCODEADO)
                      const analisisEstado = lecturaAPI.valor !== '...' 
                        ? calcularEstadoSensor(infoBase.tipo, lecturaAPI.valor, umbrales) 
                        : { texto: 'Conectando...', color: COLORES.grisTexto };

                      return (
                        <View key={sensorId} style={styles.sensorTelemetryRow}>
                          <View style={[styles.telemetryIconContainer, { backgroundColor: infoBase.color + '1A' }]}>
                            <FontAwesome5 name={infoBase.icono} size={15} color={infoBase.color} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.telemetryName}>{infoBase.nombre}</Text>
                            <Text style={styles.telemetryId}>ID: {sensorId}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.telemetryValue, { color: infoBase.color }]}>
                              {lecturaAPI.valor}{lecturaAPI.valor !== '...' && lecturaAPI.valor !== 'N/A' ? infoBase.unidad : ''}
                            </Text>
                            {/* ESTADO DINÁMICO IMPRESO CON SU COLOR DE ALERTA CORRESPONDIENTE */}
                            <Text style={[styles.telemetryStatus, { color: analisisEstado.color, fontWeight: '600' }]}>
                              {analisisEstado.texto}
                            </Text>
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

      <TouchableOpacity style={globalStyles.fab} onPress={() => { setPlantaAEditar(null); setNuevaPlanta(initialState); setModalVisible(true); }}>
        <FontAwesome5 name="plus" size={18} color={COLORES.blanco} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={globalStyles.modalContainer}>
          <ScrollView contentContainerStyle={{paddingBottom: 30}} style={globalStyles.modalContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <FontAwesome5 name="times" size={18} color={COLORES.grisTexto} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{plantaAEditar ? "Editar Planta" : "Nueva Planta"}</Text>

            <Text style={globalStyles.label}>Nombre de la planta</Text>
            <TextInput style={globalStyles.input} value={nuevaPlanta.nombrePlanta} onChangeText={v => setNuevaPlanta({...nuevaPlanta, nombrePlanta: v})} placeholder="Ej: Poto, Tomate, Cactus..." placeholderTextColor={COLORES.grisTexto} />

            <Text style={globalStyles.label}>Sensores del Dispositivo (Múltiple)</Text>
            <View style={globalStyles.chipsContainer}>
              {sensoresDisponibles.map((sensor) => {
                const seleccionado = nuevaPlanta.sensoresAsignados.includes(sensor.id);
                return (
                  <TouchableOpacity
                    key={sensor.id}
                    activeOpacity={0.7}
                    onPress={() => Math.max(0, alternarSensor(sensor.id))}
                    style={[globalStyles.chip, seleccionado && globalStyles.chipSeleccionado]}
                  >
                    <FontAwesome5 name={seleccionado ? "check" : "plus"} size={11} color={seleccionado ? COLORES.blanco : COLORES.primario} style={{marginRight: 6}} />
                    <Text style={[globalStyles.chipText, seleccionado && globalStyles.chipTextSeleccionado]}>{sensor.tipo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={globalStyles.label}>Tipo de Riego</Text>
            <TextInput style={globalStyles.input} value={nuevaPlanta.tipoRiego} onChangeText={v => setNuevaPlanta({...nuevaPlanta, tipoRiego: v})} placeholder="Ej: Goteo automático" placeholderTextColor={COLORES.grisTexto} />

            <Text style={globalStyles.label}>Fecha de plantación</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <FontAwesome5 name="calendar-alt" size={14} color={COLORES.primario} style={{ marginRight: 8 }} />
              <Text style={styles.dateButtonText}>{nuevaPlanta.fechaPlantacion.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker 
                value={nuevaPlanta.fechaPlantacion} 
                mode="date" 
                onChange={(e, date) => { setShowDatePicker(false); if(date) setNuevaPlanta({...nuevaPlanta, fechaPlantacion: date}); }} 
              />
            )}

            <TouchableOpacity style={globalStyles.btnPrimario} onPress={guardarPlanta}>
              <FontAwesome5 name="save" size={14} color={COLORES.blanco} style={{ marginRight: 6 }} />
              <Text style={globalStyles.btnPrimarioText}>{plantaAEditar ? "Guardar Cambios" : "Guardar Planta"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  headerCustom: { backgroundColor: COLORES.primario, padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 15 },
  headerTitleCustom: { fontSize: 26, fontWeight: 'bold', color: COLORES.blanco },
  headerSubtitleCustom: { fontSize: 14, color: COLORES.primarioClaro, marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  cardExpandida: { borderColor: COLORES.primario, borderWidth: 1.5 },
  cardMainRow: { flexDirection: 'row', alignItems: 'center' },
  plantImagePic: { width: 50, height: 50, borderRadius: 25 },
  plantNameText: { fontSize: 17, fontWeight: 'bold', color: COLORES.primarioOscuro },
  plantDateText: { color: COLORES.grisTexto, marginTop: 4, fontSize: 13 },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center' },
  actionButtonPadding: { marginLeft: 14, padding: 6 },
  detailsContainer: { marginTop: 14, paddingLeft: 2 },
  dividerLine: { height: 1, backgroundColor: COLORES.grisBorde, marginBottom: 12 },
  detailsSectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORES.primarioOscuro, marginBottom: 8 },
  detailsItemText: { fontSize: 14, color: COLORES.grisTextoOscuro, marginLeft: 6, marginTop: 2 },
  umbralesGrid: { backgroundColor: '#F2F4F4', padding: 12, borderRadius: 10, marginTop: 4, borderWidth: 1, borderColor: '#E5E7E9' },
  umbralItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  umbralLabel: { fontSize: 13, color: COLORES.grisTextoOscuro, fontWeight: '600', width: 110 },
  umbralValue: { fontSize: 13, color: COLORES.primarioOscuro, fontWeight: '700' },
  noSensorsText: { fontSize: 13, color: COLORES.grisTexto, fontStyle: 'italic', marginLeft: 6, marginTop: 4 },
  sensorTelemetryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.primarioFondo, padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: COLORES.primarioClaro },
  telemetryIconContainer: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  telemetryName: { fontSize: 13, fontWeight: '600', color: COLORES.grisTextoOscuro },
  telemetryId: { fontSize: 11, color: COLORES.grisTexto },
  telemetryValue: { fontSize: 15, fontWeight: 'bold' },
  telemetryStatus: { fontSize: 12, marginTop: 2 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: COLORES.primarioOscuro },
  closeButton: { position: 'absolute', top: 0, right: 0, padding: 6, zIndex: 10 },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.blanco, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: COLORES.primarioClaro, marginTop: 4 },
  dateButtonText: { fontSize: 15, color: COLORES.grisTextoOscuro, fontWeight: '500' }
});