import React from 'react';
import { Tag } from 'lucide-react';

export const PromoBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-orange-500/20 text-orange-300 text-[10px] font-bold border border-orange-500/40 ${className}`}
    >
      <Tag className="w-2.5 h-2.5" />
      <span>Promo</span>
    </span>
  );
};
