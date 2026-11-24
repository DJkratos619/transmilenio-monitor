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

        // Proveedores de Mapas Reales en Línea 100% Gratuitos (CERO API KEY requerida)
        this.providers = {
            'esri-dark': {
                nombre: 'Esri Dark Canvas (Modo Noche)',
                url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
                overlayAlpha: 0.08,
                invert: false
            },
            'satellite': {
                nombre: 'Satélite Real (Esri World Imagery)',
                url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
                overlayAlpha: 0.20,
                invert: false
            },
            'esri-streets': {
                nombre: 'Esri Calles y Avenidas de Bogotá',
                url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
                overlayAlpha: 0.05,
                invert: false
            },
            'osm': {
                nombre: 'OpenStreetMap Oficial',
                url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
                overlayAlpha: 0.05,
                invert: false
            },
            'esri-topo': {
                nombre: 'Esri Topográfico & Relieve',
                url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
                overlayAlpha: 0.10,
                invert: false
            },
            'radar': {
                nombre: 'Esquema CCO (Sintético / Offline)',
                url: null,
                overlayAlpha: 0,
                invert: false
            }
        };

        this.currentProvider = 'esri-dark';
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

    initBuses() {
        this.buses = [];
        RUTAS_SISTEMA.forEach(ruta => {
            const stops = ruta.paradasIds
                .map(id => ESTACIONES_DATA.find(e => e.id === id))
                .filter(Boolean);

            if (stops.length < 2) return;

            for (let i = 0; i < 2; i++) {
                this.buses.push({
                    rutaId: ruta.id,
                    nombre: ruta.nombre.split('/')[0],
                    color: ruta.color,
                    stops: stops,
                    segmentIdx: (i * 2) % (stops.length - 1),
                    progress: i * 0.45,
                    direction: 1,
                    speed: 0.003 + Math.random() * 0.002
                });
            }
        });
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
        this.buses.forEach(bus => {
            bus.progress += bus.speed;
            if (bus.progress >= 1.0) {
                bus.progress = 0;
                bus.segmentIdx += bus.direction;

                if (bus.segmentIdx >= bus.stops.length - 1) {
                    bus.direction = -1;
                    bus.segmentIdx = bus.stops.length - 2;
                } else if (bus.segmentIdx < 0) {
                    bus.direction = 1;
                    bus.segmentIdx = 0;
                }
            }

            const fromSt = bus.stops[bus.segmentIdx];
            const toSt = bus.stops[bus.segmentIdx + 1];
            if (!fromSt || !toSt) return;

            const lat = fromSt.coords[0] + (toSt.coords[0] - fromSt.coords[0]) * bus.progress;
            const lng = fromSt.coords[1] + (toSt.coords[1] - fromSt.coords[1]) * bus.progress;

            const pt = this.project(lat, lng);

            ctx.fillStyle = bus.color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 8;

            const bw = 26;
            const bh = 14;

            ctx.beginPath();
            ctx.roundRect(pt.x - bw / 2, pt.y - bh / 2, bw, bh, 3);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bus.nombre, pt.x, pt.y);
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
