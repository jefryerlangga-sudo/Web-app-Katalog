import React, { useEffect, useState } from 'react';

export const PRODUCT_PAGE_SIZE = 48;

type LoadMoreListProps<T> = {
  items: T[];
  resetKey?: string;
  className?: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
};

export function LoadMoreList<T>({
  items,
  resetKey = '',
  className,
  getKey,
  renderItem,
}: LoadMoreListProps<T>) {
  const [count, setCount] = useState(PRODUCT_PAGE_SIZE);

  useEffect(() => {
    setCount(PRODUCT_PAGE_SIZE);
  }, [resetKey]);

  const visible = items.slice(0, count);
  const remaining = items.length - visible.length;

  return (
    <div className={className}>
      {visible.map((item) => (
        <React.Fragment key={getKey(item)}>{renderItem(item)}</React.Fragment>
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setCount((current) => Math.min(items.length, current + PRODUCT_PAGE_SIZE))}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs active:scale-95"
        >
          Muat lagi ({Math.min(PRODUCT_PAGE_SIZE, remaining)} dari {remaining} tersisa)
        </button>
      )}
    </div>
  );
}
