import React, { useCallback, useRef, useState } from 'react';

interface FastButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  activeClassName?: string;
}

/**
 * Botão otimizado para dispositivos touch
 * - Responde no touchstart (não espera touchend)
 * - Feedback visual instantâneo
 * - Previne double-tap zoom
 * - Fallback para click em desktop
 */
export const FastButton: React.FC<FastButtonProps> = ({
  onClick,
  children,
  className = '',
  disabled = false,
  activeClassName = 'scale-90 opacity-70',
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const hasFiredRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    e.stopPropagation();
    setIsPressed(true);
    
    // Disparar callback imediatamente no touchstart
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      onClick();
      
      // Reset flag após curto delay
      timeoutRef.current = setTimeout(() => {
        hasFiredRef.current = false;
      }, 150);
    }
  }, [onClick, disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Previne click fantasma
    e.stopPropagation();
    setIsPressed(false);
  }, []);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Fallback para mouse (desktop)
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    
    // Só dispara se não foi touch
    if (!hasFiredRef.current) {
      onClick();
    }
  }, [onClick, disabled]);

  const handleMouseDown = useCallback(() => {
    if (!disabled) setIsPressed(true);
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  return (
    <button
      type="button"
      className={`${className} ${isPressed ? activeClassName : ''} transition-transform duration-0`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Link otimizado para dispositivos touch
 */
interface FastLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

export const FastLink: React.FC<FastLinkProps> = ({
  href,
  onClick,
  children,
  className = '',
  activeClassName = 'scale-95 opacity-80',
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const hasFiredRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsPressed(true);
    
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      onClick?.();
      
      setTimeout(() => {
        hasFiredRef.current = false;
      }, 150);
    }
  }, [onClick]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  return (
    <a
      href={href}
      className={`${className} ${isPressed ? activeClassName : ''} transition-transform duration-0`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (!hasFiredRef.current) {
          onClick?.();
        }
      }}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      {...props}
    >
      {children}
    </a>
  );
};

export default FastButton;
