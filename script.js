/* ═══════════════════════════════════════════════════════════════
   NAVIDAD MÁGICA — script.js   v5.0
   ───────────────────────────────────────────────────────────────
   BUGS CORREGIDOS:
   • Duplicación de mensaje — ahora usa innerHTML limpio cada vez
   • Nombres de canciones en inglés — objeto bilingüe {es,en}
   • Snow labels reflejaban lang antigua al cambiar idioma

   NUEVAS FUNCIONES:
   • Color Picker de focos (2 colores personalizados)
   • Tarjeta Shareable (canvas PNG descargable / Web Share)
   • Visualizador de Audio (Web Audio API, barras de frecuencia)
   • Modo Pantalla Completa (fullscreen + overlay elegante)
   • Stats Locales (sesiones, modos, canciones, etc.)
═══════════════════════════════════════════════════════════════ */

/* ── CONFIG CANCIONES (objeto bilingüe — FIX nombres EN) ────── */
const SONGS = [
    { name:{ es:'Luces Navideñas', en:'Christmas Lights' }, file:'luces_navideñas.mp3', icon:'🕯️' },
    { name:{ es:'Jingle Bells',    en:'Jingle Bells'     }, file:'jingle_bells.mp3',    icon:'🔔' },
    { name:{ es:'Noche de Paz',    en:'Silent Night'     }, file:'silent_night.mp3',    icon:'⭐' },
    { name:{ es:'Feliz Navidad',   en:'Merry Christmas'  }, file:'merry_christmas.mp3',   icon:'🎅' },
    { name:{ es:'Deck the Halls',  en:'Deck the Halls'   }, file:'deck_the_halls.mp3',  icon:'🎶' },
];

const SHARE_URL  = 'https://navidad-magica.vercel.app/';
const SHARE_TEXT = '🎄 ¡Mira esta cuenta regresiva mágica para Navidad con luces y nieve! ❄️';

/* ── REFERENCIAS DOM ─────────────────────────────────────────── */
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
const vizCanvas       = document.getElementById('viz-canvas');

/* ── PATRÓN DE LUCES ─────────────────────────────────────────── */
const LIGHT_PATTERN = [
    { cordon:'cordon',      light:'light' },
    { cordon:'cordon-top',  light:'light light-top' },
    { cordon:'cordon-top2', light:'light light-top2' },
    { cordon:'cordon-top',  light:'light light-top' },
    { cordon:'cordon',      light:'light' },
    { cordon:'cordon-top2', light:'light light-top2' },
    { cordon:'cordon-top',  light:'light light-top' },
    { cordon:'cordon',      light:'light' },
    { cordon:'cordon-top2', light:'light light-top2' },
    { cordon:'cordon-top',  light:'light light-top' },
];

let lights = [];

