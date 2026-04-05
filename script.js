/* ═══════════════════════════════════════════════════════════════
   NAVIDAD MÁGICA — script.js   v4.0
   ───────────────────────────────────────────────────────────────
   RENDIMIENTO — cambios clave:
   • Nieve ahora usa <canvas> + requestAnimationFrame en lugar de
     150+ spans de DOM con CSS animations. Esto elimina el lag
     principal porque el canvas es una sola capa GPU, sin layout
     ni paint por copo. El hilo principal queda libre para las
     animaciones de luces.
   • will-change en luces: solo se aplica cuando están animando
     (clase .lights-animating). Sin animación → sin capa GPU extra.
   • Slider fill: actualizado vía CSS custom property --vol-fill
     en cada evento input (sin repaint del layout).

   NUEVAS FUNCIONES:
   • PWA: registro de Service Worker
   • Web Share API + fallback de clipboard
   • Notifications API (local + check en carga)
   • Selector de canciones (carousel horizontal)
   ══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   CONFIGURACIÓN — edita aquí para añadir canciones
   Pon los archivos .mp3 en la raíz de tu proyecto Vercel
═══════════════════════════════════════════════════════════════ */
const SONGS = [
    { name: 'Luces Navideñas', file: 'luces_navideñas.mp3',  icon: '🕯️' },
    { name: 'Jingle Bells',    file: 'jingle_bells.mp3',      icon: '🔔' },
    { name: 'Noche de Paz',    file: 'silent_night.mp3',      icon: '⭐' },
    { name: 'Feliz Navidad',   file: 'merry_christmas.mp3',     icon: '🎅' },
    { name: 'Deck the Halls',  file: 'deck_the_halls.mp3',    icon: '🎶' },
];

const SHARE_URL  = 'https://navidad-magica.vercel.app/';
const SHARE_TEXT = '🎄 ¡Mira esta cuenta regresiva mágica para Navidad con luces y nieve! ❄️';

/* ═══════════════════════════════════════════════════════════════
   REFERENCIAS DOM
═══════════════════════════════════════════════════════════════ */
const christmasTitle  = document.getElementById('christmas-title');
const onOffButton     = document.getElementById('on-off-button');
const motionButton    = document.getElementById('motion-button');
const lightsContainer = document.getElementById('lights-container');
const audio           = document.getElementById('Audio');
const body            = document.body;
const volumeControl   = document.getElementById('volume-control');
const volumeSlider    = document.getElementById('volume-slider');
const snowButton      = document.getElementById('snow-button');
const snowLabel       = document.getElementById('snow-label');
const shareButton     = document.getElementById('share-button');
const notifyButton    = document.getElementById('notify-button');
const toastEl         = document.getElementById('toast');
const arrivalOverlay  = document.getElementById('arrival-overlay');
const closeArrival    = document.getElementById('close-arrival');
const songSelectorEl  = document.getElementById('song-selector');

/* ═══════════════════════════════════════════════════════════════
   PATRÓN DE LUCES
═══════════════════════════════════════════════════════════════ */
const LIGHT_PATTERN = [
    { cordon: 'cordon',      light: 'light' },
    { cordon: 'cordon-top',  light: 'light light-top' },
    { cordon: 'cordon-top2', light: 'light light-top2' },
    { cordon: 'cordon-top',  light: 'light light-top' },
    { cordon: 'cordon',      light: 'light' },
    { cordon: 'cordon-top2', light: 'light light-top2' },
    { cordon: 'cordon-top',  light: 'light light-top' },
    { cordon: 'cordon',      light: 'light' },
    { cordon: 'cordon-top2', light: 'light light-top2' },
    { cordon: 'cordon-top',  light: 'light light-top' },
];

let lights = [];

function generateLights() {
    lightsContainer.innerHTML = '';
    const w = window.innerWidth;
    const reps = w <= 480 ? 1 : w <= 768 ? 2 : w <= 1024 ? 2 : 3;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < reps; i++) {
        LIGHT_PATTERN.forEach(item => {
            const cord  = document.createElement('div');
            cord.className = item.cordon;
            frag.appendChild(cord);

            const bulb = document.createElement('div');
            bulb.className = item.light;
            frag.appendChild(bulb);
        });
    }

    lightsContainer.appendChild(frag);
    lights = lightsContainer.querySelectorAll('.light');
}

generateLights();

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        generateLights();
        if (isLightsOn) applyLightsOnStyle();
    }, 250);
});

