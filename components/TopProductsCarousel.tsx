
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Product } from '../types';

interface TopProductsCarouselProps {
  products: Product[];
}

export const TopProductsCarousel: React.FC<TopProductsCarouselProps> = ({ products }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const autoScrollSpeed = 0.8;

  const topProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return (b.clicks || 0) - (a.clicks || 0);
      })
      .slice(0, 10);
  }, [products]);

  const displayProducts = useMemo(() => {
    if (topProducts.length === 0) return [];
    return [...topProducts, ...topProducts, ...topProducts, ...topProducts];
  }, [topProducts]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isInteracting || displayProducts.length === 0) return;

    let animationFrameId: number;

    const scroll = () => {
      if (!scrollContainer) return;
      
      scrollContainer.scrollLeft += autoScrollSpeed;

      const halfWidth = scrollContainer.scrollWidth / 2;
      if (scrollContainer.scrollLeft >= halfWidth) {
        scrollContainer.scrollLeft -= halfWidth;
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isInteracting, displayProducts]);

  if (topProducts.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-white/50 py-4 relative">
      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center gap-2 mb-3 px-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
          <span className="flex items-center justify-center w-4 h-4 bg-brand-500 text-white rounded-full text-[8px]">
            ★
          </span>
          Mais Populares
        </div>
        
        <div 
          ref={scrollRef}
          onTouchStart={() => setIsInteracting(true)}
          onTouchEnd={() => setTimeout(() => setIsInteracting(false), 2000)}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          className="flex overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-nowrap py-2">
            {displayProducts.map((product, idx) => (
              <div key={`${product.id}-carousel-${idx}`} className="flex-shrink-0 w-36 sm:w-44 px-2">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 h-full flex flex-col transition-all duration-300">
                  <a 
                    href={product.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="h-24 mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-gray-50 relative group"
                  >
                    {product.isFeatured && (
                      <div className="absolute top-1 left-1 z-10 bg-brand-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">
                        Destaque
                      </div>
                    )}
                    <img 
                      src={product.imageUrl} 
                      alt={product.title} 
                      className="h-full w-full object-contain p-2 group-active:scale-95 transition-transform" 
                    />
                  </a>

                  <h4 className="text-[10px] font-bold text-gray-900 line-clamp-2 mb-1 leading-tight h-6 uppercase">{product.title}</h4>
                  
                  <div className="mt-auto">
                    <span className="text-xs font-black text-brand-600 block">{product.estimatedPrice}</span>
                    <a 
                      href={product.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-2 block w-full text-center text-[8px] bg-gray-900 text-white py-2 rounded-lg font-black uppercase tracking-widest active:bg-brand-600 transition-colors"
                    >
                      Ver Link
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute left-0 top-8 bottom-0 w-12 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-8 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none"></div>
      </div>
    </div>
  );
};