function generateLights() {
    lightsContainer.innerHTML = '';
    const w    = window.innerWidth;
    const reps = w<=480 ? 1 : w<=768 ? 2 : w<=1024 ? 2 : 3;
    const frag = document.createDocumentFragment();
    for (let i=0; i<reps; i++) {
        LIGHT_PATTERN.forEach(item => {
            const c = document.createElement('div'); c.className = item.cordon; frag.appendChild(c);
            const b = document.createElement('div'); b.className = item.light; frag.appendChild(b);
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

/* ── ESTADO GLOBAL ────────────────────────────────────────────── */
let isPlaying      = false;
let isImageVisible = false;
let isLightsOn     = false;
let contador       = 1;
let currentTheme   = 'clasico';
let currentSong    = 0;
let arrivalShown   = false;
// Colores personalizados de focos (null = usar tema)
let customColorA   = null;
let customColorB   = null;
// Idioma detectado del navegador o guardado
let currentLang    = localStorage.getItem('xmas_lang')
    || (navigator.language?.startsWith('en') ? 'en' : 'es');

/* ── HELPER: colores activos del tema o personalizados ─────────── */
function getActiveColors() {
    if (customColorA && customColorB) return { a: customColorA, b: customColorB };
    const s = getComputedStyle(document.documentElement);
    return {
        a: s.getPropertyValue('--light-a').trim() || '#ff3333',
        b: s.getPropertyValue('--light-b').trim() || '#00ff88',
    };
}

/* Hace un color más claro mezclándolo con blanco (para gradiente interno) */
function lightenColor(hex, amount = 0.45) {
    hex = hex.replace('#','');
    if (hex.length===3) hex = hex.split('').map(c=>c+c).join('');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    const toHex = v => Math.min(255, Math.round(v+(255-v)*amount)).toString(16).padStart(2,'0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* ── ENCENDER LUCES (premium: gradiente + glow multi-capa) ─────── */
function applyLightsOnStyle() {
    lights = lightsContainer.querySelectorAll('.light');
    const { a, b } = getActiveColors();
    lights.forEach((light, i) => {
        const color  = i%2===0 ? a : b;
        const light2 = lightenColor(color);
        // Gradiente radial: reflejo blanco interno + color + versión más oscura
        light.style.background = `radial-gradient(ellipse at 35% 30%, ${light2} 0%, ${color} 55%, ${color}cc 100%)`;
        light.style.boxShadow  = [
            `0 0  3px 1px ${color}`,
            `0 0  8px 3px ${color}bb`,
            `0 0 18px 6px ${color}66`,
            `0 0 32px 10px ${color}22`,
            `inset 0 0  5px rgba(255,255,255,.12)`,
        ].join(',');
        light.style.borderColor = `${color}88`;
        light.style.animation   = 'none';
        light.style.opacity     = '1';
        light.classList.add('lit');
    });
    lightsContainer.classList.remove('lights-animating');
}

/* ── TRANSICIÓN ENTRE MODOS ─────────────────────────────────────── */
function transitionLightsMode(applyFn) {
    lightsContainer.style.transition = 'opacity 0.2s ease';
    lightsContainer.style.opacity    = '0.03';
    setTimeout(() => {
        applyFn();
        lightsContainer.style.opacity = '1';
        setTimeout(() => { lightsContainer.style.transition = ''; }, 220);
    }, 215);
}

/* ── MODOS DE ANIMACIÓN ──────────────────────────────────────────── */
const motionButtonEvent = {
    handleEvent() {
        lights = lightsContainer.querySelectorAll('.light');
        const applyAnimation = () => {
            lightsContainer.style.animation = 'none';
            lightsContainer.classList.add('lights-animating');
            const { a, b } = getActiveColors();
            switch (contador) {
                case 1: // Persecución
                    lights.forEach((l,i)=>{
                        const c=i%2===0?a:b; l.style.background=c; l.style.boxShadow=`0 0 28px ${c}`;
                        l.style.animation=`persecucion 1s linear ${i*.1}s infinite`; l.classList.add('lit');
                    }); break;
                case 2: // Twinkle
                    lights.forEach(l=>{
                        const dur=(Math.random()*1+.5).toFixed(2);
                        l.style.animation=`flash ${dur}s ease-in-out infinite`;
                    }); break;
                case 3: // Alternados
                    lights.forEach((l,i)=>{
                        l.style.animation=i%2===0
                            ?'luces-alternadas 1s steps(1) infinite'
                            :'luces-alternadas 1s steps(1) .5s infinite';
                    }); break;
                case 4: // Slo-Glo
                    lights.forEach((l,i)=>{ l.style.animation=`fade 2s ease-in-out ${i*.18}s infinite`; }); break;
                case 5: // Crazy Flash
                    lights.forEach((l,i)=>{ l.style.animation=`flash .35s ease-in-out ${(i%3)*.1}s infinite`; }); break;
                case 6: // Scanner
                    lights.forEach((l,i)=>{
                        const c=i%2===0?a:b; l.style.background=c; l.style.boxShadow=`0 0 28px ${c}`;
                        l.style.animation=`persecucion 1.5s linear ${i*.1}s infinite alternate`;
                    }); break;
                case 7: // Latido
                    lights.forEach(l=>{ l.style.animation='latido 1.5s ease-in-out infinite'; }); break;
                case 8: // Explosión
                    lights.forEach((l,i)=>{ l.style.animation=`explosion 2s ease-out ${i*.05}s infinite`; }); break;
                case 9: // Estático
                    lights.forEach(l=>{ l.style.animation='none'; l.style.opacity='1'; });
                    lightsContainer.classList.remove('lights-animating'); break;
                default: contador=0; break;
            }
        };
        // Registrar stat
        incrementStat('modos');
        isLightsOn ? transitionLightsMode(applyAnimation) : applyAnimation();
        contador++;
        if (contador>9) contador=1;
    }
};
motionButton.addEventListener('click', motionButtonEvent);

/* ── BOTÓN POWER ─────────────────────────────────────────────── */
onOffButton.addEventListener('click', () => {
    if (!isPlaying) {
        syncAudioSrc();
        audio.volume = volumeSlider.value/100;
        audio.play().catch(e=>console.warn('Audio bloqueado:',e));
        volumeControl.classList.add('visible');
        if (audioCtx) resumeAudioContext();
        startViz();
    } else {
        audio.pause(); audio.currentTime=0;
        volumeControl.classList.remove('visible');
        stopViz();
    }
    isPlaying = !isPlaying;

    if (!isImageVisible) {
        christmasTitle.style.display='block'; christmasTitle.classList.add('visible');
    } else {
        christmasTitle.style.display='none'; christmasTitle.classList.remove('visible');
    }
    isImageVisible = !isImageVisible;

    onOffButton.setAttribute('aria-pressed', !isLightsOn ? 'true' : 'false');

    if (!isLightsOn) {
        lightsContainer.style.animation='none';
        applyLightsOnStyle();
    } else {
        lightsContainer.style.animation='none';
        lightsContainer.classList.remove('lights-animating');
        lights=lightsContainer.querySelectorAll('.light');
        lights.forEach(l=>{
            l.style.background='rgba(255,255,255,.08)';
            l.style.boxShadow='none'; l.style.animation='none';
            l.style.borderColor='rgba(255,255,255,.06)';
            l.classList.remove('lit');
        });
    }
    isLightsOn = !isLightsOn;
});

/* ── CONTROL DE VOLUMEN ─────────────────────────────────────── */
function updateSliderFill() {
    volumeSlider.style.setProperty('--vol-fill', volumeSlider.value+'%');
    const icon = document.getElementById('vol-icon-left');
    if (icon) icon.textContent = volumeSlider.value==='0' ? '🔇' : '🔈';
}
volumeSlider.addEventListener('input', ()=>{ audio.volume=volumeSlider.value/100; audio.muted=volumeSlider.value==='0'; updateSliderFill(); });
updateSliderFill();

/* ── TEMAS DE COLOR ─────────────────────────────────────────── */
const THEME_EMOJIS   = { clasico:'🎄', hielo:'❄️', dorado:'⭐', magico:'🔮' };
const THEME_META_MAP = { clasico:'#00e5ff', hielo:'#0096c7', dorado:'#ffd60a', magico:'#e040fb' };

document.querySelectorAll('.theme-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
        const theme=btn.dataset.theme; if (theme===currentTheme) return;
        document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        switchTheme(theme);
        incrementStat('temas');
    });
});

function switchTheme(theme) {
    const veil=document.createElement('div');
    veil.style.cssText='position:fixed;inset:0;background:#000;opacity:0;z-index:9998;pointer-events:none;transition:opacity .3s ease';
    body.appendChild(veil);
    requestAnimationFrame(()=>{
        veil.style.opacity='.75';
        setTimeout(()=>{
            document.documentElement.setAttribute('data-theme',theme);
            currentTheme=theme;
            const mt=document.getElementById('theme-color-meta');
            if (mt) mt.content=THEME_META_MAP[theme]||'#00e5ff';
            const ae=document.getElementById('arrival-emoji');
            if (ae) ae.textContent=THEME_EMOJIS[theme]||'🎄';
            // Solo refrescar colores si no hay picker personalizado
            if (!customColorA && isLightsOn) applyLightsOnStyle();
            updateSliderFill();
            updateColorPickerDefaults();
            veil.style.opacity='0';
            setTimeout(()=>veil.remove(),320);
        },320);
    });
}

/* ── COLOR PICKER DE FOCOS ─────────────────────────────────── */
const cpPanel      = document.getElementById('cp-panel');
const cpToggleBtn  = document.getElementById('color-picker-toggle');
const colorInputA  = document.getElementById('light-color-a');
const colorInputB  = document.getElementById('light-color-b');
const colorReset   = document.getElementById('color-reset');

function updateColorPickerDefaults() {
    if (!customColorA) {
        const s=getComputedStyle(document.documentElement);
        colorInputA.value = cssColorToHex(s.getPropertyValue('--light-a').trim());
        colorInputB.value = cssColorToHex(s.getPropertyValue('--light-b').trim());
    }
}

function cssColorToHex(css) {
    // Convierte "#aabbcc" o "rgb(r,g,b)" a hex para input[type=color]
    if (css.startsWith('#')) return css.length===4
        ? '#'+css[1]+css[1]+css[2]+css[2]+css[3]+css[3]
        : css;
    if (css.startsWith('rgb')) {
        const m=css.match(/\d+/g); if (!m) return '#ffffff';
        return '#'+m.slice(0,3).map(v=>parseInt(v).toString(16).padStart(2,'0')).join('');
    }
    return '#ffffff';
}

cpToggleBtn?.addEventListener('click', ()=>{
    const isHidden = cpPanel.hidden;
    cpPanel.hidden = !isHidden;
    cpToggleBtn.classList.toggle('active', !isHidden ? false : true);
    if (!cpPanel.hidden) updateColorPickerDefaults();
});

function applyCustomColors() {
    customColorA = colorInputA.value;
    customColorB = colorInputB.value;
    if (isLightsOn) applyLightsOnStyle();
}

colorInputA.addEventListener('input', applyCustomColors);
colorInputB.addEventListener('input', applyCustomColors);

colorReset?.addEventListener('click', ()=>{
    customColorA = null; customColorB = null;
    updateColorPickerDefaults();
    if (isLightsOn) applyLightsOnStyle();
    showToast(currentLang==='en' ? '🎨 Colors reset to theme' : '🎨 Colores del tema restaurados');
});

// Inicializar valores por defecto del picker
setTimeout(updateColorPickerDefaults, 100);

/* ── SELECTOR DE CANCIONES ──────────────────────────────────── */
function buildSongSelector() {
    songSelectorEl.innerHTML='';
    const frag=document.createDocumentFragment();
    SONGS.forEach((song,i)=>{
        const pill=document.createElement('button');
        pill.className='song-pill'+(i===0?' active':'');
        pill.dataset.idx=i;
        pill.setAttribute('aria-pressed',i===0?'true':'false');
        pill.innerHTML=`<span class="song-icon">${song.icon}</span><span>${song.name[currentLang]||song.name.es}</span>`;
        pill.addEventListener('click',()=>selectSong(i,pill));
        frag.appendChild(pill);
    });
    songSelectorEl.appendChild(frag);
}

function updateSongPillNames() {
    document.querySelectorAll('.song-pill').forEach((pill,i)=>{
        const nameEl=pill.querySelector('span:last-child');
        if (nameEl && SONGS[i]) nameEl.textContent=SONGS[i].name[currentLang]||SONGS[i].name.es;
    });
}

function selectSong(index, pillEl) {
    if (index===currentSong) return;
    document.querySelectorAll('.song-pill').forEach(p=>{ p.classList.remove('active'); p.setAttribute('aria-pressed','false'); });
    pillEl.classList.add('active'); pillEl.setAttribute('aria-pressed','true');
    const wasPlaying=isPlaying;
    currentSong=index;
    if (wasPlaying) { audio.pause(); syncAudioSrc(); audio.play().catch(()=>{}); }
    else syncAudioSrc();
    incrementStat('canciones');
}

function syncAudioSrc() {
    const newSrc=SONGS[currentSong].file;
    if (!audio.src.endsWith(newSrc)) { audio.src=newSrc; audio.load(); }
}

buildSongSelector();

/* ── COUNTDOWN ───────────────────────────────────────────────── */
let arrivalShownFlag = false;

function countdown() {
    const now=new Date();
    let xmas=new Date(now.getFullYear(),11,25);
    if (now>=xmas) xmas=new Date(now.getFullYear()+1,11,25);
    const diff=xmas-now;
    if (diff<=0 && !arrivalShownFlag) { arrivalShownFlag=true; showArrivalMessage(); return; }
    const d=Math.floor(diff/86400000);
    const h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000);
    const s=Math.floor((diff%60000)/1000);
    ['days','hours','minutes','seconds'].forEach((id,i)=>{
        document.getElementById(id).textContent=pad([d,h,m,s][i]);
    });
    // Sincronizar fullscreen si está abierto
    ['fs-days','fs-hours','fs-minutes','fs-seconds'].forEach((id,i)=>{
        const el=document.getElementById(id);
        if (el) el.textContent=pad([d,h,m,s][i]);
    });
}
const pad=t=>t<10?`0${t}`:String(t);
setInterval(countdown,1000);
countdown();

/* ── MENSAJE DE LLEGADA ─────────────────────────────────────── */
function showArrivalMessage() {
    const emojiEl=document.getElementById('arrival-emoji');
    if (emojiEl) emojiEl.textContent=THEME_EMOJIS[currentTheme]||'🎄';
    setTimeout(()=>{
        arrivalOverlay.classList.add('visible');
        arrivalOverlay.setAttribute('aria-hidden','false');
        closeArrival.focus(); launchConfetti();
    },600);
}
closeArrival.addEventListener('click',()=>{ arrivalOverlay.classList.remove('visible'); arrivalOverlay.setAttribute('aria-hidden','true'); });
document.addEventListener('keydown',e=>{ if (e.key==='Escape' && arrivalOverlay.classList.contains('visible')) closeArrival.click(); });

function launchConfetti() {
    const wrap=document.getElementById('confetti-canvas-wrap');
    if (!wrap) return; wrap.innerHTML='';
    const colors=['#ff4444','#00e5ff','#ffd60a','#00ff88','#e040fb','#ffffff'];
    for (let i=0;i<50;i++) {
        const p=document.createElement('span');
        const color=colors[Math.floor(Math.random()*colors.length)];
        const size=Math.random()*9+5;
        p.style.cssText=['position:absolute',`left:${Math.random()*100}%`,'top:-10px',
            `width:${size}px`,`height:${size}px`,`background:${color}`,
            `border-radius:${Math.random()>.5?'50%':'2px'}`,
            `animation:confettiFall ${Math.random()*1.5+1.5}s ${Math.random()*.6}s ease-in forwards`].join(';');
        wrap.appendChild(p);
    }
    if (!document.getElementById('confetti-style')) {
        const s=document.createElement('style'); s.id='confetti-style';
        s.textContent='@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(280px) rotate(720deg);opacity:0}}';
        document.head.appendChild(s);
    }
}

/* ── NIEVE EN CANVAS ─────────────────────────────────────────── */
const snowCanvas=document.getElementById('snow-canvas');
const snowCtx   =snowCanvas.getContext('2d',{alpha:true});

// Sprite pre-renderizado para evitar ctx.arc() en cada frame
const SPRITE_SIZE=12;
const snowSprite=document.createElement('canvas');
snowSprite.width=snowSprite.height=SPRITE_SIZE;
const sprCtx=snowSprite.getContext('2d');
const grad=sprCtx.createRadialGradient(SPRITE_SIZE/2,SPRITE_SIZE/2,0,SPRITE_SIZE/2,SPRITE_SIZE/2,SPRITE_SIZE/2);
grad.addColorStop(0,'rgba(255,255,255,1)'); grad.addColorStop(.6,'rgba(255,255,255,.6)'); grad.addColorStop(1,'rgba(255,255,255,0)');
sprCtx.fillStyle=grad; sprCtx.fillRect(0,0,SPRITE_SIZE,SPRITE_SIZE);

function resizeSnowCanvas() { snowCanvas.width=window.innerWidth; snowCanvas.height=window.innerHeight; }
resizeSnowCanvas();
window.addEventListener('resize',resizeSnowCanvas,{passive:true});

class Snowflake {
    constructor(anywhere=false) { this.reset(anywhere); }
    reset(anywhere=false) {
        this.x=Math.random()*snowCanvas.width;
        this.y=anywhere?Math.random()*snowCanvas.height:-8;
        this.radius=Math.random()*3.2+.8;
        this.speed=Math.random()*2.8+1.4; // 1.4–4.2 px/frame@60fps — caída natural
        this.wind=(Math.random()-.5)*.5;
        this.alpha=Math.random()*.5+.5;
    }
    update(dt=1) {
        this.y+=this.speed*dt; this.x+=this.wind*dt;
        if (this.y>snowCanvas.height+10||this.x<-12||this.x>snowCanvas.width+12) this.reset();
    }
    draw() {
        const s=this.radius*2;
        snowCtx.globalAlpha=this.alpha;
        snowCtx.drawImage(snowSprite,this.x-this.radius,this.y-this.radius,s,s);
    }
}

/* ── ESTRELLAS FUGACES ───────────────────────────────────────── */
class ShootingStar {
    constructor() { this.reset(true); }
    reset(initialDelay=false) {
        this.x=Math.random()*snowCanvas.width*.65;
        this.y=Math.random()*snowCanvas.height*.28;
        this.speed=Math.random()*7+6;
        this.length=Math.random()*100+70;
        this.angle=Math.PI/4+(Math.random()-.5)*.25;
        this.vx=Math.cos(this.angle)*this.speed;
        this.vy=Math.sin(this.angle)*this.speed;
        this.alpha=0; this.traveled=0;
        this.waitFrames=initialDelay?Math.floor(Math.random()*500):Math.floor(Math.random()*360+100);
    }
    update(dt=1) {
        if (this.waitFrames>0){this.waitFrames-=dt;return;}
        this.x+=this.vx*dt; this.y+=this.vy*dt; this.traveled+=this.speed*dt;
        const fl=this.length*.3;
        this.alpha=this.traveled<fl?this.traveled/fl:this.traveled>this.length-fl?Math.max(0,(this.length-this.traveled)/fl):1;
        if (this.traveled>=this.length||this.x>snowCanvas.width+20||this.y>snowCanvas.height+20) this.reset();
    }
    draw() {
        if (this.waitFrames>0||this.traveled===0) return;
        const tail=Math.min((this.length/this.speed)*.28,14);
        const tx=this.x-this.vx*tail, ty=this.y-this.vy*tail;
        const gr=snowCtx.createLinearGradient(tx,ty,this.x,this.y);
        gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(1,`rgba(255,255,255,${this.alpha*.88})`);
        snowCtx.save();
        snowCtx.globalAlpha=this.alpha; snowCtx.strokeStyle=gr;
        snowCtx.lineWidth=1.7; snowCtx.lineCap='round';
        snowCtx.beginPath(); snowCtx.moveTo(tx,ty); snowCtx.lineTo(this.x,this.y); snowCtx.stroke();
        snowCtx.globalAlpha=this.alpha; snowCtx.fillStyle='#fff';
        snowCtx.beginPath(); snowCtx.arc(this.x,this.y,1.8,0,Math.PI*2); snowCtx.fill();
        snowCtx.restore();
    }
}

const SNOW_COUNTS=[0,60,150,340];
let snowLevelIndex=2, flakes=[], snowLastTime=0;
const shootingStars=Array.from({length:4},()=>new ShootingStar());
function initSnow(count){ flakes=Array.from({length:count},(_,i)=>new Snowflake(i<count*.7)); }
initSnow(SNOW_COUNTS[snowLevelIndex]);

function animateSnow(ts) {
    const dt=snowLastTime?Math.min((ts-snowLastTime)/16.667,3.5):1;
    snowLastTime=ts;
    snowCtx.clearRect(0,0,snowCanvas.width,snowCanvas.height);
    shootingStars.forEach(s=>{s.update(dt);s.draw();});
    flakes.forEach(f=>{f.update(dt);f.draw();});
    snowCtx.globalAlpha=1;
    requestAnimationFrame(animateSnow);
}
animateSnow(0);

const SNOW_LABELS_ES=['Apagada','Ligera','Normal','Intensa'];
const SNOW_LABELS_EN=['Off','Light','Normal','Heavy'];
function applySnowLevel(index) {
    snowLabel.textContent=currentLang==='en'?SNOW_LABELS_EN[index]:SNOW_LABELS_ES[index];
    initSnow(SNOW_COUNTS[index]);
    if (SNOW_COUNTS[index]===0) snowCtx.clearRect(0,0,snowCanvas.width,snowCanvas.height);
}
snowButton.addEventListener('click',()=>{ snowLevelIndex=(snowLevelIndex+1)%SNOW_COUNTS.length; applySnowLevel(snowLevelIndex); });

/* ── TOAST ───────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg,duration=2800) {
    toastEl.textContent=msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),duration);
}

/* ── COMPARTIR ───────────────────────────────────────────────── */
shareButton.addEventListener('click', async ()=>{
    // Opción: compartir imagen + link
    if (navigator.share) {
        try {
            // Primero intenta compartir la tarjeta como imagen
            const blob=await generateShareCard();
            if (blob && navigator.canShare?.({files:[blob]})) {
                const file=new File([blob],'navidad-magica.png',{type:'image/png'});
                await navigator.share({ title:'🎄 Navidad Mágica', text:SHARE_TEXT, files:[file] });
            } else {
                await navigator.share({ title:'🎄 Navidad Mágica', text:SHARE_TEXT, url:SHARE_URL });
            }
        } catch (e) {
            if (e.name!=='AbortError') fallbackCopyLink();
        }
    } else {
        // Desktop: ofrece descargar la tarjeta
        const blob=await generateShareCard();
        if (blob) { downloadBlob(blob,'navidad-magica.png'); showToast(currentLang==='en'?'🖼️ Card downloaded!':'🖼️ ¡Tarjeta descargada!'); }
        else fallbackCopyLink();
    }
});

function fallbackCopyLink() {
    const t=I18N[currentLang];
    if (navigator.clipboard) {
        navigator.clipboard.writeText(SHARE_URL)
            .then(()=>showToast(t.toastCopied)).catch(()=>showToast(t.toastURL+SHARE_URL));
    } else { showToast(t.toastURL+SHARE_URL,4000); }
}

/* ── TARJETA SHAREABLE ───────────────────────────────────────── */
async function generateShareCard() {
    try {
        const canvas=document.getElementById('share-card-canvas');
        const ctx=canvas.getContext('2d');
        const W=canvas.width, H=canvas.height;

        // Fondo con gradiente del tema actual
        const s=getComputedStyle(document.documentElement);
        const bgA=s.getPropertyValue('--bg-a').trim()||'#071a07';
        const bgB=s.getPropertyValue('--bg-b').trim()||'#0a1628';
        const neon=s.getPropertyValue('--neon').trim()||'#00e5ff';

        const bg=ctx.createLinearGradient(0,0,W,H);
        bg.addColorStop(0,bgA); bg.addColorStop(1,bgB);
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

        // Bokeh circles
        const bokeh=ctx.createRadialGradient(W*.15,H*.6,0,W*.15,H*.6,200);
        bokeh.addColorStop(0,'rgba(255,200,50,.12)'); bokeh.addColorStop(1,'transparent');
        ctx.fillStyle=bokeh; ctx.fillRect(0,0,W,H);

        // Overlay oscuro
        const ov=ctx.createLinearGradient(0,0,0,H);
        ov.addColorStop(0,'rgba(0,0,0,.5)'); ov.addColorStop(1,'rgba(0,0,0,.3)');
        ctx.fillStyle=ov; ctx.fillRect(0,0,W,H);

        // Título
        ctx.textAlign='center';
        ctx.shadowColor=neon; ctx.shadowBlur=30;
        ctx.fillStyle='#fff';
        ctx.font='bold 36px Montserrat,sans-serif';
        ctx.fillText(currentLang==='en'?'Happy Holidays':'Felices Fiestas',W/2,80);

        // Countdown numbers
        const timeBoxes=[
            {id:'days', label:currentLang==='en'?'DAYS':'DÍAS'},
            {id:'hours',label:'HRS'},
            {id:'minutes',label:'MIN'},
            {id:'seconds',label:currentLang==='en'?'SEC':'SEG'},
        ];
        ctx.shadowBlur=20; ctx.shadowColor=neon;
        const boxW=W/4;
        timeBoxes.forEach((tb,i)=>{
            const x=boxW*i+boxW/2;
            const val=document.getElementById(tb.id)?.textContent||'00';
            ctx.fillStyle='#fff'; ctx.font='120px Montserrat,sans-serif';
            ctx.fillText(val,x,220);
            ctx.shadowBlur=0;
            ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='bold 14px Montserrat,sans-serif';
            ctx.letterSpacing='4px'; ctx.fillText(tb.label,x,248);
            ctx.letterSpacing='0px'; ctx.shadowBlur=20;
        });

        // Separadores
        ctx.fillStyle='rgba(255,255,255,.25)'; ctx.font='60px Montserrat,sans-serif';
        ctx.shadowBlur=0;
        [1,2,3].forEach(i=>ctx.fillText(':',boxW*i,190));

        // Mensaje
        ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,.7)';
        ctx.font='18px Montserrat,sans-serif';
        const prefix=currentLang==='en'?'Until Christmas':'Falta poco para Navidad';
        ctx.fillText(prefix,W/2,300);

        // URL branding
        ctx.fillStyle='rgba(255,255,255,.35)'; ctx.font='13px Montserrat,sans-serif';
        ctx.fillText('🎄 navidad-magica.vercel.app',W/2,340);

        // Estrellitas decorativas
        ctx.fillStyle='rgba(255,255,255,.6)'; ctx.shadowBlur=0;
        [[50,50],[W-50,50],[30,H-40],[W-30,H-40],[W/2,380]].forEach(([px,py])=>{
            ctx.font='18px serif'; ctx.fillText('✦',px,py);
        });

        return new Promise(res=>canvas.toBlob(res,'image/png'));
    } catch(e) { console.warn('Error generando tarjeta:',e); return null; }
}

function downloadBlob(blob,filename) {
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },500);
}

