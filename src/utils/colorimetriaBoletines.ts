import React from 'react';

export interface BoletinTheme {
    main: string;
    medium: string;
    light: string;
    border: string;
}

export function getBoletinTheme(grado?: string | null): BoletinTheme {
    const g = String(grado || '').toLowerCase();
    
    // 1ro: Principal #556B2F
    if (g.includes('1')) {
        return { 
            main: '#556B2F', 
            medium: '#d4debf', // Color claro pero visible para headers, contraste con #000
            light: '#f1f5eb', // Fondo muy claro para celdas
            border: '#8a9a6e' 
        };
    }
    // 2do: Principal #87CEEB
    if (g.includes('2')) {
        return { 
            main: '#87CEEB', 
            medium: '#b5e3f5', 
            light: '#e6f6fc', 
            border: '#5ca6c8' 
        };
    }
    // 3er: Principal #FF8C00
    if (g.includes('3')) {
        return { 
            main: '#FF8C00', 
            medium: '#ffce8a', 
            light: '#fff0d9', 
            border: '#cc7000' 
        };
    }
    // 4to: Principal #16A085
    if (g.includes('4')) {
        return { 
            main: '#16A085', 
            medium: '#a2d6c9', 
            light: '#d7ece8', 
            border: '#84b0a9' 
        };
    }
    // 5to: Principal #C2155B
    if (g.includes('5')) {
        return { 
            main: '#C2155B', 
            medium: '#edaabf', 
            light: '#fbe9ef', 
            border: '#a3114b' 
        };
    }
    // 6to: Principal #1C3669
    if (g.includes('6')) {
        return { 
            main: '#1C3669', 
            medium: '#b0c5e3', 
            light: '#e4ebf5', 
            border: '#5b729e' 
        };
    }
    
    // Fallback Neutro
    return { 
        main: '#475569', 
        medium: '#cbd5e1', 
        light: '#f1f5f9', 
        border: '#94a3b8' 
    };
}

export const getBoletinCSSVariables = (grado?: string | null): React.CSSProperties => {
    const theme = getBoletinTheme(grado);
    
    return {
        '--boletin-main': theme.main,
        '--boletin-medium': theme.medium,
        '--boletin-light': theme.light,
        '--boletin-border': theme.border,
        '--boletin-text': '#000000', // El texto siempre será negro según la regla de oro
    } as React.CSSProperties;
};

/**
 * Retorna la ruta de la imagen institucional del grado correspondiente.
 * Si no se puede determinar de forma segura, retorna null para aplicar el fallback visual.
 */
export function getBoletinHeaderImage(grado?: string | null): string | null {
    if (!grado) return null;
    
    const g = String(grado).toLowerCase();
    
    if (g.includes('1')) return '/boletin_1ro_header.png';
    if (g.includes('2')) return '/boletin_2do_header.png';
    if (g.includes('3')) return '/boletin_3ro_header.png';
    if (g.includes('4')) return '/boletin_4to_header.png';
    if (g.includes('5')) return '/boletin_5to_header.png';
    if (g.includes('6')) return '/boletin_6to_header.png';
    
    // Fallback seguro
    return null;
}