/* ═══════════════════════════════════════════════════════════════
   ESTADO GLOBAL
═══════════════════════════════════════════════════════════════ */
let isPlaying      = false;
let isImageVisible = false;
let isLightsOn     = false;
let contador       = 1;
let currentTheme   = 'clasico';
let currentSong    = 0;
let arrivalShown   = false;

/* ═══════════════════════════════════════════════════════════════
   HELPER: colores del tema desde CSS vars
═══════════════════════════════════════════════════════════════ */
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        a: s.getPropertyValue('--light-a').trim() || '#ff4444',
        b: s.getPropertyValue('--light-b').trim() || '#00ff88',
    };
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: encender luces con los colores del tema
═══════════════════════════════════════════════════════════════ */
function applyLightsOnStyle() {
    lights = lightsContainer.querySelectorAll('.light');
    const { a, b } = getThemeColors();
    lights.forEach((light, i) => {
        const color = i % 2 === 0 ? a : b;
        light.style.backgroundColor = color;
        light.style.boxShadow       = `0 0 28px ${color}`;
        light.style.animation       = 'none';
        light.style.opacity         = '1';
    });
    lightsContainer.classList.remove('lights-animating');
}

/* ═══════════════════════════════════════════════════════════════
   TRANSICIÓN ENTRE MODOS — fade del contenedor completo
═══════════════════════════════════════════════════════════════ */
function transitionLightsMode(applyFn) {
    lightsContainer.style.transition = 'opacity 0.2s ease';
    lightsContainer.style.opacity    = '0.03';
    setTimeout(() => {
        applyFn();
        lightsContainer.style.opacity = '1';
        setTimeout(() => { lightsContainer.style.transition = ''; }, 220);
    }, 215);
}

/* ═══════════════════════════════════════════════════════════════
   MODOS DE ANIMACIÓN — Botón "Modos"
═══════════════════════════════════════════════════════════════ */
const MODO_NAMES = [
    '', 'Persecución', 'Twinkle', 'Alternados', 'Slo-Glo',
    'Estrobo', 'Scanner', 'Latido', 'Explosión', 'Estático'
];

const motionButtonEvent = {
    handleEvent() {
        lights = lightsContainer.querySelectorAll('.light');

        const applyAnimation = () => {
            lightsContainer.style.animation = 'none';
            lightsContainer.classList.add('lights-animating'); // ← activa will-change en focos
            const { a, b } = getThemeColors();

            switch (contador) {
                case 1: // Persecución
                    lights.forEach((l, i) => {
                        const c = i % 2 === 0 ? a : b;
                        l.style.backgroundColor = c;
                        l.style.boxShadow = `0 0 28px ${c}`;
                        l.style.animation = `persecucion 1s linear ${i * 0.1}s infinite`;
                    }); break;

                case 2: // Twinkle aleatorio
                    lights.forEach(l => {
                        const dur = (Math.random() * 1 + 0.5).toFixed(2);
                        l.style.animation = `flash ${dur}s ease-in-out infinite`;
                    }); break;

                case 3: // Alternados
                    lights.forEach((l, i) => {
                        l.style.animation = i % 2 === 0
                            ? 'luces-alternadas 1s steps(1) infinite'
                            : 'luces-alternadas 1s steps(1) 0.5s infinite';
                    }); break;

                case 4: // Slo-Glo
                    lights.forEach((l, i) => {
                        l.style.animation = `fade 2s ease-in-out ${i * 0.18}s infinite`;
                    }); break;

                case 5: // Crazy Flash
                    lights.forEach((l, i) => {
                        l.style.animation = `flash 0.35s ease-in-out ${(i % 3) * 0.1}s infinite`;
                    }); break;

                case 6: // Scanner
                    lights.forEach((l, i) => {
                        const c = i % 2 === 0 ? a : b;
                        l.style.backgroundColor = c;
                        l.style.boxShadow = `0 0 28px ${c}`;
                        l.style.animation = `persecucion 1.5s linear ${i * 0.1}s infinite alternate`;
                    }); break;

                case 7: // Latido
                    lights.forEach(l => {
                        l.style.animation = 'latido 1.5s ease-in-out infinite';
                    }); break;

                case 8: // Explosión
                    lights.forEach((l, i) => {
                        l.style.animation = `explosion 2s ease-out ${i * 0.05}s infinite`;
                    }); break;

                case 9: // Estático
                    lights.forEach(l => {
                        l.style.animation = 'none';
                        l.style.opacity   = '1';
                    });
                    lightsContainer.classList.remove('lights-animating'); // ya no anima
                    break;

                default: contador = 0; break;
            }
        };

        isLightsOn ? transitionLightsMode(applyAnimation) : applyAnimation();
        contador++;
        if (contador > 9) contador = 1;
    }
};