/* ── VISUALIZADOR DE AUDIO ──────────────────────────────────── */
let audioCtx=null, analyser=null, dataArray=null, vizAnimId=null, source=null;

function setupAudioContext() {
    if (audioCtx) return;
    try {
        audioCtx=new (window.AudioContext||window.webkitAudioContext)();
        analyser=audioCtx.createAnalyser();
        analyser.fftSize=64;          // 32 barras — ligero y rápido
        analyser.smoothingTimeConstant=0.82;
        dataArray=new Uint8Array(analyser.frequencyBinCount);
        source=audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    } catch(e) { console.warn('Web Audio no disponible:',e); audioCtx=null; }
}

function resumeAudioContext() {
    if (audioCtx?.state==='suspended') audioCtx.resume();
}

function startViz() {
    if (!audioCtx) { setupAudioContext(); if (!audioCtx) return; }
    resumeAudioContext();
    vizCanvas.classList.add('visible');
    const vizCtx=vizCanvas.getContext('2d');
    const s=getComputedStyle(document.documentElement);

    function drawViz() {
        if (!isPlaying) return;
        vizAnimId=requestAnimationFrame(drawViz);
        analyser.getByteFrequencyData(dataArray);

        const W=vizCanvas.width=vizCanvas.offsetWidth;
        const H=vizCanvas.height;
        vizCtx.clearRect(0,0,W,H);

        const neon=s.getPropertyValue('--neon').trim()||'#00e5ff';
        const barW=Math.floor(W/dataArray.length)-1;
        const cornerR=Math.min(barW/2,3);

        dataArray.forEach((v,i)=>{
            const barH=Math.max(2,(v/255)*H);
            const x=i*(barW+1);
            const y=H-barH;
            // Gradiente de abajo a arriba: color neon -> blanco
            const gr=vizCtx.createLinearGradient(x,H,x,y);
            gr.addColorStop(0,neon); gr.addColorStop(1,'rgba(255,255,255,.9)');
            vizCtx.fillStyle=gr;
            vizCtx.beginPath();
            vizCtx.roundRect(x,y,barW,barH,cornerR);
            vizCtx.fill();
        });
    }
    drawViz();
}

