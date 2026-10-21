import React from 'react';
import whatsappImg from '../../assets/whatsapp.png';

interface WhatsAppIconProps {
    size?: number;
    className?: string;
}

export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({ size = 18, className = "" }) => {
    return (
        <img 
            src={whatsappImg} 
            alt="WhatsApp" 
            width={size} 
            height={size} 
            className={`inline-block shrink-0 object-contain ${className}`}
            style={{ width: size, height: size }}
            loading="eager"
            decoding="async"
        />
    );
};

export default WhatsAppIcon;
