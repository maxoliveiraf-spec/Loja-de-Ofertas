import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Product } from '../types';

interface SEOProps {
  products: Product[];
}

export const SEO: React.FC<SEOProps> = ({ products }) => {
  const siteTitle = "Guia da Promoção - Loja de Ofertas";
  const siteDescription = "Encontre as melhores ofertas e promoções da internet. Smartphones, eletrônicos, moda e muito mais com descontos imperdíveis.";
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://loja-de-ofertas.vercel.app';
  
  // Create JSON-LD Structured Data for the Product List
  // This helps Google understand that this page is a collection of products
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.title,
        "description": product.description,
        "image": product.imageUrl,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "BRL",
          "price": product.estimatedPrice ? product.estimatedPrice.replace(/[^0-9,]/g, '').replace(',', '.') : "0.00",
          "availability": "https://schema.org/InStock",
          "url": product.url
        }
      }
    }))
  };

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
        <meta property="og:image" content={products[0].imageUrl} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      
      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};