function stopViz() {
    cancelAnimationFrame(vizAnimId);
    vizCanvas.classList.remove('visible');
    const vizCtx=vizCanvas.getContext('2d');
    if (vizCtx) vizCtx.clearRect(0,0,vizCanvas.width,vizCanvas.height);
}

/* ── NOTIFICACIONES ─────────────────────────────────────────── */
let notifEnabled=localStorage.getItem('notif_enabled')==='1';
function updateNotifyBtn() {
    notifyButton.classList.toggle('notif-active',notifEnabled);
}
updateNotifyBtn();

notifyButton.addEventListener('click', async ()=>{
    const t=I18N[currentLang];
    if (notifEnabled) {
        notifEnabled=false; localStorage.setItem('notif_enabled','0');
        updateNotifyBtn(); showToast(t.notifOff); return;
    }
    if (!('Notification' in window)) { showToast(t.notifNo); return; }
    let perm=Notification.permission;
    if (perm==='denied') { showToast(t.notifDenied); return; }
    if (perm==='default') perm=await Notification.requestPermission();
    if (perm==='granted') {
        notifEnabled=true; localStorage.setItem('notif_enabled','1');
        updateNotifyBtn(); showToast(t.notifOn);
        new Notification('🎄 Navidad Mágica',{
            body:currentLang==='en'?'Notifications enabled! We\'ll alert you on Dec 25th 🎅':'¡Notificaciones activadas! Te avisaremos el 25 de diciembre 🎅',
            icon:'./icon.svg', tag:'navidad-setup',
        });
    } else { showToast(t.notifDenied); }
});

