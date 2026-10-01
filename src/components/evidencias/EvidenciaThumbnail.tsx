import React from 'react';
import { FileText, Image as ImageIcon, Video, FileAudio, File, FileType2 } from 'lucide-react';
import { descriptorEvidencia } from '../../lib/evidenciasApi';

/**
 * Miniatura de una evidencia.
 *
 * La miniatura es la protagonista del grid, asi que el marco tiene altura fija y
 * `object-cover`: las entregas de un grupo tienen proporciones muy distintas y
 * una rejilla que baila al cargar es justo lo que hace lento el repaso.
 *
 * Solo se pinta la imagen real cuando hay URL firmada Y el tipo es imagen o
 * video. Para PDF, documento y audio se muestra el icono con la extension, sin
 * inventar un render: la app no trae visor de PDF y meter pdf.js por esto seria
 * una dependencia de peso para un caso que el docente resuelve con "Abrir
 * archivo".
 */

const ICONOS = {
    imagen: ImageIcon,
    video: Video,
    pdf: FileType2,
    documento: FileText,
    audio: FileAudio,
    otro: File,
} as const;

interface EvidenciaThumbnailProps {
    /** URL firmada del archivo original en Supabase (si aplica) */
    url: string | null;
    /** URL de la miniatura directa (por ejemplo, desde Google Drive) */
    thumbnailUrl?: string | null;
    mimeType: string | null;
    nombre: string | null;
    /** Texto pequeno arriba a la izquierda, p. ej. el periodo. */
    etiqueta?: string | null;
    className?: string;
    rounded?: string;
}

const EvidenciaThumbnail: React.FC<EvidenciaThumbnailProps> = ({
    url,
    thumbnailUrl,
    mimeType,
    nombre,
    etiqueta,
    className = '',
    rounded = 'rounded-xl',
}) => {
    const [fallo, setFallo] = React.useState(false);
    const desc = descriptorEvidencia(mimeType, nombre);
    const Icono = ICONOS[desc.icono];
    const extension = (nombre || '').split('.').pop()?.slice(0, 4).toUpperCase();

    const mostrarReal = !fallo && ((thumbnailUrl) || (url && (desc.clase === 'imagen' || desc.clase === 'video')));
    const urlImagen = thumbnailUrl || url;

    return (
        <div className={`relative overflow-hidden bg-[#F1F1EC] border border-[#E4E3EC] ${rounded} ${className}`}>
            {mostrarReal ? (
                desc.clase === 'imagen' ? (
                    <img
                        src={urlImagen as string}
                        alt={nombre || 'Evidencia'}
                        loading="lazy"
                        onError={() => setFallo(true)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <video
                        src={urlImagen as string}
                        muted
                        playsInline
                        preload="metadata"
                        onError={() => setFallo(true)}
                        className="w-full h-full object-cover bg-black"
                    />
                )
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[#4E5566]">
                    <Icono size={26} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#767a76]">
                        {extension || desc.etiqueta}
                    </span>
                </div>
            )}

            {etiqueta ? (
                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-white/90 border border-[#E4E3EC] text-[9px] font-bold uppercase tracking-widest text-[#4E5566]">
                    {etiqueta}
                </span>
            ) : null}
        </div>
    );
};

export default React.memo(EvidenciaThumbnail);
