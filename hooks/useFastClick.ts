import { useCallback, useRef } from 'react';

/**
 * Hook para eliminar o delay de 300ms em dispositivos touch
 * Usa touchstart/touchend em vez de click para resposta instantânea
 */
export function useFastClick<T extends HTMLElement = HTMLElement>(
  callback: (e: React.TouchEvent<T> | React.MouseEvent<T>) => void,
  options: { preventDefault?: boolean; stopPropagation?: boolean } = {}
) {
  const { preventDefault = true, stopPropagation = true } = options;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const TOUCH_THRESHOLD = 10; // pixels de movimento permitido
  const TIME_THRESHOLD = 300; // ms máximo para considerar um tap

  const handleTouchStart = useCallback((e: React.TouchEvent<T>) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<T>) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Verificar se foi um tap válido (não scroll ou swipe)
    if (deltaX < TOUCH_THRESHOLD && deltaY < TOUCH_THRESHOLD && deltaTime < TIME_THRESHOLD) {
      if (preventDefault) e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      callback(e);
    }

    touchStartRef.current = null;
  }, [callback, preventDefault, stopPropagation]);

  // Fallback para mouse (desktop)
  const handleClick = useCallback((e: React.MouseEvent<T>) => {
    // Ignorar se foi um evento touch (evita duplo disparo)
    if (touchStartRef.current !== null) return;
    if (stopPropagation) e.stopPropagation();
    callback(e);
  }, [callback, stopPropagation]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onClick: handleClick,
  };
}

/**
 * Hook simplificado para botões que precisam de resposta instantânea
 * Dispara no touchstart (mais rápido que touchend)
 */
export function useInstantTap<T extends HTMLElement = HTMLElement>(
  callback: () => void
) {
  const hasFiredRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent<T>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      callback();
      // Reset após um curto delay
      setTimeout(() => {
        hasFiredRef.current = false;
      }, 100);
    }
  }, [callback]);

  // Fallback para mouse
  const handleClick = useCallback((e: React.MouseEvent<T>) => {
    e.stopPropagation();
    if (!hasFiredRef.current) {
      callback();
    }
  }, [callback]);

  return {
    onTouchStart: handleTouchStart,
    onClick: handleClick,
  };
}

export default useFastClick;
