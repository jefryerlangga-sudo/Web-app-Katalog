import React from 'react';

/** Desktop-only sticky column. Hidden below the lg breakpoint so phones stay one column. */
export const DesktopSplit: React.FC<{ sidebar: React.ReactNode; children: React.ReactNode }> = ({
  sidebar,
  children,
}) => (
  <div className="lg:flex lg:items-start lg:gap-6">
    <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
      {sidebar}
    </aside>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);
