import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { buildOriginalUrl } from '../lib/googleDrive';
import { CieloPill } from './ui/CieloPill';

function ThumbnailImage({
  driveFileId,
  imagenUrl,
  fetchDriveThumbnail,
  onClick,
}: {
  driveFileId?: string;
  imagenUrl: string;
  fetchDriveThumbnail: (fileId: string) => Promise<string | null>;
  onClick: () => void;
}) {
  const [src, setSrc] = useState(driveFileId ? '' : imagenUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!driveFileId || fetchedRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fetchedRef.current) return;
        fetchedRef.current = true;
        observer.disconnect();

        fetchDriveThumbnail(driveFileId).then(url => {
          if (url) setSrc(url);
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [driveFileId, fetchDriveThumbnail]);

  return (
    <div ref={containerRef} className="w-14 h-14 shrink-0">
      {src ? (
        <img
          src={src}
          alt="Thumbnail"
          className="w-14 h-14 object-cover rounded-lg border border-(--border-soft) hover:scale-105 transition-transform cursor-pointer"
          onClick={onClick}
        />
      ) : (
        <div className="w-14 h-14 rounded-lg border border-(--border-soft) bg-slate-100 animate-pulse" />
      )}
    </div>
  );
}

interface Props {
  cursoId: number | null;
}

export default function RegistroAnecdotico({ cursoId }: Props) {
  const { state, session, setState } = useAppStore(useShallow(s => ({ state: s.state, session: s.session, setState: s.setAppState })));
  const drive = useGoogleDrive();

  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [recordDate, setRecordDate] = useState('');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordDesc, setRecordDesc] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState('');
  const [imageWarning, setImageWarning] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);
  const [driveUploadError, setDriveUploadError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (selectedFiles.length + files.length > 2) {
        setImageWarning('Solo se permiten hasta 2 imágenes por registro.');
        const allowedCount = 2 - selectedFiles.length;
        if (allowedCount <= 0) return;
        const allowedFiles = files.slice(0, allowedCount);
        setSelectedFiles(prev => [...prev, ...allowedFiles]);
        const newPreviews = allowedFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      } else {
        setImageWarning('');
        setSelectedFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      }
    }
  };

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    setImageWarning('');
  };

  const compressImage = (file: File): Promise<{ blob: Blob; ext: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1280;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              if (blob.type === 'image/webp') {
                resolve({ blob, ext: 'webp' });
              } else {
                canvas.toBlob((jpegBlob) => {
                  resolve({ blob: jpegBlob || file, ext: 'jpg' });
                }, 'image/jpeg', 0.78);
              }
            } else {
              resolve({ blob: file, ext: 'jpg' });
            }
          }, 'image/webp', 0.78);
        };
      };
    });
  };

  const handleSaveRecord = async () => {
    if (!session?.user?.id || !cursoId) return;

    if (selectedFiles.length > 0 && !drive.isConnected) {
      setDriveUploadError('Debes conectar Google Drive para subir fotografías. Haz clic en "Conectar Google Drive" arriba.');
      return;
    }

    setIsSaving(true);
    setDriveUploadError('');
    setOptimizationProgress('Optimizando imágenes...');

    try {
      const { data: recData, error: recError } = await supabase
        .from('registros_anecdoticos')
        .insert({
          curso_id: cursoId,
          profile_id: session.user.id,
          fecha: recordDate,
          titulo: recordTitle,
          descripcion: recordDesc
        })
        .select();

      if (recError) {
        console.error('Error inserting record:', recError);
        setIsSaving(false);
        setOptimizationProgress('');
        return;
      }

      const newRecordId = recData[0].id;

      if (selectedFiles.length > 0) {
        setOptimizationProgress('Subiendo a Google Drive...');
        const folderId = await drive.ensureCIELOFolder();

        for (const file of selectedFiles) {
          const { blob, ext } = await compressImage(file);
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const { fileId, thumbnailLink } = await drive.uploadImage(blob, fileName, folderId);
          await supabase.from('registro_imagenes').insert({
            registro_id: newRecordId,
            imagen_url: buildOriginalUrl('', fileId),
            drive_file_id: fileId,
            drive_thumbnail_url: thumbnailLink || '',
            storage_provider: 'google_drive'
          });
        }
      }

      setIsNewRecordOpen(false);
      setRecordTitle('');
      setRecordDesc('');
      setSelectedFiles([]);
      setImagePreviews([]);
      setImageWarning('');
    } catch (err: any) {
      console.error('Error saving record flow:', err);
      setDriveUploadError(`Error al subir: ${err.message || 'Error desconocido'}. Puede reintentar.`);
    } finally {
      setIsSaving(false);
      setOptimizationProgress('');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm("¿Estás seguro de que deseas archivar este registro anecdótico?")) return;
    try {
      const { error } = await supabase.from('registros_anecdoticos').update({ activo: false }).eq('id', recordId);
      if (error) {
        console.error("Error archiving record:", error);
        return;
      }
      setState(s => ({
        ...s,
        registrosAnecdoticos: s.registrosAnecdoticos.filter(r => r.id !== recordId)
      }));
    } catch (err) {
      console.error("Error in archive flow:", err);
    }
  };

  const courseRecords = useMemo(() => {
    if (!cursoId) return state.registrosAnecdoticos || [];
    return (state.registrosAnecdoticos || []).filter(r => r.cursoId === cursoId);
  }, [state.registrosAnecdoticos, cursoId]);

  return (
    <>
      {/* ═══ REGISTRO ANECDÓTICO PANEL ═══ */}
      <div className="w-full border border-(--border-soft) bg-white rounded-xl shadow-sm flex flex-col shrink-0 h-full">
        <div className="p-4 border-b border-(--border-soft)">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-(--ink) uppercase tracking-widest">
              Registro Anecdótico
            </h3>
            {cursoId && (
              <div className="flex flex-col items-end gap-1">
                <CieloPill
                  as="button"
                  variant={courseRecords.length >= 5 ? 'disabled' : 'primary'}
                  onClick={() => {
                    setRecordDate(new Date().toISOString().split('T')[0]);
                    setRecordTitle('');
                    setRecordDesc('');
                    setSelectedFiles([]);
                    setImagePreviews([]);
                    setImageWarning('');
                    setDriveUploadError('');
                    setIsNewRecordOpen(true);
                  }}
                  disabled={courseRecords.length >= 5}
                  className="px-3 py-1.5 font-bold tracking-wider"
                >
                  + Nuevo
                </CieloPill>
                {courseRecords.length >= 5 && (
                  <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider text-right">Máx 5</span>
                )}
              </div>
            )}
          </div>

          {/* Google Drive Connection */}
          <div className="mt-2.5 flex items-center gap-2">
            {drive.isConnected ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Drive conectado
                <span className="text-emerald-600 font-medium normal-case tracking-normal ml-0.5">{drive.email}</span>
                <button
                  onClick={drive.disconnect}
                  className="ml-1 text-emerald-500 hover:text-red-500 transition-colors cursor-pointer font-bold"
                  title="Desconectar Google Drive"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={drive.connect}
                disabled={drive.isConnecting}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {drive.isConnecting ? 'Conectando...' : 'Conectar Google Drive'}
              </button>
            )}
            {drive.error && (
              <span className="text-[9px] text-red-500 font-bold">{drive.error}</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide flex flex-col gap-3">
          {courseRecords.length === 0 ? (
            <div className="flex flex-col items-start text-left text-slate-400 py-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sin acontecimientos</p>
              <p className="text-[10px] text-slate-400/80 mt-1">
                {!cursoId
                  ? 'Selecciona un curso específico para poder añadir o ver registros.'
                  : 'Registra hechos relevantes del curso para mantener un historial visual.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="relative border-l border-(--border-soft) pl-3 flex flex-col gap-4 py-1">
                {courseRecords.slice(0, visibleCount).map(r => {
                  const images = state.registroImagenes?.filter(img => img.registroId === r.id) || [];
                  return (
                    <div key={r.id} className="relative">
                      <span className="absolute -left-4.5 top-1 w-2 h-2 rounded-full bg-(--primary) border-2 border-white ring-3 ring-(--primary)/10" />
                      
                      <div className="flex justify-between items-center gap-2 mb-0.5">
                        <div className="text-[10px] font-bold text-(--ink-soft) uppercase tracking-wider">{r.fecha}</div>
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="text-[10px] font-bold text-(--danger) hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                      
                      <h4 className="text-[11px] font-black text-(--ink) uppercase tracking-tight mb-0.5 leading-snug">{r.titulo}</h4>
                      <p className="text-[10px] text-(--ink-soft) leading-relaxed mb-1.5 whitespace-pre-wrap">{r.descripcion}</p>
                      
                      {images.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto py-0.5 scrollbar-hide">
                          {images.map(img => (
                            <ThumbnailImage
                              key={`${img.id}-${drive.isConnected}`}
                              driveFileId={img.driveFileId}
                              imagenUrl={img.imagenUrl}
                              fetchDriveThumbnail={drive.fetchDriveThumbnail}
                              onClick={() => {
                                window.open(buildOriginalUrl(img.imagenUrl, img.driveFileId), '_blank');
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {courseRecords.length > visibleCount && (
                <CieloPill
                  as="button"
                  variant="neutral"
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="w-full py-1.5 mt-1"
                >
                  Cargar más
                </CieloPill>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ NUEVO REGISTRO MODAL ═══ */}
      {isNewRecordOpen && (
        <div className="fixed inset-0 bg-(--ink)/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-(--border-soft) rounded-(--radius-lg) shadow-md p-6 w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-(--border-soft)">
              <h3 className="text-xs font-black text-(--ink) uppercase tracking-widest">Nuevo Registro Anecdótico</h3>
              <button onClick={() => setIsNewRecordOpen(false)} className="text-(--ink-soft) hover:text-(--ink) text-sm font-bold cursor-pointer">×</button>
            </div>
            
            {optimizationProgress && (
              <div className="p-3 bg-(--primary)/10 border border-(--primary)/20 rounded-xl text-center">
                <span className="text-xs font-bold text-(--primary) uppercase tracking-widest animate-pulse">
                  {optimizationProgress}
                </span>
              </div>
            )}

            {driveUploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Error de subida</p>
                <p className="text-xs text-red-600">{driveUploadError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Fecha</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-(--border-soft) bg-(--linen)/20 text-(--ink) text-xs font-medium outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Título</label>
                <input
                  type="text"
                  placeholder="Ej. Excursión al museo de ciencias"
                  value={recordTitle}
                  onChange={(e) => setRecordTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-(--border-soft) bg-(--linen)/20 text-(--ink) text-xs font-medium outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Escribe aquí los acontecimientos o detalles importantes..."
                  value={recordDesc}
                  onChange={(e) => setRecordDesc(e.target.value)}
                  className="w-full p-4 rounded-xl border border-(--border-soft) bg-(--linen)/20 text-(--ink) text-xs font-medium outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 resize-none leading-relaxed"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-(--ink-soft) mb-1">Imágenes (Máx 2)</label>
                {drive.isConnected ? (
                  <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg mb-1.5 border border-emerald-200">
                    Las imágenes se guardarán en tu Google Drive (carpeta CIELO/Registro anecdótico)
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mb-1.5 border border-amber-200">
                    Conecta Google Drive arriba para poder adjuntar fotografías
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <label className={`h-10 px-4 flex items-center justify-center border rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedFiles.length >= 2 || isSaving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white hover:bg-(--linen)/30 border-(--border-soft) text-(--ink-soft) cursor-pointer shadow-sm'
                  }`}>
                    Seleccionar Fotos
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={selectedFiles.length >= 2 || isSaving}
                    />
                  </label>
                  <span className="text-xs text-(--ink-soft)">{selectedFiles.length}/2 seleccionadas</span>
                </div>
                
                {imageWarning && (
                  <p className="text-xs text-red-500 font-bold mt-1.5 uppercase tracking-wider">{imageWarning}</p>
                )}
                
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-3 py-1 scrollbar-hide">
                    {imagePreviews.map((url, idx) => (
                      <div key={idx} className="relative shrink-0">
                        <img src={url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-(--border-soft)" />
                        {!isSaving && (
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-(--border-soft)">
              <button
                onClick={() => setIsNewRecordOpen(false)}
                className="px-4 py-2 bg-white border border-(--border-soft) text-(--ink) text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all hover:bg-(--linen)/20 shadow-sm"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-(--primary) hover:opacity-90 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                disabled={isSaving || !recordTitle.trim() || !recordDate}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
