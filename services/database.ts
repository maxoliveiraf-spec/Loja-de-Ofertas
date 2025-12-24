// Corrigindo o erro de importação do initializeApp garantindo a sintaxe modular do Firebase v9+
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, increment, setDoc, getDocs, limit, getDoc, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { Product, ProductStatus, BlogPost, UserProfile, Comment } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDTBF78irSEk_VcFZ9p-VKdTCo_7mInM0g",
  authDomain: "lojaofertas-73c65.firebaseapp.com",
  projectId: "lojaofertas-73c65",
  storageBucket: "lojaofertas-73c65.firebasestorage.app",
  messagingSenderId: "14302060436",
  appId: "1:14302060436:web:e712f7ee6d9748db183981",
  measurementId: "G-CM26GM6XZ9"
};

let db: any = null;
export let isFirebaseConfigured = false;

try {
  // Inicialização padrão do Firebase v9+ modular
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isFirebaseConfigured = true;
} catch (e) {
  console.error("Erro ao inicializar Firebase:", e);
}

export const productService = {
  subscribe: (onUpdate: (products: Product[]) => void, onError?: (error: any) => void) => {
    if (!db) { onUpdate([]); return () => {}; }
    const q = query(collection(db, "products"), orderBy("addedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      onUpdate(products);
    }, onError);
  },
  add: async (product: Omit<Product, 'id'>) => {
    if (!db) return;
    await addDoc(collection(db, "products"), { 
      ...product, 
      clicks: 0, 
      likes: [], 
      commentsCount: 0 
    });
  },
  update: async (id: string, product: Partial<Product>) => {
    if (!db) return;
    const ref = doc(db, "products", id);
    await updateDoc(ref, product);
  },
  delete: async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "products", id));
  }
};

export const commentService = {
  subscribe: (productId: string, onUpdate: (comments: Comment[]) => void) => {
    if (!db) { onUpdate([]); return () => {}; }
    const q = query(
      collection(db, "comments"), 
      where("productId", "==", productId)
    );
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Comment))
      .sort((a, b) => b.timestamp - a.timestamp);
      
      onUpdate(comments);
    }, (error) => {
      console.error("Erro ao assinar comentários:", error);
    });
  },
  add: async (productId: string, comment: Omit<Comment, 'id'>) => {
    if (!db) return;
    await addDoc(collection(db, "comments"), { ...comment, productId });
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, { commentsCount: increment(1) });
  }
};

export const blogService = {
  subscribeToPosts: (onUpdate: (posts: BlogPost[]) => void, onError?: (error: any) => void) => {
    if (!db) { onUpdate([]); return () => {}; }
    const q = query(collection(db, "blog_posts"), orderBy("publishedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BlogPost));
      onUpdate(posts);
    }, onError);
  },
  incrementView: async (id: string) => {
    if (!db) return;
    const ref = doc(db, "blog_posts", id);
    await updateDoc(ref, { views: increment(1) });
  }
};

export const interestService = {
  saveEmail: async (email: string, productId: string) => {
    if (!db) return;
    await addDoc(collection(db, "interest_list"), {
      email,
      productId,
      timestamp: Date.now()
    });
  }
};

export const socialService = {
  toggleLike: async (productId: string, userId: string, isLiked: boolean) => {
    if (!db) return;
    const ref = doc(db, "products", productId);
    await updateDoc(ref, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
  },
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    if (!db) return null;
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? snap.data() as UserProfile : null;
  }
};

export const incrementClick = async (productId: string) => {
  if (!db) return;
  await updateDoc(doc(db, "products", productId), { clicks: increment(1) });
};

export const trackSiteVisit = async () => {
  if (!db) return;
  await addDoc(collection(db, "site_visits"), { timestamp: Date.now(), date: new Date().toISOString() });
};

export const getSiteStats = async () => {
  if (!db) return 0;
  const q = query(collection(db, "site_visits"), limit(1000));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const trackNotificationSent = async () => {
  if (!db) return;
  const statsRef = doc(db, "stats", "global");
  try { await updateDoc(statsRef, { notificationsSent: increment(1) }); }
  catch (e) { await setDoc(statsRef, { notificationsSent: 1 }, { merge: true }); }
};

export const getNotificationStats = async () => {
  if (!db) return 0;
  const docSnap = await getDoc(doc(db, "stats", "global"));
  return docSnap.exists() ? docSnap.data().notificationsSent || 0 : 0;
};
