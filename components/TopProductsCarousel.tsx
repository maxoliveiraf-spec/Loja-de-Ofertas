import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface TopProductsCarouselProps {
  products: Product[];
}

export const TopProductsCarousel: React.FC<TopProductsCarouselProps> = ({ products }) => {
  // Filter top 5 products by clicks
  const topProducts = [...products]
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 5);

  if (topProducts.length === 0) return null;

  // Duplicate the list to create a seamless infinite scroll effect
  const displayProducts = [...topProducts, ...topProducts, ...topProducts, ...topProducts];

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-brand-50 to-white border-y border-brand-100 py-4 mb-6 relative">
      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center gap-2 mb-2 px-4 text-brand-700 font-bold text-sm uppercase tracking-wider">
          <span className="flex items-center justify-center w-6 h-6 bg-brand-500 text-white rounded-full text-xs">
            ★
          </span>
          Mais Populares
        </div>
        
        {/* Carousel Container */}
        <div className="relative w-full overflow-hidden">
           {/* Fade Gradients */}
           <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-brand-50 to-transparent z-10"></div>
           <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10"></div>

           {/* Animated Track */}
           <div className="flex animate-marquee hover:pause-animation">
             {displayProducts.map((product, idx) => (
               <div key={`${product.id}-${idx}`} className="flex-shrink-0 w-48 sm:w-56 px-3">
                 <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 h-full flex flex-col transform transition-transform hover:scale-105">
                    <div className="h-32 mb-2 flex items-center justify-center overflow-hidden rounded bg-gray-50">
                       <img src={product.imageUrl} alt={product.title} className="h-full w-full object-contain p-2" />
                    </div>
                    <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1 leading-tight">{product.title}</h4>
                    <div className="mt-auto">
                        <span className="text-sm font-bold text-brand-600 block">{product.estimatedPrice}</span>
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-2 block w-full text-center text-[10px] bg-gray-900 text-white py-1 rounded hover:bg-gray-700">
                          Ver Oferta
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