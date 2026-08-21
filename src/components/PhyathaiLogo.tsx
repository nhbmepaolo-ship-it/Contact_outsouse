import React from 'react';

export const PHYATHAI_LOGO_URL =
  'https://static.hdmall.co.th/184x184/webp/system/brands/logo/2240/original/phyathai-phaholyothin-hospital.jpg';

interface PhyathaiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const PhyathaiLogo: React.FC<PhyathaiLogoProps> = ({
  className = '',
  size,
}) => {
  const heightClass = size
    ? size === 'sm'
      ? 'h-9 w-auto'
      : size === 'lg'
      ? 'h-16 w-auto'
      : size === 'xl'
      ? 'h-24 w-auto'
      : size === 'full'
      ? 'w-full h-full'
      : 'h-12 w-auto'
    : '';

  return (
    <img
      src={PHYATHAI_LOGO_URL}
      alt="โรงพยาบาลพญาไท พหลโยธิน"
      referrerPolicy="no-referrer"
      className={`object-contain select-none ${heightClass} ${className}`}
    />
  );
};




