
export enum ProductStatus {
  PENDING = 'PENDING',
  ENRICHING = 'ENRICHING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  timestamp: number;
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
  likes?: string[]; // Array of user IDs
  commentsCount?: number;
  authorName?: string;
  authorPhoto?: string;
  authorId?: string;
  isGestor?: boolean; // Identifica se foi postado pelo administrador
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  savedProducts?: string[]; // Array of product IDs
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  affiliateUrl: string;
  tags: string[];
  publishedAt: number;
  views?: number;
}

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
