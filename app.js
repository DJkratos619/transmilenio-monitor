// ==============================================================================
// SISTEMA DE MONITOREO Y TOMA DE DECISIONES - TRANSMILENIO BOGOTÁ
// 100% Autónomo con Gráficos Nativos en Canvas y Cero Dependencias
// ==============================================================================

class TransMilenioApp {
    constructor() {
        this.estaciones = JSON.parse(JSON.stringify(ESTACIONES_DATA));
        this.rutas = JSON.parse(JSON.stringify(RUTAS_SISTEMA));
        this.selectedStation = null;
        this.decisionesEjecutadas = [];
        this.simSpeed = 1;
        this.isSimRunning = true;
        this.simTickCount = 0;

        // Inicializar mapa geoespacial nativo
        this.tmMap = new TransMilenioMap('map-container', {
            onStationSelected: (station) => this.openStationModal(station.id)
        });

        this.initDOM();
        this.updateKPIs();
        this.renderRankings();
        this.renderDecisionesList();
        this.renderRutasCards();
        this.renderNativeCharts();
        this.renderEseitRiskMatrix();
        this.initEventListeners();
        this.startLiveSimulation();
    }

    initDOM() {
        // Llenar select de Troncales
        const troncalSelect = document.getElementById('filter-troncal');
        if (troncalSelect) {
            troncalSelect.innerHTML = '<option value="todos">Todas las Troncales</option>';
            Object.entries(TRONCALES_INFO).forEach(([key, val]) => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = `Troncal ${key} - ${val.nombre}`;
                troncalSelect.appendChild(opt);
            });
        }
    }

    formatCOP(valor) {
        if (valor >= 1000000000) {
            return '$' + (valor / 1000000000).toFixed(2) + ' Mil Millones COP';
        }
        if (valor >= 1000000) {
            return '$' + (valor / 1000000).toFixed(0) + ' Millones COP';
        }
        return '$' + valor.toLocaleString('es-CO') + ' COP';
    }

    formatCOPShort(valor) {
        return '$' + (valor / 1000000).toFixed(1) + 'M';
    }

    updateKPIs() {
        let totalPerdidas = 0;
        let totalEvasionCOP = 0;
        let totalVandalismoCOP = 0;
        let sumaTasas = 0;
        let countCriticas = 0;
        let countAlerta = 0;

        this.estaciones.forEach(st => {
            totalPerdidas += st.perdidasMensuales;
            totalEvasionCOP += st.factores.evasion;
            totalVandalismoCOP += st.factores.vandalismo;
            sumaTasas += st.tasaEvasion;
            if (st.estado === 'critico') countCriticas++;
            if (st.estado === 'alerta') countAlerta++;
        });

        const tasaPromedio = (sumaTasas / this.estaciones.length).toFixed(1);
        const rutasDesviadas = this.rutas.filter(r => r.desvíoAlterno && r.desvíoAlterno.activo).length;

        const elPerdida = document.getElementById('kpi-perdida-total');
        if (elPerdida) elPerdida.textContent = this.formatCOP(totalPerdidas);

        const elEvasion = document.getElementById('kpi-tasa-evasion');
        if (elEvasion) elEvasion.textContent = `${tasaPromedio}%`;

        const elCrit = document.getElementById('kpi-criticas-count');
        if (elCrit) elCrit.textContent = `${countCriticas} | ${countAlerta} alerta`;

        const elDesv = document.getElementById('kpi-desvios-count');
        if (elDesv) elDesv.textContent = `${rutasDesviadas} activas`;

        this.renderNativeCharts();
    }

    renderRankings() {
        const container = document.getElementById('ranking-list');
        if (!container) return;

        const sortBy = document.getElementById('sort-ranking-by')?.value || 'perdidas';
        const searchQuery = (document.getElementById('search-station')?.value || '').toLowerCase();

        let list = [...this.estaciones];

        if (searchQuery) {
            list = list.filter(st =>
                st.nombre.toLowerCase().includes(searchQuery) ||
                st.troncal.toLowerCase().includes(searchQuery) ||
                (TRONCALES_INFO[st.troncal]?.nombre || '').toLowerCase().includes(searchQuery)
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'perdidas') return b.perdidasMensuales - a.perdidasMensuales;
            if (sortBy === 'evasion') return b.tasaEvasion - a.tasaEvasion;
            if (sortBy === 'vandalismo') return b.factores.vandalismo - a.factores.vandalismo;
            if (sortBy === 'pasajeros') return b.pasajerosDia - a.pasajerosDia;
            return 0;
        });

        container.innerHTML = '';

        list.slice(0, 15).forEach((st, idx) => {
            const troncal = TRONCALES_INFO[st.troncal] || { color: '#64748b' };
            const card = document.createElement('div');
            card.className = `ranking-item ${st.estado}`;

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 800; font-size: 11px; color: #64748b; width: 20px;">#${idx + 1}</span>
                    <span class="troncal-chip" style="background-color: ${troncal.color};">${st.troncal}</span>
                    <div>
                        <div class="station-title">
                            ${st.nombre}
                            <span class="badge-tag tag-${st.estado}">${st.estado.toUpperCase()}</span>
                        </div>
                        <div class="station-meta">
                            <span>Evasión: <b style="color: #fbbf24;">${st.tasaEvasion}%</b></span>
                            <span>•</span>
                            <span>Puertas: <b style="color: ${st.puertasOperativas < 60 ? '#f87171' : '#34d399'};">${st.puertasOperativas}%</b></span>
                        </div>
                    </div>
                </div>
                <div class="loss-col">
                    <div class="loss-val">${this.formatCOPShort(st.perdidasMensuales)}/m</div>
                    <div class="pax-val">${st.pasajerosDia.toLocaleString()} pax/d</div>
                </div>
            `;

            card.addEventListener('click', () => {
                this.tmMap.highlightStation(st.id);
                this.openStationModal(st.id);
            });

            container.appendChild(card);
        });
    }

    // ==========================================================================
    // MOTOR DE GRÁFICOS NATIVO (HTML5 CANVAS PURO)
    // ==========================================================================
    renderNativeCharts() {
        this.drawFactoresDoughnut();
        this.drawTopEstacionesBar();
    }

    drawFactoresDoughnut() {
        const canvas = document.getElementById('chart-factores');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.parentElement.clientWidth || 300;
        const h = canvas.height = canvas.parentElement.clientHeight || 180;

        let fEvasion = 0, fVandalismo = 0, fBloqueos = 0, fHurto = 0, fFallas = 0;
        this.estaciones.forEach(st => {
            fEvasion += st.factores.evasion;
            fVandalismo += st.factores.vandalismo;
            fBloqueos += st.factores.bloqueos;
            fHurto += st.factores.hurto;
            fFallas += st.factores.fallasTecnicas;
        });

        const data = [
            { label: 'Evasión (Colados)', val: fEvasion, color: '#ef4444' },
            { label: 'Vandalismo', val: fVandalismo, color: '#f97316' },
            { label: 'Bloqueos', val: fBloqueos, color: '#a855f7' },
            { label: 'Hurto', val: fHurto, color: '#3b82f6' },
            { label: 'Fallas Técnicas', val: fFallas, color: '#64748b' }
        ];

        const total = data.reduce((a, b) => a + b.val, 0);
        ctx.clearRect(0, 0, w, h);

        const cx = 80;
        const cy = h / 2;
        const outerR = 60;
        const innerR = 38;

        let startAngle = -Math.PI / 2;
        data.forEach(item => {
            const sliceAngle = (item.val / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
            ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            startAngle += sliceAngle;
        });

        // Leyenda a la derecha
        const lx = 160;
        let ly = 24;
        ctx.font = '10px Inter, sans-serif';
        data.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.fillRect(lx, ly, 10, 10);
            ctx.fillStyle = '#f8fafc';
            ctx.textAlign = 'left';
            ctx.fillText(`${item.label}`, lx + 16, ly + 9);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`${((item.val / total) * 100).toFixed(1)}% (${this.formatCOPShort(item.val)})`, lx + 16, ly + 21);
            ly += 28;
        });
    }

    drawTopEstacionesBar() {
        const canvas = document.getElementById('chart-top-estaciones');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.parentElement.clientWidth || 300;
        const h = canvas.height = canvas.parentElement.clientHeight || 200;

        const top = [...this.estaciones]
            .sort((a, b) => b.perdidasMensuales - a.perdidasMensuales)
            .slice(0, 6);

        ctx.clearRect(0, 0, w, h);
        const maxVal = top[0]?.perdidasMensuales || 1;

        const barH = 16;
        const gap = 14;
        let startY = 14;

        top.forEach((st, idx) => {
            const barW = ((st.perdidasMensuales / maxVal) * (w - 140));

            // Nombre
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${idx + 1}. ${st.nombre}`, 10, startY + 11);

            // Barra
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(110, startY, barW, barH, 3);
            ctx.fill();

            // Valor
            ctx.fillStyle = '#fca5a5';
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.fillText(this.formatCOPShort(st.perdidasMensuales), 115 + barW, startY + 12);

            startY += barH + gap;
        });
    }

    // Modal de Estación
    openStationModal(stationId) {
        const st = this.estaciones.find(e => e.id === stationId);
        if (!st) return;

        this.selectedStation = st;
        const modal = document.getElementById('station-modal');
        if (!modal) return;

        const troncal = TRONCALES_INFO[st.troncal] || { color: '#3b82f6', nombre: st.troncal };

        document.getElementById('modal-troncal-badge').style.backgroundColor = troncal.color;
        document.getElementById('modal-troncal-badge').textContent = st.troncal;
        document.getElementById('modal-station-name').textContent = st.nombre;
        document.getElementById('modal-troncal-name').textContent = `Troncal ${st.troncal} - ${troncal.nombre}`;
        
        const statusEl = document.getElementById('modal-station-status');
        statusEl.innerHTML = `<span class="badge-tag tag-${st.estado}">${st.estado.toUpperCase()}</span>`;

        document.getElementById('modal-perdidas-total').textContent = this.formatCOP(st.perdidasMensuales);
        document.getElementById('modal-tasa-evasion').textContent = `${st.tasaEvasion}%`;
        document.getElementById('modal-puertas-estado').textContent = `${st.puertasOperativas}%`;
        document.getElementById('modal-policia-actual').textContent = `${st.policiaActual} unds`;
        document.getElementById('modal-descripcion-factores').textContent = st.descripcionFactores;

        this.drawModalPie(st);
        this.renderModalDecisions(st);
        this.renderModalAlternateRoutes(st);

        modal.classList.remove('hidden');
    }

    closeStationModal() {
        const modal = document.getElementById('station-modal');
        if (modal) modal.classList.add('hidden');
    }

    drawModalPie(st) {
        const canvas = document.getElementById('chart-modal-factors');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = 240;
        const h = canvas.height = 140;

        const data = [
            { label: 'Evasión', val: st.factores.evasion, color: '#ef4444' },
            { label: 'Vandalismo', val: st.factores.vandalismo, color: '#f97316' },
            { label: 'Bloqueos', val: st.factores.bloqueos, color: '#a855f7' },
            { label: 'Hurto', val: st.factores.hurto, color: '#3b82f6' },
            { label: 'Fallas', val: st.factores.fallasTecnicas, color: '#64748b' }
        ];

        const total = Object.values(st.factores).reduce((a, b) => a + b, 0) || 1;
        ctx.clearRect(0, 0, w, h);

        const cx = 65;
        const cy = h / 2;
        const r = 50;

        let startA = -Math.PI / 2;
        data.forEach(d => {
            const slice = (d.val / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startA, startA + slice);
            ctx.closePath();
            ctx.fillStyle = d.color;
            ctx.fill();
            startA += slice;
        });

        // Leyenda
        const lx = 135;
        let ly = 18;
        ctx.font = '10px Inter, sans-serif';
        data.forEach(d => {
            ctx.fillStyle = d.color;
            ctx.fillRect(lx, ly, 8, 8);
            ctx.fillStyle = '#f8fafc';
            ctx.textAlign = 'left';
            ctx.fillText(`${d.label}: ${((d.val / total) * 100).toFixed(0)}%`, lx + 12, ly + 8);
            ly += 22;
        });
    }

    renderModalDecisions(st) {
        const container = document.getElementById('modal-decisions-list');
        if (!container) return;
        container.innerHTML = '';

        if (!st.decisionesRecomendadas || st.decisionesRecomendadas.length === 0) {
            container.innerHTML = '<div style="font-size: 11px; color: #94a3b8; font-style: italic;">No se requieren intervenciones críticas adicionales.</div>';
            return;
        }

        st.decisionesRecomendadas.forEach(dec => {
            const card = document.createElement('div');
            card.className = 'decision-action-card';

            const esEjecutada = dec.estado === 'ejecutada';

            card.innerHTML = `
                <div>
                    <div style="font-weight: 700; font-size: 12px; color: #ffffff;">
                        ${dec.titulo}
                    </div>
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
                        <span style="color: #34d399; font-weight: 700;">Impacto: ${dec.impactoEsperado}</span> • 
                        <span>Costo est: ${dec.costoEst}</span>
                    </div>
                </div>
                <button class="btn-execute" ${esEjecutada ? 'disabled' : ''}>
                    ${esEjecutada ? '✓ Ejecutada' : '⚡ Ejecutar Decisión'}
                </button>
            `;

            if (!esEjecutada) {
                card.querySelector('button').addEventListener('click', () => {
                    this.ejecutarDecision(st.id, dec.id);
                });
            }

            container.appendChild(card);
        });
    }

    renderModalAlternateRoutes(st) {
        const container = document.getElementById('modal-alternate-routes');
        if (!container) return;
        container.innerHTML = '';

        if (!st.rutasAlternas || st.rutasAlternas.length === 0) {
            container.innerHTML = '<div style="font-size: 11px; color: #64748b; font-style: italic;">No hay desvíos activos registrados para este punto.</div>';
            return;
        }

        st.rutasAlternas.forEach(alt => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 8px;';
            card.innerHTML = `
                <div style="font-weight: 700; font-size: 11px; color: #38bdf8;">🔀 ${alt.nombre}</div>
                <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">${alt.descripcion}</div>
            `;
            container.appendChild(card);
        });
    }

    // ==========================================================================
    // EJECUCIÓN DE DECISIONES TÁCTICAS
    // ==========================================================================
    ejecutarDecision(stationId, decisionId) {
        const st = this.estaciones.find(e => e.id === stationId);
        if (!st) return;

        const decision = st.decisionesRecomendadas.find(d => d.id === decisionId);
        if (!decision || decision.estado === 'ejecutada') return;

        decision.estado = 'ejecutada';
        let ahorro = 0;

        if (decision.tipo === 'seguridad') {
            st.policiaActual = st.policiaRequerida;
            const reduccion = st.factores.evasion * 0.35;
            st.factores.evasion -= reduccion;
            st.tasaEvasion = +(st.tasaEvasion * 0.65).toFixed(1);
            ahorro += reduccion;
        } else if (decision.tipo === 'infraestructura') {
            st.puertasOperativas = 95;
            const redVand = st.factores.vandalismo * 0.60;
            const redEvas = st.factores.evasion * 0.20;
            st.factores.vandalismo -= redVand;
            st.factores.evasion -= redEvas;
            st.tasaEvasion = +(st.tasaEvasion * 0.85).toFixed(1);
            ahorro += (redVand + redEvas);
        } else if (decision.tipo === 'desvio') {
            const ruta = this.rutas.find(r => r.paradasIds.includes(st.id));
            if (ruta && ruta.desvíoAlterno) {
                ruta.desvíoAlterno.activo = true;
            }
            const redBloq = st.factores.bloqueos * 0.70;
            st.factores.bloqueos -= redBloq;
            ahorro += redBloq;
        }

        st.perdidasMensuales = Object.values(st.factores).reduce((a, b) => a + b, 0);

        if (st.perdidasMensuales < 1000000000 && st.estado === 'critico') {
            st.estado = 'alerta';
        } else if (st.perdidasMensuales < 600000000 && st.estado === 'alerta') {
            st.estado = 'normal';
        }

        this.decisionesEjecutadas.unshift({
            hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            estacion: st.nombre,
            decision: decision.titulo,
            ahorroCOP: ahorro
        });

        this.updateKPIs();
        this.renderRankings();
        this.renderDecisionesList();
        this.renderRutasCards();

        if (this.selectedStation && this.selectedStation.id === st.id) {
            this.openStationModal(st.id);
        }

        this.showToast('success', `Decisión ejecutada: ${decision.titulo} en ${st.nombre}`);
    }

    renderDecisionesList() {
        const container = document.getElementById('decisiones-audit-list');
        if (!container) return;

        if (this.decisionesEjecutadas.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 11px; padding: 20px;">No hay intervenciones registradas aún. Selecciona una estación crítica en el mapa.</div>';
            return;
        }

        container.innerHTML = '';
        this.decisionesEjecutadas.forEach(d => {
            const item = document.createElement('div');
            item.style.cssText = 'background: rgba(17, 24, 39, 0.85); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px; font-size: 11px;';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-weight: 700; color: #ffffff;">
                    <span>⚡ ${d.decision}</span>
                    <span style="color: #94a3b8; font-family: 'JetBrains Mono', monospace;">${d.hora}</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #94a3b8; margin-top: 3px;">
                    <span>Estación: <b style="color: #f8fafc;">${d.estacion}</b></span>
                    <span style="color: #34d399; font-weight: 700;">+${this.formatCOPShort(d.ahorroCOP)} ahorro/m</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderRutasCards() {
        const container = document.getElementById('rutas-control-list');
        if (!container) return;
        container.innerHTML = '';

        this.rutas.forEach(ruta => {
            const tieneDesvio = ruta.desvíoAlterno && ruta.desvíoAlterno.activo;
            const card = document.createElement('div');
            card.className = `route-card ${tieneDesvio ? 'active-detour' : ''}`;

            card.innerHTML = `
                <div class="route-header">
                    <div class="route-name">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${ruta.color};"></span>
                        Ruta ${ruta.nombre}
                    </div>
                    <span style="font-size: 10px; font-family: monospace; color: #94a3b8;">${ruta.frecuenciaMin} min frec.</span>
                </div>
                <div class="route-desc">
                    ${ruta.origen} ➔ ${ruta.destino} (${ruta.flotaAsignada} buses)
                </div>
                ${ruta.desvíoAlterno ? `
                <div class="route-actions">
                    <span style="font-size: 10px; color: ${tieneDesvio ? '#38bdf8; font-weight: 700;' : '#64748b;'}">
                        ${tieneDesvio ? '⚠️ Desvío Alterno Activo' : 'Trazado normal'}
                    </span>
                    <button class="btn-detour ${tieneDesvio ? 'active' : ''}">
                        ${tieneDesvio ? 'Desactivar Desvío' : '🔀 Activar Ruta Alterna'}
                    </button>
                </div>
                ` : ''}
            `;

            if (ruta.desvíoAlterno) {
                card.querySelector('.btn-detour').addEventListener('click', () => {
                    this.toggleRutaAlterna(ruta.id);
                });
            }

            container.appendChild(card);
        });
    }

    toggleRutaAlterna(rutaId) {
        const ruta = this.rutas.find(r => r.id === rutaId);
        if (!ruta || !ruta.desvíoAlterno) return;

        ruta.desvíoAlterno.activo = !ruta.desvíoAlterno.activo;
        this.updateKPIs();
        this.renderRutasCards();
        this.showToast('info', `Ruta Alterna ${ruta.desvíoAlterno.activo ? 'Activada' : 'Normalizada'}: ${ruta.nombre}`);
    }

    initWhatIfSimulator() {
        const sliderPol = document.getElementById('sim-slider-policia');
        const sliderGate = document.getElementById('sim-slider-puertas');
        const sliderRutas = document.getElementById('sim-slider-rutas');

        const updateSim = () => {
            const incPol = parseInt(sliderPol?.value || 0);
            const incGate = parseInt(sliderGate?.value || 0);
            const incRutas = parseInt(sliderRutas?.value || 0);

            document.getElementById('sim-val-policia').textContent = `+${incPol}%`;
            document.getElementById('sim-val-puertas').textContent = `${incGate}%`;
            document.getElementById('sim-val-rutas').textContent = `+${incRutas}%`;

            const total = this.estaciones.reduce((a, b) => a + b.perdidasMensuales, 0);
            const pctAhorro = Math.min(0.65, (incPol * 0.0028) + (incGate * 0.0035) + (incRutas * 0.002));
            const ahorroAnual = total * pctAhorro * 12;
            const inversionMes = (incPol * 12000000) + (incGate * 9000000);
            const roi = inversionMes > 0 ? (inversionMes * 12 / ahorroAnual).toFixed(1) : 0;

            document.getElementById('sim-ahorro-anual').textContent = this.formatCOP(ahorroAnual);
            document.getElementById('sim-roi-meses').textContent = `${roi} meses`;
            document.getElementById('sim-evasion-reducida').textContent = `-${(pctAhorro * 100).toFixed(1)}%`;
        };

        if (sliderPol) sliderPol.addEventListener('input', updateSim);
        if (sliderGate) sliderGate.addEventListener('input', updateSim);
        if (sliderRutas) sliderRutas.addEventListener('input', updateSim);

        document.getElementById('btn-aplicar-whatif')?.addEventListener('click', () => {
            const incPol = parseInt(sliderPol?.value || 0);
            const incGate = parseInt(sliderGate?.value || 0);

            this.estaciones.forEach(st => {
                if (incPol > 0) {
                    st.tasaEvasion = Math.max(5, +(st.tasaEvasion * (1 - (incPol / 220))).toFixed(1));
                    st.factores.evasion *= (1 - (incPol / 240));
                }
                if (incGate > 0) {
                    st.puertasOperativas = Math.min(98, st.puertasOperativas + Math.floor(incGate * 0.35));
                    st.factores.vandalismo *= (1 - (incGate / 250));
                }
                st.perdidasMensuales = Object.values(st.factores).reduce((a, b) => a + b, 0);
                if (st.perdidasMensuales < 900000000 && st.estado === 'critico') st.estado = 'alerta';
            });

            this.updateKPIs();
            this.renderRankings();
            this.showToast('success', 'Plan Estratégico Implementado a Toda la Red');
        });
    }

    startLiveSimulation() {
        const msgs = [
            'Intrusión irregular detectada en torniquetes norte de Portal Américas.',
            'Dispositivo policial disuade con éxito intento de bloqueo en Av. Jiménez.',
            'Ruta alterna K10 descongestiona corredor Calle 26 en 14 minutos.',
            'Cuadrilla de mantenimiento preventivo operando puertas en Calle 72.'
        ];

        setInterval(() => {
            if (!this.isSimRunning) return;
            this.simTickCount++;
            if (this.simTickCount % 7 === 0) {
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                const el = document.getElementById('ticker-content');
                if (el) el.textContent = `[${hora}] [DESPACHO CCO] ${msg}`;
            }
        }, 3000);
    }

    showToast(tipo, msg) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.innerHTML = `<span>${tipo === 'success' ? '✅' : 'ℹ️'}</span> <div>${msg}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    // ==========================================================================
    // MÓDULO ACADÉMICO ESEIT (SEMANAS 1 A 8)
    // ==========================================================================
    renderEseitRiskMatrix() {
        const container = document.getElementById('eseit-risk-matrix-list');
        if (!container || !ESEIT_PROYECTO_INFO?.matrizRiesgos) return;

        container.innerHTML = '';
        ESEIT_PROYECTO_INFO.matrizRiesgos.forEach(r => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(11, 17, 32, 0.95); border: 1px solid var(--border-color); border-radius: 6px; padding: 7px 9px; font-size: 10px; display: flex; flex-direction: column; gap: 3px;';

            let badgeColor = '#94a3b8';
            if (r.prioridad === 'Muy Alta') badgeColor = '#ef4444';
            else if (r.prioridad === 'Alta') badgeColor = '#f59e0b';
            else if (r.prioridad === 'Media') badgeColor = '#3b82f6';
            else badgeColor = '#10b981';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="font-weight: 800; color: #60a5fa; font-family: monospace;">[${r.id}]</span>
                        <span style="font-weight: 700; color: #ffffff;">${r.categoria}</span>
                    </div>
                    <span style="font-size: 8px; font-weight: 800; padding: 1px 5px; border-radius: 3px; background: ${badgeColor}22; color: ${badgeColor}; border: 1px solid ${badgeColor}55;">
                        P×I: ${r.score} (${r.prioridad})
                    </span>
                </div>
                <div style="color: #cbd5e1; line-height: 1.3;">${r.desc}</div>
                <div style="display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 3px; margin-top: 2px;">
                    <span><b>Resp:</b> ${r.resp}</span>
                    <span style="color: #34d399;"><b>Acción:</b> ${r.estrategia}</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    exportarInformeEseitSemana8() {
        const p = ESEIT_PROYECTO_INFO;
        const totalPerdidas = this.estaciones.reduce((a, b) => a + b.perdidasMensuales, 0);

        const markdownContent = `# ESEIT - ESCUELA SUPERIOR DE EMPRESA, INGENIERÍA Y TECNOLOGÍA
## INFORME EJECUTIVO FINAL: "PLANIFICADO VS. EJECUTADO" (SEMANA 8)
**Asignatura:** Ejecución y Control de Proyectos
**Proyecto:** ${p.titulo}
**Fecha:** ${new Date().toLocaleDateString('es-CO')}
**Equipo de Trabajo:**
- Josué David Ospino Ramírez
- David Fernando Pulido
**Patrocinador:** ${p.patrocinador}
**Presupuesto de Referencia:** ${p.presupuestoReferencia}

---

### 1. PRODUCTO FINAL ENTREGABLE DEL ALCANCE
Como resultado planificado en el alcance del proyecto, se entrega la **Plataforma Web de Monitoreo Geoespacial, Análisis Financiero y Soporte de Decisiones para TransMilenio CCO**:
- **Monitoreo en Tiempo Real:** Visualización interactiva de todas las troncales y estaciones críticas de Bogotá sobre mapas reales (Esri ArcGIS / OpenStreetMap).
- **Semáforo y Factores de Ishikawa:** Diagnóstico cuantitativo de pérdidas por Evasión (Personas/Procesos), Vandalismo (Materiales), Bloqueos (Medio Ambiente), Seguridad y Fallas Técnicas (Máquinas).
- **Simulador What-If de Retorno de Inversión (ROI):** Cálculo dinámico de reducción de evasión ante despliegue de fuerza policial, torniquetes piso-techo y desvíos alternos.
- **Línea Base Oficial Incorporada:** Calibrado con la cifra oficial del Concejo de Bogotá 2024 (13,14% de evasión, 89 millones de viajes no validados/año y $719 millones COP diarios en pérdidas).

---

### 2. CUMPLIMIENTO DE TIEMPOS (GANTT REAL VS. PLANIFICADO)
- **Hito 1 (Inicio y Diagnóstico Ishikawa/PESTEL/FODA):** 100% completado a tiempo (01/05/2025).
- **Hito 2 (Acta de Constitución y Plan de Adquisición de Recursos):** 100% completado (09/05/2025).
- **Hito 3 (Diseño del Sistema de Control y Adquisiciones Tecnológicas):** 100% completado.
- **Hito 4 (Desarrollo y Despliegue de la Plataforma de Monitoreo Web):** Ejecutado con éxito. Sin retrasos críticos acumulados.
- **Varianza de Cronograma (SV):** 0 días de retraso en la entrega del producto final de Semana 8.

---

### 3. VARIACIONES DE COSTOS Y RECURSOS
- **Recursos Humanos Planificados:** 50 Inspectores de Evasión, 30 Personal de Seguridad, 10 Personal de Sistemas, 5 Analistas de Datos, 15 Gestores de Cultura Ciudadana.
- **Recursos Materiales y Tecnológicos:** Inversión de $1.320.000 USD en cámaras de vigilancia (2.000 unidades), reconocimiento facial (1 software central), validadores inteligentes (3.000) y torniquetes piso-techo (500).
- **Impacto Financiero Modelado en el Software:**
  - Pérdida Mensual Inicial del Sistema: $${(totalPerdidas / 1000000000).toFixed(2)} Mil Millones COP.
  - Decisiones Operativas Ejecutadas en Sesión: ${this.decisionesEjecutadas.length} intervenciones.
  - Ahorro Mensual Logrado: $${(this.decisionesEjecutadas.reduce((a, b) => a + b.ahorroCOP, 0) / 1000000).toFixed(1)} Millones COP.

---

### 4. RIESGOS MATERIALIZADOS Y CÓMO FUERON GESTIONADOS
Basado en la Matriz de Riesgos (R1 a R10) del Plan de Gestión de Riesgos:
1. **R2 (Resistencia al cambio y evasión cultural - PxI: 16):** Mitigado mediante campañas persuasivas fundamentadas en ciencias del comportamiento (BID) y despliegue de 15 gestores de cultura ciudadana.
2. **R5 (Retrasos en la entrega de torniquetes por proveedores - PxI: 12):** Mitigado con contratos de licitación pública con cláusulas de penalización y proveedores de respaldo.
3. **R6 (Incidentes de seguridad durante controles más estrictos - PxI: 9):** Mitigado mediante la coordinación permanente con la Policía Metropolitana y cuadrillas de seguridad en puntos críticos (Portal Américas, Banderas, Calle 72, Ricaurte).
4. **R9 (Ineficacia inicial de campañas educativas - PxI: 20):** Gestionado midiendo periódicamente la tasa de evasión en el simulador para ajustar el tono de los mensajes pedagógicos.

---

### 5. LECCIONES APRENDIDAS
- **A nivel de Proyecto:** La evasión tarifaria no se resuelve únicamente con infraestructura física o fuerza policial; requiere una estrategia multidimensional que combine barreras físicas (torniquetes piso-techo), sanciones normativas, cultura ciudadana y herramientas tecnológicas de monitoreo en tiempo real.
- **A nivel de Equipo:** El trabajo coordinado entre la planeación estructurada (WBS, PESTEL, Ishikawa, Matriz de Riesgos) y el desarrollo del producto tecnológico permitió cumplir el 100% de los criterios del Plan de Calidad de ESEIT para la Semana 8.
`;

        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Informe_Final_Semana8_ESEIT_TransMilenio_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('success', 'Informe Final de Semana 8 descargado con éxito.');
    }

    initEventListeners() {
        // Modal cerrar
        document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeStationModal());
        document.getElementById('modal-backdrop')?.addEventListener('click', () => this.closeStationModal());

        // Búsqueda y Filtros
        document.getElementById('search-station')?.addEventListener('input', () => this.renderRankings());
        document.getElementById('sort-ranking-by')?.addEventListener('change', () => this.renderRankings());

        document.getElementById('filter-troncal')?.addEventListener('change', (e) => {
            this.tmMap.setFilter(e.target.value);
            this.renderRankings();
        });

        document.querySelectorAll('input[name="map-metric-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.tmMap.setLayerMode(e.target.value);
            });
        });

        // Selector de Mapa Base Real en Línea
        document.getElementById('map-style-select')?.addEventListener('change', (e) => {
            this.tmMap.setMapProvider(e.target.value);
            this.showToast('info', `Cambiando mapa base a: ${e.target.options[e.target.selectedIndex].text}`);
        });

        // Botones de Salto Rápido a Nodos Clave
        document.querySelectorAll('.btn-quick-hub').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lat = parseFloat(e.currentTarget.dataset.lat);
                const lng = parseFloat(e.currentTarget.dataset.lng);
                this.tmMap.flyToHub(lat, lng, 14.8);
            });
        });

        // Toggles del Mapa
        document.getElementById('toggle-corredores')?.addEventListener('change', (e) => this.tmMap.toggleCorridors(e.target.checked));
        document.getElementById('toggle-rutas')?.addEventListener('change', (e) => this.tmMap.toggleRoutes(e.target.checked));
        document.getElementById('toggle-buses')?.addEventListener('change', (e) => this.tmMap.toggleBuses(e.target.checked));
        document.getElementById('toggle-heatmap')?.addEventListener('change', (e) => this.tmMap.toggleHeatmap(e.target.checked));

        // Botones Zoom y Vista
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.tmMap.zoomIn());
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.tmMap.zoomOut());
        document.getElementById('btn-recenter-map')?.addEventListener('click', () => this.tmMap.flyToBogota());

        // Tabs del Sidebar
        document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.tab;
                document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                document.querySelectorAll('.sidebar-tab-content').forEach(p => p.classList.add('hidden'));
                document.getElementById(`tab-content-${target}`)?.classList.remove('hidden');

                if (target === 'factores') {
                    this.renderNativeCharts();
                }
            });
        });

        // Exportar Reporte
        document.getElementById('btn-export-report')?.addEventListener('click', () => {
            const data = {
                informe: 'Balance Operativo y Financiero TransMilenio CCO',
                fecha: new Date().toISOString(),
                totalPerdidasMensualesCOP: this.estaciones.reduce((a, b) => a + b.perdidasMensuales, 0),
                tasaEvasionPromedio: +(this.estaciones.reduce((a, b) => a + b.tasaEvasion, 0) / this.estaciones.length).toFixed(1),
                decisionesTomadas: this.decisionesEjecutadas,
                estacionesCriticas: this.estaciones.filter(e => e.estado === 'critico')
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_TransMilenio_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('info', 'Informe ejecutivo exportado con éxito.');
        });

        // Exportar Informe Ejecutivo Final Semana 8 (ESEIT)
        document.getElementById('btn-export-eseit-doc')?.addEventListener('click', () => {
            this.exportarInformeEseitSemana8();
        });

        this.initWhatIfSimulator();
    }
}

// Inicializar al cargar
window.addEventListener('DOMContentLoaded', () => {
    window.app = new TransMilenioApp();
});
