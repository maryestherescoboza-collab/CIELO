import type { Centro } from '../../types';

export const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const GRAVEDAD_LABELS: Record<string, string> = {
    leve: 'Primera Vez',
    moderada: 'Recurrente',
    grave: 'Persistente',
};

export const ESTADO_CENTRO_LABELS: Record<string, string> = {
    activo: 'Activo',
    pendiente: 'Pendiente',
    suspendido: 'Suspendido',
    cancelado: 'Cancelado',
};

export const ESTADO_CENTRO_COLORS: Record<string, string> = {
    activo: 'bg-[#188038]/10 text-[#188038]',
    pendiente: 'bg-[#F5BC5D]/20 text-[#8A651F]',
    suspendido: 'bg-[#EB8847]/10 text-[#A34B22]',
    cancelado: 'bg-[#D93025]/10 text-[#D93025]',
};

export const ESTADO_CODIGO_LABELS: Record<string, string> = {
    activo: 'Activo',
    inactivo: 'Inactivo',
    expirado: 'Expirado',
};

export const ESTADO_CODIGO_COLORS: Record<string, string> = {
    activo: 'bg-[#188038]/10 text-[#188038]',
    inactivo: 'bg-[#6B7280]/10 text-[#6B7280]',
    expirado: 'bg-[#EB8847]/10 text-[#A34B22]',
};

export const centroToForm = (c: Centro) => ({
    nombre: c.nombre || '',
    codigo_centro: c.codigoCentro || '',
    tanda: c.tanda || '',
    telefono: c.telefono || '',
    distrito_educativo: c.distritoEducativo || '',
    regional_educacion: c.regionalEducacion || '',
    provincia: c.provincia || '',
    municipio: c.municipio || '',
    estado: (c.estado as string) || 'activo',
});

export const inputCls = "w-full bg-white border border-[#E6E1D8] rounded-xl px-4 py-2.5 text-[13px] text-[#3F3C36] placeholder:text-[#6B7280]/60 outline-none focus:border-[#6F94AF] focus:ring-2 focus:ring-[#6F94AF]/20 transition-all shadow-sm";

export function formatFechaCorta(fecha?: string | null) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}
