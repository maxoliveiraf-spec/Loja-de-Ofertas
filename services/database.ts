import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, increment, setDoc, getDocs, limit, getDoc } from 'firebase/firestore';
import { Product, ProductStatus } from '../types';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDTBF78irSEk_VcFZ9p-VKdTCo_7mInM0g",
  authDomain: "lojaofertas-73c65.firebaseapp.com",
  projectId: "lojaofertas-73c65",
  storageBucket: "lojaofertas-73c65.firebasestorage.app",
  messagingSenderId: "14302060436",
  appId: "1:14302060436:web:e712f7ee6d9748db183981",
  measurementId: "G-CM26GM6XZ9"
};

// Inicializa o Firebase
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
  // Inscreve-se para atualizações em tempo real
  subscribe: (onUpdate: (products: Product[]) => void, onError?: (error: any) => void) => {
    if (!db) {
      onUpdate([]);
      return () => {};
    }

    try {
      const q = query(collection(db, "products"), orderBy("addedAt", "desc"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => {
          const data = doc.data();
          // Explicit mapping to ensure clean JSON object and avoid circular refs from Firestore internals
          return {
            id: doc.id,
            url: data.url || '',
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'Outros',
            estimatedPrice: data.estimatedPrice || '',
            imageUrl: data.imageUrl || '',
            videoUrl: data.videoUrl || '',
            imageSearchTerm: data.imageSearchTerm || '',
            status: data.status || ProductStatus.READY,
            addedAt: data.addedAt || Date.now(),
            clicks: data.clicks || 0
          } as Product;
        });
        onUpdate(products);
      }, (error) => {
        console.error("Erro ao buscar produtos do Firestore:", error);
        if (onError) onError(error);
      });

      return unsubscribe;
    } catch (err) {
      console.error("Erro ao criar subscrição:", err);
      if (onError) onError(err);
      return () => {};
    }
  },

  add: async (product: Omit<Product, 'id'>) => {
    if (!db) throw new Error("Firebase não inicializado corretamente.");
    
    // Adiciona ao Firestore. O ID é gerado automaticamente pelo Firebase.
    await addDoc(collection(db, "products"), {
        ...product,
        clicks: 0 // Initialize clicks
    });
  },

  delete: async (id: string) => {
    if (!db) throw new Error("Firebase não inicializado corretamente.");
    await deleteDoc(doc(db, "products", id));
  }
};

export const incrementClick = async (productId: string) => {
  if (!db) return;
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      clicks: increment(1)
    });
  } catch (error) {
    console.error("Error incrementing click:", error);
  }
};

// --- ANALYTICS & NOTIFICATIONS ---

export const trackSiteVisit = async () => {
  if (!db) return;
  try {
    await addDoc(collection(db, "site_visits"), {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      date: new Date().toISOString()
    });
  } catch (error) {
    // Silent fail for analytics
    console.debug("Error tracking visit:", error);
  }
};

export const getSiteStats = async () => {
  if (!db) return 0;
  try {
    // Limit to 1000 to save reads and bandwidth while giving a good estimate
    const q = query(collection(db, "site_visits"), limit(1000));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return 0;
  }
};

// Increment global notification counter
export const trackNotificationSent = async () => {
  if (!db) return;
  try {
    const statsRef = doc(db, "stats", "global");
    // Ensure document exists
    try {
       await updateDoc(statsRef, {
         notificationsSent: increment(1)
       });
    } catch (e) {
       // Create if doesn't exist
       await setDoc(statsRef, { notificationsSent: 1 }, { merge: true });
    }
  } catch (error) {
    console.debug("Error tracking notification:", error);
  }
};

// Get global notification count
export const getNotificationStats = async () => {
  if (!db) return 0;
  try {
    const statsRef = doc(db, "stats", "global");
    const docSnap = await getDoc(statsRef);
    if (docSnap.exists()) {
      return docSnap.data().notificationsSent || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    return 0;
  }
};