import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Product } from '../types';

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
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
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
    await addDoc(collection(db, "products"), product);
  },

  delete: async (id: string) => {
    if (!db) throw new Error("Firebase não inicializado corretamente.");
    await deleteDoc(doc(db, "products", id));
  }
};