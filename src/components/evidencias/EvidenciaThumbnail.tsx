import React, { useEffect, useState } from 'react';
import { 
    FileText, 
    Image as ImageIcon, 
    Video, 
    FileAudio, 
    File, 
    FileType2,
    FileSpreadsheet,
    Presentation,
} from 'lucide-react';
import { renderizarMiniaturaPdf } from '../../utils/pdfThumbnail';

interface EvidenciaThumbnailProps {
    /** URL firmada del archivo original en Supabase (si aplica) */
    url: string | null;
    /** URL de la miniatura directa (por ejemplo, desde Google Drive o pregenerada) */
    thumbnailUrl?: string | null;
    mimeType: string | null;
    nombre: string | null;
    /** Color de fondo opcional según el nivel de logro */
    tintBg?: string | null;
    /** Color de icono temático opcional */
    tintIconColor?: string | null;
    className?: string;
    rounded?: string;
}

function obtenerFormatoOfimatica(nombre: string | null, mime: string | null): {
    tipo: 'word' | 'excel' | 'powerpoint' | 'pdf' | 'video' | 'audio' | 'imagen' | 'otro';
    colorBg: string;
    colorIcono: string;
    extension: string;
} {
    const ext = (nombre || '').split('.').pop()?.toLowerCase() || '';
    const m = (mime || '').toLowerCase();

    if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
        return { tipo: 'imagen', colorBg: '#F1F5F9', colorIcono: '#166534', extension: ext.toUpperCase() || 'IMG' };
    }
    if (m === 'application/pdf' || ext === 'pdf') {
        return { tipo: 'pdf', colorBg: '#FEF2F2', colorIcono: '#DC2626', extension: 'PDF' };
    }
    if (m.includes('spreadsheet') || m.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
        return { tipo: 'excel', colorBg: '#F0FDF4', colorIcono: '#16A34A', extension: ext.toUpperCase() || 'XLS' };
    }
    if (m.includes('presentation') || m.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) {
        return { tipo: 'powerpoint', colorBg: '#FFF7ED', colorIcono: '#EA580C', extension: ext.toUpperCase() || 'PPT' };
    }
    if (m.includes('word') || m.includes('document') || ['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
        return { tipo: 'word', colorBg: '#EFF6FF', colorIcono: '#2563EB', extension: ext.toUpperCase() || 'DOC' };
    }
    if (m.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
        return { tipo: 'video', colorBg: '#FAF5FF', colorIcono: '#9333EA', extension: ext.toUpperCase() || 'VID' };
    }
    if (m.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) {
        return { tipo: 'audio', colorBg: '#FDF2F8', colorIcono: '#DB2777', extension: ext.toUpperCase() || 'AUD' };
    }

    return { tipo: 'otro', colorBg: '#F8FAFC', colorIcono: '#64748B', extension: ext.toUpperCase() || 'FILE' };
}

const EvidenciaThumbnail: React.FC<EvidenciaThumbnailProps> = ({
    url,
    thumbnailUrl,
    mimeType,
    nombre,
    tintBg,
    tintIconColor,
    className = '',
    rounded = 'rounded-[8px]',
}) => {
    const [fallo, setFallo] = useState(false);
    const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    const formato = obtenerFormatoOfimatica(nombre, mimeType);

    // Cargar dinámicamente miniatura de la primera página de PDF si no hay thumbnail previo
    useEffect(() => {
        let montado = true;
        if (formato.tipo === 'pdf' && !thumbnailUrl && url && !fallo && !pdfThumbnail && !generandoPdf) {
            setGenerandoPdf(true);
            renderizarMiniaturaPdf(url)
                .then((thumb) => {
                    if (montado && thumb) {
                        setPdfThumbnail(thumb);
                    }
                })
                .catch(() => {
                    // Silenciosamente usar icono de respaldo
                })
                .finally(() => {
                    if (montado) setGenerandoPdf(false);
                });
        }
        return () => {
            montado = false;
        };
    }, [formato.tipo, thumbnailUrl, url, fallo, pdfThumbnail, generandoPdf]);

    const urlVisual = thumbnailUrl || pdfThumbnail || (formato.tipo === 'imagen' ? url : null);
    const mostrarImagen = !fallo && Boolean(urlVisual);

    const Icono = (() => {
        switch (formato.tipo) {
            case 'excel':
                return FileSpreadsheet;
            case 'powerpoint':
                return Presentation;
            case 'word':
                return FileText;
            case 'pdf':
                return FileType2;
            case 'video':
                return Video;
            case 'audio':
                return FileAudio;
            case 'imagen':
                return ImageIcon;
            default:
                return File;
        }
    })();

    const finalBg = tintBg || formato.colorBg;
    const finalIconColor = tintIconColor || formato.colorIcono;

    return (
        <div 
            className={`relative overflow-hidden flex items-center justify-center ${rounded} ${className}`} 
            style={{ backgroundColor: finalBg }}
        >
            {mostrarImagen ? (
                <img
                    src={urlVisual!}
                    alt={nombre || 'Evidencia'}
                    loading="lazy"
                    onError={() => setFallo(true)}
                    className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                />
            ) : formato.tipo === 'video' && url && !fallo ? (
                <video
                    src={url}
                    muted
                    playsInline
                    preload="metadata"
                    onError={() => setFallo(true)}
                    className="w-full h-full object-cover bg-black"
                />
            ) : (
                <div 
                    className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 select-none"
                    style={{ color: finalIconColor }}
                >
                    <Icono size={28} strokeWidth={1.5} />
                    {formato.tipo !== 'imagen' && (
                        <span 
                            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-current/20 bg-white/70"
                        >
                            {formato.extension}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(EvidenciaThumbnail);
