import React from 'react';
import { MessageSquare, Brain, Scale, Leaf } from 'lucide-react';
import type { BCKey } from '../types';

export const BC_ICONS: Record<BCKey, React.ReactNode> = {
    BC1: <MessageSquare size={14} />,
    BC2: <Brain size={14} />,
    BC3: <Scale size={14} />,
    BC4: <Leaf size={14} />,
};

export const BC_COLOR_THEMES: Record<BCKey, { bg: string; text: string; active: string }> = {
    BC1: {
        bg: 'bg-[#7C9672]/10 text-[#7C9672] border-[#7C9672]/20',
        text: 'text-[#7C9672]',
        active: 'bg-[#7C9672] text-white border-[#7C9672]'
    },
    BC2: {
        bg: 'bg-[#D8B55A]/15 text-[#8C6D1F] border-[#D8B55A]/30', // darker text for readability on light yellow background
        text: 'text-[#8C6D1F]',
        active: 'bg-[#D8B55A] text-white border-[#D8B55A]'
    },
    BC3: {
        bg: 'bg-[#CB4834]/10 text-[#CB4834] border-[#CB4834]/20',
        text: 'text-[#CB4834]',
        active: 'bg-[#CB4834] text-white border-[#CB4834]'
    },
    BC4: {
        bg: 'bg-[#6F94AF]/10 text-[#6F94AF] border-[#6F94AF]/20',
        text: 'text-[#6F94AF]',
        active: 'bg-[#6F94AF] text-white border-[#6F94AF]'
    }
};
