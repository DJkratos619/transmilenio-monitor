// ==============================================================================
// MOTOR GEOESPACIAL WEB MERCATOR CON MAPA REAL EN LÍNEA - TRANSMILENIO BOGOTÁ
// Integración con Mapas Reales (CartoDB Dark, Satélite Esri, OpenStreetMap)
// ==============================================================================

// Polyfill de seguridad para roundRect en canvas
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (!r) r = 0;
        if (typeof r === 'number') r = [r, r, r, r];
        this.beginPath();
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
        this.lineTo(x + r[3], y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
        this.lineTo(x, y + r[0]);
        this.quadraticCurveTo(x, y, x + r[0], y);
        this.closePath();
        return this;
    };
}

class TransMilenioMap {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = options;
        this.onStationSelected = options.onStationSelected || (() => {});

        // Estado del lienzo
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);

        // Proveedores de Mapas Reales en Línea (Con Google Maps Oficial y Cero API Key requerida)
        this.providers = {
            'google-hybrid': {
                nombre: 'Google Maps Híbrido (Satélite + Calles)',
                url: (z, x, y) => `https://mt${(x + y) % 4}.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`,
                overlayAlpha: 0.12,
                invert: false
            },
            'google-roadmap': {
                nombre: 'Google Maps Calles (Estándar)',
                url: (z, x, y) => `https://mt${(x + y) % 4}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`,
                overlayAlpha: 0.04,
                invert: false
            },
            'google-traffic': {
                nombre: 'Google Maps Tráfico en Vivo',
                url: (z, x, y) => `https://mt${(x + y) % 4}.google.com/vt/lyrs=m,traffic&x=${x}&y=${y}&z=${z}`,
                overlayAlpha: 0.04,
                invert: false
            },
            'google-terrain': {
                nombre: 'Google Maps Terreno & Relieve',
                url: (z, x, y) => `https://mt${(x + y) % 4}.google.com/vt/lyrs=p&x=${x}&y=${y}&z=${z}`,
                overlayAlpha: 0.08,
                invert: false
            },
            'esri-dark': {
                nombre: 'Modo Oscuro CCO (Esri Dark Canvas)',
                url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
                overlayAlpha: 0.08,
                invert: false
            },
            'radar': {
                nombre: 'Esquema CCO (Sintético / Offline)',
                url: null,
                overlayAlpha: 0,
                invert: false
            }
        };

        this.currentProvider = 'google-hybrid';
        this.tileCache = new Map();

        // Parámetros geográficos de Bogotá en Web Mercator
        // Coordenadas centrales de Bogotá (Calle 26 con NQS aprox)
        this.centerLat = 4.6482;
        this.centerLng = -74.0900;
        this.zoom = 12.3; // Nivel de zoom de inicio
        this.minZoom = 10.5;
        this.maxZoom = 17.5;

        // Arrastre e interacción
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.startCenterLat = 0;
        this.startCenterLng = 0;

        // Modos y toggles
        this.activeMetricMode = 'perdidas';
        this.activeFilter = 'todos';
        this.showCorridors = true;
        this.showRoutes = true;
        this.showBuses = true;
        this.showHeatmap = false;

        // Control de velocidad y física de simulación
        this.simSpeedMultiplier = 1.0;
        this.baseSpeed = 0.000030; // Velocidad geográfica calibrada para realismo

        this.hoveredStation = null;
        this.mousePos = { x: 0, y: 0 };

        this.initBuses();
        this.initCanvasSize();
        this.initEvents();
        this.startRenderLoop();
    }

    initCanvasSize() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || (window.innerWidth - 440) || 800;
        this.height = rect.height || (window.innerHeight - 85) || 600;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.floor(this.width * dpr);
        this.canvas.height = Math.floor(this.height * dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
    }

    // ==========================================================================
    // MATEMÁTICAS WEB MERCATOR (EPSG:3857) EXACTAS
    // ==========================================================================
    latLngToWorld(lat, lng) {
        const x = ((lng + 180) / 360) * 256;
        const sinLat = Math.sin(lat * Math.PI / 180);
        const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
        const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * 256;
        return { x, y };
    }

    worldToLatLng(x, y) {
        const lng = (x / 256) * 360 - 180;
        const n = Math.PI - 2 * Math.PI * (y / 256);
        const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        return { lat, lng };
    }

    project(lat, lng) {
        const centerWorld = this.latLngToWorld(this.centerLat, this.centerLng);
        const pointWorld = this.latLngToWorld(lat, lng);
        const scale = Math.pow(2, this.zoom);

        const screenX = (this.width / 2) + (pointWorld.x - centerWorld.x) * scale;
        const screenY = (this.height / 2) + (pointWorld.y - centerWorld.y) * scale;
        return { x: screenX, y: screenY };
    }

    unproject(screenX, screenY) {
        const centerWorld = this.latLngToWorld(this.centerLat, this.centerLng);
        const scale = Math.pow(2, this.zoom);

        const worldX = centerWorld.x + (screenX - (this.width / 2)) / scale;
        const worldY = centerWorld.y + (screenY - (this.height / 2)) / scale;
        return this.worldToLatLng(worldX, worldY);
    }

    // ==========================================================================
    // GESTIÓN DE TILES Y MAPA REAL EN LÍNEA
    // ==========================================================================
    setMapProvider(providerKey) {
        if (this.providers[providerKey]) {
            this.currentProvider = providerKey;
            this.tileCache.clear(); // Limpiar tiles anteriores de inmediato
        }
    }

    getTile(url) {
        if (this.tileCache.has(url)) {
            return this.tileCache.get(url);
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        const record = { img, loaded: false, error: false };

        img.onload = () => {
            record.loaded = true;
        };
        img.onerror = () => {
            record.error = true;
        };

        // Cache con límite de memoria LRU
        if (this.tileCache.size > 400) {
            const firstKey = this.tileCache.keys().next().value;
            this.tileCache.delete(firstKey);
        }

        this.tileCache.set(url, record);
        return record;
    }

    drawRealMapTiles(ctx) {
        const provider = this.providers[this.currentProvider];
        if (!provider || !provider.url) return;

        const tileZoom = Math.max(1, Math.floor(this.zoom));
        const scaleRatio = Math.pow(2, this.zoom - tileZoom);
        const tileSizeScreen = 256 * scaleRatio;

        const numTiles = Math.pow(2, tileZoom);
        const centerWorld = this.latLngToWorld(this.centerLat, this.centerLng);
        const centerTileX = (centerWorld.x / 256) * numTiles;
        const centerTileY = (centerWorld.y / 256) * numTiles;

        // Calcular rango de tiles visibles en la ventana actual
        const halfTilesW = (this.width / tileSizeScreen) / 2;
        const halfTilesH = (this.height / tileSizeScreen) / 2;

        const minTileX = Math.floor(centerTileX - halfTilesW) - 1;
        const maxTileX = Math.ceil(centerTileX + halfTilesW) + 1;
        const minTileY = Math.floor(centerTileY - halfTilesH) - 1;
        const maxTileY = Math.ceil(centerTileY + halfTilesH) + 1;

        ctx.save();
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            for (let ty = minTileY; ty <= maxTileY; ty++) {
                if (ty < 0 || ty >= numTiles) continue;

                const wrappedX = ((tx % numTiles) + numTiles) % numTiles;
                const tileUrl = provider.url(tileZoom, wrappedX, ty);
                const tile = this.getTile(tileUrl);

                const screenX = (this.width / 2) + (tx - centerTileX) * tileSizeScreen;
                const screenY = (this.height / 2) + (ty - centerTileY) * tileSizeScreen;

                if (tile && tile.loaded) {
                    ctx.drawImage(tile.img, screenX, screenY, tileSizeScreen, tileSizeScreen);
                } else {
                    // Fallback mientras descarga: cuadrícula oscura
                    ctx.fillStyle = '#090d16';
                    ctx.fillRect(screenX, screenY, tileSizeScreen, tileSizeScreen);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
                    ctx.strokeRect(screenX, screenY, tileSizeScreen, tileSizeScreen);
                }
            }
        }

        // Velo sutil opcional para realzar los corredores y buses brillantes
        if (provider.overlayAlpha > 0) {
            ctx.fillStyle = `rgba(7, 10, 18, ${provider.overlayAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.restore();
    }

    // ==========================================================================
    // INTERACCIÓN Y EVENTOS
    // ==========================================================================
    initEvents() {
        window.addEventListener('resize', () => this.initCanvasSize());

        // Arrastre con el ratón (Pan fluido)
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.startCenterLat = this.centerLat;
            this.startCenterLng = this.centerLng;
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            if (this.isDragging) {
                const dx = e.clientX - this.dragStartX;
                const dy = e.clientY - this.dragStartY;

                const scale = Math.pow(2, this.zoom);
                const centerWorld = this.latLngToWorld(this.startCenterLat, this.startCenterLng);

                const newWorldX = centerWorld.x - (dx / scale);
                const newWorldY = centerWorld.y - (dy / scale);

                const newLatLng = this.worldToLatLng(newWorldX, newWorldY);
                this.centerLat = Math.max(4.45, Math.min(4.85, newLatLng.lat));
                this.centerLng = Math.max(-74.30, Math.min(-73.95, newLatLng.lng));
            } else {
                this.checkHover(this.mousePos.x, this.mousePos.y);
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Zoom suave con rueda de ratón centrado en el cursor
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const mouseBefore = this.unproject(this.mousePos.x, this.mousePos.y);
            const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + zoomDelta));

            this.zoom = newZoom;

            // Recalcular centro para que el punto bajo el ratón permanezca estable
            const mouseAfter = this.unproject(this.mousePos.x, this.mousePos.y);
            this.centerLat += (mouseBefore.lat - mouseAfter.lat);
            this.centerLng += (mouseBefore.lng - mouseAfter.lng);
        }, { passive: false });

        // Clic para abrir modal
        this.canvas.addEventListener('click', () => {
            if (this.hoveredStation) {
                this.onStationSelected(this.hoveredStation);
            }
        });
    }

    checkHover(mx, my) {
        let found = null;
        for (const st of ESTACIONES_DATA) {
            if (this.activeFilter !== 'todos') {
                if (['critico', 'alerta', 'normal'].includes(this.activeFilter)) {
                    if (st.estado !== this.activeFilter) continue;
                } else if (st.troncal !== this.activeFilter) {
                    continue;
                }
            }

            const pt = this.project(st.coords[0], st.coords[1]);
            const dist = Math.hypot(pt.x - mx, pt.y - my);
            const radius = 16;

            if (dist <= radius) {
                found = st;
                break;
            }
        }
        this.hoveredStation = found;
        this.canvas.style.cursor = found ? 'pointer' : (this.isDragging ? 'grabbing' : 'grab');
    }

    zoomIn() {
        this.zoom = Math.min(this.maxZoom, this.zoom + 0.5);
    }

    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom - 0.5);
    }

    flyToBogota() {
        this.centerLat = 4.6482;
        this.centerLng = -74.0900;
        this.zoom = 12.3;
    }

    flyToHub(lat, lng, zoomLevel = 14.5) {
        this.centerLat = lat;
        this.centerLng = lng;
        this.zoom = zoomLevel;
    }

    highlightStation(stationId) {
        const st = ESTACIONES_DATA.find(e => e.id === stationId);
        if (!st) return;
        this.centerLat = st.coords[0];
        this.centerLng = st.coords[1];
        this.zoom = 14.8;
    }

    setFilter(filterValue) { this.activeFilter = filterValue; }
    setLayerMode(mode) { this.activeMetricMode = mode; }
    toggleCorridors(show) { this.showCorridors = show; }
    toggleRoutes(show) { this.showRoutes = show; }
    toggleBuses(show) { this.showBuses = show; }
    toggleHeatmap(show) { this.showHeatmap = show; }

    setSimSpeed(multiplier) {
        this.simSpeedMultiplier = Math.max(0, multiplier);
    }

    initBuses() {
        this.buses = [];
        RUTAS_SISTEMA.forEach(ruta => {
            const waypoints = (ruta.desvíoAlterno && ruta.desvíoAlterno.activo && ruta.desvíoAlterno.coordenadas)
                ? ruta.desvíoAlterno.coordenadas
                : (ruta.trayectoriaGPS || []);

            if (waypoints.length < 2) return;

            // Precomputar distancias geográficas reales de cada tramo
            const segments = [];
            let totalDist = 0;
            for (let i = 0; i < waypoints.length - 1; i++) {
                const p1 = waypoints[i];
                const p2 = waypoints[i + 1];
                const dLat = p2[0] - p1[0];
                const dLng = (p2[1] - p1[1]) * Math.cos((p1[0] * Math.PI) / 180);
                const dist = Math.hypot(dLat, dLng) || 0.0001;
                segments.push({
                    p1,
                    p2,
                    dist,
                    startDist: totalDist
                });
                totalDist += dist;
            }

            // Estaciones oficiales asignadas a esta ruta para dwell time
            const rutaStops = (ruta.paradasIds || [])
                .map(id => ESTACIONES_DATA.find(e => e.id === id))
                .filter(Boolean);

            // Generar 2 buses escalonados en sentidos opuestos o distanciados
            const numBuses = 2;
            for (let b = 0; b < numBuses; b++) {
                const initFraction = (b / numBuses) + 0.12;
                const targetDist = (initFraction % 1.0) * totalDist;

                let segIdx = 0;
                let segProg = 0;
                for (let s = 0; s < segments.length; s++) {
                    const seg = segments[s];
                    if (targetDist >= seg.startDist && targetDist <= seg.startDist + seg.dist) {
                        segIdx = s;
                        segProg = (targetDist - seg.startDist) / seg.dist;
                        break;
                    }
                }

                const seg = segments[segIdx] || segments[0];
                const curLat = seg.p1[0] + (seg.p2[0] - seg.p1[0]) * segProg;
                const curLng = seg.p1[1] + (seg.p2[1] - seg.p1[1]) * segProg;

                this.buses.push({
                    id: `BUS-${ruta.id}-${b + 1}`,
                    rutaId: ruta.id,
                    codigo: ruta.nombre.split('/')[0].trim(),
                    origen: ruta.origen,
                    destinoFinal: ruta.destino,
                    destino: b % 2 === 0 ? ruta.destino : ruta.origen,
                    color: ruta.color,
                    waypoints,
                    segments,
                    totalDist,
                    rutaStops,
                    segIdx,
                    segProgress: segProg,
                    direction: b % 2 === 0 ? 1 : -1,
                    lat: curLat,
                    lng: curLng,
                    heading: 0,
                    dwellTimer: 0,
                    lastStopId: null,
                    status: 'En tránsito',
                    paxCount: Math.floor(120 + Math.random() * 110)
                });
            }
        });
    }

    getBusesTelemetry() {
        return this.buses.map(b => ({
            id: b.id,
            codigo: b.codigo,
            destino: b.destino,
            color: b.color,
            lat: b.lat,
            lng: b.lng,
            status: b.status,
            dwellTimer: b.dwellTimer,
            paxCount: b.paxCount
        }));
    }

    // ==========================================================================
    // RENDERIZADO PRINCIPAL
    // ==========================================================================
    startRenderLoop() {
        const tick = () => {
            this.render();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const now = Date.now();

        // 1. Dibujar mapa base real en línea (o cuadrícula si es radar)
        if (this.currentProvider !== 'radar') {
            this.drawRealMapTiles(ctx);
        } else {
            ctx.fillStyle = '#070a12';
            ctx.fillRect(0, 0, w, h);
            this.drawGridFallback(ctx, w, h);
        }

        // 2. Mapa de Calor (Heatmap)
        if (this.showHeatmap) {
            this.drawHeatmap(ctx);
        }

        // 3. Corredores Troncales
        if (this.showCorridors) {
            this.drawCorredores(ctx);
        }

        // 4. Rutas y Desvíos Alternos
        if (this.showRoutes) {
            this.drawRutasYDesvios(ctx, now);
        }

        // 5. Buses en Tiempo Real
        if (this.showBuses) {
            this.updateAndDrawBuses(ctx);
        }

        // 6. Estaciones y Semáforo de Riesgo
        this.drawEstaciones(ctx, now);

        // 7. Tooltip en Hover
        if (this.hoveredStation) {
            this.drawStationTooltip(ctx, this.hoveredStation);
        }
    }

    drawGridFallback(ctx, w, h) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    drawHeatmap(ctx) {
        ctx.save();
        ESTACIONES_DATA.forEach(st => {
            const pt = this.project(st.coords[0], st.coords[1]);
            const radius = (st.perdidasMensuales / 1000000) * 0.04 * Math.pow(1.3, this.zoom - 12);
            if (radius <= 0) return;

            const grad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, radius);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
            grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.25)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    drawCorredores(ctx) {
        ctx.save();
        CORREDORES_TRONCALES.forEach(corredor => {
            if (corredor.coordenadas.length < 2) return;
            const pts = corredor.coordenadas.map(c => this.project(c[0], c[1]));

            // Resplandor exterior (Glow)
            ctx.strokeStyle = corredor.color;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            // Línea principal
            ctx.globalAlpha = 0.95;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
        });
        ctx.restore();
    }

    drawRutasYDesvios(ctx, now) {
        ctx.save();
        RUTAS_SISTEMA.forEach(ruta => {
            if (ruta.desvíoAlterno && ruta.desvíoAlterno.activo && ruta.desvíoAlterno.coordenadas) {
                const pts = ruta.desvíoAlterno.coordenadas.map(c => this.project(c[0], c[1]));
                if (pts.length > 1) {
                    ctx.save();
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 5;
                    ctx.setLineDash([14, 8]);
                    ctx.lineDashOffset = -(now / 35) % 22;
                    ctx.shadowColor = '#38bdf8';
                    ctx.shadowBlur = 14;

                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                    ctx.stroke();
                    ctx.restore();

                    // Etiqueta de ruta alterna activa
                    const midPt = pts[Math.floor(pts.length / 2)];
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 11px Inter, sans-serif';
                    ctx.fillText(`🔀 ${ruta.desvíoAlterno.nombre}`, midPt.x + 10, midPt.y - 10);
                }
            }
        });
        ctx.restore();
    }

    updateAndDrawBuses(ctx) {
        ctx.save();
        const speedMult = this.simSpeedMultiplier;

        this.buses.forEach(bus => {
            if (!bus.segments || bus.segments.length === 0) return;

            // 1. FÍSICA Y CINEMÁTICA DE MOVIMIENTO
            if (speedMult > 0) {
                if (bus.dwellTimer > 0) {
                    // Bus detenido en plataforma por abordaje
                    bus.dwellTimer -= speedMult;
                    bus.status = 'Abordando en plataforma';
                } else {
                    bus.status = 'En tránsito';
                    const curSeg = bus.segments[bus.segIdx];
                    const distPerFrame = this.baseSpeed * speedMult;
                    const deltaProg = distPerFrame / (curSeg.dist || 0.001);

                    bus.segProgress += deltaProg * bus.direction;

                    // Manejo de final de segmento y cabeceras
                    if (bus.direction === 1) {
                        if (bus.segProgress >= 1.0) {
                            bus.segProgress = 0;
                            bus.segIdx++;
                            if (bus.segIdx >= bus.segments.length) {
                                // Llegó a terminal: retorno y pausa de cabecera
                                bus.direction = -1;
                                bus.segIdx = bus.segments.length - 1;
                                bus.segProgress = 1.0;
                                bus.dwellTimer = 110;
                                bus.destino = bus.destino === bus.destinoFinal ? bus.origen : bus.destinoFinal;
                            }
                        }
                    } else {
                        if (bus.segProgress <= 0.0) {
                            bus.segProgress = 1.0;
                            bus.segIdx--;
                            if (bus.segIdx < 0) {
                                // Llegó a cabecera opuesta
                                bus.direction = 1;
                                bus.segIdx = 0;
                                bus.segProgress = 0.0;
                                bus.dwellTimer = 110;
                                bus.destino = bus.destino === bus.origen ? bus.destinoFinal : bus.origen;
                            }
                        }
                    }

                    // Recalcular posición exacta en carretera
                    const activeSeg = bus.segments[bus.segIdx];
                    if (activeSeg) {
                        bus.lat = activeSeg.p1[0] + (activeSeg.p2[0] - activeSeg.p1[0]) * bus.segProgress;
                        bus.lng = activeSeg.p1[1] + (activeSeg.p2[1] - activeSeg.p1[1]) * bus.segProgress;

                        // Comprobar si arriba a una estación de su ruta para hacer parada
                        for (const stop of bus.rutaStops) {
                            const dLat = Math.abs(bus.lat - stop.coords[0]);
                            const dLng = Math.abs(bus.lng - stop.coords[1]);
                            if (dLat < 0.0016 && dLng < 0.0016) {
                                if (bus.lastStopId !== stop.id) {
                                    bus.lastStopId = stop.id;
                                    bus.dwellTimer = 75; // ~1.2s de parada
                                    bus.status = `Abordando en ${stop.nombre}`;
                                    // Variación realista de pasajeros
                                    bus.paxCount = Math.max(50, Math.min(250, bus.paxCount + Math.floor(Math.random() * 30 - 14)));
                                    break;
                                }
                            } else if (bus.lastStopId === stop.id && (dLat > 0.003 || dLng > 0.003)) {
                                bus.lastStopId = null;
                            }
                        }
                    }
                }
            }

            // 2. CÁLCULO DE PROYECCIÓN Y ORIENTACIÓN EN PANTALLA
            const pt = this.project(bus.lat, bus.lng);
            if (pt.x < -60 || pt.x > this.width + 60 || pt.y < -60 || pt.y > this.height + 60) return;

            const activeSeg = bus.segments[bus.segIdx];
            if (!activeSeg) return;

            const pt1 = this.project(activeSeg.p1[0], activeSeg.p1[1]);
            const pt2 = this.project(activeSeg.p2[0], activeSeg.p2[1]);
            const targetAngle = Math.atan2((pt2.y - pt1.y) * bus.direction, (pt2.x - pt1.x) * bus.direction);
            bus.heading = targetAngle;

            // 3. RENDERIZADO DETALLADO DEL BUS BIARTICULADO TRANSMILENIO
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(bus.heading);

            // Haz de luz delantera proyectada sobre el pavimento
            const lightGrad = ctx.createRadialGradient(16, 0, 2, 42, 0, 26);
            lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
            lightGrad.addColorStop(0.7, 'rgba(254, 240, 138, 0.15)');
            lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.moveTo(14, -4);
            ctx.lineTo(44, -13);
            ctx.lineTo(44, 13);
            ctx.lineTo(14, 4);
            ctx.closePath();
            ctx.fill();

            // Halo pulsante si está abordando en estación
            if (bus.dwellTimer > 0) {
                ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 22, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Sombra realista proyectada
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;

            // Coche Trasero (Rojo TM)
            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(-20, -6, 16, 12, [3, 0, 0, 3]);
            ctx.fill();
            ctx.stroke();

            // Ventanas coche trasero
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-18, -5, 11, 2);
            ctx.fillRect(-18, 3, 11, 2);

            // Fuelle de articulación (acordeón negro)
            ctx.fillStyle = '#020617';
            ctx.fillRect(-4, -5.5, 4, 11);
            ctx.strokeStyle = '#475569';
            ctx.strokeRect(-4, -5.5, 4, 11);

            // Coche Delantero (Rojo TM)
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.roundRect(0, -6, 18, 12, [0, 4, 4, 0]);
            ctx.fill();
            ctx.stroke();

            // Ventanas coche delantero
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(2, -5, 10, 2);
            ctx.fillRect(2, 3, 10, 2);

            // Parabrisas Delantero
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(13, -4.5, 3.5, 9);

            // Rutero LED Frontal Amarillo
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(16.5, -3.5, 1.5, 7);

            // Chapa en el techo con código de ruta legible
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#0b1120';
            ctx.beginPath();
            ctx.roundRect(-8, -5, 16, 10, 2);
            ctx.fill();
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bus.codigo, 0, 0.5);

            ctx.restore();
        });
        ctx.restore();
    }

    drawEstaciones(ctx, now) {
        ctx.save();

        ESTACIONES_DATA.forEach(st => {
            if (this.activeFilter !== 'todos') {
                if (['critico', 'alerta', 'normal'].includes(this.activeFilter)) {
                    if (st.estado !== this.activeFilter) return;
                } else if (st.troncal !== this.activeFilter) {
                    return;
                }
            }

            const pt = this.project(st.coords[0], st.coords[1]);

            // No dibujar fuera de pantalla
            if (pt.x < -30 || pt.x > this.width + 30 || pt.y < -30 || pt.y > this.height + 30) {
                return;
            }

            let color = '#10b981';
            if (st.estado === 'critico') color = '#ef4444';
            else if (st.estado === 'alerta') color = '#f59e0b';

            let radius = 7;
            if (this.activeMetricMode === 'perdidas') {
                radius = 6 + (st.perdidasMensuales / 2000000000) * 10;
            } else if (this.activeMetricMode === 'evasion') {
                radius = 5 + (st.tasaEvasion / 30) * 10;
                color = st.tasaEvasion > 22 ? '#ef4444' : (st.tasaEvasion > 16 ? '#f59e0b' : '#10b981');
            }

            // Radar pulsante para puntos críticos y alerta
            if (st.estado === 'critico' || st.estado === 'alerta') {
                const pulsePeriod = st.estado === 'critico' ? 1400 : 2200;
                const phase = (now % pulsePeriod) / pulsePeriod;
                const haloRadius = radius + phase * 22;
                const haloAlpha = (1 - phase) * 0.75;

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = haloAlpha;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, haloRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Núcleo de la estación
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 6;

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Estrella si es portal
            if (st.esPortal) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', pt.x, pt.y);
            }

            // Nombre visible si zoom >= 13 o si es portal o crítica
            if (this.zoom >= 13.2 || st.esPortal || (this.zoom >= 12.0 && st.estado === 'critico')) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 6;
                ctx.fillText(st.nombre, pt.x + radius + 5, pt.y);
            }
        });

        ctx.restore();
    }

    drawStationTooltip(ctx, st) {
        const pt = this.project(st.coords[0], st.coords[1]);
        const troncalInfo = TRONCALES_INFO[st.troncal] || { nombre: st.troncal, color: '#3b82f6' };

        const tw = 220;
        const th = 85;
        const tx = Math.min(this.width - tw - 15, Math.max(15, pt.x - tw / 2));
        const ty = Math.max(15, pt.y - th - 20);

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(st.nombre, tx + 10, ty + 8);

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Troncal: ${troncalInfo.nombre}`, tx + 10, ty + 26);

        const formatM = (v) => '$' + (v / 1000000).toFixed(0) + 'M COP/mes';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillStyle = '#f87171';
        ctx.fillText(`Pérdidas: ${formatM(st.perdidasMensuales)}`, tx + 10, ty + 42);

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Tasa Evasión: ${st.tasaEvasion}% • Puertas: ${st.puertasOperativas}%`, tx + 10, ty + 58);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('⚡ Click para evaluar y tomar decisiones', tx + 10, ty + 72);

        ctx.restore();
    }
}
