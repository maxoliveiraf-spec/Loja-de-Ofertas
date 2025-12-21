import React, { useState, useEffect, useRef } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { TopProductsCarousel } from './components/TopProductsCarousel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SEO } from './components/SEO';
import { NotificationBell, NotificationItem } from './components/NotificationBell';
import { Product, ProductStatus, UserProfile } from './types';
import { productService, isFirebaseConfigured, trackSiteVisit, trackNotificationSent, socialService } from './services/database';
import { Footer } from './components/Footer';

const GOOGLE_CLIENT_ID = "14302060436-3nsfssbbrs3fgrphslk1g9nncura8nnb.apps.googleusercontent.com"; 
const ADMIN_EMAIL = "maxoliveiraf@gmail.com";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false); 
  
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const authModalGoogleRef = useRef<HTMLDivElement>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ url: '', title: '', estimatedPrice: '', category: 'Eletrônicos', imageUrl: '', description: '' });

  useEffect(() => {
    trackSiteVisit();
    let isInitialLoad = true;
    const unsubscribe = productService.subscribe(
      (updatedProducts) => {
        if (!isInitialLoad && updatedProducts.length > products.length) {
          triggerNotification({
             title: 'Nova Oferta! 🎉',
             message: `Acabou de chegar: ${updatedProducts[0].title}`,
             url: updatedProducts[0].url,
             imageUrl: updatedProducts[0].imageUrl
          });
        }
        setProducts(updatedProducts);
        isInitialLoad = false;
      },
      (error) => setDbError('api_disabled')
    );
    return () => unsubscribe();
  }, [products.length]);

  // Auth Management
  useEffect(() => {
    if ((isAdminOpen || isAnalyticsOpen || isAuthModalOpen) && !user && window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback
      });
      
      const target = isAuthModalOpen ? authModalGoogleRef : googleButtonRef;
      if (target.current) {
        window.google.accounts.id.renderButton(target.current, { theme: "outline", size: "large", width: 250 });
      }
    }
  }, [isAdminOpen, isAnalyticsOpen, isAuthModalOpen, user]);

  const handleGoogleCallback = async (response: any) => {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const payload = JSON.parse(jsonPayload);

    const newUser: UserProfile = {
      uid: payload.sub,
      displayName: payload.name,
      email: payload.email,
      photoURL: payload.picture,
      savedProducts: []
    };

    const dbProfile = await socialService.getUserProfile(newUser.uid);
    setUser({ ...newUser, ...dbProfile });

    if (payload.email === ADMIN_EMAIL) setIsAuthorized(true);
    setIsAuthModalOpen(false);
  };

  const triggerNotification = (data: any) => {
     setNotifications(prev => [{ id: Date.now().toString(), ...data, timestamp: Date.now(), read: false }, ...prev]);
     trackNotificationSent();
  };

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    await productService.add({ ...formData, status: ProductStatus.READY, addedAt: Date.now() });
    setFormData({ url: '', title: '', estimatedPrice: '', category: 'Eletrônicos', imageUrl: '', description: '' });
    alert("Adicionado!");
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = filterCategory === 'Todos' || p.category === filterCategory;
    const query = searchQuery.toLowerCase();
    return matchesCategory && (p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
  });

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-white sm:bg-gray-50 flex flex-col font-sans">
        <SEO products={products} />

        <Header 
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
          totalProducts={products.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto py-0 sm:py-8 sm:px-4">
            {/* Top Carousel apenas Desktop */}
            <div className="hidden sm:block mb-8">
              <TopProductsCarousel products={products} />
            </div>

            {/* Categoria Filter Bar Mobile (Estilo Story Circle) */}
            <div className="sm:hidden flex overflow-x-auto gap-4 p-4 scrollbar-hide border-b border-gray-100 bg-white sticky top-16 z-30">
               {['Todos', 'Eletrônicos', 'Moda', 'Casa', 'Beleza'].map(cat => (
                 <button 
                  key={cat} 
                  onClick={() => setFilterCategory(cat)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 group`}
                 >
                   <div className={`w-14 h-14 rounded-full p-0.5 ${filterCategory === cat ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'bg-gray-200'}`}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden text-center p-1">
                        {cat}
                      </div>
                   </div>
                   <span className={`text-[10px] ${filterCategory === cat ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{cat}</span>
                 </button>
               ))}
            </div>

            {/* GRID / FEED CONTAINER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-6 lg:gap-8 max-w-lg sm:max-w-none mx-auto">
               {filteredProducts.map(p => (
                 <ProductCard 
                   key={p.id} 
                   product={p} 
                   currentUser={user} 
                   onAuthRequired={() => setIsAuthModalOpen(true)}
                 />
               ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-20 px-4">
                <p className="text-gray-400 italic">Nenhuma oferta por aqui ainda...</p>
              </div>
            )}
        </main>

        <Footer onOpenAdmin={() => setIsAdminOpen(true)} />

        <NotificationBell notifications={notifications} onClear={() => setNotifications([])} onMarkRead={() => {}} />

        {/* Modal de Login (Estilo Social) */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              </div>
              <h3 className="text-xl font-extrabold mb-2 text-gray-900">Entre para interagir</h3>
              <p className="text-xs text-gray-500 mb-8 leading-relaxed">Você precisa estar logado para curtir, comentar e salvar suas ofertas favoritas!</p>
              <div ref={authModalGoogleRef} className="flex justify-center mb-6"></div>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-[11px] text-gray-400 font-bold uppercase tracking-widest hover:text-gray-600 transition-colors">Depois</button>
            </div>
          </div>
        )}

        {/* Admin Modal */}
        {isAdminOpen && (
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto sm:bg-black/50 sm:flex sm:items-center sm:justify-center sm:p-4">
            <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col">
               <div className="p-4 border-b flex justify-between items-center bg-white">
                 <h2 className="font-bold text-lg">Área do Gestor</h2>
                 <button onClick={() => setIsAdminOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">✕</button>
               </div>
               <div className="p-6 overflow-y-auto">
                  {!isAuthorized ? (
                    <div className="text-center py-10">
                       <p className="mb-6 text-sm text-gray-500 italic">Apenas administradores podem acessar esta seção.</p>
                       <div ref={googleButtonRef} className="flex justify-center"></div>
                    </div>
                  ) : (
                    <form onSubmit={handleAddProduct} className="space-y-4">
                       <input name="url" placeholder="Link do Afiliado" value={formData.url} onChange={(e)=>setFormData({...formData, url: e.target.value})} className="w-full border p-2 rounded text-sm" />
                       <input name="title" placeholder="Título do Produto" value={formData.title} onChange={(e)=>setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded text-sm" />
                       <input name="estimatedPrice" placeholder="Preço (ex: R$ 199,00)" value={formData.estimatedPrice} onChange={(e)=>setFormData({...formData, estimatedPrice: e.target.value})} className="w-full border p-2 rounded text-sm" />
                       <select value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded text-sm">
                          <option>Eletrônicos</option><option>Moda</option><option>Casa</option><option>Beleza</option>
                       </select>
                       <input name="imageUrl" placeholder="Link da Imagem" value={formData.imageUrl} onChange={(e)=>setFormData({...formData, imageUrl: e.target.value})} className="w-full border p-2 rounded text-sm" />
                       <button type="submit" className="w-full bg-brand-600 text-white font-bold py-3 rounded text-sm shadow-md">Publicar Oferta</button>
                    </form>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </HelmetProvider>
  );
}

export default App;