import React, { useState, useEffect, useRef } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  url?: string;
  imageUrl?: string;
}

interface NotificationBellProps {
  notifications: NotificationItem[];
  onClear: () => void;
  onMarkRead: () => void;
  onPermissionGranted?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onClear, onMarkRead, onPermissionGranted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    if (!isOpen) {
      // UX Improvement: Request permission specifically when user interacts with the bell
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted' && onPermissionGranted) {
            onPermissionGranted();
          }
        } catch (e) {
          console.debug("Permission request failed or dismissed", e);
        }
      }
      onMarkRead();
    }
    setIsOpen(!isOpen);
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    return 'Há dias';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end" ref={panelRef}>
      
      {/* Notification Panel (YouTube style drawer) */}
      <div 
        className={`mb-3 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-right transform ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">Notificações</h3>
          {notifications.length > 0 && (
            <button onClick={onClear} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
              Limpar tudo
            </button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
              <svg className="w-12 h-12 mb-2 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
              <p className="text-sm">Nenhuma notificação por enquanto.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {notifications.map((notif) => (
                <li key={notif.id} className="hover:bg-gray-50 transition-colors">
                  <a href={notif.url || '#'} className="flex p-4 gap-3">
                     {notif.imageUrl ? (
                       <img src={notif.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover bg-gray-100 flex-shrink-0" />
                     ) : (
                       <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-600">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       </div>
                     )}
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-semibold text-gray-900 line-clamp-1">{notif.title}</p>
                       <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{notif.message}</p>
                       <p className="text-[10px] text-gray-400 mt-1 font-medium">{formatTime(notif.timestamp)}</p>
                     </div>
                     {!notif.read && <div className="w-2 h-2 bg-brand-500 rounded-full mt-2"></div>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* The Bell Button (FAB) */}
      <button
        onClick={handleToggle}
        className="relative group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/80 backdrop-blur-md hover:bg-white border border-gray-200 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label="Notificações"
      >
        <svg 
          className={`w-6 h-6 sm:w-7 sm:h-7 text-gray-700 transition-colors group-hover:text-brand-600 ${unreadCount > 0 ? 'animate-swing' : ''}`} 
          fill={unreadCount > 0 ? "currentColor" : "none"} 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded-full border-2 border-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 1s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
};