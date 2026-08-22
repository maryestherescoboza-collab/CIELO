import { useState, useEffect } from 'react';

interface UserAvatarProps {
    src?: string | null;
    name?: string;
    color?: string;
    className?: string;
}

export function UserAvatar({ src, name = 'Usuario', color, className = '' }: UserAvatarProps) {
    // Si la URL cambia, necesitamos resetear el estado
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>(src ? 'loading' : 'error');

    useEffect(() => {
        setStatus(src ? 'loading' : 'error');
    }, [src]);

    const getInitials = (n: string) => {
        const parts = n.split(' ').filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    const initials = getInitials(name);
    
    // Color por defecto estilizado (slate-800) si no se provee color
    const bg = color || '#1e293b';

    return (
        <div 
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ${className}`}
            style={(status === 'error' || !src) ? { backgroundColor: bg } : undefined}
        >
            {src && status !== 'error' && (
                <img
                    src={src}
                    alt={name}
                    className={`h-full w-full object-cover transition-opacity duration-300 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setStatus('success')}
                    onError={() => setStatus('error')}
                />
            )}
            
            {status === 'loading' && src && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200 animate-pulse">
                </div>
            )}

            {(status === 'error' || !src) && (
                <svg viewBox="0 0 100 100" className="w-full h-full text-white pointer-events-none select-none">
                    <rect width="100" height="100" fill="transparent" />
                    <text 
                        x="50%" 
                        y="53%" 
                        dominantBaseline="middle" 
                        textAnchor="middle" 
                        fontWeight="bold" 
                        fontSize="40" 
                        fill="currentColor"
                        fontFamily="system-ui, sans-serif"
                    >
                        {initials}
                    </text>
                </svg>
            )}
        </div>
    );
}
