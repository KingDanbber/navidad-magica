const christmasTitle = document.getElementById('christmas-title');;
const onOffButton = document.getElementById('on-off-button');
const motionButton = document.getElementById('motion-button');
const lightsContainer = document.querySelector('.lights'); // Seleccionamos el contenedor primero

// 1. Definimos el patrón de un bloque (el grupo de 8 luces que tenías)
const pattern = [{
    cordon: 'cordon',
    light: 'light'
},
    {
        cordon: 'cordon-top',
        light: 'light light-top'
    },
    {
        cordon: 'cordon-top2',
        light: 'light light-top2'
    },
    {
        cordon: 'cordon-top',
        light: 'light light-top'
    },
    {
        cordon: 'cordon',
        light: 'light'
    },
    {
        cordon: 'cordon-top2',
        light: 'light light-top2'
    },
    {
        cordon: 'cordon-top',
        light: 'light light-top'
    },
    {
        cordon: 'cordon',
        light: 'light'
    },
    {
        cordon: 'cordon-top2',
        light: 'light light-top2'
    },
    {
        cordon: 'cordon-top',
        light: 'light light-top'
    }];

// 2. Generamos las luces dinámicamente (Calibrado con CSS)
function generateLights() {
    lightsContainer.innerHTML = '';
    const width = window.innerWidth;
    let repetitions;

    // Lógica precisa basada en tus Media Queries
    if (width <= 480) {
        repetitions = 1; // Móvil Pequeño: 1 bloque (6 luces) centrado
    } else if (width <= 768) {
        repetitions = 2; // Tableta/Móvil Grande: 2 bloques (12 luces)
    } else if (width <= 1024) {
        repetitions = 2; // Laptop pequeña: 2 bloques (o 3 si caben apretados)
    } else {
        repetitions = 3; // Escritorio: 3 bloques (18 luces)
    }

    // Generación
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

    // ACTUALIZAMOS LA REFERENCIA DE LAS LUCES
    // Esto es vital para que las animaciones funcionen después de redimensionar
    // (Asegúrate de cambiar 'const lights' por 'let lights' al inicio de tu archivo si no lo has hecho)
    /* Si tu variable lights está definida como 'const' arriba,
       necesitarás recargar la página al redimensionar.
       Si quieres que sea dinámico, cambia arriba: let lights = ...
       y descomenta la línea de abajo:
    */
    // lights = document.querySelectorAll('.light');
}

// Ejecutamos al inicio
generateLights();

// Listener inteligente para rotación de pantalla (Optimizado)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Opción A (Sencilla): Recargar página para recalcular todo limpio
        // location.reload();

        // Opción B (Fluida): Regenerar solo luces (requiere cambiar const lights a let lights)
        generateLights();
        // Reasignamos los eventos de animación a las nuevas luces
        // (Esto requiere una refactorización mayor, así que por seguridad:)
        location.reload();
    }, 250);
});

let lights = document.querySelectorAll('.light');
const audio = document.getElementById('Audio');

let autoSequenceActive = false; // Nueva variable de control
let isplaying = false;
let isImageVisible = false;
let contador = 1;
let lightsAnimationRunning = false;
let isLightsOn = false;

let animationSequence = 0;

const animations = ['flicker', 'duo', 'all']; // Nombres de las animaciones
const animationDurations = [2, 2, 2]; // Duraciones de las animaciones en segundos

let currentAnimationIndex = 0;


function playNextAnimation() {
    // Si la secuencia automática fue desactivada, nos detenemos y limpiamos
    if (!autoSequenceActive) {
        lightsContainer.style.animation = 'none';
        return;
    }

    if (currentAnimationIndex < animations.length) {
        lightsContainer.style.animation = `${animations[currentAnimationIndex]} ${animationDurations[currentAnimationIndex]}s ease-in-out`;

        lightsContainer.addEventListener('animationend', () => {
            // Doble verificación antes de reiniciar el ciclo
            if (!autoSequenceActive) return;

            currentAnimationIndex = (currentAnimationIndex + 1) % animations.length;
            playNextAnimation();
        },
            {
                once: true
            });
    }
}



