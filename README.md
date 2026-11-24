# 🚎 TransMilenio CCO - Monitor de Estaciones, Pérdidas Económicas y Toma de Decisiones

Sistema web interactivo y geoespacial diseñado para el monitoreo en tiempo real del estado de las estaciones y rutas troncales de **TransMilenio** en Bogotá D.C. El aplicativo permite identificar qué estaciones presentan mayores pérdidas económicas, analizar los factores que las originan (evasión masiva, vandalismo, bloqueos, hurtos, fallas técnicas) y habilitar herramientas tácticas para la **toma de decisiones operativas**, tales como despliegue de seguridad policial, adecuación de infraestructura y activación de **rutas alternas y desvíos**.

---

## 🌟 Características Principales

### 1. Mapa Geoespacial Interactivo (Bogotá D.C.)
- **Cartografía Oficial TransMilenio**: Visualización de los corredores troncales clave:
  - **Troncal A / H**: Caracas Norte y Caracas Sur (Héroes, Calle 72, Marly, Av. Jiménez, Tercer Milenio, Portal Tunal, Portal Usme).
  - **Troncal B**: Autopista Norte (Portal Norte, Toberín, Calle 100, Virrey).
  - **Troncal C**: Suba (Portal Suba, 21 Ángeles, Suba Av. Boyacá).
  - **Troncal D**: Calle 80 (Portal 80, Minuto de Dios, Escuela Militar).
  - **Troncal E / G**: NQS Central y Sur (Ricaurte, CAD, Comuneros, Santa Isabel, General Santander, Portal Sur).
  - **Troncal F**: Américas (Portal Américas, Patio Bonito, Banderas, Mandalay, Distrito Grafiti).
  - **Troncal K**: Calle 26 / El Dorado (Portal Eldorado, Corferias, Salitre El Greco).
  - **Troncal L**: Carrera 10 (San Victorino, Portal 20 de Julio).
  - **Troncal J**: Eje Ambiental (Las Aguas, Museo del Oro).
- **Semáforo Operativo y Pulso Tipo Radar**:
  - 🔴 **Crítico**: Pérdidas superiores a $1.000 Millones COP/mes o riesgo inminente (halo pulsante rojo).
  - 🟡 **Alerta**: Pérdidas intermedias o afectaciones moderadas.
  - 🟢 **Normal**: Operación dentro de parámetros regulares.
- **Rutas Troncales y Buses en Tiempo Real**: Animación continua de flota articulada desplazándose entre paradas en tiempo real.
- **Modos de Métrica**: Alterna entre visualización de *Pérdidas Económicas ($ COP)*, *Estado Operativo* y *Tasa de Evasión (%)*.
- **Mapa de Calor (Heatmap)**: Capa de concentración de pérdidas monetarias por cuadrante.

### 2. Diagnóstico y Factores de Pérdida Económica
Cada estación cuenta con un modelo financiero desglosado en 5 factores determinantes:
1. **Evasión de Pago ("Colados")**: Salto de torniquetes y apertura forzada de puertas de vagón.
2. **Vandalismo y Daños Físicos**: Rotura de vidrios templados, actuadores de puertas automáticas y validadores de tarjetas Tullave.
3. **Bloqueos y Parálisis Operativa**: Horas de flota inmovilizada, retrasos acumulados y viajes perdidos.
4. **Hurtos e Impacto en la Demanda**: Deserción de pasajeros por percepción de inseguridad.
5. **Fallas Técnicas y Mantenimiento**: Defectos en torniquetes y subestaciones eléctricas.

### 3. Centro de Toma de Decisiones e Intervenciones
El operador puede pulsar sobre cualquier estación crítica o en alerta para abrir el **Inspector de Decisiones** y ejecutar acciones inmediatas con 1 clic:
- 🛡️ **Plan Choque Policial + Gestores de Convivencia**: Incrementa la presencia policial activa, reduciendo de inmediato la evasión entre un 30% y 40%.
- 🚪 **Renovación con Torniquetes Piso a Techo CBC y Puertas Blindadas**: Restaura la operatividad de puertas al 95% y disminuye daños por vandalismo en más del 60%.
- 🔀 **Activación de Desvíos y Rutas Alternas**: Si un corredor colapsa por manifestaciones o saturación (ej. Caracas en Calle 72), se activa dinámicamente un trazado alterno que se proyecta en el mapa en color cian neón con animación de flujo continuo.
- 🚌 **Inyección de Flota de Reserva (Biarticulados)**: Descongestiona plataformas saturadas y balancea la carga de pasajeros.

