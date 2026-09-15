export async function calculateHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export function cleanTechnicalText(text: string): string {
    if (!text) return '';
    return text
        // Eliminar caracteres de control invisibles (zero-width)
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Normalizar saltos de línea (eliminar retornos de carro)
        .replace(/\r\n/g, '\n')
        // Reducir espacios consecutivos horizontales a uno solo
        .replace(/[ \t]{2,}/g, ' ')
        // Reducir más de dos saltos de línea a dos
        .replace(/\n{3,}/g, '\n\n')
        // Hacer trim a cada línea sin borrar líneas vacías deliberadas
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
}
