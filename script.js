/* ═══════════════════════════════════════════════════════════════
   NAVIDAD MÁGICA — script.js   v3.0
   ───────────────────────────────────────────────────────────────
   NOVEDADES:
   • Temas de color (4) con transición fade suave
   • Control de volumen (slider, visible cuando Power=ON)
   • Intensidad de nieve (4 niveles: apagada/ligera/normal/intensa)
   • Mensaje de llegada cuando el countdown llega a 0
   • Transición animada entre modos de luces (fade del contenedor)
   • Estrellas en el fondo generadas en JS
   • applyLightsOnStyle() lee los colores del tema actual via CSS vars
   ══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   REFERENCIAS DOM
═══════════════════════════════════════════════════════════════ */
const christmasTitle  = document.getElementById('christmas-title');
const onOffButton     = document.getElementById('on-off-button');
const motionButton    = document.getElementById('motion-button');
const lightsContainer = document.querySelector('.lights');
const audio           = document.getElementById('Audio');
const body            = document.body;

/* ═══════════════════════════════════════════════════════════════
   PATRÓN DE LUCES
═══════════════════════════════════════════════════════════════ */
const pattern = [
    { cordon: 'cordon',      light: 'light' },
    { cordon: 'cordon-top',  light: 'light light-top' },
    { cordon: 'cordon-top2', light: 'light light-top2' },
    { cordon: 'cordon-top',  light: 'light light-top' },
    { cordon: 'cordon',      light: 'light' },
    { cordon: 'cordon-top2', light: 'light light-top2' },
    { cordon: 'cordon-top',  light: 'light light-top' },
    { cordon: 'cordon',      light: 'light' },
    { cordon: 'cordon-top2', light: 'light light-top2' },
    { cordon: 'cordon-top',  light: 'light light-top' }
];

let lights = [];

/* ─────────────────────────────────────────────────────────────
   Generación de luces según el ancho de pantalla
───────────────────────────────────────────────────────────── */
function generateLights() {
    lightsContainer.innerHTML = '';
    const width = window.innerWidth;

    const repetitions = width <= 480  ? 1
                      : width <= 768  ? 2
                      : width <= 1024 ? 2
                      :                 3;

    for (let i = 0; i < repetitions; i++) {
        pattern.forEach(item => {
            const cordonDiv = document.createElement('div');
            cordonDiv.className = item.cordon;
            lightsContainer.appendChild(cordonDiv);

            const lightDiv = document.createElement('div');
            lightDiv.className = item.light;
            lightsContainer.appendChild(lightDiv);
        });
    }

    // Actualizamos siempre la referencia para evitar stale refs
    lights = document.querySelectorAll('.light');
}

generateLights();

/* Resize sin location.reload() */
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const wasOn = isLightsOn;
        generateLights();
        if (wasOn) applyLightsOnStyle();
    }, 250);
});

/* ═══════════════════════════════════════════════════════════════
   ESTADO GLOBAL
═══════════════════════════════════════════════════════════════ */
let isPlaying      = false;
let isImageVisible = false;
let isLightsOn     = false;
let contador       = 1;        // Modo de animación activo
let currentTheme   = 'clasico';

/* ═══════════════════════════════════════════════════════════════
   HELPER: leer colores del tema actual desde CSS vars
═══════════════════════════════════════════════════════════════ */
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        a: s.getPropertyValue('--light-a').trim(),
        b: s.getPropertyValue('--light-b').trim(),
    };
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: encender luces con los colores del tema actual
═══════════════════════════════════════════════════════════════ */
function applyLightsOnStyle() {
    lights = document.querySelectorAll('.light');
    const { a, b } = getThemeColors();

    lights.forEach((light, index) => {
        const color = (index % 2 === 0) ? a : b;
        light.style.backgroundColor = color;
        light.style.boxShadow       = `0px 0px 32px ${color}`;
        light.style.animation       = 'none';
        light.style.opacity         = '1';
    });
}