function checkChristmasNotification() {
    if (!notifEnabled||Notification.permission!=='granted') return;
    const now=new Date();
    if (now.getMonth()===11&&now.getDate()===25&&!sessionStorage.getItem('xmas_notif_shown')) {
        sessionStorage.setItem('xmas_notif_shown','1');
        setTimeout(()=>{
            new Notification('🎄 ¡Feliz Navidad!',{
                body:'¡Ha llegado Navidad! 🎅✨', icon:'./icon.svg', tag:'navidad-day',
                requireInteraction:true, vibrate:[200,100,200,100,200],
            });
        },2000);
    }
}
checkChristmasNotification();

/* ── FULLSCREEN / PANTALLA COMPLETA ─────────────────────────── */
const fsOverlay = document.getElementById('fullscreen-overlay');
const fsExitBtn = document.getElementById('fs-exit');
const fsBtn     = document.getElementById('fullscreen-btn');

fsBtn?.addEventListener('click', openFullscreen);
fsExitBtn?.addEventListener('click', closeFullscreen);
fsOverlay?.addEventListener('click', e=>{ if (e.target===fsOverlay) closeFullscreen(); });

function openFullscreen() {
    // Sincronizar textos con idioma actual
    syncFullscreenLabels();
    fsOverlay.hidden=false;
    fsBtn?.classList.add('active');
    // Intentar fullscreen del navegador si disponible
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(()=>{});
    }
    incrementStat('pantalla');
}
function closeFullscreen() {
    fsOverlay.hidden=true;
    fsBtn?.classList.remove('active');
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
}
document.addEventListener('fullscreenchange',()=>{
    if (!document.fullscreenElement && !fsOverlay.hidden) fsOverlay.hidden=true;
});
document.addEventListener('keydown',e=>{
    if (e.key==='Escape' && !fsOverlay.hidden) closeFullscreen();
});

