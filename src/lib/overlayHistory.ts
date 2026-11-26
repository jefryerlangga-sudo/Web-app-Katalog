import { useEffect, useRef } from 'react';

/** Push one history entry while `open` is true so the phone back button closes it. */
export function useOverlayHistory(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pushed = useRef(false);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const id = `ov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    window.history.pushState({ ...(window.history.state || {}), overlay: id }, '');
    pushed.current = true;
    const onPop = () => {
      pushed.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (pushed.current) {
        pushed.current = false;
        window.history.back();
      }
    };
  }, [open]);
}
