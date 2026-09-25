export interface NivelDominio {
    valor: number;
    etiqueta: string;
    descriptor: string;
}

export const NIVELES_DOMINIO: Record<number, NivelDominio> = {
    100: { valor: 100, etiqueta: 'Dominio completo', descriptor: 'Domina el indicador con autonomía.' },
    85: { valor: 85, etiqueta: 'Logro esperado', descriptor: 'Alcanza lo esperado con algunas dificultades.' },
    70: { valor: 70, etiqueta: 'Logro parcial', descriptor: 'Demuestra parcialmente el indicador.' },
    55: { valor: 55, etiqueta: 'Inicio', descriptor: 'Evidencia limitada; necesita apoyo.' },
};
