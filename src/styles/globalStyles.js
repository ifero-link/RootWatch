// src/styles/globalStyles.js
import { StyleSheet } from 'react-native';

export const COLORES = {
  primario: '#2D6A4F',       // Verde corporativo principal
  primarioOscuro: '#1B4332', // Verde bosque profundo (Títulos, cabeceras)
  primarioClaro: '#D8F3DC',  // Verde pastel (Bordes de inputs, chips)
  primarioFondo: '#E8F5E9',  // Fondo sutil para chips seleccionados
  fondoApp: '#F8FAF5',       // Blanco roto/verdoso muy limpio
  blanco: '#FFFFFF',
  grisTexto: '#7F8C8D',      // Gris para subtítulos y fechas
  grisTextoOscuro: '#2C3E50',// Gris oscuro neutro para textos de formularios
  grisBorde: '#E2E8F0',      // Bordes sutiles y separadores
  error: '#E74C3C',          // Rojo (Alertas, borrar, frío, temperatura)
  info: '#2980B9',           // Azul (Humedad, agua)
  advertencia: '#F39C12',    // Amarillo/Naranja (Luz, avisos)
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.fondoApp,
  },
  scrollContainer: {
    padding: 20,
  },
  listContainer: {
    padding: 20,
  },
  headerBox: {
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORES.primarioOscuro,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORES.grisTexto,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORES.blanco,
    padding: 16,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORES.grisBorde,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardExpandida: {
    borderColor: COLORES.primario,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.primario,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORES.primarioClaro,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 5,
    color: COLORES.grisTextoOscuro,
    backgroundColor: COLORES.blanco,
  },
  btnPrimario: {
    backgroundColor: COLORES.primario,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnPrimarioText: {
    color: COLORES.blanco,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 30,
    backgroundColor: COLORES.primario,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 1000,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginBottom: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSeleccionado: {
    backgroundColor: COLORES.primario,
    borderColor: COLORES.primario,
  },
  chipText: {
    color: COLORES.primario,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSeleccionado: {
    color: COLORES.blanco,
  },
  sensorTelemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF7',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  telemetryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  telemetryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  telemetryId: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  telemetryValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  telemetryStatus: {
    fontSize: 11,
    color: '#718096',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORES.blanco,
    padding: 25,
    borderRadius: 20,
    maxHeight: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
    zIndex: 10,
  }
});