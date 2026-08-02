export const demoStudents = [
  { id: 1, name: 'Isabella', surname: 'Rosario', avatar: 'IR' },
  { id: 2, name: 'Mateo', surname: 'Jiménez', avatar: 'MJ' },
  { id: 3, name: 'Valentina', surname: 'Cruz', avatar: 'VC' },
  { id: 4, name: 'Sebastián', surname: 'García', avatar: 'SG' },
  { id: 5, name: 'Camila', surname: 'Reyes', avatar: 'CR' },
];

export const demoActivities = [
  { id: 1, title: 'Ensayo Crítico sobre Historia', type: 'Rubrica', maxScore: 100 },
  { id: 2, title: 'Proyecto de Ciencias Naturales', type: 'Rubrica', maxScore: 100 },
  { id: 3, title: 'Participación y Trabajo en Equipo', type: 'Cotejo', maxScore: 100 },
];

export const demoRubricTemplate = {
  id: 1,
  title: 'Rúbrica de Ensayo Analítico',
  criterios: [
    {
      id: 101,
      name: 'Estructura y Coherencia',
      weight: 40,
      levels: [
        { id: 1, score: 100, desc: 'Estructura impecable y flujo lógico perfecto.' },
        { id: 2, score: 85, desc: 'Buena estructura general, algunos saltos menores.' },
        { id: 3, score: 70, desc: 'Estructura básica, ideas a veces desconectadas.' },
        { id: 4, score: 55, desc: 'Carece de estructura lógica evidente.' },
      ]
    },
    {
      id: 102,
      name: 'Argumentación Crítica',
      weight: 40,
      levels: [
        { id: 5, score: 100, desc: 'Argumentos profundos respaldados por evidencias sólidas.' },
        { id: 6, score: 85, desc: 'Buenos argumentos pero faltan algunas referencias.' },
        { id: 7, score: 70, desc: 'Argumentos superficiales o repetitivos.' },
        { id: 8, score: 55, desc: 'Sin argumentación válida.' },
      ]
    },
    {
      id: 103,
      name: 'Ortografía y Gramática',
      weight: 20,
      levels: [
        { id: 9, score: 100, desc: 'Sin errores gramaticales u ortográficos.' },
        { id: 10, score: 85, desc: 'Errores mínimos que no afectan la lectura.' },
        { id: 11, score: 70, desc: 'Errores frecuentes que dificultan la lectura.' },
        { id: 12, score: 55, desc: 'Múltiples errores graves.' },
      ]
    }
  ]
};

export const demoCotejoTemplate = {
  id: 2,
  title: 'Lista de Cotejo de Participación',
  criterios: [
    { id: 201, name: 'Aporta ideas constructivas al grupo', weight: 33.3 },
    { id: 202, name: 'Respeta el turno de los demás', weight: 33.3 },
    { id: 203, name: 'Mantiene una actitud colaborativa', weight: 33.4 },
  ]
};

// Generar calificaciones iniciales aleatorias altas para que se vea bien
export const generateInitialGrades = () => {
  const grades: Record<string, number> = {};
  demoStudents.forEach(st => {
    demoActivities.forEach(act => {
      const key = `${st.id}-${act.id}`;
      // Random score between 80 and 100
      grades[key] = Math.floor(Math.random() * (100 - 80 + 1)) + 80;
    });
  });
  return grades;
};

// Para mantener memoria de lo que el usuario seleccionó dentro de una rúbrica
export const generateInitialRubricSelections = () => {
  const selections: Record<string, Record<number, number>> = {};
  demoStudents.forEach(st => {
    // Solo para actividad 1 (Ensayo)
    selections[`${st.id}-1`] = { 101: 1, 102: 5, 103: 9 }; // Niveles más altos por defecto
  });
  return selections;
};

// Para mantener memoria de los checks del cotejo
export const generateInitialCotejoChecks = () => {
  const checks: Record<string, Record<number, boolean>> = {};
  demoStudents.forEach(st => {
    // Solo para actividad 3 (Cotejo)
    checks[`${st.id}-3`] = { 201: true, 202: true, 203: true };
  });
  return checks;
};
