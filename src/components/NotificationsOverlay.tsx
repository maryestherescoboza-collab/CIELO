import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';

interface NotificationsOverlayProps {
    genericToast: any;
}

const NotificationsOverlay: React.FC<NotificationsOverlayProps> = ({
    genericToast
}) => {
    return (
        <>
            {genericToast && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-9999 animate-in fade-in slide-in-from-top-8">
                    <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${
                        genericToast.type === 'success' 
                            ? 'bg-emerald-900/90 border-emerald-500 text-white' 
                            : 'bg-rose-900/90 border-rose-500 text-white'
                     }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            genericToast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}>
                            {genericToast.type === 'success' ? <Plus size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <p className="text-sm font-black uppercase">{genericToast.message}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationsOverlay;
