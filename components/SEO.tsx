
import React, { useEffect } from 'react';
import { Product } from '../types';

interface SEOProps {
  products: Product[];
}

export const SEO: React.FC<SEOProps> = ({ products }) => {
  useEffect(() => {
    const siteTitle = "Guia da Promoção - Loja de Ofertas";
    const siteDescription = "Encontre as melhores ofertas e promoções da internet. Smartphones, eletrônicos, moda e muito mais com descontos imperdíveis.";
    const siteUrl = window.location.origin;

    // Atualiza o Título do Documento
    document.title = siteTitle;

    // Atualiza a Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', siteDescription);

    // Função auxiliar para atualizar tags OG
    const updateMetaTag = (attr: string, value: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${value}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateMetaTag('property', 'og:type', 'website');
    updateMetaTag('property', 'og:title', siteTitle);
    updateMetaTag('property', 'og:description', siteDescription);
    updateMetaTag('property', 'og:url', siteUrl);

    if (products.length > 0 && products[0].imageUrl) {
      updateMetaTag('property', 'og:image', String(products[0].imageUrl));
    }

    // Injeção de JSON-LD
    let scriptEl = document.getElementById('json-ld-seo') as HTMLScriptElement;
    
    if (products && products.length > 0) {
      try {
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

        if (!scriptEl) {
          scriptEl = document.createElement('script');
          scriptEl.id = 'json-ld-seo';
          scriptEl.type = 'application/ld+json';
          document.head.appendChild(scriptEl);
        }
        scriptEl.textContent = JSON.stringify(structuredData);
      } catch (e) {
        console.error("Erro ao serializar SEO JSON-LD:", e);
      }
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [products]);

  return null;
};