motionButton.addEventListener('click', motionButtonEvent);

/* ═══════════════════════════════════════════════════════════════
   BOTÓN POWER
═══════════════════════════════════════════════════════════════ */
onOffButton.addEventListener('click', () => {
    // ── Audio ──────────────────────────────────────────────────
    if (!isPlaying) {
        syncAudioSrc();
        audio.volume = volumeSlider.value / 100;
        audio.play().catch(e => console.warn('Audio bloqueado:', e));
        volumeControl.classList.add('visible');
    } else {
        audio.pause();
        audio.currentTime = 0;
        volumeControl.classList.remove('visible');
    }
    isPlaying = !isPlaying;

    // ── Título ─────────────────────────────────────────────────
    if (!isImageVisible) {
        christmasTitle.style.display = 'block';
        christmasTitle.classList.add('visible');
    } else {
        christmasTitle.style.display = 'none';
        christmasTitle.classList.remove('visible');
    }
    isImageVisible = !isImageVisible;

    onOffButton.setAttribute('aria-pressed', !isLightsOn ? 'true' : 'false');

    // ── Luces ──────────────────────────────────────────────────
    if (!isLightsOn) {
        lightsContainer.style.animation = 'none';
        applyLightsOnStyle();
    } else {
        lightsContainer.style.animation = 'none';
        lightsContainer.classList.remove('lights-animating');
        lights = lightsContainer.querySelectorAll('.light');
        lights.forEach(l => {
            l.style.backgroundColor = 'transparent';
            l.style.boxShadow       = 'none';
            l.style.animation       = 'none';
            l.style.willChange      = 'auto';  // Liberar capas GPU
        });
    }
    isLightsOn = !isLightsOn;
});

/* ═══════════════════════════════════════════════════════════════
   CONTROL DE VOLUMEN
   FIX: actualiza --vol-fill para mostrar el fill del track
═══════════════════════════════════════════════════════════════ */
function updateSliderFill() {
    const pct = volumeSlider.value + '%';
    volumeSlider.style.setProperty('--vol-fill', pct);
    // Icono mudo cuando volumen = 0
    const iconLeft = document.getElementById('vol-icon-left');
    if (iconLeft) iconLeft.textContent = volumeSlider.value === '0' ? '🔇' : '🔈';
}

volumeSlider.addEventListener('input', () => {
    audio.volume  = volumeSlider.value / 100;
    audio.muted   = volumeSlider.value === '0';
    updateSliderFill();
});

// Inicializar fill al cargar
updateSliderFill();

/* ═══════════════════════════════════════════════════════════════
   TEMAS DE COLOR
═══════════════════════════════════════════════════════════════ */
const THEME_EMOJIS   = { clasico:'🎄', hielo:'❄️', dorado:'⭐', magico:'🔮' };
const THEME_META_MAP = { clasico:'#00e5ff', hielo:'#0096c7', dorado:'#ffd60a', magico:'#e040fb' };

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        if (theme === currentTheme) return;
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchTheme(theme);
    });
});

function switchTheme(theme) {
    // Fade suave para ocultar el cambio brusco
    const veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;z-index:9998;pointer-events:none;transition:opacity 0.3s ease';
    body.appendChild(veil);

    requestAnimationFrame(() => {
        veil.style.opacity = '0.75';
        setTimeout(() => {
            document.documentElement.setAttribute('data-theme', theme);
            currentTheme = theme;

            // Actualizar meta theme-color para el chrome del navegador
            const metaTheme = document.getElementById('theme-color-meta');
            if (metaTheme) metaTheme.content = THEME_META_MAP[theme] || '#00e5ff';

            // Actualizar emoji del mensaje de llegada
            const emojiEl = document.getElementById('arrival-emoji');
            if (emojiEl) emojiEl.textContent = THEME_EMOJIS[theme] || '🎄';

            // Refrescar colores de luces si están encendidas
            if (isLightsOn) applyLightsOnStyle();

            // Actualizar fill color del slider
            updateSliderFill();

            veil.style.opacity = '0';
            setTimeout(() => veil.remove(), 320);
        }, 320);
    });
}

