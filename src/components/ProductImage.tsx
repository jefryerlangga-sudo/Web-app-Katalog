import React, { useEffect, useState } from 'react';
import { resolveProductImage } from '../lib/productImage';

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const resolved = resolveProductImage(src, failed);
  const placeholder = resolved.endsWith('/placeholder-product.svg');

  return (
    <img
      src={resolved}
      alt={alt}
      className={`${className} ${placeholder ? 'object-contain p-1.5' : 'object-cover'}`}
      loading="lazy"
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
};