/* ═══════════════════════════════════════════════════════════════
   TRANSICIÓN ENTRE MODOS DE LUCES
   Hace fade del contenedor completo para no interferir con
   las animaciones CSS de opacidad de los focos individuales.
═══════════════════════════════════════════════════════════════ */
function transitionLightsMode(applyFn) {
    lightsContainer.style.transition = 'opacity 0.22s ease';
    lightsContainer.style.opacity    = '0.04';

    setTimeout(() => {
        applyFn();
        lightsContainer.style.opacity = '1';
        // Eliminamos la transición para que las animaciones CSS
        // de los focos no se vean interferidas
        setTimeout(() => {
            lightsContainer.style.transition = '';
        }, 250);
    }, 240);
}

/* ═══════════════════════════════════════════════════════════════
   MODOS DE ANIMACIÓN (Botón "Modos")
═══════════════════════════════════════════════════════════════ */
const motionButtonEvent = {
    handleEvent: function () {
        // Refresca referencia por si hubo un resize
        lights = document.querySelectorAll('.light');

        const applyAnimation = () => {
            // Detenemos animación del contenedor
            lightsContainer.style.animation = 'none';

            const { a, b } = getThemeColors();

            switch (contador) {
                case 1: // Persecución
                    lights.forEach((light, index) => {
                        const color = (index % 2 === 0) ? a : b;
                        light.style.backgroundColor = color;
                        light.style.boxShadow = `0px 0px 32px ${color}`;
                        light.style.animation = `persecucion 1s linear ${index * 0.1}s infinite`;
                    });
                    break;

                case 2: // Twinkle aleatorio
                    lights.forEach(light => {
                        const dur = (Math.random() * 1 + 0.5).toFixed(2);
                        light.style.animation = `flash ${dur}s ease-in-out infinite`;
                    });
                    break;

                case 3: // Alternados (pares/impares)
                    lights.forEach((light, index) => {
                        light.style.animation = (index % 2 === 0)
                            ? 'luces-alternadas 1s steps(1) infinite'
                            : 'luces-alternadas 1s steps(1) 0.5s infinite';
                    });
                    break;

                case 4: // Slo-Glo (ola suave)
                    lights.forEach((light, index) => {
                        light.style.animation = `fade 2s ease-in-out ${index * 0.18}s infinite`;
                    });
                    break;

                case 5: // Crazy Flash (estrobo)
                    lights.forEach((light, index) => {
                        light.style.animation = `flash 0.35s ease-in-out ${(index % 3) * 0.1}s infinite`;
                    });
                    break;

                case 6: // Scanner (ida y vuelta)
                    lights.forEach((light, index) => {
                        const color = (index % 2 === 0) ? a : b;
                        light.style.backgroundColor = color;
                        light.style.boxShadow = `0px 0px 32px ${color}`;
                        light.style.animation = `persecucion 1.5s linear ${index * 0.1}s infinite alternate`;
                    });
                    break;

                case 7: // Latido (heartbeat)
                    lights.forEach(light => {
                        light.style.animation = 'latido 1.5s ease-in-out infinite';
                    });
                    break;

                case 8: // Explosión de Hielo
                    lights.forEach((light, index) => {
                        light.style.animation = `explosion 2s ease-out ${index * 0.05}s infinite`;
                    });
                    break;

                case 9: // Estático (sin animación)
                    lights.forEach(light => {
                        light.style.animation = 'none';
                        light.style.opacity   = '1';
                    });
                    break;

                default:
                    contador = 0;
                    break;
            }
        };

        // Solo animamos la transición si las luces están encendidas
        if (isLightsOn) {
            transitionLightsMode(applyAnimation);
        } else {
            applyAnimation();
        }

        contador++;
        if (contador > 9) contador = 1;
    }
};

motionButton.addEventListener('click', motionButtonEvent);

/* ═══════════════════════════════════════════════════════════════
   BOTÓN POWER
═══════════════════════════════════════════════════════════════ */
const volumeControl = document.getElementById('volume-control');
const volumeSlider  = document.getElementById('volume-slider');

