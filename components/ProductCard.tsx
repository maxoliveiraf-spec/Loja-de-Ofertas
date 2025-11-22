import React, { useState } from 'react';
import { Product, ProductStatus } from '../types';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [copied, setCopied] = useState(false);

  // Helper to extract YouTube Embed URL
  const getYouTubeEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?controls=1&modestbranding=1&rel=0` : null;
  };

  const embedUrl = getYouTubeEmbedUrl(product.videoUrl);

  // Generate a placeholder URL if no specific image URL is available.
  const imageUrl = product.imageUrl || 
    (product.imageSearchTerm 
      ? `https://picsum.photos/seed/${product.imageSearchTerm.replace(/\s+/g, '')}/400/400` 
      : `https://picsum.photos/seed/${product.id}/400/400`);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any parent click events if applicable

    const shareData = {
      title: product.title,
      text: `🔥 Olha essa oferta: ${product.title} ${product.estimatedPrice ? `por apenas ${product.estimatedPrice}` : ''}. Confira aqui:`,
      url: product.url,
    };

    // Check if Web Share API is supported (Mobile/Modern Browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User rejected or error occurred
        console.debug('Share cancelled');
      }
    } else {
      // Fallback to Clipboard
      try {
        const textToCopy = `${shareData.text} ${shareData.url}`;
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy text');
      }
    }
  };

  if (product.status === ProductStatus.PENDING || product.status === ProductStatus.ENRICHING) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
        <div className="h-64 bg-gray-100"></div>
        <div className="p-4 flex-1 space-y-3">
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
          <div className="h-6 bg-gray-100 rounded w-1/3"></div>
          <div className="h-10 bg-gray-100 rounded mt-4"></div>
        </div>
      </div>
    );
  }

  if (product.status === ProductStatus.ERROR) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-100 p-4 h-full flex flex-col justify-center items-center text-center">
        <p className="text-sm text-red-600 mb-2">Erro ao carregar</p>
        <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 underline truncate w-full">
          Link do produto
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white group rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col hover:shadow-xl transition-all duration-300 relative">
      
      {/* Media Container (Video or Image) - Fixed Height h-64 */}
      <div className="relative h-64 bg-white flex items-center justify-center border-b border-gray-50">
         
         {/* Category Badge (Only show on image to not block video, or keep top left if acceptable) */}
         <div className="absolute top-3 left-3 z-20 pointer-events-none">
           <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-gray-500 bg-gray-100/90 backdrop-blur-sm rounded-sm shadow-sm">
            {product.category}
           </span>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={`absolute top-3 right-3 z-20 p-2 rounded-full shadow-md transition-all duration-200 border border-gray-100 ${
            copied 
              ? 'bg-green-50 text-green-600 scale-110' 
              : 'bg-white text-gray-400 hover:text-brand-600 hover:scale-110'
          }`}
          title="Compartilhar oferta"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>

        {embedUrl ? (
           // Video Embed
           <iframe 
             src={embedUrl} 
             title={product.title}
             className="w-full h-full object-cover"
             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
             allowFullScreen
           ></iframe>
        ) : (
           // Standard Image
           <img 
             src={imageUrl} 
             alt={product.title} 
             className="max-h-full max-w-full w-auto h-auto object-contain p-6 transform group-hover:scale-105 transition-transform duration-500"
             loading="lazy"
           />
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 
          className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 h-10 leading-5 group-hover:text-brand-600 transition-colors"
          title={product.title}
        >
          {product.title}
        </h3>
        
        {/* Price Section */}
        <div className="mb-3">
          {product.estimatedPrice ? (
             <div className="flex items-baseline gap-1">
               <span className="text-xs text-gray-500 font-normal">Por apenas</span>
               <span className="text-xl font-bold text-gray-900">{product.estimatedPrice}</span>
             </div>
          ) : (
            <div className="text-sm text-gray-400 italic">Confira o preço</div>
          )}
        </div>

        {/* Description - smaller text */}
        <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-1 leading-relaxed">
          {product.description}
        </p>
        
        {/* Call to Action */}
        <div className="mt-auto pt-3 border-t border-gray-50">
          <a 
            href={product.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center px-4 py-2.5 bg-brand-600 text-white text-sm font-bold rounded hover:bg-brand-700 transition-colors duration-200 shadow-sm"
          >
            Ver a Promoção
          </a>
        </div>
      </div>
    </div>
  );
};