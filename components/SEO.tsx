
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
  
  const jsonLdString = useMemo(() => {
    try {
      if (!products || !Array.isArray(products) || products.length === 0) return '';

      // Mapeamento rigoroso para evitar referências circulares ou objetos complexos do React/Firebase
      const itemListElement = products.slice(0, 15).map((p, index) => {
        const title = p.title ? String(p.title).substring(0, 100) : "Produto";
        const description = p.description ? String(p.description).substring(0, 200) : "";
        const imageUrl = p.imageUrl ? String(p.imageUrl) : "";
        const url = p.url ? String(p.url) : siteUrl;
        const priceString = p.estimatedPrice ? String(p.estimatedPrice).replace(/[^0-9,.]/g, '').replace(',', '.') : "0.00";
        const price = parseFloat(priceString) || 0;

        return {
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": title,
            "description": description,
            "image": imageUrl,
            "offers": {
              "@type": "Offer",
              "priceCurrency": "BRL",
              "price": price.toFixed(2),
              "availability": "https://schema.org/InStock",
              "url": url
            }
          }
        };
      });

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": itemListElement
      };

      return JSON.stringify(structuredData);
    } catch (e) {
      console.error("Erro crítico ao serializar SEO JSON-LD:", e);
      return '';
    }
  }, [products, siteUrl]);

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <link rel="canonical" href={siteUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      {products.length > 0 && products[0].imageUrl && (
        <meta property="og:image" content={String(products[0].imageUrl)} />
      )}
      {jsonLdString && (
        <script type="application/ld+json">
          {jsonLdString}
        </script>
      )}
    </Helmet>
  );
};
