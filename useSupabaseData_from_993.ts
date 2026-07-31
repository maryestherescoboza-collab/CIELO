                    userId: String(cd.docente_id),
                    rol: cd.rol as 'tutor' | 'co-docente',
                    asignatura: cd.asignatura as string,
                    createdAt: cd.created_at as string
                })),
                grupos: (grupos || []).map((g: Record<string, unknown>): Grupo => ({
                    id: g.id as number,
                    nombre: g.nombre as string,
                    grado: g.grado as string,
                    seccion: g.seccion as string,
                    createdAt: g.created_at as string
                })),
            };});
        } catch (error) {
            console.error('Error fetching data from Supabase:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            fetchData();
            // Intervalo silencioso de respaldo mÃ¡s largo
            const interval = setInterval(() => fetchData(true), 120000);

            // Realtime para evitar recargas constantes pero mantener sincronización
            const channel = supabase.channel(`db-changes-${session.user.id}-${Date.now()}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${session.user.id}` }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'curso_detalle' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges', filter: `user_id=eq.${session.user.id}` }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'calificaciones' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'recuperaciones' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'curso_docentes' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'cursos' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'estudiantes' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'actividades' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos' }, () => fetchData(true))
                .subscribe();

            return () => {
                clearInterval(interval);
                supabase.removeChannel(channel);
            };
        } else {
            setLoading(false);
        }
    }, [session, fetchData]);

    const syncUpsert = useCallback(async (table: string, data: Record<string, unknown> | Record<string, unknown>[]) => {
        if (!session?.user?.id) return;

        const toSnakeCase = (obj: Record<string, unknown>) => {
            const snakeObj: Record<string, unknown> = {};
            for (const key in obj) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                snakeObj[snakeKey] = obj[key];
            }
            return snakeObj;
        };

        const dbData = Array.isArray(data)
            ? (data as Record<string, unknown>[]).map(toSnakeCase)
            : toSnakeCase(data as Record<string, unknown>);

        if (Array.isArray(dbData)) {
            dbData.forEach(item => (item as Record<string, unknown>).user_id = session.user.id);
        } else {
            (dbData as Record<string, unknown>).user_id = session.user.id;
        }

        const { error } = await supabase.from(table).upsert(dbData);
        if (error) console.error('Error syncing upsert to ' + table + ':', error);
    }, [session]);

    const syncDelete = useCallback(async (table: string, idOrFilter: number | string | Record<string, unknown>) => {
        if (!session?.user?.id) return;

        let query = supabase.from(table).delete();

        if (typeof idOrFilter === 'object' && idOrFilter !== null) {
            const toSnakeCase = (obj: Record<string, unknown>) => {
                const snakeObj: Record<string, unknown> = {};
                for (const key in obj) {
                    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    snakeObj[snakeKey] = obj[key];
                }
                return snakeObj;
            };
            const snakeFilter = toSnakeCase(idOrFilter as Record<string, unknown>);
            query = query.match(snakeFilter);
        } else {
            query = query.eq('id', idOrFilter);
        }

        const { error } = await query;
        if (error) console.error('Error syncing delete to ' + table + ':', error);
    }, [session]);

    return {
        state,
        setState,
        loading,
        session,
        syncUpsert,
        syncDelete,
        refresh: fetchData
    };
}