function syncFullscreenLabels() {
    const t=I18N[currentLang];
    const el=id=>document.getElementById(id);
    if (el('fs-message')) el('fs-message').innerHTML=`${t.fsPrefix} <span class="fs-xmas">${t.xmasWord}</span>`;
    if (el('fs-title'))   el('fs-title').textContent=t.title;
    if (el('fs-label-d')) el('fs-label-d').textContent=t.days;
    if (el('fs-label-h')) el('fs-label-h').textContent=t.hrs;
    if (el('fs-label-m')) el('fs-label-m').textContent=t.min;
    if (el('fs-label-s')) el('fs-label-s').textContent=t.seg;
}

/* ── ESTADÍSTICAS LOCALES ────────────────────────────────────── */
const STATS_KEYS=['sessions','modos','temas','canciones','pantalla'];

function loadStats() {
    const raw=localStorage.getItem('xmas_stats');
    return raw ? JSON.parse(raw) : { sessions:0,modos:0,temas:0,canciones:0,pantalla:0 };
}
function saveStats(s) { localStorage.setItem('xmas_stats',JSON.stringify(s)); }
function incrementStat(key) {
    const s=loadStats(); s[key]=(s[key]||0)+1; saveStats(s);
}
// Contar sesión
(()=>{ const s=loadStats(); s.sessions=(s.sessions||0)+1; saveStats(s); })();

