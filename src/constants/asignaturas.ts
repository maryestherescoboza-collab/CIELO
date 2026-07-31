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