/* ═══════════════════════════════════════════════════════════════
   SELECTOR DE CANCIONES
═══════════════════════════════════════════════════════════════ */
function buildSongSelector() {
    const frag = document.createDocumentFragment();
    SONGS.forEach((song, i) => {
        const pill = document.createElement('button');
        pill.className   = 'song-pill' + (i === 0 ? ' active' : '');
        pill.dataset.idx = i;
        pill.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        pill.innerHTML   = `<span class="song-icon">${song.icon}</span><span>${song.name}</span>`;
        pill.addEventListener('click', () => selectSong(i, pill));
        frag.appendChild(pill);
    });
    songSelectorEl.appendChild(frag);
}

function selectSong(index, pillEl) {
    if (index === currentSong) return;

    document.querySelectorAll('.song-pill').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
    });
    pillEl.classList.add('active');
    pillEl.setAttribute('aria-pressed', 'true');

    const wasPlaying = isPlaying;
    currentSong = index;

    if (wasPlaying) {
        audio.pause();
        syncAudioSrc();
        audio.play().catch(e => console.warn('Error cambiando canción:', e));
    } else {
        syncAudioSrc();
    }
}

function syncAudioSrc() {
    const newSrc = SONGS[currentSong].file;
    // Solo cambia si realmente cambió — evita reload innecesario
    if (!audio.src.endsWith(newSrc)) {
        audio.src = newSrc;
        audio.load();
    }
}

buildSongSelector();

/* ═══════════════════════════════════════════════════════════════
   COUNTDOWN REGRESIVO
═══════════════════════════════════════════════════════════════ */
function countdown() {
    const now = new Date();
    let xmas  = new Date(now.getFullYear(), 11, 25); // 25 dic
    if (now >= xmas) xmas = new Date(now.getFullYear() + 1, 11, 25);

    const diff = xmas - now;

    if (diff <= 0 && !arrivalShown) {
        arrivalShown = true;
        showArrivalMessage();
        ['days','hours','minutes','seconds'].forEach(id =>
            document.getElementById(id).textContent = '00');
        return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById('days').textContent    = pad(d);
    document.getElementById('hours').textContent   = pad(h);
    document.getElementById('minutes').textContent = pad(m);
    document.getElementById('seconds').textContent = pad(s);
}

const pad = t => t < 10 ? `0${t}` : String(t);

setInterval(countdown, 1000);
countdown();

/* ═══════════════════════════════════════════════════════════════
   MENSAJE DE LLEGADA
═══════════════════════════════════════════════════════════════ */
function showArrivalMessage() {
    const emojiEl = document.getElementById('arrival-emoji');
    if (emojiEl) emojiEl.textContent = THEME_EMOJIS[currentTheme] || '🎄';
    setTimeout(() => {
        arrivalOverlay.classList.add('visible');
        arrivalOverlay.setAttribute('aria-hidden', 'false');
        closeArrival.focus();
        launchConfetti();
    }, 600);
}

closeArrival.addEventListener('click', () => {
    arrivalOverlay.classList.remove('visible');
    arrivalOverlay.setAttribute('aria-hidden', 'true');
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && arrivalOverlay.classList.contains('visible'))
        closeArrival.click();
});

