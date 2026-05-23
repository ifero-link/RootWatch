// src/services/api.js
import { API_IP } from '../../config';
const BASE_URL = `http://${API_IP}:8080/api/mediciones`; 

export const apiService = {
  // GET /api/mediciones/ultima
  getUltimaMedicion: async () => {
    try {
      const response = await fetch(`${BASE_URL}/ultima`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error al obtener la última medición:", error);
      throw error;
    }
  },

  // GET /api/mediciones/all
  getHistorialMediciones: async () => {
    try {
      // 🔥 CORREGIDO: Añadimos /all al final para coincidir con el cambio de Java
      const response = await fetch(`${BASE_URL}/all`); 
      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error al obtener el historial:", error);
      throw error;
    }
  }
};