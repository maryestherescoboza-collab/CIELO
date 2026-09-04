/**
 * Generador de identificadores único en CIELO.
 *
 * A diferencia de `crypto.randomUUID()`, que solo está disponible en
 * contextos seguros (https / localhost) y por tanto Lanza si se invoca desde
 * el empaquetado de Electron (`file://`), esta utilidad genera identificadores
 * estables y únicos usando primitivas que existen en cualquier entorno.
 */
let counter = 0;

export function uid(prefix?: string): string {
  counter += 1;
  const base = `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return prefix ? `${prefix}-${base}` : base;
}