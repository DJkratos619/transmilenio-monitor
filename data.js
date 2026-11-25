// ==============================================================================
// SISTEMA DE MONITOREO Y GESTIÓN DE PÉRDIDAS - TRANSMILENIO BOGOTÁ
// PROYECTO ACADÉMICO: EJECUCIÓN Y CONTROL DE PROYECTOS - ESEIT
// Integrantes: Josué David Ospino Ramírez, David Fernando Pulido
// Basado en cifras oficiales del Concejo de Bogotá 2024 y Alcaldía Mayor
// ==============================================================================

const ESEIT_PROYECTO_INFO = {
    institucion: "ESEIT - Escuela Superior de Empresa, Ingeniería y Tecnología",
    asignatura: "Ejecución y Control de Proyectos",
    titulo: "Evasión del pago de pasajes del sistema de transporte público de Bogotá",
    integrantes: [
        "Josué David Ospino Ramírez",
        "David Fernando Pulido"
    ],
    fechaElaboracion: "09/04/2025",
    patrocinador: "Alcaldía Mayor de Bogotá",
    presupuestoReferencia: "3.000.000.000.000 COP (3 Billones COP)",
    cifrasOficialesConcejo2024: {
        tasaEvasionPromedio: 13.14, // % oficial del Concejo de Bogotá 2024
        viajesEvadidosAno: 89000000, // 89 millones de viajes no validados
        perdidaDiariaCOP: 719000000, // $719 millones COP / día
        perdidaMensualCOP: 21570000000, // ~$21.570 millones COP / mes
        tarifaPasajeCOP: 3200 // Tarifa Bogotá documentada en PESTEL
    },
    ishikawaDimensiones: {
        personas: "Falta de cultura ciudadana, desinterés en pagar pasaje, desconocimiento",
        procesos: "Insuficiencia en control de acceso, falta de sanciones efectivas",
        materiales: "Inexistencia de barreras físicas adecuadas, deficiencia en señalización",
        maquinas: "Tecnología obsoleta, fallas en torniquetes y sistemas de validación",
        medioAmbiente: "Horarios pico, desorden y congestión extrema en estaciones"
    },
    matrizRiesgos: [
        { id: "R1", categoria: "Técnico", desc: "Fallas en implementación del nuevo sistema de control de acceso (hardware o software)", prob: 3, imp: 4, score: 12, prioridad: "Alta", resp: "Depto. Tecnología", estrategia: "Mitigar", mitigacion: "Pruebas exhaustivas, contingencia, capacitación técnica." },
        { id: "R2", categoria: "Social", desc: "Resistencia al cambio por parte de usuarios dificultando adopción de campañas", prob: 4, imp: 4, score: 16, prioridad: "Muy Alta", resp: "Comunicaciones y Cultura Ciudadana", estrategia: "Mitigar", mitigacion: "Campañas persuasivas, líderes comunitarios, incentivos." },
        { id: "R3", categoria: "Financiero", desc: "Sobrecostos en adquisición de tecnología o en implementación de campañas", prob: 3, imp: 3, score: 9, prioridad: "Media", resp: "Depto. Financiero, Gerente", estrategia: "Mitigar", mitigacion: "Planificación presupuestaria, reservas de contingencia." },
        { id: "R4", categoria: "Legal", desc: "Desafíos legales relacionados con implementación de sanciones a evasores", prob: 2, imp: 4, score: 8, prioridad: "Media", resp: "Depto. Legal", estrategia: "Mitigar", mitigacion: "Consulta con expertos legales, protocolo normativo transparente." },
        { id: "R5", categoria: "Gestión", desc: "Retrasos en entrega de equipos o materiales por parte de proveedores", prob: 4, imp: 3, score: 12, prioridad: "Alta", resp: "Depto. Adquisiciones, Gerente", estrategia: "Mitigar", mitigacion: "Contratos con penalizaciones, seguimiento estricto, proveedores de respaldo." },
        { id: "R6", categoria: "Seguridad", desc: "Aumento de incidentes de seguridad al implementar controles más estrictos", prob: 3, imp: 3, score: 9, prioridad: "Media", resp: "Depto. Seguridad", estrategia: "Mitigar", mitigacion: "Mayor personal de seguridad, coordinación policial continua." },
        { id: "R7", categoria: "Ambiental", desc: "Impacto negativo de congestión durante implementación de obras", prob: 2, imp: 2, score: 4, prioridad: "Baja", resp: "Depto. Operaciones", estrategia: "Mitigar", mitigacion: "Obras nocturnas/valle, señalización y desvíos programados." },
        { id: "R8", categoria: "Político", desc: "Cambios en políticas de la administración distrital que afecten el apoyo", prob: 2, imp: 4, score: 8, prioridad: "Media", resp: "Gerente, Relaciones Institucionales", estrategia: "Mitigar", mitigacion: "Comunicación constante distrital, demostración de valor técnico." },
        { id: "R9", categoria: "Cultura Ciudadana", desc: "Ineficacia de las campañas de concientización para cambiar conductas", prob: 4, imp: 5, score: 20, prioridad: "Muy Alta", resp: "Cultura Ciudadana y Comunicaciones", estrategia: "Mitigar", mitigacion: "Enfoque en ciencias del comportamiento (BID), evaluación periódica." },
        { id: "R10", categoria: "Infraestructura", desc: "Deterioro acelerado de infraestructura existente durante mejoras", prob: 3, imp: 3, score: 9, prioridad: "Media", resp: "Depto. Operaciones", estrategia: "Mitigar", mitigacion: "Inspecciones frecuentes, mantenimiento preventivo programado." }
    ]
};

