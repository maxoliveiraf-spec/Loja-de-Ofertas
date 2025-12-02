import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface MobileInfiniteFeedProps {
  products: Product[];
}

export const MobileInfiniteFeed: React.FC<MobileInfiniteFeedProps> = ({ products }) => {
  // Estado para armazenar a lista "infinita" de produtos
  const [displayList, setDisplayList] = useState<Product[]>([]);
  // Referência para o elemento "sentinela" no final da lista
  const observerTarget = useRef<HTMLDivElement>(null);

  // Inicializa ou reinicializa a lista quando os produtos originais mudam (filtro/busca)
  useEffect(() => {
    setDisplayList(products);
  }, [products]);

  // Função para adicionar mais itens (loop)
  const loadMore = useCallback(() => {
    if (products.length === 0) return;
    
    // Adiciona a lista original ao final da lista atual
    // Simula o efeito de "esteira" voltando ao primeiro item
    setDisplayList(prev => [...prev, ...products]);
  }, [products]);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget || products.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Pequeno delay para não ser instantâneo demais e dar sensação de carregamento
          // e evitar loops travados se a lista for muito curta
          setTimeout(() => {
            loadMore();
          }, 300);
        }
      },
      { threshold: 0.1 } // Dispara quando 10% do sentinela estiver visível
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
        // Criamos uma key única combinando o ID original com o índice do array
        // pois o ID se repetirá no loop infinito
        const uniqueKey = `${product.id}-loop-${index}`;
        
        return (
          <div key={uniqueKey} className="w-full">
            <ProductCard product={product} />
          </div>
        );
      })}
      
      {/* Sentinela invisível para disparar o carregamento */}
      {products.length > 2 && (
        <div ref={observerTarget} className="h-10 flex justify-center items-center opacity-0">
           Loading...
        </div>
      )}
    </div>
  );
};