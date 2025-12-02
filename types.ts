export enum ProductStatus {
  PENDING = 'PENDING',
  ENRICHING = 'ENRICHING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface Product {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  estimatedPrice?: string;
  imageUrl?: string;
  videoUrl?: string;
  imageSearchTerm?: string;
  status: ProductStatus;
  addedAt: number;
  clicks?: number;
}

export interface SiteStats {
  totalVisits: number;
  productClicks: number;
  referrers: Record<string, number>;
}

export interface AppConfig {
  lastSync: number;
}

// Type definitions for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}