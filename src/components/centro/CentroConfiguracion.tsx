import { useState } from 'react';
import { Building2, MapPin, Save, CheckCircle2, XCircle, PhoneCall } from 'lucide-react';
import { useCentroActions } from '../../hooks/useCentroActions';
import { centroToForm, inputCls, formatFechaCorta } from './centroUi';
import { Campo } from './Campo';
import CentroCompartirId from './CentroCompartirId';
import type { Centro } from '../../types';

interface Props {
    centroId: string;
    centro: Centro;
    onCentroActualizado: (centro: Centro) => void;
}

export default function CentroConfiguracion({ centroId, centro, onCentroActualizado }: Props) {
    const { updateCentro } = useCentroActions();

    const [formCentro, setFormCentro] = useState(() => centroToForm(centro));
    const [guardandoCentro, setGuardandoCentro] = useState(false);
    const [msgConfig, setMsgConfig] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

    const setCampoCentro = (campo: keyof typeof formCentro, valor: string) => {
        setFormCentro(prev => ({ ...prev, [campo]: valor }));
        setMsgConfig(null);
    };

    const guardarCentro = async () => {
        if (!formCentro.nombre.trim()) {
            setMsgConfig({ tipo: 'error', texto: 'El nombre del centro es obligatorio.' });
            return;
        }
        setGuardandoCentro(true);
        setMsgConfig(null);
        try {
            const centroDb = await updateCentro(centroId, {
                nombre: formCentro.nombre.trim(),
                tanda: formCentro.tanda.trim(),
                telefono: formCentro.telefono.trim(),
                distrito_educativo: formCentro.distrito_educativo.trim(),
                regional_educacion: formCentro.regional_educacion.trim(),
                provincia: formCentro.provincia.trim(),
                municipio: formCentro.municipio.trim(),
                estado: formCentro.estado as 'pendiente' | 'activo' | 'suspendido' | 'cancelado',
            });
            if (!centroDb) throw new Error('La actualización del centro no devolvió datos.');
            setFormCentro(centroToForm(centroDb));
            onCentroActualizado(centroDb);
            setMsgConfig({ tipo: 'success', texto: 'Cambios guardados correctamente.' });
        } catch (err) {
            console.error('[CentroConfiguracion] Error al guardar el centro:', err);
            setMsgConfig({ tipo: 'error', texto: 'No se pudieron guardar los cambios. Inténtalo de nuevo.' });
        } finally {
            setGuardandoCentro(false);
        }
    };

    return (
        <section className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] overflow-hidden">
            <header className="px-5 py-3.5 border-b border-[#E6E1D8] flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D8] flex items-center justify-center text-primary shrink-0">
                    <Building2 size={16} />
                </span>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-[#3F3C36]">Configuración del centro</h2>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Datos generales del centro</p>
                </div>
                <div className="ml-auto flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-medium text-[#6B7280]">
                        Actualizado: {centro.updatedAt ? formatFechaCorta(centro.updatedAt) : '—'}
                    </span>
                </div>
            </header>

            <div className="px-5 py-3.5 space-y-4">
                {/* Bloque · Información general */}
                <div className="rounded-xl bg-white border border-[#E6E1D8] p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 size={14} className="text-primary" />
                        <h3 className="text-[13px] font-semibold text-[#3F3C36]">Información general</h3>
                    </div>
                    {/* Bloque · ID del centro (solo lectura, compartible con docentes) */}
                    <div className="mb-3">
                        <CentroCompartirId centroId={centroId} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Campo label="Nombre del centro" required>
                            <input
                                value={formCentro.nombre}
                                onChange={(e) => setCampoCentro('nombre', e.target.value)}
                                className={inputCls}
                            />
                        </Campo>

                        <Campo label="Tanda / Jornada">
                            <select
                                value={formCentro.tanda}
                                onChange={(e) => setCampoCentro('tanda', e.target.value)}
                                className={inputCls}
                            >
                                <option value="">Selecciona…</option>
                                <option value="Jornada Extendida">Jornada Extendida</option>
                                <option value="Matutina">Matutina</option>
                                <option value="Vespertina">Vespertina</option>
                                <option value="Nocturna">Nocturna</option>
                            </select>
                        </Campo>
                    </div>
                </div>

                {/* Bloque · Contacto y ubicación */}
                <div className="rounded-xl bg-white border border-[#E6E1D8] p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} className="text-primary" />
                        <h3 className="text-[13px] font-semibold text-[#3F3C36]">Contacto y ubicación</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Campo label="Teléfono">
                            <input
                                type="tel"
                                value={formCentro.telefono}
                                onChange={(e) => setCampoCentro('telefono', e.target.value)}
                                className={inputCls}
                            />
                        </Campo>
                        <Campo label="Distrito educativo">
                            <input
                                value={formCentro.distrito_educativo}
                                onChange={(e) => setCampoCentro('distrito_educativo', e.target.value)}
                                className={inputCls}
                            />
                        </Campo>
                        <Campo label="Regional de educación">
                            <input
                                value={formCentro.regional_educacion}
                                onChange={(e) => setCampoCentro('regional_educacion', e.target.value)}
                                className={inputCls}
                            />
                        </Campo>
                        <Campo label="Provincia">
                            <input
                                value={formCentro.provincia}
                                onChange={(e) => setCampoCentro('provincia', e.target.value)}
                                className={inputCls}
                            />
                        </Campo>
                        <Campo label="Municipio">
                            <input
                                value={formCentro.municipio}
                                onChange={(e) => setCampoCentro('municipio', e.target.value)}
                                className={inputCls}
                            />
                        </Campo>
                    </div>
                </div>

                {/* Bloque · Cancelar suscripción */}
                <div className="rounded-xl bg-white border border-[#E6E1D8] p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <PhoneCall size={14} className="text-primary" />
                        <h3 className="text-[13px] font-semibold text-[#3F3C36]">Cancelar suscripción</h3>
                    </div>
                    <p className="text-[13px] text-[#6B7280] max-w-lg leading-relaxed">
                        Si deseas cancelar la suscripción de tu centro, contacta a nuestro equipo de soporte para solicitar la cancelación.
                    </p>
                    <a
                        href="tel:+18093132365"
                        aria-label="Llamar a soporte al 1 809 313 2365"
                        title="Llamar a soporte: 1 809 313 2365"
                        className="mt-4 inline-flex items-center gap-3 rounded-xl border border-[#E6E1D8] bg-[#F9F8F6] px-4 py-3 hover:bg-white hover:border-primary transition-colors group"
                    >
                        <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <PhoneCall size={16} />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-[11px] font-medium text-[#6B7280] group-hover:text-[#3F3C36] transition-colors">Contactar a un agente</span>
                            <span className="block text-[15px] font-semibold text-[#3F3C36] tabular-nums">1 809 313 2365</span>
                        </span>
                    </a>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={guardarCentro}
                        disabled={guardandoCentro}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-white text-[13px] font-semibold px-4 py-2 hover:bg-[#5F839E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Save size={15} />
                        {guardandoCentro ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    {msgConfig && (
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                            msgConfig.tipo === 'success' ? 'text-[#188038]' : 'text-[#D93025]'
                        }`}>
                            {msgConfig.tipo === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {msgConfig.texto}
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}
