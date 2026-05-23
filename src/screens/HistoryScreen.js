// src/screens/HistoryScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { apiService } from '../services/api';

export default function HistoryScreen() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado para controlar qué gráfica estamos viendo: 'temp', 'hum' o 'luz'
  const [metricaSeleccionada, setMetricaSeleccionada] = useState('temp');

  const cargarDatos = async () => {
    try {
      const data = await apiService.getHistorialMediciones();
      // Ordenamos cronológicamente (antiguos a modernos) para que el gráfico fluya de izquierda a derecha
      const datosOrdenados = data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setHistorial(datosOrdenados);
    } catch (error) {
      console.log("Error al cargar el histórico para los gráficos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // Puesta a punto de un autorefresco cada 10 segundos también en los gráficos
    const intervalo = setInterval(cargarDatos, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text style={styles.loadingText}>Generando analíticas del Huerto...</Text>
      </View>
    );
  }

  // 1. Obtener la última medición para la tarjeta fija de arriba (Tiempo Real)
  const ultimaMedicion = historial.length > 0 ? historial[historial.length - 1] : null;

  // 2. Filtrar y preparar los últimos 7 registros para que el gráfico no se sature en la pantalla
  const muestrasGrafico = historial.slice(-7);

  // 3. Configurar las etiquetas del eje X (Horas) y los valores del eje Y según la métrica activa
  const labelsX = muestrasGrafico.map(item => {
    if (!item.fecha) return '';
    const d = new Date(item.fecha);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  let valoresY = [0];
  let tituloGrafico = "Temperatura";
  let sufijo = "°C";
  let colorGrafico = (opacity = 1) => `rgba(231, 76, 60, ${opacity})`; // Rojo para Temp

  if (metricaSeleccionada === 'hum') {
    valoresY = muestrasGrafico.map(item => item.humedad || 0);
    tituloGrafico = "Humedad Ambiental";
    sufijo = "%";
    colorGrafico = (opacity = 1) => `rgba(52, 152, 219, ${opacity})`; // Azul para Humedad
  } else if (metricaSeleccionada === 'luz') {
    valoresY = muestrasGrafico.map(item => item.luz || 0);
    tituloGrafico = "Nivel de Luminosidad";
    sufijo = "%";
    colorGrafico = (opacity = 1) => `rgba(241, 196, 15, ${opacity})`; // Amarillo para Luz
  } else {
    valoresY = muestrasGrafico.map(item => item.temperatura || 0);
  }

  // Si la base de datos está vacía, evitamos que la librería de gráficos rompa la app
  const datosData = {
    labels: labelsX.length > 0 ? labelsX : ["Sin datos"],
    datasets: [{ data: valoresY.length > 0 ? valoresY : [0] }]
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2ECC71']} />}
    >
      {/* Cabecera Principal */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Root Watch</Text>
        <Text style={styles.headerSubtitle}>Histórico & Analítica Visual</Text>
      </View>

      {/* SECCIÓN SUPERIOR: Datos en Tiempo Real (Fijos arriba) */}
      <View style={styles.realTimeContainer}>
        <Text style={styles.sectionTitle}>🎯 Estado Actual (Último registro)</Text>
        {ultimaMedicion ? (
          <View style={styles.realTimeCard}>
            <View style={styles.rtBox}>
              <Text style={styles.rtLabel}>🌡️ Temp</Text>
              <Text style={[styles.rtValue, { color: '#E74C3C' }]}>{ultimaMedicion.temperatura}°C</Text>
            </View>
            <View style={styles.rtBox}>
              <Text style={styles.rtLabel}>💧 Hum. Amb</Text>
              <Text style={[styles.rtValue, { color: '#3498DB' }]}>{ultimaMedicion.humedad}%</Text>
            </View>
            <View style={styles.rtBox}>
              <Text style={styles.rtLabel}>☀️ Luz</Text>
              <Text style={[styles.rtValue, { color: '#F1C40F' }]}>{ultimaMedicion.luz}%</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>Esperando lecturas de los sensores...</Text>
        )}
      </View>

      {/* SECCIÓN INTERMEDIA: Botonera Selectora de Gráficos */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.btnSelector, metricaSeleccionada === 'temp' && styles.btnActiveTemp]}
          onPress={() => setMetricaSeleccionada('temp')}
        >
          <Text style={[styles.btnText, metricaSeleccionada === 'temp' && styles.btnTextActive]}>🌡️ Temp</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.btnSelector, metricaSeleccionada === 'hum' && styles.btnActiveHum]}
          onPress={() => setMetricaSeleccionada('hum')}
        >
          <Text style={[styles.btnText, metricaSeleccionada === 'hum' && styles.btnTextActive]}>💧 Humedad</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.btnSelector, metricaSeleccionada === 'luz' && styles.btnActiveLuz]}
          onPress={() => setMetricaSeleccionada('luz')}
        >
          <Text style={[styles.btnText, metricaSeleccionada === 'luz' && styles.btnTextActive]}>☀️ Luz</Text>
        </TouchableOpacity>
      </View>

      {/* SECCIÓN INFERIOR: El Gráfico Dinámico */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolución de: {tituloGrafico}</Text>
        {historial.length > 0 ? (
          <LineChart
            data={datosData}
            width={Dimensions.get('window').width - 16} 
            height={240}
            yAxisSuffix={sufijo}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 1, // Un decimal de precisión (ej: 24.5)
              color: colorGrafico,
              labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#FFFFFF" },

              paddingRight: 0,
              paddingLeft: 20,

              propsForLabels: {
                fontSize: 11, 
                dx: 40,         
              }
            }}
            bezier // Suaviza la línea haciendo un efecto de onda estética de Figma
            style={styles.chartStyle}
          />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.noData}>No hay registros acumulados para trazar la línea.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FBF8' },
  loadingText: { marginTop: 12, color: '#7F8C8D', fontSize: 14, fontWeight: '500' },
  header: { backgroundColor: '#2ECC71', padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#E8F8F5', marginTop: 4 },
  realTimeContainer: { padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },
  realTimeCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  rtBox: { alignItems: 'center' },
  rtLabel: { fontSize: 12, color: '#7F8C8D', marginBottom: 4, fontWeight: '500' },
  rtValue: { fontSize: 18, fontWeight: 'bold' },
  selectorContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginVertical: 12 },
  btnSelector: { flex: 1, backgroundColor: '#EAECEE', paddingVertical: 10, mx: 4, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#D5D8DC' },
  btnText: { fontSize: 13, fontWeight: '600', color: '#5D6D7E' },
  btnTextActive: { color: '#FFFFFF' },
  btnActiveTemp: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  btnActiveHum: { backgroundColor: '#3498DB', borderColor: '#3498DB' },
  btnActiveLuz: { backgroundColor: '#F1C40F', borderColor: '#F1C40F' },
  chartContainer: { paddingHorizontal: 16, marginBottom: 30, alignItems: 'center' },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#34495E', marginBottom: 10, textAlign: 'center' },
  chartStyle: { borderRadius: 16, paddingRight: 10, paddingLeft: 8, marginVertical: 8, marginLeft: 18 },
  chartPlaceholder: { height: 240, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E8E8' },
  noData: { color: '#95A5A6', fontSize: 14, textAlign: 'center' },
  
  
});