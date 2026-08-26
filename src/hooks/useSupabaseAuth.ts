import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export function useSupabaseAuth() {
    const setSession = useAppStore(s => s.setSession);
    const setAuthInitialized = useAppStore(s => s.setAuthInitialized);

    useEffect(() => {
        console.log('[DEBUG AUTH] mount START');

        console.log('[DEBUG AUTH] subscribe START');
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            console.log(`[DEBUG AUTH] evento: ${event}`);
            if (currentSession) console.log('[DEBUG AUTH] sesión procesada en onAuthStateChange');
            setSession(currentSession);
            setAuthInitialized(true);
        });
        console.log('[DEBUG AUTH] subscribe END');

        return () => {
            console.log('[DEBUG AUTH] cleanup');
            subscription.unsubscribe();
        };
    }, [setSession, setAuthInitialized]);
}
