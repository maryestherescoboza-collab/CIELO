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
        bg: 'bg-primary/10 text-primary border-primary/20',
        text: 'text-primary',
        active: 'bg-primary text-white border-primary'
    },
    BC2: {
        bg: 'bg-warning/15 text-[#8C6D1F] border-warning/30', // darker text for readability on light yellow background
        text: 'text-[#8C6D1F]',
        active: 'bg-warning text-white border-warning'
    },
    BC3: {
        bg: 'bg-danger/10 text-danger border-danger/20',
        text: 'text-danger',
        active: 'bg-danger text-white border-danger'
    },
    BC4: {
        bg: 'bg-primary/10 text-primary border-primary/20',
        text: 'text-primary',
        active: 'bg-primary text-white border-primary'
    }
};
