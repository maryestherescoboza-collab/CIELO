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
        bg: 'bg-cielo-blue/10 text-cielo-blue border-cielo-blue/20',
        text: 'text-cielo-blue',
        active: 'bg-cielo-blue text-white border-cielo-blue'
    },
    BC2: {
        bg: 'bg-cielo-gold/15 text-[#8C6D1F] border-cielo-gold/30',
        text: 'text-[#8C6D1F]',
        active: 'bg-cielo-gold text-[#1E293B] border-cielo-gold'
    },
    BC3: {
        bg: 'bg-cielo-terracotta/10 text-cielo-terracotta border-cielo-terracotta/20',
        text: 'text-cielo-terracotta',
        active: 'bg-cielo-terracotta text-white border-cielo-terracotta'
    },
    BC4: {
        bg: 'bg-cielo-green/10 text-cielo-green border-cielo-green/20',
        text: 'text-cielo-green',
        active: 'bg-cielo-green text-white border-cielo-green'
    }
};
