import { supabase } from './supabase';

export interface AIUsageStats {
    tokensEsteMes: number;
    costoEstimado: number;
    presupuestoTotal: number;
    disponible: number;
}

const PRESUPUESTO_TOTAL = 0.50; // US$0.50

export async function getCurrentMonthAIUsage(userId: string): Promise<AIUsageStats> {
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    
    // Consultar tabla directamente por ahora
    const { data: logs, error } = await supabase
        .from('ai_usage_logs')
        .select('total_tokens, cost')
        .eq('user_id', userId)
        .gte('created_at', firstDay);

    if (error) {
        console.error('Error obteniendo uso de IA:', error);
        return { tokensEsteMes: 0, costoEstimado: 0, presupuestoTotal: PRESUPUESTO_TOTAL, disponible: PRESUPUESTO_TOTAL };
    }

    let totalTokens = 0;
    let totalCosto = 0;

    for (const log of logs || []) {
        totalTokens += (log.total_tokens || 0);
        totalCosto += (Number(log.cost) || 0);
    }

    const disponible = Math.max(0, PRESUPUESTO_TOTAL - totalCosto);

    return {
        tokensEsteMes: totalTokens,
        costoEstimado: Number(totalCosto.toFixed(4)),
        presupuestoTotal: PRESUPUESTO_TOTAL,
        disponible: Number(disponible.toFixed(4))
    };
}