onOffButton.addEventListener('click', () => {
    // 1 ── Audio
    if (!isPlaying) {
        audio.volume = volumeSlider.value / 100;
        audio.play().catch(err => console.warn('Audio bloqueado por el navegador:', err));
        volumeControl.classList.add('visible');
    } else {
        audio.pause();
        audio.currentTime = 0;
        volumeControl.classList.remove('visible');
    }
    isPlaying = !isPlaying;

    // 2 ── Título central
    if (!isImageVisible) {
        christmasTitle.classList.add('visible');
        christmasTitle.style.display = 'block';
    } else {
        christmasTitle.classList.remove('visible');
        christmasTitle.style.display = 'none';
    }
    isImageVisible = !isImageVisible;

    // Accesibilidad
    onOffButton.setAttribute('aria-pressed', isLightsOn ? 'false' : 'true');

    // 3 ── Luces
    if (!isLightsOn) {
        lightsContainer.style.animation = 'none';
        applyLightsOnStyle();
    } else {
        lightsContainer.style.animation = 'none';
        lights = document.querySelectorAll('.light');
        lights.forEach(light => {
            light.style.backgroundColor = 'transparent';
            light.style.boxShadow       = 'none';
            light.style.animation       = 'none';
        });
    }

    isLightsOn = !isLightsOn;
});

/* ═══════════════════════════════════════════════════════════════
   CONTROL DE VOLUMEN
═══════════════════════════════════════════════════════════════ */
volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value / 100;
    audio.muted  = (volumeSlider.value === '0');
});

/* ═══════════════════════════════════════════════════════════════
   TEMAS DE COLOR
═══════════════════════════════════════════════════════════════ */
const themeEmojis = {
    clasico: '🎄',
    hielo:   '❄️',
    dorado:  '⭐',
    magico:  '🔮',
};

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        if (theme === currentTheme) return;

        switchTheme(theme);

        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function switchTheme(theme) {
    // Crea un overlay de fade negro
    const fadeEl = document.createElement('div');
    fadeEl.style.cssText = [
        'position:fixed', 'inset:0', 'background:#000',
        'opacity:0', 'z-index:9999',
        'transition:opacity 0.32s ease',
        'pointer-events:none'
    ].join(';');
    body.appendChild(fadeEl);

    // Fase 1: oscurecer
    requestAnimationFrame(() => {
        fadeEl.style.opacity = '0.75';

        setTimeout(() => {
            // Aplicar nuevo tema
            document.documentElement.setAttribute('data-theme', theme);
            currentTheme = theme;

            // Si las luces están encendidas, refrescar colores
            if (isLightsOn) applyLightsOnStyle();

            // Actualizar emoji del mensaje de llegada
            const arrivalEmoji = document.getElementById('arrival-emoji');
            if (arrivalEmoji) arrivalEmoji.textContent = themeEmojis[theme] || '🎄';

            // Fase 2: aclarar
            fadeEl.style.opacity = '0';
            setTimeout(() => fadeEl.remove(), 370);
        }, 340);
    });
}

/* ═══════════════════════════════════════════════════════════════
   COUNTDOWN REGRESIVO
═══════════════════════════════════════════════════════════════ */
let arrivalShown = false;

function countdown() {
    const now      = new Date();
    let christmas  = new Date(now.getFullYear(), 11, 25); // 25 diciembre

    // Si ya pasó este año, mostramos la del siguiente
    if (now >= christmas) {
        christmas = new Date(now.getFullYear() + 1, 11, 25);
    }

    const timeLeft = christmas - now;

    // Verificar llegada
    if (timeLeft <= 0 && !arrivalShown) {
        arrivalShown = true;
        showArrivalMessage();
        ['days','hours','minutes','seconds'].forEach(id => {
            document.getElementById(id).textContent = '00';
        });
        return;
    }

    const days    = Math.floor(timeLeft / 86400000);
    const hours   = Math.floor((timeLeft % 86400000) / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    document.getElementById('days').textContent    = formatTime(days);
    document.getElementById('hours').textContent   = formatTime(hours);
    document.getElementById('minutes').textContent = formatTime(minutes);
    document.getElementById('seconds').textContent = formatTime(seconds);
}

function formatTime(t) {
    return t < 10 ? `0${t}` : String(t);
}

setInterval(countdown, 1000);
countdown();

/* ═══════════════════════════════════════════════════════════════
   MENSAJE DE LLEGADA
═══════════════════════════════════════════════════════════════ */
const arrivalOverlay = document.getElementById('arrival-overlay');
const closeArrival   = document.getElementById('close-arrival');

function showArrivalMessage() {
    const emojiEl = document.getElementById('arrival-emoji');
    if (emojiEl) emojiEl.textContent = themeEmojis[currentTheme] || '🎄';

    setTimeout(() => {
        arrivalOverlay.classList.add('visible');
        arrivalOverlay.setAttribute('aria-hidden', 'false');
        closeArrival.focus();
    }, 600);
}

closeArrival.addEventListener('click', () => {
    arrivalOverlay.classList.remove('visible');
    arrivalOverlay.setAttribute('aria-hidden', 'true');
});

// Cerrar con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && arrivalOverlay.classList.contains('visible')) {
        closeArrival.click();
    }
});

