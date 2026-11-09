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

export const OPCION_AGREGAR_OPTATIVA = '__agregar_optativa__';
export const PREFIJO_ASIGNATURA_OPTATIVA = 'optativa:';

/**
 * Limpia el prefijo interno `optativa:` si está presente.
 */
export const limpiarPrefijoOptativa = (valor: string | null | undefined): string => {
  if (!valor) return '';
  const trimmed = String(valor).trim();
  if (trimmed.toLowerCase().startsWith(PREFIJO_ASIGNATURA_OPTATIVA)) {
    return trimmed.slice(PREFIJO_ASIGNATURA_OPTATIVA.length).trim();
  }
  return trimmed;
};

/**
 * Crea el identificador interno para una asignatura optativa personalizada.
 * Ejemplo: "Robótica Educativa" -> "optativa:Robótica Educativa"
 */
export const crearAsignaturaOptativaId = (nombre: string): string => {
  const limpio = limpiarPrefijoOptativa(nombre).replace(/\s+/g, ' ').trim();
  return limpio ? `${PREFIJO_ASIGNATURA_OPTATIVA}${limpio}` : '';
};

/**
 * Determina si un identificador o nombre corresponde a una asignatura oficial del catálogo de CIELO.
 */
export const esAsignaturaOficial = (idOrNombre: string | null | undefined): boolean => {
  if (!idOrNombre) return false;
  const raw = String(idOrNombre).trim();
  if (!raw || raw.toLowerCase().startsWith(PREFIJO_ASIGNATURA_OPTATIVA)) return false;
  const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ASIGNATURAS_CATALOGO.some(a => {
    const idNorm = a.id.toLowerCase();
    const nombreNorm = a.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return norm === idNorm || norm === nombreNorm;
  });
};

/**
 * Determina si una asignatura es optativa / personalizada (creada por el docente).
 */
export const esAsignaturaOptativa = (idOrNombre: string | null | undefined): boolean => {
  if (!idOrNombre) return false;
  const raw = String(idOrNombre).trim();
  if (!raw || raw === 'Sin Asignatura' || raw === 'otra' || raw === OPCION_AGREGAR_OPTATIVA) return false;
  if (raw.toLowerCase().startsWith(PREFIJO_ASIGNATURA_OPTATIVA)) return true;
  return !esAsignaturaOficial(raw);
};

export const sonMismaAsignatura = (a: string | null | undefined, b: string | null | undefined): boolean => {
  if (!a || !b) return false;
  const clean = (s: string) =>
    limpiarPrefijoOptativa(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  const ca = clean(a);
  const cb = clean(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;

  // Si alguna de las dos está marcada explícitamente como optativa, exigir coincidencia exacta normalizada
  const optA = String(a).trim().toLowerCase().startsWith(PREFIJO_ASIGNATURA_OPTATIVA);
  const optB = String(b).trim().toLowerCase().startsWith(PREFIJO_ASIGNATURA_OPTATIVA);
  if (optA || optB) {
    return ca === cb;
  }

  // Lengua Española / Español: NUNCA debe coincidir con Lenguas Extranjeras (Inglés o Francés)
  const esEspanolA = (ca.includes('lengua') || ca.includes('espanol')) && !ca.includes('ingl') && !ca.includes('extranjer') && !ca.includes('franc');
  const esEspanolB = (cb.includes('lengua') || cb.includes('espanol')) && !cb.includes('ingl') && !cb.includes('extranjer') && !cb.includes('franc');
  if (esEspanolA && esEspanolB) return true;

  // Inglés / Lenguas Extranjeras (Inglés)
  if (ca.includes('ingl') && cb.includes('ingl')) return true;

  // Francés / Lenguas Extranjeras (Francés)
  if (ca.includes('franc') && cb.includes('franc')) return true;

  // Matemática
  if (ca.includes('matematica') && cb.includes('matematica')) return true;

  // Ciencias Sociales
  if (ca.includes('social') && cb.includes('social') && !ca.includes('naturaleza') && !cb.includes('naturaleza')) return true;

  // Ciencias de la Naturaleza
  if (ca.includes('naturaleza') && cb.includes('naturaleza')) return true;

  // Educación Física (nunca debe coincidir con Ciencias de la Naturaleza / física)
  if (ca.includes('fisica') && cb.includes('fisica') && !ca.includes('naturaleza') && !cb.includes('naturaleza')) return true;

  // Educación Artística
  if (ca.includes('artistic') && cb.includes('artistic')) return true;

  // Formación Integral
  if (ca.includes('formacion') && cb.includes('formacion')) return true;

  return false;
};

export const getAsignaturaNombre = (id: string | null | undefined): string => {
  if (!id) return 'Sin Asignatura';
  const raw = String(id).trim();
  if (raw.toLowerCase().startsWith(PREFIJO_ASIGNATURA_OPTATIVA)) {
    return limpiarPrefijoOptativa(raw) || 'Asignatura Optativa';
  }
  const found = ASIGNATURAS_CATALOGO.find(a => a.id === raw);
  return found ? found.nombre : raw;
};

export const getAsignaturaId = (nombre: string | null | undefined): string => {
  if (!nombre) return 'otra';
  const raw = String(nombre).trim();
  if (raw.toLowerCase().startsWith(PREFIJO_ASIGNATURA_OPTATIVA)) {
    return crearAsignaturaOptativaId(raw);
  }
  const found = ASIGNATURAS_CATALOGO.find(a => a.nombre.toLowerCase() === raw.toLowerCase() || a.id.toLowerCase() === raw.toLowerCase());
  return found ? found.id : 'otra';
};
