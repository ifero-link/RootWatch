import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { globalStyles, COLORES } from '../styles/globalStyles';

export default function HomeScreen() {
  const [medicion, setMedicion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    consultarApi();
    const temporizador = setInterval(() => {
      consultarApi();
    }, 10000);
    return () => clearInterval(temporizador);
  }, []);

  return (
    <ScrollView 
      style={globalStyles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => { setRefreshing(true); consultarApi(); }} 
          colors={[COLORES.primario]} 
        />
      }
    >
      {/* Encabezado */}
      <View style={styles.headerBanner}>
        <Text style={styles.bannerTitle}>SmartHuerto IoT</Text>
        <Text style={styles.bannerSubtitle}>Estado de salud en tiempo real</Text>
      </View>

      {/* Estado del sistema */}
      <View style={[globalStyles.card, { marginHorizontal: 20, marginBottom: 10 }]}>
        <Text style={styles.cardTitle}>
          <FontAwesome5 name="info-circle" color={COLORES.primario} /> Estado del Sistema
        </Text>
        <Text style={{ color: COLORES.primario, fontWeight: '600', marginTop: 8 }}>
          📡 Dispositivo Arduino R4 WiFi Online
        </Text>
      </View>

      {/* Grid de Sensores */}
      <View style={styles.gridContainer}>
        {[
          { icon: 'thermometer-half', color: COLORES.error, label: 'Temperatura', value: `${medicion?.temperatura ?? '--'} °C` },
          { icon: 'cloud', color: COLORES.info, label: 'Humedad Aire', value: `${medicion?.humedad ?? '--'} %` },
          { icon: 'tint', color: COLORES.info, label: 'Humedad Suelo', value: `${medicion?.humedadSuelo ?? '--'} %` },
          { icon: 'sun', color: COLORES.advertencia, label: 'Luminosidad', value: `${medicion?.luz ?? '--'} %` },
        ].map((item, index) => (
          <View key={index} style={[globalStyles.card, styles.gridItem]}>
            <FontAwesome5 name={item.icon} size={32} color={item.color} />
            <Text style={styles.gridLabel}>{item.label}</Text>
            <Text style={styles.gridValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Tarjeta de Recomendación*/}
      <View style={[globalStyles.card, { marginHorizontal: 20, marginTop: 5, padding: 20, marginBottom: 40 }]}>
        <Text style={styles.cardTitle}>
          <FontAwesome5 name="leaf" color={COLORES.primario} /> Recomendación del Día
        </Text>
        
        <Text style={{ color: COLORES.grisTexto, marginTop: 12, lineHeight: 22 }}>
          {(() => {
            if (!medicion) return "Cargando datos...";

            let mensajes = [];

            // Evaluamos cada condición y añadimos el texto específico que elegiste
            if (medicion.humedadSuelo < 30) {
              mensajes.push("El nivel de humedad del suelo está bajo. Se recomienda activar el sistema de riego automático pronto para evitar daños en las raíces.");
            }
            if (medicion.temperatura > 35) {
              mensajes.push("Se ha detectado una temperatura elevada. Asegura que tu huerto tenga buena ventilación para evitar el estrés térmico en las plantas.");
            }
            if (medicion.luz < 20) {
              mensajes.push("La luminosidad es insuficiente. Considera mover la maceta a un lugar con mayor exposición solar para favorecer la fotosíntesis.");
            }
            if (medicion.humedad < 40) {
              mensajes.push("El aire está algo seco. Un poco de pulverización de agua en las hojas ayudará a mantener la frescura de tu huerto.");
            }

            // Si hay mensajes, los unimos con un salto de línea; si no, el mensaje de optimismo
            return mensajes.length > 0 
              ? mensajes.join('\n\n') 
              : "Los niveles ambientales son óptimos. Tu huerto está en excelente estado, continúa con el monitoreo regular.";
          })()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerBanner: { 
    backgroundColor: COLORES.primarioOscuro, 
    padding: 30, 
    paddingTop: 60, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    marginBottom: 20 
  },
  bannerTitle: { fontSize: 30, fontWeight: 'bold', color: COLORES.blanco },
  bannerSubtitle: { fontSize: 14, color: COLORES.primarioClaro, marginTop: 4 },
  
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORES.grisTextoOscuro },
  
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    marginTop: 10
  },
  gridItem: { 
    width: '47%', 
    alignItems: 'center', 
    paddingVertical: 35, 
    marginBottom: 15,
    elevation: 3, 
    borderRadius: 20 
  },
  gridLabel: { 
    fontSize: 14, 
    color: COLORES.grisTexto, 
    marginTop: 12,
    fontWeight: '500'
  },
  gridValue: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: COLORES.primarioOscuro, 
    marginTop: 8 
  }
});