import type { ReactNode } from 'react';

export function Campo({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
    return (
        <div>
            <label className="block text-[12px] font-semibold text-[#3F3C36] mb-1.5">
                {label} {required && <span className="text-[#D93025]">*</span>}
            </label>
            {children}
        </div>
    );
}
