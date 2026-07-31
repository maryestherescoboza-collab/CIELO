export const normalizeArea = (a?: string | null) => 
    (a || '').replace(/_/g, ' ')
    .toLowerCase()
    .replace('matemáticas', 'matematica')
    .replace('matemática', 'matematica')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "");

export const getGradeClass = (score: number | null) => {
    if (score === null) return 'bg-slate-50 text-slate-400';
    if (score >= 90) return 'bg-[#7C9672]/10 text-[#7C9672]'; // Estratégico
    if (score >= 80) return 'bg-[#D8B55A]/15 text-[#8C6D1F]'; // Autónomo (darker gold text for readability)
    if (score >= 70) return 'bg-[#CB4834]/10 text-[#CB4834]'; // Resolutivo
    return 'bg-[#3F3C36]/10 text-[#3F3C36]'; // Receptivo
};
