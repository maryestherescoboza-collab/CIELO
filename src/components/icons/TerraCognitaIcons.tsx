import React from 'react';

interface TCIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

const TC_Base = ({ children, size = 18, className = "", ...props }: TCIconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`terra-icon transition-all duration-500 ease-in-out ${className}`}
        {...props}
    >
        {children}
    </svg>
);

export const TC_Genesis = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M12 4.2c-.3 2.1-.8 5.4-.8 7.8s.5 5.7.8 7.8" />
        <path d="M4.2 12c2.1-.3 5.4-.8 7.8-.8s5.7.5 7.8.8" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </TC_Base>
);

export const TC_Resonance = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
        <path d="M12 21.5c-4.5 0-8-3.5-8-8s3.5-8 8-8 8 3.5 8 8" />
        <path d="M17.5 4.5c1.5 1.5 2 3.5 2 5.5" />
        <path d="M6.5 4.5c-1.5 1.5-2 3.5-2 5.5" />
    </TC_Base>
);

export const TC_Archive = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M19.2 21.5H4.8c-.8 0-1.3-.5-1.3-1.3V3.8c0-.8.5-1.3 1.3-1.3h14.4c.8 0 1.3.5 1.3 1.3v16.4c0 .8-.5 1.3-1.3 1.3z" />
        <path d="M7.5 2.5v7.2l2.5-2.3 2.5 2.3V2.5" />
    </TC_Base>
);

export const TC_Anomaly = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M12 2.5l9.2 16.2c.4.7-.1 1.6-.9 1.6H3.7c-.8 0-1.3-.9-.9-1.6L12 2.5z" />
        <path d="M12 9.5v5" />
        <circle cx="12" cy="17.5" r=".8" fill="currentColor" stroke="none" />
    </TC_Base>
);

export const TC_Flux = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M18.5 13.5l2.5-2.5-2.5-2.5" />
        <path d="M3.5 11h17.5" />
        <path d="M5.5 10.5c.3 1.2 1.3 2.5 2.5 2.5" />
    </TC_Base>
);

export const TC_Cosmos = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M12 2.5c.5 1.5 1.5 2.5 3 3s1.5.5-1.5 1.5c-1.5.5-2.5 1.5-3 3s-1.5-2.5-3-3-1.5-.5 1.5-1.5c1.5-.5 2.5-1.5 3-3z" />
        <circle cx="6" cy="16" r="1.5" />
        <circle cx="18" cy="18" r="1.2" />
        <path d="M14 16c2 0 3.5 1.5 3.5 3.5" />
    </TC_Base>
);

export const TC_Chronos = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M19.5 4.5H4.5c-.8 0-1.5.7-1.5 1.5v13.5c0 .8.7 1.5 1.5 1.5h15.5c.8 0 1.5-.7 1.5-1.5V6c0-.8-.7-1.5-1.5-1.5z" />
        <path d="M16.5 2.5v4M7.5 2.5v4" />
        <path d="M3.5 9.5h17.5" />
    </TC_Base>
);

export const TC_Echo = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M20.5 12c0 4.7-3.8 8.5-8.5 8.5s-8.5-3.8-8.5-8.5 3.8-8.5 8.5-8.5" />
        <path d="M11 7.5L15 12l-4 4.5" />
    </TC_Base>
);

export const TC_Aria = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M18.5 4.8l-1.5 1.5M5.5 17.8l-1.5 1.5M18.5 17.8l1.5 1.5M5.5 4.8l1.5 1.5M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2" />
        <path d="M12 12m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" />
    </TC_Base>
);

export const TC_Close = (props: TCIconProps) => (
    <TC_Base {...props}>
        <path d="M18.5 5.5c-2 2-11 11-13 13M5.5 5.5c2 2 11 11 13 13" />
    </TC_Base>
);