const TRONCALES_INFO = {
    'A': { nombre: 'Caracas Norte', color: '#1d4ed8', bgLight: '#dbeafe', codigo: 'A' },
    'B': { nombre: 'Autopista Norte', color: '#15803d', bgLight: '#dcfce7', codigo: 'B' },
    'C': { nombre: 'Suba', color: '#ca8a04', bgLight: '#fef9c3', codigo: 'C' },
    'D': { nombre: 'Calle 80', color: '#7e22ce', bgLight: '#f3e8ff', codigo: 'D' },
    'E': { nombre: 'NQS Central', color: '#a16207', bgLight: '#fef3c7', codigo: 'E' },
    'F': { nombre: 'Américas', color: '#dc2626', bgLight: '#fee2e2', codigo: 'F' },
    'G': { nombre: 'NQS Sur', color: '#ea580c', bgLight: '#ffedd5', codigo: 'G' },
    'H': { nombre: 'Caracas Sur', color: '#0369a1', bgLight: '#e0f2fe', codigo: 'H' },
    'J': { nombre: 'Eje Ambiental', color: '#be185d', bgLight: '#fce7f3', codigo: 'J' },
    'K': { nombre: 'Calle 26 / El Dorado', color: '#b45309', bgLight: '#fef3c7', codigo: 'K' },
    'L': { nombre: 'Carrera 10', color: '#0f766e', bgLight: '#ccfbf1', codigo: 'L' },
    'M': { nombre: 'Carrera 7', color: '#475569', bgLight: '#f1f5f9', codigo: 'M' }
};

// ==============================================================================
// ESTACIONES Y NODOS CALIBRADOS CON LAS CIFRAS OFICIALES DEL CONCEJO 2024
// Total de pérdidas mensuales alineadas con ~$21.570M COP / mes y 13.14% promedio
// ==============================================================================

