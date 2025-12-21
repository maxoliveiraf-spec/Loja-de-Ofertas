import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, increment, setDoc, getDocs, limit, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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

// Social Features
export const socialService = {
  toggleLike: async (productId: string, userId: string, isLiked: boolean) => {
    if (!db) return;
    const ref = doc(db, "products", productId);
    await updateDoc(ref, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
  },
  addComment: async (productId: string, comment: Omit<Comment, 'id'>) => {
    if (!db) return;
    await addDoc(collection(db, "products", productId, "comments"), comment);
    await updateDoc(doc(db, "products", productId), {
      commentsCount: increment(1)
    });
  },
  subscribeComments: (productId: string, onUpdate: (comments: Comment[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "products", productId, "comments"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      onUpdate(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
  },
  toggleSave: async (userId: string, productId: string, isSaved: boolean) => {
    if (!db) return;
    const ref = doc(db, "users", userId);
    try {
      await updateDoc(ref, {
        savedProducts: isSaved ? arrayRemove(productId) : arrayUnion(productId)
      });
    } catch (e) {
      await setDoc(ref, { savedProducts: [productId] }, { merge: true });
    }
  },
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    if (!db) return null;
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? snap.data() as UserProfile : null;
  }
};

export const blogService = {
  subscribeToPosts: (onUpdate: (posts: BlogPost[]) => void) => {
    if (!db) { onUpdate([]); return () => {}; }
    const q = query(collection(db, "blog_posts"), orderBy("publishedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BlogPost));
      onUpdate(posts);
    });
  },
  incrementView: async (id: string) => {
    if (!db) return;
    await updateDoc(doc(db, "blog_posts", id), { views: increment(1) });
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