//Función para el Botón de Cambio de Encendido - Shuffle Button Function
const motionButtonEvent = {
    handleEvent: function (ev) {

        // DETENER la secuencia automática del contenedor
        autoSequenceActive = false;
        lightsContainer.style.animation = 'none';

        switch (contador) {
            // --- ANIMACIONES EXISTENTES (1-5) ---
            case 1: // MODO 1: "Chasing" (Persecución)
                lights.forEach((light, index) => {
                    light.style.backgroundColor = (index % 2 === 0) ? '#ffffff': '#00e5ff';
                    light.style.boxShadow = (index % 2 === 0) ? '0px 0px 35px #ffffff': '0px 0px 35px #00e5ff';
                    light.style.animation = `persecucion 1s linear ${index * 0.1}s infinite`;
                });
                break;

            case 2: // MODO 2: "Twinkle" (Parpadeo Aleatorio)
                lights.forEach((light) => {
                    const randomDuration = (Math.random() * 1 + 0.5).toFixed(2);
                    light.style.animation = `flash ${randomDuration}s ease-in-out infinite`;
                });
                break;

            case 3: // MODO 3: "Alternating" (Pares e Impares)
                lights.forEach((light, index) => {
                    if (index % 2 === 0) {
                        light.style.animation = `luces-alternadas 1s steps(1) infinite`;
                    } else {
                        light.style.animation = `luces-alternadas 1s steps(1) 0.5s infinite`;
                    }
                });
                break;

            case 4: // MODO 4: "Slo-Glo" (Ola suave)
                lights.forEach((light, index) => {
                    light.style.animation = `fade 2s ease-in-out ${index * 0.2}s infinite`;
                });
                break;

            case 5: // MODO 5: "Crazy Flash" (Estrobo)
                lights.forEach((light, index) => {
                    light.style.animation = `flash 0.4s ease-in-out ${index % 3 * 0.1}s infinite`;
                });
                break;

            // --- NUEVAS ANIMACIONES (6-8) ---

            case 6: // MODO 6: "Scanner" (Ida y Vuelta)
                lights.forEach((light, index) => {
                    // Usamos 'alternate' para que vaya y vuelva
                    light.style.animation = `persecucion 1.5s linear ${index * 0.1}s infinite alternate`;
                });
                break;

            case 7: // MODO 7: "Latido" (Heartbeat)
                lights.forEach((light) => {
                    // Sin retrasos (index), todos laten al mismo tiempo como un corazón vivo
                    light.style.animation = `latido 1.5s ease-in-out infinite`;
                });
                break;

            case 8: // MODO 8: "Explosión de Hielo" (Flash Bang)
                lights.forEach((light, index) => {
                    // Un pequeño retraso aleatorio hace que parezca escarcha brillando
                    light.style.animation = `explosion 2s ease-out ${index * 0.05}s infinite`;
                });
                break;

            // --- APAGADO ---

            case 9: // MODO 9: Reinicio (Estático)
                lights.forEach(light => {
                    light.style.animation = 'none';
                    light.style.opacity = '1';
                });
                break;

            default:
                contador = 0;
                break;
        }

        contador++;
        // ¡IMPORTANTE! Ahora el límite es 9, no 6
        if (contador > 9) contador = 1;;
    }
}

