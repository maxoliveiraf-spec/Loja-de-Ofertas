import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Product } from '../types';

interface SEOProps {
  products: Product[];
}

export const SEO: React.FC<SEOProps> = ({ products }) => {
  const siteTitle = "Guia da Promoção - Loja de Ofertas";
  const siteDescription = "Encontre as melhores ofertas e promoções da internet. Smartphones, eletrônicos, moda e muito mais com descontos imperdíveis.";
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://loja-de-ofertas.vercel.app';
  
  // Sanitização rigorosa para evitar estruturas circulares (Circular Structure)
  // Garantimos que cada campo seja convertido explicitamente para string primitiva
  const jsonLdString = useMemo(() => {
    try {
      if (!products || !Array.isArray(products)) return '{}';

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": products.slice(0, 20).map((product, index) => {
          // Extração segura de preço
          const rawPrice = String(product.estimatedPrice || "0.00");
          const sanitizedPrice = rawPrice.replace(/[^0-9,]/g, '').replace(',', '.');

          return {
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Product",
              "name": String(product.title || "Produto"),
              "description": String(product.description || ""),
              "image": String(product.imageUrl || ""),
              "offers": {
                "@type": "Offer",
                "priceCurrency": "BRL",
                "price": sanitizedPrice || "0.00",
                "availability": "https://schema.org/InStock",
                "url": String(product.url || siteUrl)
              }
            }
          };
        })
      };

      return JSON.stringify(structuredData);
    } catch (e) {
      console.error("Critical error generating JSON-LD:", e);
      return '{}';
    }
  }, [products, siteUrl]);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <link rel="canonical" href={siteUrl} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      {products.length > 0 && products[0].imageUrl && (
        <meta property="og:image" content={String(products[0].imageUrl)} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      
      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {jsonLdString}
      </script>
    </Helmet>
  );
};