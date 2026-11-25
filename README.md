# 🚎 TransMilenio CCO - Plataforma de Monitoreo de Evasión, Pérdidas Económicas y Toma de Decisiones

> 🌐 **Aplicativo Web en Vivo:**  
> 👉 **[https://djkratos619.github.io/transmilenio-monitor/](https://djkratos619.github.io/transmilenio-monitor/)**

---

## 🎓 Información del Proyecto Académico

* **Institución:** ESEIT – Escuela Superior de Empresa, Ingeniería y Tecnología  
* **Asignatura:** Ejecución y Control de Proyectos  
* **Título del Proyecto:** *Evasión del pago de pasajes del sistema de transporte público de Bogotá*  
* **Integrantes:**  
  * **Josué David Ospino Ramírez**  
  * **David Fernando Pulido**  
* **Patrocinador:** Alcaldía Mayor de Bogotá  
* **Línea Base Oficial:** Cifras oficiales del **Concejo de Bogotá (2024)**  
  * **Tasa promedio de evasión:** `13.14%` (~89 millones de viajes no validados al año)  
  * **Pérdida diaria estimada:** `$719 Millones de COP / día` (~`$21.570 Millones COP / mes`)  
  * **Tarifa oficial de referencia:** `$3.200 COP`  

---

## 📖 Guía de Uso del Aplicativo en Línea

La plataforma funciona directamente desde cualquier navegador web (Google Chrome, Opera GX, Edge o dispositivos móviles) sin necesidad de instalar ningún software.

### 1. Navegación en Google Maps en Tiempo Real
* En el menú superior izquierdo del mapa encontrarás el selector **"Mapa Base"**, con las capas oficiales de **Google Maps**:
  * 🗺️ **Google Maps Híbrido (Satélite + Calles):** Fotografía satelital de alta resolución con nombres de avenidas, puentes y estaciones.
  * 🛣️ **Google Maps Calles (Vial):** Trazado urbano detallado de Bogotá.
  * 🚦 **Google Maps Tráfico:** Estado de congestión vehicular en tiempo real.
  * ⛰️ **Google Maps Terreno:** Topografía y cerros de la sabana.
  * 🌃 **Modo Oscuro CCO:** Mapa temático de alto contraste para centros de control.
* **Interacción:**
  * Arrastra con el ratón o pantalla táctil para desplazarte por la ciudad.
  * Usa la rueda del ratón o los botones **`+`** y **`−`** para acercarte o alejarte.
  * Usa los botones rápidos: **`📍 Bogotá Centro`**, **`🔴 P. Américas`**, **`🔴 Ricaurte`** y **`🟢 P. Norte`**.

---

### 2. Monitoreo de Estaciones y Semáforo de Riesgo
* Los nodos de las estaciones en el mapa se clasifican según su criticidad económica:
  * 🔴 **Estado Crítico (Aura pulsante roja):** Pérdidas superiores a \$1.000 Millones COP/mes o evasión superior al 20%.
  * 🟡 **Estado de Alerta (Aura ámbar):** Evasión intermedia o fallas mecánicas en puertas.
  * 🟢 **Operación Normal:** Operación en equilibrio financiero.
* **Flota de Buses en Vivo:** Visualización continua de biarticulados desplazándose entre estaciones en tiempo real.
* **Capas:** Activa o desactiva *Corredores Troncales*, *Rutas*, *Buses Vivos* o el *Mapa de Calor de Pérdidas*.

---

### 3. Evaluación de Factores y Toma de Decisiones Tácticas
1. Haz clic sobre cualquier estación en el mapa o en la lista del **Ranking**:
   * Se abrirá el **Inspector de Estación** con el desglose en dona de las causas de pérdida según el **Diagrama de Ishikawa (6M)**:
     * **Personas:** Pérdidas por colados y salto de torniquetes.
     * **Materiales:** Costos por vidrios rotos y puertas automáticas forzadas.
     * **Medio Ambiente:** Retrasos por congestión y bloqueos en horas pico.
     * **Máquinas:** Averías en validadores y torniquetes obsoletos.
2. **Ejecutar Intervenciones en 1 Clic:**
   * 🛡️ **Refuerzo de Inspectores y Policía:** Despliega personal de fiscalización (R6/R9), reduciendo la evasión en un 35% de inmediato.
   * 🚪 **Instalación de Torniquetes Piso-Techo y Barreras:** Repara la disponibilidad de puertas al 95% y disminuye daños por vandalismo.
   * 🔀 **Activar Rutas Alternas y Desvíos de Emergencia:** Traza sobre el mapa un desvío dinámico en cian neón (ej. desvío por NQS o Cra 10 ante bloqueos en la Caracas).

---

### 4. Simulador Estratégico "What-If"
En la pestaña **`🔮 Simulador`** del panel lateral:
* Ajusta los controles deslizantes de inversión:
  * Incremento de presencia policial / gestores (`0% a +100%`).
  * Renovación de torniquetes piso-techo y puertas blindadas (`0% a 100%`).
  * Optimización de frecuencias y desvíos inteligentes (`0% a +50%`).
* El simulador calcula en tiempo real:
  * **Ahorro Anual Proyectado ($ COP)**.
  * **Retorno de Inversión (ROI en meses)**.
  * **Porcentaje de reducción de evasión global**.
* Haz clic en **"Implementar Plan Estratégico en Vivo"** para aplicar los parámetros a toda la red de Bogotá.

---

### 5. Módulo Académico ESEIT y Descarga del Informe de Semana 8
En la pestaña **`🎓 ESEIT`** del panel lateral:
* Consulta la **Ficha Técnica Oficial** del proyecto y las cifras del Concejo de Bogotá.
* Explora la **Matriz de Riesgos Interactiva (R1 a R10)** con probabilidades, impactos ($P \times I$), prioridades y responsables.
* Haz clic en **`📥 Descargar Informe Semana 8 (Planificado vs. Ejecutado)`** para generar el documento formal requerido por la rúbrica de la universidad con:
  1. *Producto final entregable del alcance*.
  2. *Cumplimiento de tiempos (Gantt real vs. planificado)*.
  3. *Variaciones de costos y recursos*.
  4. *Riesgos materializados y gestión*.
  5. *Lecciones aprendidas a nivel del proyecto y del equipo*.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 Canvas & Web Mercator (EPSG:3857):** Motor de mapas vectorial fluido y sin dependencias pesadas.
* **Google Maps API Tiles:** Capas cartográficas satelitales, viales y de tráfico.
* **JavaScript Nativo (ES6+):** Motor de cálculo de pérdidas, simulación física de flota y gestión de estado reactivo.
* **CSS3 HUD:** Interfaz inspirada en centros de control de operaciones de transporte masivo.
* **GitHub Pages:** Despliegue continuo con alta disponibilidad y certificado SSL.

---

© 2025 **ESEIT** – *Josué David Ospino Ramírez & David Fernando Pulido*. Todos los derechos reservados.