const ESTACIONES_DATA = [
    // ---------------- TRONCAL F: AMÉRICAS ----------------
    {
        id: 'f-portal-americas',
        nombre: 'Portal Américas',
        troncal: 'F',
        coords: [4.6295, -74.1685],
        esPortal: true,
        pasajerosDia: 112000,
        perdidasMensuales: 1850000000,
        tasaEvasion: 23.5, // Evasión crítica sobre promedio
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 54,
        policiaActual: 8,
        policiaRequerida: 24,
        factores: {
            evasion: 1150000000, // Causa Ishikawa: Personas / Procesos
            vandalismo: 380000000, // Causa Ishikawa: Materiales (puertas)
            bloqueos: 220000000, // Causa Ishikawa: Medio Ambiente (horas pico)
            hurto: 70000000,
            fallasTecnicas: 30000000 // Causa Ishikawa: Máquinas (validadores)
        },
        descripcionFactores: 'Evasión masiva por acceso peatonal sur, forzamiento de puertas telescópicas en plataformas 1 y 2, y congestión severa en horas pico.',
        decisionesRecomendadas: [
            { id: 'pol-f-americas', tipo: 'seguridad', titulo: 'Refuerzo de 24 Inspectores y Policía (R6/R9)', impactoEsperado: '-35% evasión inmediata', costoEst: '$45M/mes', estado: 'pendiente' },
            { id: 'gate-f-americas', tipo: 'infraestructura', titulo: 'Instalación de Torniquetes Piso-Techo y Barreras (R10)', impactoEsperado: 'Blindaje perimetral 90%', costoEst: '$180M', estado: 'pendiente' },
            { id: 'route-f-americas', tipo: 'desvio', titulo: 'Activar Desvío Expreso Américas - NQS', impactoEsperado: 'Descongestión del 22%', costoEst: '$12M/op', estado: 'pendiente' }
        ],
        rutasAlternas: [
            { nombre: 'Desvío Américas por NQS Central', descripcion: 'Desviar flota F19 por enlace Av. Comuneros hacia NQS para mitigar cuello de botella en Banderas.' }
        ]
    },
    {
        id: 'f-banderas',
        nombre: 'Banderas',
        troncal: 'F',
        coords: [4.6415, -74.1360],
        esPortal: false,
        pasajerosDia: 88000,
        perdidasMensuales: 1620000000,
        tasaEvasion: 21.8,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 60,
        policiaActual: 6,
        policiaRequerida: 18,
        factores: {
            evasion: 1020000000,
            vandalismo: 340000000,
            bloqueos: 150000000,
            hurto: 80000000,
            fallasTecnicas: 30000000
        },
        descripcionFactores: 'Punto neurálgico de transbordo intermodal. Salto de torniquetes en puentes elevados y apertura manual de puertas correderas.',
        decisionesRecomendadas: [
            { id: 'pol-f-banderas', tipo: 'seguridad', titulo: 'Despliegue 12 Gestores de Convivencia y Cultura (R2/R9)', impactoEsperado: '-28% evasión', costoEst: '$28M/mes', estado: 'pendiente' },
            { id: 'door-f-banderas', tipo: 'infraestructura', titulo: 'Sustitución Puertas Anti-Apertura Forzada', impactoEsperado: 'Reducción daños 75%', costoEst: '$120M', estado: 'pendiente' }
        ],
        rutasAlternas: [
            { nombre: 'Bypass Operativo Mandalay - Pradera', descripcion: 'Servicios F23 y F28 realizan parada omitida si plataforma Banderas supera 95% de aforo.' }
        ]
    },
    {
        id: 'f-patio-bonito',
        nombre: 'Patio Bonito',
        troncal: 'F',
        coords: [4.6335, -74.1590],
        esPortal: false,
        pasajerosDia: 42000,
        perdidasMensuales: 980000000,
        tasaEvasion: 24.5,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 45,
        policiaActual: 3,
        policiaRequerida: 10,
        factores: {
            evasion: 670000000,
            vandalismo: 210000000,
            bloqueos: 60000000,
            hurto: 30000000,
            fallasTecnicas: 10000000
        },
        descripcionFactores: 'Alta intrusión cruzando la Avenida Ciudad de Cali hacia los vagones por falta de barreras perimetrales.',
        decisionesRecomendadas: [
            { id: 'fenc-f-patio', tipo: 'infraestructura', titulo: 'Cerramiento Perimetral con Malla Rígida Anticolados', impactoEsperado: '-60% ingresos irregulares', costoEst: '$85M', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },
    {
        id: 'f-mandalay',
        nombre: 'Mandalay',
        troncal: 'F',
        coords: [4.6425, -74.1290],
        esPortal: false,
        pasajerosDia: 25000,
        perdidasMensuales: 340000000,
        tasaEvasion: 11.2,
        estado: 'normal',
        nivelRiesgo: 'Bajo',
        puertasOperativas: 82,
        policiaActual: 2,
        policiaRequerida: 4,
        factores: {
            evasion: 220000000,
            vandalismo: 60000000,
            bloqueos: 30000000,
            hurto: 20000000,
            fallasTecnicas: 10000000
        },
        descripcionFactores: 'Estación con afluencia regular y tasa de evasión bajo el promedio del 13.14%.',
        decisionesRecomendadas: [],
        rutasAlternas: []
    },

    // ---------------- TRONCAL A: CARACAS NORTE ----------------
    {
        id: 'a-calle-72',
        nombre: 'Calle 72',
        troncal: 'A',
        coords: [4.6575, -74.0645],
        esPortal: false,
        pasajerosDia: 78000,
        perdidasMensuales: 1720000000,
        tasaEvasion: 19.8,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 48,
        policiaActual: 4,
        policiaRequerida: 16,
        factores: {
            evasion: 940000000,
            vandalismo: 410000000,
            bloqueos: 260000000,
            hurto: 85000000,
            fallasTecnicas: 25000000
        },
        descripcionFactores: 'Zona universitaria y financiera. Daños recurrentes por manifestaciones en puertas de vidrio y validadores.',
        decisionesRecomendadas: [
            { id: 'pol-a-72', tipo: 'seguridad', titulo: 'Control Policial Mixto en Pasarelas Norte y Sur', impactoEsperado: '-32% evasión', costoEst: '$32M/mes', estado: 'pendiente' },
            { id: 'bypass-a-72', tipo: 'desvio', titulo: 'Protocolo Desvío Caracas por Carrera 7 / Cra 13', impactoEsperado: 'Evitar parálisis por marchas', costoEst: '$15M/op', estado: 'pendiente' }
        ],
        rutasAlternas: [
            { nombre: 'Desvío Troncal por Carrera 10 / NQS', descripcion: 'Transferir biarticulados por Calle 80 hacia NQS si Caracas está bloqueada.' }
        ]
    },
    {
        id: 'a-calle-76',
        nombre: 'Calle 76',
        troncal: 'A',
        coords: [4.6625, -74.0620],
        esPortal: false,
        pasajerosDia: 74000,
        perdidasMensuales: 1480000000,
        tasaEvasion: 18.2,
        estado: 'critico',
        nivelRiesgo: 'Alto',
        puertasOperativas: 58,
        policiaActual: 4,
        policiaRequerida: 14,
        factores: {
            evasion: 890000000,
            vandalismo: 310000000,
            bloqueos: 190000000,
            hurto: 65000000,
            fallasTecnicas: 25000000
        },
        descripcionFactores: 'Intercambio con Autonorte y Calle 80. Congestión severa en torniquetes en horas pico.',
        decisionesRecomendadas: [
            { id: 'gate-a-76', tipo: 'infraestructura', titulo: 'Renovación Torniquetes Tipo Tambor Alto CBC', impactoEsperado: '-45% evasión en taquillas', costoEst: '$95M', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },
    {
        id: 'a-av-jimenez',
        nombre: 'Avenida Jiménez (Caracas)',
        troncal: 'A',
        coords: [4.6025, -74.0905],
        esPortal: false,
        pasajerosDia: 95000,
        perdidasMensuales: 1910000000,
        tasaEvasion: 22.4,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 40,
        policiaActual: 8,
        policiaRequerida: 26,
        factores: {
            evasion: 1180000000,
            vandalismo: 420000000,
            bloqueos: 180000000,
            hurto: 95000000,
            fallasTecnicas: 35000000
        },
        descripcionFactores: 'Mayor nodo de transbordo del centro histórico. Conecta Caracas, Américas y Eje Ambiental. Puertas forzadas y cosquilleo.',
        decisionesRecomendadas: [
            { id: 'pol-a-jimenez', tipo: 'seguridad', titulo: 'Comando Permanente Unificado Policía + Inspectores', impactoEsperado: '-50% delitos y colados', costoEst: '$60M/mes', estado: 'pendiente' },
            { id: 'doors-a-jimenez', tipo: 'infraestructura', titulo: 'Blindaje Total Puertas Automáticas Fase III', impactoEsperado: 'Reducción daños en 85%', costoEst: '$210M', estado: 'pendiente' }
        ],
        rutasAlternas: [
            { nombre: 'Conexión Bicentenario por Carrera 10', descripcion: 'Desviar pasajeros destino sur a Bicentenario para descongestionar Jiménez.' }
        ]
    },

    // ---------------- TRONCAL E: NQS CENTRAL ----------------
    {
        id: 'e-ricaurte',
        nombre: 'Ricaurte (NQS / Américas)',
        troncal: 'E',
        coords: [4.6070, -74.0980],
        esPortal: false,
        pasajerosDia: 105000,
        perdidasMensuales: 1980000000,
        tasaEvasion: 21.6,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 52,
        policiaActual: 8,
        policiaRequerida: 28,
        factores: {
            evasion: 1240000000,
            vandalismo: 440000000,
            bloqueos: 160000000,
            hurto: 100000000,
            fallasTecnicas: 40000000
        },
        descripcionFactores: 'El túnel peatonal más transitado del sistema. Informalidad, salto masivo de torniquetes y puntos ciegos.',
        decisionesRecomendadas: [
            { id: 'pol-e-ricaurte', tipo: 'seguridad', titulo: 'Patrullaje Permanente en Túnel de Conexión NQS-Américas', impactoEsperado: '-45% delitos e informalidad', costoEst: '$50M/mes', estado: 'pendiente' },
            { id: 'cam-e-ricaurte', tipo: 'tecnologia', titulo: 'Cámaras IA con Detección de Aglomeraciones y Evasión', impactoEsperado: 'Alertas en tiempo real CCO', costoEst: '$75M', estado: 'pendiente' }
        ],
        rutasAlternas: [
            { nombre: 'Transbordo Alterno Paloquemao - Comuneros', descripcion: 'Sugerir transbordo en Paloquemao para aliviar el túnel central de Ricaurte.' }
        ]
    },

    // ---------------- TRONCAL H: CARACAS SUR (TUNAL / USME) ----------------
    {
        id: 'h-portal-tunal',
        nombre: 'Portal Tunal',
        troncal: 'H',
        coords: [4.5710, -74.1360],
        esPortal: true,
        pasajerosDia: 85000,
        perdidasMensuales: 1680000000,
        tasaEvasion: 22.0,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 50,
        policiaActual: 6,
        policiaRequerida: 22,
        factores: {
            evasion: 1080000000,
            vandalismo: 360000000,
            bloqueos: 140000000,
            hurto: 65000000,
            fallasTecnicas: 35000000
        },
        descripcionFactores: 'Articulación con TransMiCable hacia Ciudad Bolívar. Evasión en transbordo peatonal y torniquetes sobrepasados.',
        decisionesRecomendadas: [
            { id: 'pol-h-tunal', tipo: 'seguridad', titulo: 'Dispositivo Mixto Policía + Gestores en Enlace Cable', impactoEsperado: '-40% evasión en transbordo', costoEst: '$42M/mes', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },
    {
        id: 'h-portal-usme',
        nombre: 'Portal Usme',
        troncal: 'H',
        coords: [4.5360, -74.1170],
        esPortal: true,
        pasajerosDia: 76000,
        perdidasMensuales: 1530000000,
        tasaEvasion: 23.1,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 46,
        policiaActual: 5,
        policiaRequerida: 18,
        factores: {
            evasion: 1010000000,
            vandalismo: 310000000,
            bloqueos: 135000000,
            hurto: 45000000,
            fallasTecnicas: 30000000
        },
        descripcionFactores: 'Extremo sur de Bogotá. Bloqueos frecuentes en acceso a la vía al Llano y calzadas exclusivas sin cerramiento.',
        decisionesRecomendadas: [
            { id: 'pol-h-usme', tipo: 'seguridad', titulo: 'Control Estratégico en Bahías Alimentadoras', impactoEsperado: '-35% evasión', costoEst: '$34M/mes', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },

    // ---------------- TRONCAL C: SUBA ----------------
    {
        id: 'c-portal-suba',
        nombre: 'Portal Suba',
        troncal: 'C',
        coords: [4.7480, -74.0945],
        esPortal: true,
        pasajerosDia: 102000,
        perdidasMensuales: 1590000000,
        tasaEvasion: 18.5,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 58,
        policiaActual: 6,
        policiaRequerida: 20,
        factores: {
            evasion: 990000000,
            vandalismo: 320000000,
            bloqueos: 170000000,
            hurto: 75000000,
            fallasTecnicas: 35000000
        },
        descripcionFactores: 'Aglomeración masiva en alimentadores barriales. Evasión por plataformas abiertas.',
        decisionesRecomendadas: [
            { id: 'pol-c-suba', tipo: 'seguridad', titulo: 'Operativo Especial Evasión en Plataforma 2', impactoEsperado: '-38% colados en horas pico', costoEst: '$36M/mes', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },

    // ---------------- TRONCAL G: NQS SUR ----------------
    {
        id: 'g-portal-sur',
        nombre: 'Portal Sur (JFK)',
        troncal: 'G',
        coords: [4.5960, -74.1680],
        esPortal: true,
        pasajerosDia: 92000,
        perdidasMensuales: 1540000000,
        tasaEvasion: 19.6,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 60,
        policiaActual: 8,
        policiaRequerida: 22,
        factores: {
            evasion: 980000000,
            vandalismo: 330000000,
            bloqueos: 140000000,
            hurto: 60000000,
            fallasTecnicas: 30000000
        },
        descripcionFactores: 'Recepción del flujo masivo de Soacha y alimentadores de Bosa y Perdomo.',
        decisionesRecomendadas: [
            { id: 'pol-g-sur', tipo: 'seguridad', titulo: 'Comando Móvil en Enlace Soacha - Bogotá', impactoEsperado: '-35% evasión perimetral', costoEst: '$40M/mes', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },

    // ---------------- TRONCAL B: AUTOPISTA NORTE ----------------
    {
        id: 'b-portal-norte',
        nombre: 'Portal Norte',
        troncal: 'B',
        coords: [4.7550, -74.0450],
        esPortal: true,
        pasajerosDia: 118000,
        perdidasMensuales: 1420000000,
        tasaEvasion: 14.2,
        estado: 'alerta',
        nivelRiesgo: 'Medio',
        puertasOperativas: 75,
        policiaActual: 8,
        policiaRequerida: 20,
        factores: {
            evasion: 890000000,
            vandalismo: 280000000,
            bloqueos: 150000000,
            hurto: 70000000,
            fallasTecnicas: 30000000
        },
        descripcionFactores: 'Pasajeros de la Sabana Norte (Chía, Zipaquirá). Evasión focalizada en bahías intermunicipales.',
        decisionesRecomendadas: [
            { id: 'gate-b-norte', tipo: 'infraestructura', titulo: 'Control Integrado en Bahía Intermunicipal', impactoEsperado: '-40% evasión en transbordo', costoEst: '$110M', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },

    // ---------------- TRONCAL D: CALLE 80 ----------------
    {
        id: 'd-portal-80',
        nombre: 'Portal 80',
        troncal: 'D',
        coords: [4.7095, -74.1130],
        esPortal: true,
        pasajerosDia: 98000,
        perdidasMensuales: 1470000000,
        tasaEvasion: 16.5,
        estado: 'alerta',
        nivelRiesgo: 'Alto',
        puertasOperativas: 64,
        policiaActual: 6,
        policiaRequerida: 18,
        factores: {
            evasion: 910000000,
            vandalismo: 290000000,
            bloqueos: 160000000,
            hurto: 75000000,
            fallasTecnicas: 35000000
        },
        descripcionFactores: 'Entrada del occidente de Cundinamarca. Sobrecarga en taquillas en hora pico matutina.',
        decisionesRecomendadas: [],
        rutasAlternas: []
    },

    // ---------------- TRONCAL K: CALLE 26 / EL DORADO ----------------
    {
        id: 'k-portal-eldorado',
        nombre: 'Portal Eldorado',
        troncal: 'K',
        coords: [4.6850, -74.1370],
        esPortal: true,
        pasajerosDia: 96000,
        perdidasMensuales: 1150000000,
        tasaEvasion: 12.0, // Bajo el promedio del 13.14%
        estado: 'normal',
        nivelRiesgo: 'Bajo',
        puertasOperativas: 82,
        policiaActual: 8,
        policiaRequerida: 16,
        factores: {
            evasion: 710000000,
            vandalismo: 220000000,
            bloqueos: 110000000,
            hurto: 80000000,
            fallasTecnicas: 30000000
        },
        descripcionFactores: 'Conexión con el Aeropuerto Internacional. Infraestructura más moderna y menor tasa de evasión.',
        decisionesRecomendadas: [],
        rutasAlternas: []
    },

    // ---------------- TRONCAL L: CARRERA 10 ----------------
    {
        id: 'l-san-victorino',
        nombre: 'San Victorino (Neos Moda)',
        troncal: 'L',
        coords: [4.6000, -74.0770],
        esPortal: false,
        pasajerosDia: 62000,
        perdidasMensuales: 1390000000,
        tasaEvasion: 20.5,
        estado: 'critico',
        nivelRiesgo: 'Muy Alto',
        puertasOperativas: 52,
        policiaActual: 5,
        policiaRequerida: 18,
        factores: {
            evasion: 880000000,
            vandalismo: 280000000,
            bloqueos: 110000000,
            hurto: 85000000,
            fallasTecnicas: 35000000
        },
        descripcionFactores: 'Comercio mayorista del Madrugón. Densidad extrema, comercio informal y saltos reiterados.',
        decisionesRecomendadas: [
            { id: 'pol-l-victorino', tipo: 'seguridad', titulo: 'Operativo Permanente de Seguridad Comercial', impactoEsperado: '-45% colados y delitos', costoEst: '$48M/mes', estado: 'pendiente' }
        ],
        rutasAlternas: []
    },
    {
        id: 'l-portal-20-julio',
        nombre: 'Portal 20 de Julio',
        troncal: 'L',
        coords: [4.5660, -74.0930],
        esPortal: true,
        pasajerosDia: 79000,
        perdidasMensuales: 1280000000,
        tasaEvasion: 16.8,
        estado: 'alerta',
        nivelRiesgo: 'Alto',
        puertasOperativas: 68,
        policiaActual: 6,
        policiaRequerida: 16,
        factores: {
            evasion: 820000000,
            vandalismo: 260000000,
            bloqueos: 110000000,
            hurto: 60000000,
            fallasTecnicas: 30000000
        },
        descripcionFactores: 'Demanda del suroriente. Fallas mecánicas recurrentes en puertas de acceso.',
        decisionesRecomendadas: [],
        rutasAlternas: []
    }
];

// Red de Corredores Troncales
const CORREDORES_TRONCALES = [
    {
        codigo: 'Caracas-Norte',
        troncal: 'A',
        color: '#1d4ed8',
        ancho: 4,
        coordenadas: [
            [4.6672, -74.0592],
            [4.6625, -74.0620],
            [4.6575, -74.0645],
            [4.6360, -74.0745],
            [4.6025, -74.0905]
        ]
    },
    {
        codigo: 'Autopista-Norte',
        troncal: 'B',
        color: '#15803d',
        ancho: 4,
        coordenadas: [
            [4.7550, -74.0450],
            [4.6672, -74.0592]
        ]
    },
    {
        codigo: 'Suba',
        troncal: 'C',
        color: '#ca8a04',
        ancho: 4,
        coordenadas: [
            [4.7480, -74.0945],
            [4.6672, -74.0592]
        ]
    },
    {
        codigo: 'Calle-80',
        troncal: 'D',
        color: '#7e22ce',
        ancho: 4,
        coordenadas: [
            [4.7095, -74.1130],
            [4.6672, -74.0592]
        ]
    },
    {
        codigo: 'Americas',
        troncal: 'F',
        color: '#dc2626',
        ancho: 4,
        coordenadas: [
            [4.6295, -74.1685],
            [4.6335, -74.1590],
            [4.6415, -74.1360],
            [4.6425, -74.1290],
            [4.6070, -74.0980],
            [4.6025, -74.0905]
        ]
    },
    {
        codigo: 'NQS-Central-Sur',
        troncal: 'E',
        color: '#ea580c',
        ancho: 4,
        coordenadas: [
            [4.6672, -74.0592],
            [4.6070, -74.0980],
            [4.5960, -74.1680]
        ]
    },
    {
        codigo: 'Calle-26-Eldorado',
        troncal: 'K',
        color: '#b45309',
        ancho: 4,
        coordenadas: [
            [4.6850, -74.1370],
            [4.6025, -74.0905]
        ]
    },
    {
        codigo: 'Caracas-Sur',
        troncal: 'H',
        color: '#0369a1',
        ancho: 4,
        coordenadas: [
            [4.6025, -74.0905],
            [4.5710, -74.1360],
            [4.5360, -74.1170]
        ]
    },
    {
        codigo: 'Carrera-10',
        troncal: 'L',
        color: '#0f766e',
        ancho: 4,
        coordenadas: [
            [4.6025, -74.0905],
            [4.6000, -74.0770],
            [4.5660, -74.0930]
        ]
    }
];

// Rutas Operativas y Desvíos
const RUTAS_SISTEMA = [
    {
        id: 'ruta-f19',
        nombre: 'F19 / B19',
        origen: 'Portal Norte',
        destino: 'Portal Américas',
        color: '#dc2626',
        frecuenciaMin: 4,
        flotaAsignada: 28,
        paradasIds: ['b-portal-norte', 'a-calle-72', 'a-av-jimenez', 'f-banderas', 'f-portal-americas'],
        desvíoAlterno: {
            activo: false,
            nombre: 'Desvío Expreso Américas - NQS',
            razon: 'Afectación en Calle 72',
            enlace: 'Bypass por NQS Central evitando nudo Caracas',
            coordenadas: [
                [4.7550, -74.0450],
                [4.6070, -74.0980],
                [4.6415, -74.1360],
                [4.6295, -74.1685]
            ]
        }
    },
    {
        id: 'ruta-h27',
        nombre: 'H27 / B27',
        origen: 'Portal Norte',
        destino: 'Portal Tunal',
        color: '#0369a1',
        frecuenciaMin: 5,
        flotaAsignada: 24,
        paradasIds: ['b-portal-norte', 'a-calle-76', 'a-av-jimenez', 'h-portal-tunal'],
        desvíoAlterno: {
            activo: false,
            nombre: 'Desvío Caracas Sur por Carrera 10',
            razon: 'Saturación en Av. Jiménez',
            enlace: 'Desvío por San Victorino y Portal 20 de Julio',
            coordenadas: [
                [4.6625, -74.0620],
                [4.6000, -74.0770],
                [4.5660, -74.0930],
                [4.5710, -74.1360]
            ]
        }
    },
    {
        id: 'ruta-k10',
        nombre: 'K10 / L10',
        origen: 'Portal Eldorado',
        destino: 'Portal 20 de Julio',
        color: '#0f766e',
        frecuenciaMin: 6,
        flotaAsignada: 18,
        paradasIds: ['k-portal-eldorado', 'a-av-jimenez', 'l-san-victorino', 'l-portal-20-julio'],
        desvíoAlterno: {
            activo: false,
            nombre: 'Desvío K10 por Américas',
            razon: 'Mantenimiento Calle 26 Centro Memoria',
            enlace: 'Enlace por Carrera 30 hacia Comuneros',
            coordenadas: [
                [4.6850, -74.1370],
                [4.6070, -74.0980],
                [4.5660, -74.0930]
            ]
        }
    }
];

const CONFIG_SISTEMA = {
    tarifaPasajeCOP: 3200, // Tarifa oficial documentada en PESTEL ESEIT
    cifrasConcejo2024: ESEIT_PROYECTO_INFO.cifrasOficialesConcejo2024,
    centroBogota: [4.6482, -74.0900],
    zoomInicial: 12.3
};
