import { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
    "Tu bienestar no es un extra en el plan de clase, es el plan principal.",
    "Planificar está bien, respirar está mejor.",
    "Un profesor descansado no es un lujo, es una necesidad.",
    "El mejor recurso que tienes no es la pizarra digital, eres tú.",
    "Cuida de ti con la misma intensidad con la que cuidas de ellos.",
    "No dejes que tu lista de tareas se lleve tu mejor versión.",
    "Tu energía es el recurso más valioso del aula. Recárgala.",
    "El silencio después de clase también es parte del trabajo.",
    "No eres una máquina de corregir, eres una persona que inspira.",
    "A veces, el mejor acto pedagógico es tomarte un café a solas.",
    "Mientras cargamos, respira. Lo demás puede esperar unos segundos.",
    "Tu aula empieza aquí, pero tú también importas.",
    "Todo listo para que dediques menos tiempo a organizar y más a enseñar.",
    "La tecnología trabaja para ti. Tú encárgate de enseñar.",
    "Menos tiempo buscando. Más tiempo enseñando.",
    "Tu trabajo ya es bastante. Dejemos que CIELO se encargue de lo demás.",
    "Preparando tu espacio de trabajo…",
    "Cargando módulos…",
    "Inicializando módulos…",
    "Preparando módulos…",
    "Cargando estructura de módulos…",
    "Verificando módulos disponibles…",
    "Organizando tu espacio de trabajo…",
    "Preparando tus herramientas…",
    "Sincronizando tu información…",
    "Configurando tu experiencia…",
    "Un momento, estamos dejando todo listo…",
    "Casi listo. Terminando de preparar tu espacio…"
];

let lastStartIndex = -1;

function pickStartIndex() {
    let next = Math.floor(Math.random() * LOADING_MESSAGES.length);
    if (next === lastStartIndex) next = (next + 1) % LOADING_MESSAGES.length;
    lastStartIndex = next;
    return next;
}

export default function LoadingMessage() {
    const [index, setIndex] = useState(pickStartIndex);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const fadeMs = 800;
        let fadeTimeout: ReturnType<typeof setTimeout> | undefined;
        const timer = setInterval(() => {
            setFading(true);
            fadeTimeout = setTimeout(() => {
                setIndex(i => (i + 1) % LOADING_MESSAGES.length);
                setFading(false);
            }, fadeMs);
        }, 3500);

        return () => {
            clearInterval(timer);
            if (fadeTimeout !== undefined) clearTimeout(fadeTimeout);
        };
    }, []);

    return (
        <h2 className={`font-['Poppins'] text-[23px] font-black text-(--ink) transition-opacity duration-800 ease-in-out ${fading ? 'opacity-0' : 'opacity-100'}`}>
            {LOADING_MESSAGES[index]}
        </h2>
    );
}