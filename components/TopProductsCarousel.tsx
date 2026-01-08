
import React from 'react';
import { Product } from '../types';

interface TopProductsCarouselProps {
  products: Product[];
}

export const TopProductsCarousel: React.FC<TopProductsCarouselProps> = ({ products }) => {
  // Ordena priorizando produtos em destaque (isFeatured) e depois por número de cliques
  const topProducts = [...products]
    .sort((a, b) => {
      // 1. Prioridade para quem é destaque
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      
      // 2. Desempate por cliques
      return (b.clicks || 0) - (a.clicks || 0);
    })
    .slice(0, 10); // Aumentado para 10 para mostrar mais itens já que inclui destaques e populares

  if (topProducts.length === 0) return null;

  // Duplica a lista para criar o efeito de scroll infinito fluido
  const displayProducts = [...topProducts, ...topProducts, ...topProducts, ...topProducts];

  return (
    <div className="w-full overflow-hidden bg-white/50 py-4 relative">
      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center gap-2 mb-3 px-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
          <span className="flex items-center justify-center w-4 h-4 bg-brand-500 text-white rounded-full text-[8px]">
            ★
          </span>
          Top Escolhas da Galera
        </div>
        
        {/* Carousel Container */}
        <div className="relative w-full overflow-hidden">
           {/* Fade Gradients */}
           <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-50 to-transparent z-10"></div>
           <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-50 to-transparent z-10"></div>

           {/* Animated Track */}
           <div className="flex animate-marquee hover:pause-animation">
             {displayProducts.map((product, idx) => (
               <div key={`${product.id}-${idx}`} className="flex-shrink-0 w-36 sm:w-44 px-2">
                 <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 h-full flex flex-col transform transition-transform hover:scale-105">
                    <div className="h-24 mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-gray-50 relative">
                       {product.isFeatured && (
                         <div className="absolute top-1 left-1 z-10 bg-brand-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">
                           Destaque
                         </div>
                       )}
                       <img src={product.imageUrl} alt={product.title} className="h-full w-full object-contain p-2" />
                    </div>
                    <h4 className="text-[10px] font-bold text-gray-900 line-clamp-2 mb-1 leading-tight h-6 uppercase">{product.title}</h4>
                    <div className="mt-auto">
                        <span className="text-xs font-black text-brand-600 block">{product.estimatedPrice}</span>
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-2 block w-full text-center text-[8px] bg-gray-900 text-white py-1.5 rounded-lg font-black uppercase tracking-widest hover:bg-gray-700">
                          Ver Link
                        </a>
                    </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
