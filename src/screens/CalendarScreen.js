import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, Switch, ScrollView, Alert, Platform } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { FontAwesome5 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as Notifications from 'expo-notifications';
import { API_IP } from '../../config';
import { COLORES, globalStyles } from '../styles/globalStyles';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function CalendarScreen() {
  const [username, setUsername] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [plantas, setPlantas] = useState([]);
  const [idActividadEditando, setIdActividadEditando] = useState(null);

  const [tipoActividad, setTipoActividad] = useState('Riego');
  const [plantaSeleccionada, setPlantaSeleccionada] = useState({ id: '', nombre: 'General / Todo el Huerto' });
  const [notes, setNotes] = useState('');
  const [recordatorio, setRecordatorio] = useState(false);

  const coloresActividades = {
    'Riego': COLORES.info,
    'Fertilización': COLORES.primario,
    'Trasplante': COLORES.advertencia,
    'Poda': '#8E44AD',
    'Tratamiento específico': COLORES.error
  };

  const iconosActividades = {
    'Riego': 'tint',
    'Fertilización': 'leaf',
    'Trasplante': 'seedling',
    'Poda': 'cut',
    'Tratamiento específico': 'medkit'
  };

  useEffect(() => {
    const inicializar = async () => {
      const userInfo = await GoogleSignin.getCurrentUser();
      if (userInfo) {
        setUsername(userInfo.user.email);
        cargarActividades(userInfo.user.email);
        cargarPlantas(userInfo.user.email);
      }
      solicitarPermisosNotificaciones();
    };
    inicializar();
  }, []);

  const solicitarPermisosNotificaciones = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (Platform.OS === 'android' && finalStatus === 'granted') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas de Tareas',
        importance: Notifications.AndroidImportance.MAX, 
        enableVibrate: true,
        lightColor: COLORES.primario,
        sound: 'default',
        showBadge: true,
      });
    }
  };

  const obtenerContenidoPersonalizado = (tipo, planta, detalles) => {
    const notasTexto = detalles ? `\nNotas: ${detalles}` : '';
    return { title: `${tipo} - Root Watch`, body: `Tarea programada en "${planta}".${notasTexto}` };
  };

  const programarNotificacionMovil = async (fechaString, tipo, planta, detalles) => {
    try {
      const activeSaved = await AsyncStorage.getItem('@notif_active');
      if (activeSaved !== null && JSON.parse(activeSaved) === false) return;

      const horaCustom = (await AsyncStorage.getItem('@notif_hora')) || '09';
      const minutoCustom = (await AsyncStorage.getItem('@notif_minuto')) || '00';

      const [anio, mes, dia] = fechaString.split('-'); 
      let fechaObjetivo = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), parseInt(horaCustom), parseInt(minutoCustom), 0);
      const ahora = new Date();

      if (fechaObjetivo <= ahora) {
        fechaObjetivo.setDate(fechaObjetivo.getDate() + 1);
      }

      const segundosRestantes = Math.floor((fechaObjetivo.getTime() - ahora.getTime()) / 1000);
      const contenidoAlerta = obtenerContenidoPersonalizado(tipo, planta, detalles);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: contenidoAlerta.title,
          body: contenidoAlerta.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: { 
          type: 'timeInterval', 
          seconds: segundosRestantes,
          channelId: 'default',
        },
      });
    } catch (error) {
      console.log("Error al programar la notificación:", error);
    }
  };

  const cargarActividades = async (user) => {
    try {
      const res = await fetch(`http://${API_IP}:8080/api/actividades/mis-actividades?username=${user}`);
      if (res.ok) setActividades(await res.json());
    } catch (e) { console.log(e); }
  };

  const cargarPlantas = async (user) => {
    try {
      const res = await fetch(`http://${API_IP}:8080/api/usuarios/mis-plantas?username=${user}`);
      if (res.ok) setPlantas(await res.json());
    } catch (e) { console.log(e); }
  };

  const abrirEditarActividad = (item) => {
    setIdActividadEditando(item.id); 
    setTipoActividad(item.tipoActividad);
    setPlantaSeleccionada({ id: item.idPlanta, nombre: item.nombrePlanta });
    setNotes(item.notas || '');
    setRecordatorio(item.recordatorio || false);
    setModalVisible(true);
  };

  const abrirCrearActividad = () => {
    setIdActividadEditando(null); 
    setNotes('');
    setRecordatorio(false);
    setTipoActividad('Riego');
    setPlantaSeleccionada({ id: '', nombre: 'General / Todo el Huerto' });
    setModalVisible(true);
  };

  const guardarActividad = async () => {
    const actividadAGuardar = {
      username,
      idPlanta: plantaSeleccionada.id,
      nombrePlanta: plantaSeleccionada.nombre,
      fecha: diaSeleccionado,
      tipoActividad,
      notas: notes,
      recordatorio,
      completado: new Date(diaSeleccionado) < new Date()
    };

    let url = `http://${API_IP}:8080/api/actividades/guardar`;
    let metodo = 'POST';

    if (idActividadEditando) {
      actividadAGuardar.id = idActividadEditando;
      url = `http://${API_IP}:8080/api/actividades/actualizar`;
      metodo = 'PUT';
    }

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actividadAGuardar)
      });
      
      if (res.ok) {
        setModalVisible(false);
        if (recordatorio) {
          await programarNotificacionMovil(diaSeleccionado, tipoActividad, plantaSeleccionada.nombre, notes);
        }
        cargarActividades(username);
        Alert.alert("¡Éxito!", "Agenda actualizada correctamente.");
      }
    } catch (e) { 
      Alert.alert("Error", "No se pudo conectar con el servidor."); 
    }
  };

  const eliminarActividad = (idActividad) => {
    Alert.alert(
      "¿Eliminar tarea?",
      "¿Estás seguro de quitar este evento de tu agenda?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              const res = await fetch(`http://${API_IP}:8080/api/actividades/eliminar?id=${idActividad}`, { method: 'DELETE' });
              if (res.ok) cargarActividades(username);
            } catch (e) { console.log(e); }
          }
        }
      ]
    );
  };

  const obtenerDiasMarcados = () => {
    let marcados = {};
    actividades.forEach(act => {
      if (!marcados[act.fecha]) marcados[act.fecha] = { dots: [] };
      const color = coloresActividades[act.tipoActividad] || COLORES.grisTexto;
      if (!marcados[act.fecha].dots.some(d => d.color == color)) {
        marcados[act.fecha].dots.push({ key: act.id, color, selectedDotColor: color });
      }
    });
    if (diaSeleccionado) {
      marcados[diaSeleccionado] = { ...marcados[diaSeleccionado], selected: true, selectedColor: COLORES.primario };
    }
    return marcados;
  };

  const actividadesDelDia = actividades.filter(act => act.fecha === diaSeleccionado);

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerCustom}>
        <Text style={styles.headerTitleCustom}>Root Watch</Text>
        <Text style={styles.headerSubtitleCustom}>Agenda y Calendario de Tareas</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Calendar
          style={styles.calendarCard}
          theme={{
            todayTextColor: COLORES.primario,
            arrowColor: COLORES.primario,
            dotStyle: { width: 6, height: 6, borderRadius: 3, marginTop: 1 },
            textMonthFontWeight: 'bold',
            selectedDayBackgroundColor: COLORES.primario,
          }}
          onDayPress={(day) => setDiaSeleccionado(day.dateString)}
          markingType={'multi-dot'}
          markedDates={obtenerDiasMarcados()}
        />

        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {diaSeleccionado ? `Tareas del ${new Date(diaSeleccionado).toLocaleDateString()}` : 'Selecciona un día'}
            </Text>
            {diaSeleccionado && (
              <TouchableOpacity style={styles.btnAddEvent} onPress={abrirCrearActividad}>
                <FontAwesome5 name="plus" size={12} color={COLORES.blanco} />
                <Text style={{ color: COLORES.blanco, fontWeight: 'bold', marginLeft: 6, fontSize: 13 }}>Añadir</Text>
              </TouchableOpacity>
            )}
          </View>

          {actividadesDelDia.length === 0 ? (
  <Text style={styles.emptyText}>No hay eventos registrados para este día.</Text>
) : (
  actividadesDelDia.map(item => (
    <View key={item.id} style={[globalStyles.card, styles.taskCardContainer]}>
      
      {/* Botón principal: Abre la edición al tocar cualquier parte de la tarea */}
      <TouchableOpacity 
        style={styles.taskTouchArea} 
        onPress={() => abrirEditarActividad(item)}
      >
        <View style={[styles.taskIconBox, { backgroundColor: (coloresActividades[item.tipoActividad] || COLORES.grisTexto) + '1A' }]}>
          <FontAwesome5 name={iconosActividades[item.tipoActividad] || 'circle'} size={14} color={coloresActividades[item.tipoActividad]} />
        </View>
        
        <View style={styles.taskTextContainer}>
          <Text style={styles.eventTitle}>
            {item.tipoActividad} - <Text style={{ fontWeight: 'normal', color: COLORES.grisTexto }}>{item.nombrePlanta}</Text>
          </Text>
          {item.notes ? <Text style={styles.eventNotes} numberOfLines={1}>{item.notes}</Text> : null}
        </View>
      </TouchableOpacity>

      {/* Contenedor de acciones: Derecha */}
      <View style={styles.taskActionsContainer}>
        {item.recordatorio && (
          <FontAwesome5 name="bell" size={14} color={COLORES.advertencia} style={{ marginRight: 12 }} />
        )}
        <TouchableOpacity onPress={() => eliminarActividad(item.id)} style={styles.btnDeleteTask}>
          <FontAwesome5 name="trash" size={16} color={COLORES.error} />
        </TouchableOpacity>
      </View>
    </View>
  ))
)}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={globalStyles.modalContainer}>
          <ScrollView style={globalStyles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{idActividadEditando ? 'Modificar Actividad' : 'Registrar Actividad'}</Text>

            <Text style={globalStyles.label}>Tipo de Registro</Text>
            <View style={globalStyles.chipsContainer}>
              {['Riego', 'Fertilización', 'Trasplante', 'Poda', 'Tratamiento específico'].map((tipo) => {
                const seleccionado = tipoActividad === tipo;
                // Obtenemos el color dinámico
                const colorActividad = coloresActividades[tipo];
                
                return (
                  <TouchableOpacity 
                    key={tipo} 
                    // Si está seleccionado, aplicamos el color de la actividad, si no, un color base gris
                    style={[
                      globalStyles.chip, 
                      seleccionado && { backgroundColor: colorActividad, borderColor: colorActividad }
                    ]}
                    onPress={() => setTipoActividad(tipo)}
                  >
                    <FontAwesome5 
                      name={iconosActividades[tipo]} 
                      size={12} 
                      // El icono es blanco si está seleccionado, de lo contrario usa el color de la actividad
                      color={seleccionado ? '#FFFFFF' : colorActividad} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={[
                      globalStyles.chipText, 
                      seleccionado && { color: '#FFFFFF', fontWeight: 'bold' }
                    ]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={globalStyles.label}>Asociar a Planta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 5 }}>
              <TouchableOpacity 
                style={[globalStyles.chip, plantaSeleccionada.id === '' && globalStyles.chipSeleccionado]}
                onPress={() => setPlantaSeleccionada({ id: '', nombre: 'General / Todo el Huerto' })}
              >
                <Text style={[globalStyles.chipText, plantaSeleccionada.id === '' && globalStyles.chipTextSeleccionado]}>General</Text>
              </TouchableOpacity>
              {plantas.map((p) => {
                const seleccionado = plantaSeleccionada.id === p.id;
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[globalStyles.chip, seleccionado && globalStyles.chipSeleccionado]}
                    onPress={() => setPlantaSeleccionada({ id: p.id, nombre: p.nombrePlanta })}
                  >
                    <Text style={[globalStyles.chipText, seleccionado && globalStyles.chipTextSeleccionado]}>{p.nombrePlanta}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={globalStyles.label}>Notas o Comentarios</Text>
            <TextInput 
              style={[globalStyles.input, { textAlignVertical: 'top', height: 80 }]} 
              multiline numberOfLines={3} 
              value={notes}
              onChangeText={setNotes}
              placeholder="Detalles de la tarea..."
              placeholderTextColor={COLORES.grisTexto}
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: '600', color: COLORES.grisTextoOscuro }}>¿Activar Recordatorio?</Text>
                <Text style={{ fontSize: 11, color: COLORES.grisTexto }}>Avisará al smartphone en la hora configurada globalmente.</Text>
              </View>
              <Switch value={recordatorio} onValueChange={setRecordatorio} thumbColor={recordatorio ? COLORES.primario : COLORES.grisTexto} trackColor={{ true: COLORES.primarioClaro }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, paddingBottom: 20 }}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={{ color: COLORES.error, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[globalStyles.btnPrimario, { marginTop: 0, flex: 2 }]} onPress={guardarActividad}>
                <FontAwesome5 name="save" size={14} color={COLORES.blanco} />
                <Text style={globalStyles.btnPrimarioText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCustom: { backgroundColor: COLORES.primario, padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 15 },
  headerTitleCustom: { fontSize: 26, fontWeight: 'bold', color: COLORES.blanco },
  headerSubtitleCustom: { fontSize: 14, color: COLORES.primarioClaro, marginTop: 4 },
  calendarCard: { marginHorizontal: 20, marginTop: 5, borderRadius: 15, elevation: 2, paddingBottom: 10, backgroundColor: COLORES.blanco, borderWidth: 1, borderColor: COLORES.grisBorde },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORES.primarioOscuro },
  btnAddEvent: { backgroundColor: COLORES.primario, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  taskIconBox: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  eventTitle: { fontSize: 15, fontWeight: 'bold', color: COLORES.grisTextoOscuro },
  eventNotes: { fontSize: 13, color: COLORES.grisTexto, marginTop: 3 },
  emptyText: { textAlign: 'center', color: COLORES.grisTexto, fontStyle: 'italic', marginTop: 20 },
  btnDeleteTask: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORES.primarioOscuro, marginBottom: 15, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, backgroundColor: COLORES.primarioFondo, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORES.primarioClaro },
  btnCancel: { flex: 1, marginRight: 10, borderColor: COLORES.error, borderWidth: 1, padding: 14, borderRadius: 10, alignItems: 'center', height: 50, justifyContent: 'center' },
  taskCardContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderLeftWidth: 5, 
    borderLeftColor: COLORES.primario // Este se sobrescribirá dinámicamente si lo deseas
  },
  taskTouchArea: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  taskTextContainer: { 
    flex: 1, 
    marginLeft: 10 
  },
  taskActionsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginLeft: 10
  },
  btnDeleteTask: { 
    padding: 5 
  },
});