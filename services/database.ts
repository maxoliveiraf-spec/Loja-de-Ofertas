
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, increment, setDoc, getDocs, limit, getDoc, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { getAuth, signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
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
let auth: any = null;
export let isFirebaseConfigured = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  isFirebaseConfigured = true;
  
  // Log de diagnóstico para ajudar o usuário com Domínios Autorizados
  console.log("--- DIAGNÓSTICO FIREBASE ---");
  console.log("Se o login falhar, adicione este domínio no Firebase Console (Authentication > Settings > Authorized domains):");
  console.log(window.location.hostname);
  console.log("----------------------------");
} catch (e) {
  console.error("Firebase Init Error:", e);
}

export const authService = {
  loginWithToken: async (idToken: string) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } catch (e: any) {
      if (e.code === 'auth/configuration-not-found') {
        console.error("ERRO: O Provedor Google não está ativado OU o domínio atual não está autorizado.");
      }
      throw e;
    }
  },
  logout: async () => {
    if (auth) await signOut(auth);
  },
  onAuthChange: (callback: (user: any) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },
  getCurrentUser: () => auth?.currentUser || null
};

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
    }, (error) => {
      console.warn("Firestore Read Error:", error);
      if (onError) onError(error);
    });
  },
  add: async (product: Omit<Product, 'id'>) => {
    if (!db) return;
    return await addDoc(collection(db, "products"), { 
      ...product, 
      clicks: 0, 
      likes: [], 
      commentsCount: 0 
    });
  },
  update: async (id: string, product: Partial<Product>) => {
    if (!db) return;
    const ref = doc(db, "products", id);
    const { id: _, ...updateData } = product as any;
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );
    return await updateDoc(ref, cleanData);
  },
  delete: async (id: string) => {
    if (!db) return;
    return await deleteDoc(doc(db, "products", id));
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
    }, (error) => {});
  },
  incrementView: async (postId: string) => {
    if (!db) return;
    try { await updateDoc(doc(db, "blog_posts", postId), { views: increment(1) }); } catch (e) {}
  }
};

export const commentService = {
  subscribe: (productId: string, onUpdate: (comments: Comment[]) => void) => {
    if (!db) { onUpdate([]); return () => {}; }
    const q = query(collection(db, "comments"), where("productId", "==", productId));
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Comment)).sort((a, b) => b.timestamp - a.timestamp);
      onUpdate(comments);
    }, (error) => {});
  },
  add: async (productId: string, comment: Omit<Comment, 'id'>) => {
    if (!db) return;
    await addDoc(collection(db, "comments"), { ...comment, productId });
    const productRef = doc(db, "products", productId);
    try { await updateDoc(productRef, { commentsCount: increment(1) }); } catch (e) {}
  }
};

export const interestService = {
  saveEmail: async (email: string, productId: string, productTitle: string) => {
    if (!db) return;
    await addDoc(collection(db, "interest_list"), { email, productId, productTitle, timestamp: Date.now() });
  },
  getLeads: async () => {
    if (!db) return [];
    const q = query(collection(db, "interest_list"), orderBy("timestamp", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

export const socialService = {
  toggleLike: async (productId: string, userId: string, isLiked: boolean) => {
    if (!db) return;
    const ref = doc(db, "products", productId);
    try {
      await updateDoc(ref, { likes: isLiked ? arrayRemove(userId) : arrayUnion(userId) });
    } catch (e) {}
  },
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, "users", userId));
      return snap.exists() ? snap.data() as UserProfile : null;
    } catch (e) { return null; }
  }
};

export const incrementClick = async (productId: string) => {
  if (!db) return;
  try { await updateDoc(doc(db, "products", productId), { clicks: increment(1) }); } catch (e) {}
};

export const trackSiteVisit = async () => {
  if (!db) return;
  try { await addDoc(collection(db, "site_visits"), { timestamp: Date.now(), date: new Date().toISOString() }); } catch (e) {}
};

export const getSiteStats = async () => {
  if (!db) return 0;
  try {
    const q = query(collection(db, "site_visits"), limit(1000));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (e) { return 0; }
};

export const trackNotificationSent = async () => {
  if (!db) return;
  const statsRef = doc(db, "stats", "global");
  try { await updateDoc(statsRef, { notificationsSent: increment(1) }); } catch (e) { 
    try { await setDoc(statsRef, { notificationsSent: 1 }, { merge: true }); } catch (err) {}
  }
};

export const getNotificationStats = async () => {
  if (!db) return 0;
  try {
    const docSnap = await getDoc(doc(db, "stats", "global"));
    return docSnap.exists() ? docSnap.data().notificationsSent || 0 : 0;
  } catch (e) { return 0; }
};
