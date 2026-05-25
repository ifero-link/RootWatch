import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, Switch, ScrollView, Alert, FlatList, Platform } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { FontAwesome5 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as Notifications from 'expo-notifications';
import { API_IP } from '../../config';

// Manejador para pintar la notificación flotante si la app está abierta en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Configuración del idioma del calendario a Español
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

  // Estados del Formulario de Actividad
  const [tipoActividad, setTipoActividad] = useState('Riego');
  const [plantaSeleccionada, setPlantaSeleccionada] = useState({ id: '', nombre: 'General / Todo el Huerto' });
  const [notas, setNotas] = useState('');
  const [recordatorio, setRecordatorio] = useState(false);

  const coloresActividades = {
    'Riego': '#2980B9',
    'Fertilización': '#27AE60',
    'Trasplante': '#D35400',
    'Poda': '#8E44AD',
    'Tratamiento específico': '#C0392B'
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
      // Configuramos el canal con la máxima agresividad visual y sonora
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas de Tareas',
        importance: Notifications.AndroidImportance.MAX, 
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#2D6A4F',
        sound: 'default', // Activa el timbre por defecto de Android
        showBadge: true,
      });
      console.log("LOG SMART-HUERTO: Canal de notificaciones optimizado en importancia MAX.");
    }
  };

  // Función para personalizar dinámicamente el contenido de la alerta según el tipo de tarea
  const obtenerContenidoPersonalizado = (tipo, planta, detalles) => {
    const notasTexto = detalles ? `\nNotas: ${detalles}` : '';
    
    switch (tipo) {
      case 'Riego':
        return {
          title: `¡Hora de Regar! - SmartHuerto`,
          body: `Tus plantas tienen sed. Toca regar en "${planta}".${notasTexto}`
        };
      case 'Fertilización':
        return {
          title: `Nutrientes listos - SmartHuerto`,
          body: `Es momento de aplicar fertilizante/abono en "${planta}" para un crecimiento fuerte.${notasTexto}`
        };
      case 'Trasplante':
        return {
          title: `Nueva casa - SmartHuerto`,
          body: `Agenda de trasplante activa: Prepara el nuevo sustrato para "${planta}".${notasTexto}`
        };
      case 'Poda':
        return {
          title: `Mantenimiento de ramas - SmartHuerto`,
          body: `Toca saneamiento y poda en "${planta}". Retira las hojas secas o dañadas.${notasTexto}`
        };
      case 'Tratamiento específico':
        return {
          title: `Protección del Huerto - SmartHuerto`,
          body: `Atención médica/preventiva requerida en "${planta}". Revisa el tratamiento.${notasTexto}`
        };
      default:
        return {
          title: `Recordatorio de SmartHuerto`,
          body: `Tienes una tarea programada de ${tipo} en "${planta}".${notasTexto}`
        };
    }
  };

  const programarNotificacionMovil = async (fechaString, tipo, planta, detalles) => {
    try {
      // 1. Validar si el interruptor global de Ajustes está apagado
      const activeSaved = await AsyncStorage.getItem('@notif_active');
      if (activeSaved !== null && JSON.parse(activeSaved) === false) {
        console.log("LOG SMART-HUERTO: Notificaciones desactivadas globalmente.");
        return;
      }

      // 2. Recuperar la hora y minutos de la pantalla de Ajustes (Por defecto las 09:00)
      const horaCustom = (await AsyncStorage.getItem('@notif_hora')) || '09';
      const minutoCustom = (await AsyncStorage.getItem('@notif_minuto')) || '00';

      // 3. Reconstruir la fecha aislando husos horarios locales
      const [anio, mes, dia] = fechaString.split('-'); 
      let fechaObjetivo = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), parseInt(horaCustom), parseInt(minutoCustom), 0);
      const ahora = new Date();

      // --- LOGICA PROTECTORA INTELIGENTE ---
      // Si la hora programada de hoy ya pasó en el reloj real del teléfono,
      // movemos automáticamente la notificación al día siguiente para que no dé negativo.
      if (fechaObjetivo <= ahora) {
        console.log("LOG SMART-HUERTO: La hora ya pasó hoy. Moviendo recordatorio a mañana automáticamente...");
        fechaObjetivo.setDate(fechaObjetivo.getDate() + 1);
      }

      const segundosRestantes = Math.floor((fechaObjetivo.getTime() - ahora.getTime()) / 1000);
      
      console.log("LOG SMART-HUERTO: Objetivo real final ->", fechaObjetivo.toString());
      console.log("LOG SMART-HUERTO: Segundos restantes calculados:", segundosRestantes);

      // 4. Obtener los textos personalizados con emojis según la tarea
      const contenidoAlerta = obtenerContenidoPersonalizado(tipo, planta, detalles);

      // 5. Agendar en el microprocesador nativo del smartphone
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
      
      console.log(`LOG SMART-HUERTO: Alerta [${tipo}] programada para las ${horaCustom}:${minutoCustom} (en ${segundosRestantes} segs)`);
    } catch (error) {
      console.log("LOG SMART-HUERTO: Error al programar la notificación personalizada:", error);
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
    setNotas(item.notas || '');
    setRecordatorio(item.recordatorio || false);
    setModalVisible(true);
  };

  const abrirCrearActividad = () => {
    setIdActividadEditando(null); 
    setNotas('');
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
      notas,
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
        // Cierra el modal de inmediato
        setModalVisible(false);

        // Programa la alerta nativa y personalizada vinculada a la hora de tus Ajustes
        if (recordatorio) {
          await programarNotificacionMovil(diaSeleccionado, tipoActividad, plantaSeleccionada.nombre, notas);
        }

        // Resetea el formulario para posteriores clics
        setIdActividadEditando(null); 
        setNotas('');
        setRecordatorio(false);
        setTipoActividad('Riego');
        setPlantaSeleccionada({ id: '', nombre: 'General / Todo el Huerto' });

        // Sincroniza la lista visual del calendario
        cargarActividades(username);
        
        Alert.alert("¡Éxito!", idActividadEditando ? "Actividad actualizada correctamente." : "Actividad guardada en tu agenda.");
      } else {
        Alert.alert("Error", "El servidor rechazó la operación.");
      }
    } catch (e) { 
      Alert.alert("Error", "No se pudo conectar con el servidor Spring Boot."); 
    }
  };

  const eliminarActividad = (idActividad) => {
    Alert.alert(
      "¿Eliminar tarea?",
      "¿Estás seguro de que quieres quitar este evento de tu agenda?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              const res = await fetch(`http://${API_IP}:8080/api/actividades/eliminar?id=${idActividad}`, {
                method: 'DELETE'
              });
              if (res.ok) cargarActividades(username);
            } catch (e) { Alert.alert("Error", "Problema de conexión con la base de datos."); }
          }
        }
      ]
    );
  };

  const obtenerDiasMarcados = () => {
    let marcados = {};
    actividades.forEach(act => {
      if (!marcados[act.fecha]) marcados[act.fecha] = { dots: [] };
      const color = coloresActividades[act.tipoActividad] || '#7F8C8D';
      if (!marcados[act.fecha].dots.some(d => d.color == color)) {
        marcados[act.fecha].dots.push({ key: act.id, color, selectedDotColor: color });
      }
    });

    if (diaSeleccionado) {
      marcados[diaSeleccionado] = {
        ...marcados[diaSeleccionado],
        selected: true,
        selectedColor: '#2D6A4F'
      };
    }
    return marcados;
  };

  const actividadesDelDia = actividades.filter(act => act.fecha === diaSeleccionado);

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Agenda SmartHuerto</Text>
      </View>

      <Calendar
        style={styles.calendarCard}
        theme={{
          todayTextColor: '#2D6A4F',
          arrowColor: '#2D6A4F',
          dotStyle: { width: 6, height: 6, borderRadius: 3, marginTop: 1 },
          textMonthFontWeight: 'bold',
        }}
        onDayPress={(day) => setDiaSeleccionado(day.dateString)}
        markingType={'multi-dot'}
        markedDates={obtenerDiasMarcados()}
      />

      <View style={{ flex: 1, padding: 20 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {diaSeleccionado ? `Tareas del ${new Date(diaSeleccionado).toLocaleDateString()}` : 'Selecciona un día'}
          </Text>
          {diaSeleccionado && (
            <TouchableOpacity style={styles.btnAddEvent} onPress={abrirCrearActividad}>
              <FontAwesome5 name="plus" size={14} color="white" />
              <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 6, fontSize: 13 }}>Añadir</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={actividadesDelDia}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay eventos registrados para este día.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.eventCard, { borderLeftColor: coloresActividades[item.tipoActividad] }]}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => abrirEditarActividad(item)}>
                <Text style={styles.eventTitle}>
                  {item.tipoActividad} - <Text style={{ fontSize: 14, fontWeight: 'normal', color: '#555' }}>{item.nombrePlanta}</Text>
                </Text>
                {item.notas ? <Text style={styles.eventNotes}>{item.notas}</Text> : null}
                <Text style={styles.textClickToEdit}>Toca la tarjeta para editar</Text>
              </TouchableOpacity>
              
              {item.recordatorio && (
                <FontAwesome5 name="bell" size={14} color="#F39C12" style={{ marginRight: 15 }} />
              )}
              
              <TouchableOpacity onPress={() => eliminarActividad(item.id)} style={styles.btnDeleteTask}>
                <FontAwesome5 name="trash" size={14} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {idActividadEditando ? 'Modificar Actividad' : 'Registrar Actividad Manual'}
            </Text>

            <Text style={styles.label}>Tipo de Registro</Text>
            <View style={styles.pickerRow}>
              {['Riego', 'Fertilización', 'Trasplante', 'Poda', 'Tratamiento específico'].map((tipo) => (
                <TouchableOpacity 
                  key={tipo} 
                  style={[styles.chip, tipoActividad === tipo && { backgroundColor: coloresActividades[tipo], borderColor: coloresActividades[tipo] }]}
                  onPress={() => setTipoActividad(tipo)}
                >
                  <Text style={[styles.chipText, tipoActividad === tipo && { color: 'white' }]}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Asociar a Planta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 5 }}>
              <TouchableOpacity 
                style={[styles.plantChip, plantaSeleccionada.id === '' && styles.plantChipActive]}
                onPress={() => setPlantaSeleccionada({ id: '', nombre: 'General / Todo el Huerto' })}
              >
                <Text style={plantaSeleccionada.id === '' ? { color: 'white' } : { color: '#333' }}>General</Text>
              </TouchableOpacity>
              {plantas.map((p) => (
                <TouchableOpacity 
                  key={p.id} 
                  style={[styles.plantChip, plantaSeleccionada.id === p.id && styles.plantChipActive]}
                  onPress={() => setPlantaSeleccionada({ id: p.id, nombre: p.nombrePlanta })}
                >
                  <Text style={plantaSeleccionada.id === p.id ? { color: 'white' } : { color: '#333' }}>{p.nombrePlanta}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Notas o Comentarios</Text>
            <TextInput 
              style={styles.inputArea} 
              multiline numberOfLines={3} 
              value={notas}
              onChangeText={setNotas}
              placeholder="Ej: Añadidos 2L de agua con sustrato..."
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: '600', color: '#1B4332' }}>¿Activar Recordatorio en el Móvil?</Text>
                <Text style={{ fontSize: 11, color: '#7F8C8D' }}>Avisará al smartphone en la hora configurada globalmente desde Ajustes.</Text>
              </View>
              <Switch value={recordatorio} onValueChange={setRecordatorio} thumbColor={recordatorio ? "#2D6A4F" : "#7F8C8D"} trackColor={{ true: '#D8F3DC' }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, paddingBottom: 40 }}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#E74C3C', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={guardarActividad}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {idActividadEditando ? 'Actualizar Cambios' : 'Guardar en Agenda'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF5' },
  headerBox: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1B4332' },
  calendarCard: { marginHorizontal: 15, borderRadius: 15, elevation: 4, paddingBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B4332' },
  btnAddEvent: { backgroundColor: '#2D6A4F', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  eventCard: { backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, elevation: 1 },
  eventTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50' },
  eventNotes: { fontSize: 13, color: '#7F8C8D', marginTop: 3 },
  textClickToEdit: { fontSize: 11, color: '#2D6A4F', fontStyle: 'italic', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#A0AEC0', fontStyle: 'italic', marginTop: 20 },
  btnDeleteTask: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B4332', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#2D6A4F', marginTop: 15, marginBottom: 5 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  chip: { borderWidth: 1, borderColor: '#BDC3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12, color: '#555', fontWeight: '500' },
  plantChip: { backgroundColor: '#EAEDED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  plantChipActive: { backgroundColor: '#2D6A4F' },
  inputArea: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, marginTop: 5, textAlignVertical: 'top', color: '#333' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, backgroundColor: '#F4F6F6', padding: 12, borderRadius: 10 },
  btnCancel: { flex: 1, marginRight: 10, borderColor: '#E74C3C', borderWidth: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnSave: { flex: 2, backgroundColor: '#2D6A4F', padding: 14, borderRadius: 10, alignItems: 'center' }
});