/* ═══════════════════════════════════════════════════════════════
   NIEVE
═══════════════════════════════════════════════════════════════ */
const snowLevels = [
    { label: 'Apagada', interval: null, maxFlakes: 0   },
    { label: 'Ligera',  interval: 480,  maxFlakes: 45  },
    { label: 'Normal',  interval: 200,  maxFlakes: 120 },
    { label: 'Intensa', interval: 65,   maxFlakes: 280 },
];

let snowLevelIndex  = 2;   // Empieza en Normal
let MAX_SNOW_FLAKES = snowLevels[2].maxFlakes;
let snowIntervalId  = null;

const snowButton = document.getElementById('snow-button');
const snowLabel  = document.getElementById('snow-label');

function applySnowLevel(index) {
    clearInterval(snowIntervalId);

    // Eliminar copos si nivel es 0
    if (snowLevels[index].maxFlakes === 0) {
        document.querySelectorAll('.snow-flake').forEach(f => f.remove());
    }

    snowLabel.textContent  = snowLevels[index].label;
    MAX_SNOW_FLAKES        = snowLevels[index].maxFlakes;

    if (snowLevels[index].interval !== null) {
        snowIntervalId = setInterval(crearNieve, snowLevels[index].interval);
    }
}

snowButton.addEventListener('click', () => {
    snowLevelIndex = (snowLevelIndex + 1) % snowLevels.length;
    applySnowLevel(snowLevelIndex);
});

// Copos de nieve
function crearNieve() {
    if (document.querySelectorAll('.snow-flake').length >= MAX_SNOW_FLAKES) return;

    const copo  = document.createElement('span');
    copo.className = 'snow-flake';

    const x     = innerWidth * Math.random();
    const size  = (Math.random() * 8) + 2;
    const z     = Math.round(Math.random()) * 100;
    const delay = Math.random() * 5;
    const anima = (Math.random() * 10) + 5;

    copo.style.left              = x + 'px';
    copo.style.width             = size + 'px';
    copo.style.height            = size + 'px';
    copo.style.zIndex            = z;
    copo.style.animationDelay    = delay + 's';
    copo.style.animationDuration = anima + 's';

    body.appendChild(copo);

    // Incluimos el delay para no eliminar el copo antes de que termine
    setTimeout(() => copo.remove(), (anima + delay) * 1000);
}

// Arrancar nieve en nivel inicial (Normal)
applySnowLevel(snowLevelIndex);

/* ═══════════════════════════════════════════════════════════════
   ESTRELLAS DE FONDO
   Se generan una sola vez al cargar; son estáticas con animación
   de twinkle sutíl definida en CSS (.star).
═══════════════════════════════════════════════════════════════ */
function createStarfield() {
    const fragment = document.createDocumentFragment();
    const count    = 65;

    for (let i = 0; i < count; i++) {
        const star = document.createElement('span');
        star.className = 'star';

        const size = Math.random() * 2 + 0.8;
        star.style.cssText = [
            `left:${Math.random() * 100}%`,
            `top:${Math.random() * 62}%`,         // Solo en la mitad superior
            `width:${size}px`,
            `height:${size}px`,
            `animation-delay:${(Math.random() * 4).toFixed(2)}s`,
            `animation-duration:${(Math.random() * 2 + 2).toFixed(2)}s`,
        ].join(';');

        fragment.appendChild(star);
    }

    body.appendChild(fragment);
}

createStarfield();
