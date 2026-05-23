import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { apiService } from '../services/api';

export default function HomeScreen() {
  const [medicion, setMedicion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función para descargar los datos de la API de Spring Boot
  const consultarApi = async () => {
    try {
      const data = await apiService.getUltimaMedicion();
      setMedicion(data);
    } catch (error) {
      console.log("Error de conexión, verifica la IP del backend");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
  //  Carga inicial al abrir la pantalla
  consultarApi();

  // Configura el temporizador para que consulte cada 10 segundos
  const temporizador = setInterval(() => {
    console.log("Refrescando datos del SmartHuerto automáticamente...");
    consultarApi();
  }, 10000);


  // Cuando el usuario cambie de pestaña este return apaga el temporizador para no consumir batería ni saturar tu servidor Java.
  return () => clearInterval(temporizador);
}, []);

  const onRefresh = () => {
    setRefreshing(true);
    consultarApi();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text style={styles.loadingText}>Conectando con Root Watch Server...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2ECC71']} />}
    >
      {/* Cabecera superior estilizada estilo Figma */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Root Watch</Text>
        <Text style={styles.headerSubtitle}>Estado actual de tu SmartHuerto</Text>
      </View>

      {/* Tarjeta de Estado del Sistema */}
      <View style={styles.cardStatus}>
        <Text style={styles.cardTitle}>Estado General</Text>
        <Text style={styles.statusBadge}>🟢 En Línea y Sincronizado</Text>
      </View>

      {/* Grid de Sensores (2 columnas) */}
      <View style={styles.gridContainer}>
        
        {/* Celda de Temperatura */}
        <View style={styles.gridItem}>
          <Text style={styles.iconSensor}>🌡️</Text>
          <Text style={styles.labelSensor}>Temperatura</Text>
          <Text style={styles.valueSensor}>{medicion?.temperatura !== undefined ? `${medicion.temperatura}°C` : '--'}</Text>
        </View>

        {/* Celda de Humedad Ambiental */}
        <View style={styles.gridItem}>
          <Text style={styles.iconSensor}>💧</Text>
          <Text style={styles.labelSensor}>Hum. Ambiente</Text>
          <Text style={styles.valueSensor}>{medicion?.humedad !== undefined ? `${medicion.humedad}%` : '--'}</Text>
        </View>

        {/* Celda de Humedad del Suelo */}
        <View style={styles.gridItem}>
          <Text style={styles.iconSensor}>🪴</Text>
          <Text style={styles.labelSensor}>Humedad Suelo</Text>
          <Text style={styles.valueSensor}>{medicion?.humedadSuelo !== undefined ? `${medicion.humedadSuelo}%` : '--'}</Text>
        </View>

        {/* Celda de Iluminación LDR */}
        <View style={styles.gridItem}>
          <Text style={styles.iconSensor}>☀️</Text>
          <Text style={styles.labelSensor}>Luz Solar</Text>
          <Text style={styles.valueSensor}>{medicion?.luz !== undefined ? `${medicion.luz}%` : '--'}</Text>
        </View>
        
      </View>

      {/* Botón manual de actualización rápida */}
      <TouchableOpacity style={styles.buttonRefresh} onPress={consultarApi}>
        <Text style={styles.buttonText}>Forzar Actualización</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBF8' }, // Fondo pálido de la guía de diseño
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FBF8' },
  loadingText: { marginTop: 10, color: '#7F8C8D', fontSize: 14 },
  header: { backgroundColor: '#2ECC71', padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#E8F8F5', marginTop: 4 },
  cardStatus: { backgroundColor: '#FFFFFF', margin: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 6 },
  statusBadge: { fontSize: 14, color: '#27AE60', fontWeight: '600' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
  gridItem: { backgroundColor: '#FFFFFF', width: '47%', padding: 16, borderRadius: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  iconSensor: { fontSize: 32, marginBottom: 8 },
  labelSensor: { fontSize: 12, color: '#7F8C8D', fontWeight: '500' },
  valueSensor: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginTop: 4 },
  buttonRefresh: { backgroundColor: '#2C3E50', margin: 16, padding: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});