/* Confetti ligero dentro del arrival overlay */
function launchConfetti() {
    const wrap = document.getElementById('confetti-canvas-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const colors = ['#ff4444','#00e5ff','#ffd60a','#00ff88','#e040fb','#ffffff'];
    for (let i = 0; i < 45; i++) {
        const piece = document.createElement('span');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size  = Math.random() * 8 + 5;
        const left  = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur   = Math.random() * 1.5 + 1.5;
        piece.style.cssText = [
            'position:absolute',
            `left:${left}%`,
            'top:-10px',
            `width:${size}px`,
            `height:${size}px`,
            `background:${color}`,
            `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
            `animation:confettiFall ${dur}s ${delay}s ease-in forwards`,
            'pointer-events:none',
        ].join(';');
        wrap.appendChild(piece);
    }
    // Inyectar keyframe una sola vez
    if (!document.getElementById('confetti-style')) {
        const s = document.createElement('style');
        s.id = 'confetti-style';
        s.textContent = `@keyframes confettiFall {
            0%   { transform:translateY(0) rotate(0deg);   opacity:1; }
            100% { transform:translateY(260px) rotate(720deg); opacity:0; }
        }`;
        document.head.appendChild(s);
    }
}

/* ═══════════════════════════════════════════════════════════════
   NIEVE EN CANVAS — requestAnimationFrame
   ─────────────────────────────────────────────────────────────
   Por qué es más rápido que spans de DOM:
   • Un único elemento <canvas> = una sola capa GPU
   • Sin layout, sin paint por copo, sin GC pressure
   • El hilo principal queda libre para las animaciones de luces
   • Los copos nunca se crean ni destruyen — se reciclan
═══════════════════════════════════════════════════════════════ */
const snowCanvas = document.getElementById('snow-canvas');
const snowCtx    = snowCanvas.getContext('2d', { alpha: true });

// Pre-render sprite de copo (evita ctx.arc() por cada copo cada frame)
const SPRITE_SIZE = 12;
const snowSprite  = document.createElement('canvas');
snowSprite.width  = snowSprite.height = SPRITE_SIZE;
const sprCtx = snowSprite.getContext('2d');
const grad   = sprCtx.createRadialGradient(
    SPRITE_SIZE/2, SPRITE_SIZE/2, 0,
    SPRITE_SIZE/2, SPRITE_SIZE/2, SPRITE_SIZE/2
);
grad.addColorStop(0,   'rgba(255,255,255,1)');
grad.addColorStop(0.6, 'rgba(255,255,255,0.6)');
grad.addColorStop(1,   'rgba(255,255,255,0)');
sprCtx.fillStyle = grad;
sprCtx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

function resizeSnowCanvas() {
    snowCanvas.width  = window.innerWidth;
    snowCanvas.height = window.innerHeight;
}
resizeSnowCanvas();
window.addEventListener('resize', resizeSnowCanvas, { passive: true });

/* Clase Copo — recicla al llegar al fondo (sin new/GC) */
class Snowflake {
    constructor(initialY = false) { this.reset(initialY); }
    reset(placeAnywhere = false) {
        this.x      = Math.random() * snowCanvas.width;
        this.y      = placeAnywhere ? Math.random() * snowCanvas.height : -8;
        this.radius = Math.random() * 3.5 + 0.8;
        this.speed  = Math.random() * 1.1 + 0.35;
        this.wind   = (Math.random() - 0.5) * 0.45;
        this.alpha  = Math.random() * 0.55 + 0.45;
    }
    update() {
        this.y += this.speed;
        this.x += this.wind;
        if (this.y > snowCanvas.height + 10 || this.x < -10 || this.x > snowCanvas.width + 10)
            this.reset();
    }
    draw() {
        const s = this.radius * 2;
        snowCtx.globalAlpha = this.alpha;
        // drawImage es ~5× más rápido que arc() en canvas
        snowCtx.drawImage(snowSprite, this.x - this.radius, this.y - this.radius, s, s);
    }
}

const SNOW_COUNTS = [0, 60, 150, 340]; // apagada, ligera, normal, intensa
let snowLevelIndex = 2;
let flakes = [];

function initSnow(count) {
    flakes = Array.from({ length: count }, (_, i) => new Snowflake(i < count * 0.7));
}

initSnow(SNOW_COUNTS[snowLevelIndex]);

let snowAnimId = null;
let snowRunning = true;

function animateSnow() {
    if (!snowRunning) return;
    snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    flakes.forEach(f => { f.update(); f.draw(); });
    snowCtx.globalAlpha = 1;
    snowAnimId = requestAnimationFrame(animateSnow);
}

animateSnow();

/* Niveles de nieve */
const SNOW_LABELS = ['Apagada','Ligera','Normal','Intensa'];

function applySnowLevel(index) {
    snowLabel.textContent = SNOW_LABELS[index];
    initSnow(SNOW_COUNTS[index]);
    // Si se apaga, limpiar canvas una vez más
    if (SNOW_COUNTS[index] === 0) {
        snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    }
}

snowButton.addEventListener('click', () => {
    snowLevelIndex = (snowLevelIndex + 1) % SNOW_COUNTS.length;
    applySnowLevel(snowLevelIndex);
});

/* ═══════════════════════════════════════════════════════════════
   TOAST — feedback visual
═══════════════════════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, duration = 2800) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}

/* ═══════════════════════════════════════════════════════════════
   COMPARTIR — Web Share API con fallback a clipboard
═══════════════════════════════════════════════════════════════ */
shareButton.addEventListener('click', async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: '🎄 Navidad Mágica',
                text:  SHARE_TEXT,
                url:   SHARE_URL,
            });
        } catch (e) {
            if (e.name !== 'AbortError') fallbackCopyLink();
        }
    } else {
        fallbackCopyLink();
    }
});

function fallbackCopyLink() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(SHARE_URL)
            .then(() => showToast('🔗 Enlace copiado al portapapeles'))
            .catch(() => showToast('📋 ' + SHARE_URL));
    } else {
        showToast('📋 ' + SHARE_URL, 4000);
    }
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICACIONES DE NAVIDAD — Notifications API
   ─────────────────────────────────────────────────────────────
   Sin servidor push: la notificación se muestra si la página está
   abierta el 25 de diciembre. Se puede mejorar con Push API en
   el futuro añadiendo un servidor de suscripciones.
═══════════════════════════════════════════════════════════════ */
let notifEnabled = localStorage.getItem('notif_enabled') === '1';

function updateNotifyBtn() {
    notifyButton.title = notifEnabled
        ? '🔔 Notificación de Navidad: ACTIVA (toca para desactivar)'
        : '🔔 Activar notificación de Navidad';
    notifyButton.classList.toggle('notif-active', notifEnabled);
}
updateNotifyBtn();

notifyButton.addEventListener('click', async () => {
    if (notifEnabled) {
        // Desactivar
        notifEnabled = false;
        localStorage.setItem('notif_enabled', '0');
        updateNotifyBtn();
        showToast('🔕 Notificación desactivada');
        return;
    }

    if (!('Notification' in window)) {
        showToast('⚠️ Tu navegador no soporta notificaciones');
        return;
    }

    let perm = Notification.permission;

    if (perm === 'denied') {
        showToast('🚫 Permiso bloqueado. Actívalo en ajustes del navegador.');
        return;
    }

    if (perm === 'default') {
        perm = await Notification.requestPermission();
    }

    if (perm === 'granted') {
        notifEnabled = true;
        localStorage.setItem('notif_enabled', '1');
        updateNotifyBtn();
        showToast('🔔 ¡Listo! Te avisaremos el 25 de diciembre 🎄');

        // Notificación de confirmación inmediata
        new Notification('🎄 Navidad Mágica', {
            body: '¡Notificaciones activadas! Te avisaremos el 25 de diciembre. 🎅',
            icon: './icon.svg',
            badge: './icon.svg',
            tag: 'navidad-setup',
        });
    } else {
        showToast('⚠️ Permiso de notificaciones denegado');
    }
});

/* Verificar si es Navidad al cargar */
function checkChristmasNotification() {
    if (!notifEnabled) return;
    if (Notification.permission !== 'granted') return;

    const now  = new Date();
    const isXmas = now.getMonth() === 11 && now.getDate() === 25;

    if (isXmas && !sessionStorage.getItem('xmas_notif_shown')) {
        sessionStorage.setItem('xmas_notif_shown', '1');
        setTimeout(() => {
            new Notification('🎄 ¡Feliz Navidad!', {
                body: '¡Ha llegado Navidad! Que sea un día lleno de magia y alegría 🎅✨',
                icon: './icon.svg',
                badge: './icon.svg',
                tag: 'navidad-day',
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200],
            });
        }, 2000);
    }
}

checkChristmasNotification();

/* ═══════════════════════════════════════════════════════════════
   PWA — REGISTRO DEL SERVICE WORKER
═══════════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(reg => {
                console.log('[PWA] Service Worker registrado:', reg.scope);
                // Mostrar banner de instalación si disponible
                window.addEventListener('beforeinstallprompt', e => {
                    e.preventDefault();
                    window._pwaInstallEvent = e;
                });
            })
            .catch(err => console.warn('[PWA] Error registrando SW:', err));
    });
}

/* ═══════════════════════════════════════════════════════════════
   ESTRELLAS EN EL FONDO (generadas una sola vez)
═══════════════════════════════════════════════════════════════ */
function createStarfield() {
    const frag  = document.createDocumentFragment();
    // Menos estrellas en mobile para ahorrar GPU
    const count = window.innerWidth < 480 ? 35 : 60;

    for (let i = 0; i < count; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        const size = Math.random() * 2 + 0.7;
        star.style.cssText = [
            `left:${(Math.random() * 100).toFixed(1)}%`,
            `top:${(Math.random() * 58).toFixed(1)}%`,
            `width:${size.toFixed(1)}px`,
            `height:${size.toFixed(1)}px`,
            `animation-delay:${(Math.random() * 4).toFixed(2)}s`,
            `animation-duration:${(Math.random() * 2.5 + 1.8).toFixed(2)}s`,
        ].join(';');
        frag.appendChild(star);
    }
    body.appendChild(frag);
}

createStarfield();
