export interface Asignatura {
  id: string; // slug
  nombre: string;
}

export const ASIGNATURAS_CATALOGO: Asignatura[] = [
  { id: 'lengua_espanola', nombre: 'Lengua Española' },
  { id: 'ingles', nombre: 'Lenguas Extranjeras (Inglés)' },
  { id: 'frances', nombre: 'Lenguas Extranjeras (Francés)' },
  { id: 'matematica', nombre: 'Matemática' },
  { id: 'ciencias_sociales', nombre: 'Ciencias Sociales' },
  { id: 'ciencias_naturaleza', nombre: 'Ciencias de la Naturaleza' },
  { id: 'artistica', nombre: 'Educación Artística' },
  { id: 'educacion_fisica', nombre: 'Educación Física' },
  { id: 'formacion_integral', nombre: 'Formación Integral Humana y Religiosa' },
];

export interface AsignaturaOficial {
  id: string; // slug
  nombre: string; // Nombre oficial completo
  nombreCorto: string; // Para mensajes contextuales ("Tu profesor de Sociales...")
  icono: string;
  color: string;
  bgColor: string;
}

/**
 * Las 7 asignaturas curriculares oficiales del plan de estudios de CIELO.
 */
export const SIETE_ASIGNATURAS_OFICIALES: AsignaturaOficial[] = [
  { 
    id: 'lengua_espanola', 
    nombre: 'Lengua Española', 
    nombreCorto: 'Lengua Española', 
    icono: '📖', 
    color: '#3B82F6',
    bgColor: '#EFF6FF'
  },
  { 
    id: 'matematica', 
    nombre: 'Matemática', 
    nombreCorto: 'Matemática', 
    icono: '📐', 
    color: '#10B981',
    bgColor: '#ECFDF5'
  },
  { 
    id: 'ciencias_sociales', 
    nombre: 'Ciencias Sociales', 
    nombreCorto: 'Sociales', 
    icono: '🌍', 
    color: '#F59E0B',
    bgColor: '#FFFBEB'
  },
  { 
    id: 'ciencias_naturaleza', 
    nombre: 'Ciencias de la Naturaleza', 
    nombreCorto: 'Ciencias de la Naturaleza', 
    icono: '🔬', 
    color: '#06B6D4',
    bgColor: '#ECFEFF'
  },
  { 
    id: 'ingles', 
    nombre: 'Lenguas Extranjeras (Inglés)', 
    nombreCorto: 'Inglés', 
    icono: '🌐', 
    color: '#8B5CF6',
    bgColor: '#F5F3FF'
  },
  { 
    id: 'educacion_fisica', 
    nombre: 'Educación Física', 
    nombreCorto: 'Educación Física', 
    icono: '⚽', 
    color: '#EC4899',
    bgColor: '#FDF2F8'
  },
  { 
    id: 'artistica', 
    nombre: 'Educación Artística', 
    nombreCorto: 'Educación Artística', 
    icono: '🎨', 
    color: '#F97316',
    bgColor: '#FFF7ED'
  },
];

export const getMensajeDocenteNoUsaCielo = (nombreAsignatura: string): string => {
  const nombre = (nombreAsignatura || '').trim() || 'esta asignatura';
  return `Tu docente de ${nombre} aún no evalúa a sus estudiantes con CIELO`;
};

export const sonMismaAsignatura = (a: string | null | undefined, b: string | null | undefined): boolean => {
  if (!a || !b) return false;
  const clean = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const ca = clean(a);
  const cb = clean(b);
  if (ca === cb) return true;
  if (ca.includes('lengua') && cb.includes('lengua')) return true;
  if (ca.includes('matematica') && cb.includes('matematica')) return true;
  if (ca.includes('social') && cb.includes('social')) return true;
  if (ca.includes('naturaleza') && cb.includes('naturaleza')) return true;
  if (ca.includes('ingl') && cb.includes('ingl')) return true;
  if (ca.includes('fisica') && cb.includes('fisica') && !ca.includes('naturaleza') && !cb.includes('naturaleza')) return true;
  if (ca.includes('artistic') && cb.includes('artistic')) return true;
  return false;
};

export const getAsignaturaNombre = (id: string | null | undefined): string => {
  if (!id) return 'Sin Asignatura';
  const found = ASIGNATURAS_CATALOGO.find(a => a.id === id);
  return found ? found.nombre : id;
};

export const getAsignaturaId = (nombre: string | null | undefined): string => {
  if (!nombre) return 'otra';
  const found = ASIGNATURAS_CATALOGO.find(a => a.nombre.toLowerCase() === nombre.toLowerCase());
  return found ? found.id : 'otra';
};