### 4. Simulador Estratégico "What-If"
Permite a los directivos y analistas de movilidad simular escenarios de inversión:
- Aumentar presencia policial (0% a +100%).
- Cobertura de puertas anti-evasión (0% a 100%).
- Optimización de frecuencias y rutas alternas (0% a +50%).
- Cálculo dinámico de **Ahorro Anual Proyectado ($ COP)**, **Retorno de Inversión (ROI en meses)** y **Reducción de Evasión Global**.

### 5. Auditoría Operativa y Exportación
- **Bitácora CCO**: Registro cronológico de todas las intervenciones ejecutadas durante el turno de control.
- **Exportar Informe**: Descarga instantánea de un informe ejecutivo en JSON con KPIs consolidados, balance de pérdidas y auditoría de decisiones.

---

## 🚀 Cómo Ejecutar la Aplicación

No requiere instalaciones complejas de Node.js ni Python. La aplicación está construida con tecnologías web modernas estándar (HTML5, Tailwind CSS, Leaflet.js, Chart.js).

### Opción 1: Con el Servidor Local en PowerShell (Recomendado)
Abre PowerShell y ejecuta:
```powershell
cd C:\Users\josue\.gemini\antigravity\scratch\transmilenio-monitor
.\start-server.ps1
```
El script iniciará el servidor en `http://localhost:8080/` y abrirá automáticamente tu navegador (Microsoft Edge / Chrome).

### Opción 2: Abrir directamente en el navegador
Puedes hacer doble clic en el archivo `index.html` o abrirlo en tu navegador favorito:
```powershell
Start-Process "C:\Users\josue\.gemini\antigravity\scratch\transmilenio-monitor\index.html"
```

---

## 📁 Estructura del Proyecto

```text
transmilenio-monitor/
├── index.html          # Interfaz principal, HUD de mando, KPIs y modal de decisiones
├── styles.css          # Estilos HUD dark mode, radar pings, animaciones de rutas y buses
├── data.js             # Base geoespacial de estaciones, troncales, rutas y factores de pérdida
├── map.js              # Motor Leaflet: marcadores, polilíneas troncales, buses y desvíos
├── app.js              # Lógica de simulación, Chart.js, motor de decisiones y bitácora
├── start-server.ps1    # Servidor HTTP ligero nativo en PowerShell
└── README.md           # Documentación completa del proyecto
```

---

## 📊 Principales Estaciones Evaluadas

| Estación | Troncal | Pérdida Mensual | Tasa Evasión | Factor Crítico Principal | Decisión Táctica Sugerida |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Portal Américas** | F | $1.850M COP | 26.8% | Evasión masiva y vandalismo | Plan Choque Policial + Desvío por NQS |
| **Banderas** | F | $1.620M COP | 24.2% | Salto torniquetes transbordo | Gestores + Puertas anti-forzado |
| **Avenida Jiménez** | A / J | $1.910M COP | 25.4% | Hurto, puertas forzadas | Comando unificado + Blindaje Fase III |
| **Ricaurte** | E / F | $1.980M COP | 24.8% | Túnel peatonal y colados | Patrullaje túnel + Cámaras IA |
| **Calle 72** | A | $1.720M COP | 23.5% | Marchas y vandalismo de puertas | Desvío por Cra 7ma / Cra 13 |
| **Portal Tunal** | H | $1.680M COP | 25.1% | Transbordo TransMiCable | Dispositivo perimetral + Barreras CBC |
| **Portal Suba** | C | $1.590M COP | 21.5% | Aglomeración alimentadores | Operativo evasión + Refuerzo C15 |
| **San Victorino** | L | $1.390M COP | 23.8% | Madrugón y comercio informal | Intervención comercial + Desvío peatonal |
