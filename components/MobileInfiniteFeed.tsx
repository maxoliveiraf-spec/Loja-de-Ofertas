
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface MobileInfiniteFeedProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const MobileInfiniteFeed: React.FC<MobileInfiniteFeedProps> = ({ products, onSelectProduct }) => {
  const [displayList, setDisplayList] = useState<Product[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayList(products);
  }, [products]);

  const loadMore = useCallback(() => {
    if (products.length === 0) return;
    setDisplayList(prev => [...prev, ...products]);
  }, [products]);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget || products.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => {
            loadMore();
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMore, products.length]);

  if (products.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {displayList.map((product, index) => {
        const uniqueKey = `${product.id}-loop-${index}`;
        
        return (
          <div key={uniqueKey} className="w-full">
            <ProductCard 
              product={product} 
              currentUser={null} 
              onAuthRequired={() => {}} 
              onSelect={onSelectProduct}
            />
          </div>
        );
      })}
      
      {products.length > 2 && (
        <div ref={observerTarget} className="h-10 flex justify-center items-center opacity-0">
           Carregando...
        </div>
      )}
    </div>
  );
};