const statsBtn   = document.getElementById('stats-btn');
const statsModal = document.getElementById('stats-modal');
const statsClose = document.getElementById('stats-close');
const statsReset = document.getElementById('stats-reset');

statsBtn?.addEventListener('click',()=>{ renderStats(); statsModal.hidden=false; });
statsClose?.addEventListener('click',()=>{ statsModal.hidden=true; });
statsReset?.addEventListener('click',()=>{
    saveStats({sessions:0,modos:0,temas:0,canciones:0,pantalla:0});
    renderStats();
    showToast(currentLang==='en'?'🗑️ Stats cleared':'🗑️ Estadísticas borradas');
});
document.addEventListener('keydown',e=>{ if (e.key==='Escape'&&!statsModal.hidden) statsModal.hidden=true; });

function renderStats() {
    const s=loadStats();
    const t=I18N[currentLang];
    const grid=document.getElementById('stats-grid');
    if (!grid) return;
    const items=[
        { key:'sessions', icon:'🎄', label:t['stat-sessions'] },
        { key:'modos',    icon:'✨', label:t['stat-modos']    },
        { key:'temas',    icon:'🎨', label:t['stat-temas']    },
        { key:'canciones',icon:'🎵', label:t['stat-canciones']},
        { key:'pantalla', icon:'⛶', label:t['stat-pantalla'] },
    ];
    grid.innerHTML=items.map(item=>`
        <div class="stat-card">
            <div class="stat-value">${s[item.key]||0}</div>
            <div class="stat-label">${item.icon} ${item.label}</div>
        </div>`).join('');
}

/* ── CLIMA ─────────────────────────────────────────────────────── */
const WEATHER_ICONS={
    'clear':'☀️','sunny':'☀️','despejado':'☀️',
    'cloud':'☁️','nublado':'☁️','overcast':'☁️',
    'partly':'⛅','parcialmente':'⛅',
    'rain':'🌧️','lluvia':'🌧️','drizzle':'🌦️',
    'snow':'🌨️','nieve':'🌨️',
    'thunder':'⛈️','tormenta':'⛈️',
    'fog':'🌫️','niebla':'🌫️','mist':'🌫️',
    'wind':'💨','viento':'💨',
};
function getWeatherEmoji(desc) {
    const d=desc.toLowerCase();
    for (const [k,ic] of Object.entries(WEATHER_ICONS)) { if (d.includes(k)) return ic; }
    return '🌡️';
}
async function fetchWeather() {
    try {
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),5000);
        const res=await fetch('https://wttr.in/?format=j1',{signal:controller.signal});
        clearTimeout(timer);
        if (!res.ok) throw new Error('wttr');
        const data=await res.json();
        const curr=data.current_condition[0];
        const tempC=curr.temp_C;
        const desc=currentLang==='en'
            ?curr.weatherDesc[0].value
            :(curr.lang_es?.[0]?.value||curr.weatherDesc[0].value);
        document.getElementById('weather-temp').textContent=`${tempC}°C`;
        document.getElementById('weather-desc').textContent=desc;
        document.getElementById('weather-icon').textContent=getWeatherEmoji(desc);
    } catch(e) {
        const d=document.getElementById('weather-desc');
        if (d) d.textContent='--';
    }
}
setTimeout(fetchWeather,1500);

