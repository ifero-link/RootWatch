import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { COLORES, globalStyles } from '../styles/globalStyles';

export default function HistoryScreen() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metricaSeleccionada, setMetricaSeleccionada] = useState('temp');

  const cargarDatos = async () => {
    try {
      const data = await apiService.getHistorialMediciones();
      const datosOrdenados = data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setHistorial(datosOrdenados);
    } catch (error) {
      console.log("Error al cargar histórico:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={styles.loadingText}>Generando analíticas del Huerto...</Text>
      </View>
    );
  }

  const ultimaMedicion = historial.length > 0 ? historial[historial.length - 1] : null;
  const muestrasGrafico = historial.slice(-7);

  const labelsX = muestrasGrafico.map(item => {
    if (!item.fecha) return '';
    const d = new Date(item.fecha);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  let valoresY = [0];
  let tituloGrafico = "Temperatura";
  let sufijo = "°C";
  let colorGrafico = (opacity = 1) => `rgba(231, 76, 60, ${opacity})`;

  if (metricaSeleccionada === 'hum') {
    valoresY = muestrasGrafico.map(item => item.humedad || 0);
    tituloGrafico = "Humedad Ambiental";
    sufijo = "%";
    colorGrafico = (opacity = 1) => `rgba(52, 152, 219, ${opacity})`;
  } else if (metricaSeleccionada === 'luz') {
    valoresY = muestrasGrafico.map(item => item.luz || 0);
    tituloGrafico = "Nivel de Luminosidad";
    sufijo = "%";
    colorGrafico = (opacity = 1) => `rgba(241, 196, 15, ${opacity})`;
  } else {
    valoresY = muestrasGrafico.map(item => item.temperatura || 0);
  }

  const datosData = {
    labels: labelsX.length > 0 ? labelsX : ["Sin datos"],
    datasets: [{ data: valoresY.length > 0 ? valoresY : [0] }]
  };

  return (
    <ScrollView 
      style={globalStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORES.primario]} />}
    >
      <View style={styles.headerCustom}>
        <Text style={styles.headerTitleCustom}>Root Watch</Text>
        <Text style={styles.headerSubtitleCustom}>Histórico & Analítica Visual</Text>
      </View>

      <View style={styles.realTimeContainer}>
        <Text style={styles.sectionTitle}>
          <FontAwesome5 name="bullseye" size={14} color={COLORES.primario} /> Estado Actual (Último registro)
        </Text>
        {ultimaMedicion ? (
          <View style={globalStyles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={styles.rtBox}>
                <FontAwesome5 name="thermometer-half" size={16} color={COLORES.error} style={{ marginBottom: 4 }} />
                <Text style={styles.rtValue}>{ultimaMedicion.temperatura}°C</Text>
              </View>
              <View style={styles.rtBox}>
                <FontAwesome5 name="tint" size={16} color={COLORES.info} style={{ marginBottom: 4 }} />
                <Text style={styles.rtValue}>{ultimaMedicion.humedad}%</Text>
              </View>
              <View style={styles.rtBox}>
                <FontAwesome5 name="sun" size={16} color={COLORES.advertencia} style={{ marginBottom: 4 }} />
                <Text style={styles.rtValue}>{ultimaMedicion.luz}%</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>Esperando lecturas de sensores...</Text>
        )}
      </View>

      <View style={styles.selectorContainer}>
        <TouchableOpacity 
          style={[styles.btnSelector, metricaSeleccionada === 'temp' && { backgroundColor: COLORES.error, borderColor: COLORES.error }]}
          onPress={() => setMetricaSeleccionada('temp')}
        >
          <FontAwesome5 name="thermometer-half" size={12} color={metricaSeleccionada === 'temp' ? COLORES.blanco : COLORES.grisTexto} style={{ marginRight: 6 }} />
          <Text style={[styles.btnText, metricaSeleccionada === 'temp' && { color: COLORES.blanco }]}>Temp</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btnSelector, metricaSeleccionada === 'hum' && { backgroundColor: COLORES.info, borderColor: COLORES.info }]}
          onPress={() => setMetricaSeleccionada('hum')}
        >
          <FontAwesome5 name="tint" size={12} color={metricaSeleccionada === 'hum' ? COLORES.blanco : COLORES.grisTexto} style={{ marginRight: 6 }} />
          <Text style={[styles.btnText, metricaSeleccionada === 'hum' && { color: COLORES.blanco }]}>Humedad</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btnSelector, metricaSeleccionada === 'luz' && { backgroundColor: COLORES.advertencia, borderColor: COLORES.advertencia }]}
          onPress={() => setMetricaSeleccionada('luz')}
        >
          <FontAwesome5 name="sun" size={12} color={metricaSeleccionada === 'luz' ? COLORES.blanco : COLORES.grisTexto} style={{ marginRight: 6 }} />
          <Text style={[styles.btnText, metricaSeleccionada === 'luz' && { color: COLORES.blanco }]}>Luz</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolución de: {tituloGrafico}</Text>
        {historial.length > 0 ? (
          <LineChart
            data={datosData}
            width={Dimensions.get('window').width - 24} 
            height={230}
            yAxisSuffix={sufijo}
            chartConfig={{
              backgroundColor: COLORES.blanco,
              backgroundGradientFrom: COLORES.blanco,
              backgroundGradientTo: COLORES.blanco,
              decimalPlaces: 1,
              color: colorGrafico,
              labelColor: () => COLORES.grisTextoOscuro,
              style: { borderRadius: 15 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: COLORES.blanco },
              paddingRight: 20,
              paddingLeft: 10
            }}
            bezier 
            style={{ borderRadius: 15, marginVertical: 8 }}
          />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.noData}>No hay registros acumulados.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORES.grisTexto, fontSize: 14, fontWeight: '500' },
  headerCustom: { backgroundColor: COLORES.primario, padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 15 },
  headerTitleCustom: { fontSize: 26, fontWeight: 'bold', color: COLORES.blanco },
  headerSubtitleCustom: { fontSize: 14, color: COLORES.primarioClaro, marginTop: 4 },
  realTimeContainer: { paddingHorizontal: 20, marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORES.primarioOscuro, marginBottom: 12 },
  rtBox: { alignItems: 'center', flex: 1 },
  rtValue: { fontSize: 16, fontWeight: 'bold', color: COLORES.grisTextoOscuro, marginTop: 2 },
  selectorContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 12 },
  btnSelector: { flex: 1, backgroundColor: COLORES.blanco, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: COLORES.grisBorde, flexDirection: 'row' },
  btnText: { fontSize: 13, fontWeight: '600', color: COLORES.grisTexto },
  chartContainer: { paddingHorizontal: 20, marginBottom: 30 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: COLORES.primarioOscuro, marginBottom: 5 },
  chartPlaceholder: { height: 230, backgroundColor: COLORES.blanco, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORES.grisBorde },
  noData: { color: COLORES.grisTexto, fontSize: 14, textAlign: 'center' }
});