// Inicializa Evento Click para Botón de Encendido
onOffButton.addEventListener('click', () => {

    // 1. Lógica de Audio (Se mantiene igual)
    if (!isplaying) {
        audio.volume = 0.15;
        audio.play();
    } else {
        audio.pause();
        audio.currentTime = 0;
    }
    isplaying = !isplaying;

    // 2. Lógica de Imagen Central (Se mantiene igual)
    if (!isImageVisible) {
        christmasTitle.style.display = 'block'; // Mostramos el texto
        christmasTitle.classList.add('visible');
    } else {
        christmasTitle.style.display = 'none';
        christmasTitle.classList.remove('visible');
    }
    isImageVisible = !isImageVisible;

    // 3. Lógica de las Luces (AQUÍ ESTÁ EL CAMBIO PRINCIPAL)
    if (!isLightsOn) {
        // --- ESTADO: ENCENDIENDO (ON) ---

        autoSequenceActive = false; // Aseguramos que no arranque la secuencia automática
        lightsContainer.style.animation = 'none'; // Limpiamos animaciones del contenedor

        lights.forEach((light, index) => {
            // A) Les ponemos color
            if (index % 2 === 0) {
                // Blanco
                light.style.backgroundColor = '#ffffff';
                light.style.boxShadow = '0px 0px 35px #ffffff';
            } else {
                light.style.backgroundColor = '#00e5ff';
                light.style.boxShadow = '0px 0px 35px #00e5ff';
            }
            // B) Les quitamos la animación para que queden estáticas
            light.style.animation = 'none';
            light.style.opacity = '1';
        });

    } else {
        // --- ESTADO: APAGANDO (OFF) ---

        autoSequenceActive = false;
        lightsContainer.style.animation = 'none';

        lights.forEach(light => {
            // A) Les quitamos el color (Transparente) y la sombra
            light.style.backgroundColor = 'transparent';
            light.style.boxShadow = 'none';

            // B) Aseguramos que no haya animaciones corriendo
            light.style.animation = 'none';
        });
    }

    // Invertimos el estado
    isLightsOn = !isLightsOn;
});

//Inicializa Evento Click para Botón de Animación
motionButton.addEventListener('click', motionButtonEvent);

// Función para calcular el tiempo restante hasta Navidad
function countdown() {
    const now = new Date();
    const christmas = new Date(now.getFullYear(),
        11,
        25); // 25 de diciembre

    const timeLeft = christmas - now;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // Actualiza el contenido de los elementos del contador
    document.getElementById("days").textContent = formatTime(days);
    document.getElementById("hours").textContent = formatTime(hours);
    document.getElementById("minutes").textContent = formatTime(minutes);
    document.getElementById("seconds").textContent = formatTime(seconds);
}

// Función para formatear el tiempo en dos dígitos (agrega ceros a la izquierda si es necesario)
function formatTime(time) {
    return time < 10 ? `0${time}`: time;
}

// Actualiza el contador cada segundo
setInterval(countdown, 1000);

// Inicializa el contador
countdown();

//Inicializa Crear Nieve
const body = document.querySelector('body')

const crearNieve = () => {
    let copo = document.createElement('i')
    let x = innerWidth * Math.random()
    let size = (Math.random()*8) + 2
    let z = Math.round(Math.random())*100
    let delay = Math.random()*5
    let anima = (Math.random()*10)+5

    copo.style.left = x + 'px'
    copo.style.width = size + 'px'
    copo.style.height = size + 'px'
    copo.style.zIndex = z
    copo.style.animationDelay = delay + 's'
    copo.style.animationDuration = anima + 's'

    body.appendChild(copo)

    setTimeout(()=> {
        copo.remove()
    },
        anima*1000);
}

setInterval(crearNieve, 100)

// --- CONTADOR DE VISITAS (Simulado/Persistente) ---
function updateVisitorCounter() {
    const counterElement = document.getElementById('visit-count');
    
    // 1. Revisamos si ya existe un número guardado en el navegador
    let visits = localStorage.getItem('site_visits');
    
    if (!visits) {
        // Si es la primera vez, inventamos un número base para que se vea popular
        // Genera un número entre 12,000 y 15,000
        visits = Math.floor(Math.random() * (15000 - 12000 + 1) + 12000);
    } else {
        // Si ya existe, lo convertimos a número
        visits = parseInt(visits);
    }
    
    // 2. Sumamos la visita actual
    visits++;
    
    // 3. Guardamos el nuevo total
    localStorage.setItem('site_visits', visits);
    
    // 4. Mostramos el número con formato de miles (ej: 12,450)
    counterElement.textContent = visits.toLocaleString();
}

// Ejecutamos el contador
updateVisitorCounter();
