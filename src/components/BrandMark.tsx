import React from 'react';

type BrandMarkProps = {
  className?: string;
};

/**
 * Square Partshop emblem. The artwork is white on black, so it sits in a dark
 * rounded badge and stays readable on both light and dark surfaces.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ className = 'w-9 h-9' }) => {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-inset ring-white/20 flex-shrink-0 ${className}`}
    >
      <img
        src="/partshop-emblem.png"
        alt=""
        width={143}
        height={143}
        draggable={false}
        className="h-full w-full object-contain"
      />
    </span>
  );
};