/* ── TRADUCCIÓN (FIX: usa innerHTML para evitar duplicación) ─── */
const I18N = {
    es:{
        title:'Felices Fiestas', xmasWord:'Navidad', fsPrefix:'Falta poco para',
        message:'Falta poco para', days:'DÍAS', hrs:'HRS', min:'MIN', seg:'SEG',
        power:'Power', modes:'Modos', snow:'Nieve', share:'Compartir', notify:'Avisar',
        loading:'Cargando...',
        toastCopied:'🔗 Enlace copiado al portapapeles', toastURL:'📋 ',
        notifOn:'🔔 ¡Listo! Te avisaremos el 25 de diciembre 🎄',
        notifOff:'🔕 Notificación desactivada',
        notifDenied:'🚫 Permiso bloqueado. Actívalo en ajustes del navegador.',
        notifNo:'⚠️ Tu navegador no soporta notificaciones',
        arrivalTitle:'¡Feliz Navidad!',
        arrivalSub:'Que esta noche sea llena de magia, amor y alegría ✨',
        arrivalBtn:'🎊 ¡Celebrar!',
        snowLevels:['Apagada','Ligera','Normal','Intensa'],
        fullscreen:'Pantalla',
        'stats-title':'Estadísticas',
        'stats-reset':'Borrar estadísticas',
        'stat-sessions':'Visitas',
        'stat-modos':'Modos usados',
        'stat-temas':'Temas cambiados',
        'stat-canciones':'Canciones',
        'stat-pantalla':'Pantalla completa',
    },
    en:{
        title:'Happy Holidays', xmasWord:'Christmas', fsPrefix:'Until',
        message:'Until', days:'DAYS', hrs:'HRS', min:'MIN', seg:'SEC',
        power:'Power', modes:'Modes', snow:'Snow', share:'Share', notify:'Notify',
        loading:'Loading...',
        toastCopied:'🔗 Link copied to clipboard', toastURL:'📋 ',
        notifOn:'🔔 Done! We\'ll notify you on December 25th 🎄',
        notifOff:'🔕 Notification disabled',
        notifDenied:'🚫 Permission blocked. Enable it in browser settings.',
        notifNo:'⚠️ Your browser doesn\'t support notifications',
        arrivalTitle:'Merry Christmas!',
        arrivalSub:'May this night be filled with magic, love and joy ✨',
        arrivalBtn:'🎊 Celebrate!',
        snowLevels:['Off','Light','Normal','Heavy'],
        fullscreen:'Screen',
        'stats-title':'Statistics',
        'stats-reset':'Clear statistics',
        'stat-sessions':'Sessions',
        'stat-modos':'Modes used',
        'stat-temas':'Themes changed',
        'stat-canciones':'Songs played',
        'stat-pantalla':'Fullscreen',
    },
};

function applyTranslation(lang) {
    const t=I18N[lang]||I18N.es;
    currentLang=lang;
    localStorage.setItem('xmas_lang',lang);

    // Toggle label
    const langLabel=document.getElementById('lang-label');
    if (langLabel) langLabel.textContent=lang.toUpperCase();

    // Título central
    const titleEl=document.getElementById('christmas-title');
    if (titleEl) titleEl.textContent=t.title;

    // FIX: Reconstruir innerHTML del mensaje — evita toda duplicación
    const msgEl=document.getElementById('message-el');
    if (msgEl) msgEl.innerHTML=`${t.message} <span class="christmas-text">${t.xmasWord}</span>`;

    // Unidades del countdown (IDs directos — sin ambigüedad)
    const unitMap=[['label-d',t.days],['label-h',t.hrs],['label-m',t.min],['label-s',t.seg]];
    unitMap.forEach(([id,val])=>{ const el=document.getElementById(id); if (el) el.textContent=val; });

    // Botones principales (solo el texto, no los spans de icono)
    document.querySelectorAll('[data-i18n]').forEach(el=>{
        const key=el.dataset.i18n;
        if (t[key]!==undefined) el.textContent=t[key];
    });

    // Mensaje de llegada
    const arrTitle=document.querySelector('.arrival-title');
    const arrSub  =document.querySelector('.arrival-subtitle');
    const arrBtn  =document.getElementById('close-arrival');
    if (arrTitle) arrTitle.textContent=t.arrivalTitle;
    if (arrSub)   arrSub.textContent  =t.arrivalSub;
    if (arrBtn)   arrBtn.textContent  =t.arrivalBtn;

    // Nivel de nieve actual (con etiqueta correcta del idioma)
    applySnowLevel(snowLevelIndex);

    // Nombres de canciones (FIX: objeto bilingüe)
    updateSongPillNames();

    // Sincronizar fullscreen labels
    syncFullscreenLabels();

    // Actualizar clima en nuevo idioma
    fetchWeather();
}

// Aplicar idioma al cargar
applyTranslation(currentLang);

document.getElementById('lang-toggle')?.addEventListener('click',()=>{
    applyTranslation(currentLang==='es'?'en':'es');
});

/* ── ESTRELLAS FIJAS EN EL FONDO ─────────────────────────────── */
function createStarfield() {
    const frag=document.createDocumentFragment();
    const count=window.innerWidth<480?35:60;
    for (let i=0;i<count;i++) {
        const star=document.createElement('span');
        star.className='star';
        const size=(Math.random()*2+.7).toFixed(1);
        star.style.cssText=[
            `left:${(Math.random()*100).toFixed(1)}%`,
            `top:${(Math.random()*58).toFixed(1)}%`,
            `width:${size}px`,`height:${size}px`,
            `animation-delay:${(Math.random()*4).toFixed(2)}s`,
            `animation-duration:${(Math.random()*2.5+1.8).toFixed(2)}s`,
        ].join(';');
        frag.appendChild(star);
    }
    body.appendChild(frag);
}
createStarfield();

/* ── SERVICE WORKER ─────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
    window.addEventListener('load',()=>{
        navigator.serviceWorker.register('./sw.js',{scope:'./'})
            .then(r=>console.log('[PWA] SW registrado:',r.scope))
            .catch(e=>console.warn('[PWA] SW error:',e));
    });
}
