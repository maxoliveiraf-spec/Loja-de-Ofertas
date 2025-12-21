import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { TopProductsCarousel } from './components/TopProductsCarousel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SEO } from './components/SEO';
import { NotificationBell, NotificationItem } from './components/NotificationBell';
import { Product, ProductStatus, UserProfile } from './types';
import { productService, trackSiteVisit, trackNotificationSent, socialService } from './services/database';
import { enrichProductData } from './services/geminiService';
import { Footer } from './components/Footer';

const GOOGLE_CLIENT_ID = "14302060436-3nsfssbbrs3fgrphslk1g9nncura8nnb.apps.googleusercontent.com"; 
const ADMIN_EMAIL = "maxoliveiraf@gmail.com";
const INITIAL_ITEMS = 12;
const ITEMS_PER_PAGE = 8;

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const authModalGoogleRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ 
    url: '', 
    title: '', 
    estimatedPrice: '', 
    category: 'Eletrônicos', 
    imageUrl: '', 
    description: '' 
  });

  const isUserAdmin = user?.email === ADMIN_EMAIL;

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

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < products.length) {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [products.length, visibleCount]);

  useEffect(() => {
    if ((isPostModalOpen || isAnalyticsOpen || isAuthModalOpen) && !user && window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback
      });
      
      const target = isAuthModalOpen ? authModalGoogleRef : googleButtonRef;
      if (target.current) {
        window.google.accounts.id.renderButton(target.current, { theme: "outline", size: "large", width: 250 });
      }
    }
  }, [isPostModalOpen, isAnalyticsOpen, isAuthModalOpen, user]);

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
    setIsAuthModalOpen(false);
  };

  const triggerNotification = (data: any) => {
     setNotifications(prev => [{ id: Date.now().toString(), ...data, timestamp: Date.now(), read: false }, ...prev]);
     trackNotificationSent();
  };

  const isValidMercadoLivreUrl = (url: string) => {
    const mlRegex = /^(https?:\/\/)?(www\.)?(mercadolivre\.com(\.br)?|mlstatic\.com|mercadolivre\.com\/sec\/)\/.+$/i;
    return mlRegex.test(url.trim());
  };

  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, url }));
    if (!editingProduct && isValidMercadoLivreUrl(url) && !formData.title) {
      setIsEnriching(true);
      try {
        const enriched = await enrichProductData(url);
        setFormData(prev => ({
          ...prev,
          title: enriched.title || prev.title,
          description: enriched.description || prev.description,
          category: enriched.category || prev.category,
          estimatedPrice: enriched.estimatedPrice || prev.estimatedPrice
        }));
      } catch (e) {
        console.error("Enrichment failed", e);
      } finally {
        setIsEnriching(false);
      }
    }
  };

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!isValidMercadoLivreUrl(formData.url)) {
      alert("Erro: Apenas links oficiais do Mercado Livre são permitidos!");
      return;
    }

    if (!formData.title.trim() || !formData.estimatedPrice.trim() || !formData.imageUrl.trim()) {
      alert("Erro: Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, {
          ...formData,
          category: formData.category
        });
        alert("🎉 Oferta atualizada com sucesso!");
      } else {
        await productService.add({ 
          ...formData, 
          status: ProductStatus.READY, 
          addedAt: Date.now(),
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          authorId: user.uid
        });
        alert("🎉 Oferta publicada com sucesso na comunidade!");
      }

      setFormData({ url: '', title: '', estimatedPrice: '', category: 'Eletrônicos', imageUrl: '', description: '' });
      setEditingProduct(null);
      setIsPostModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar. Verifique sua conexão.");
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      url: product.url,
      title: product.title,
      estimatedPrice: product.estimatedPrice || '',
      category: product.category,
      imageUrl: product.imageUrl || '',
      description: product.description || ''
    });
    setIsPostModalOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = filterCategory === 'Todos' || p.category === filterCategory;
    const query = searchQuery.toLowerCase();
    return matchesCategory && (p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
  });

  // Apply Client-side Pagination
  const pagedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-white sm:bg-gray-50 flex flex-col font-sans">
        <SEO products={products} />

        <Header 
          onOpenAdmin={() => { setEditingProduct(null); setFormData({url:'',title:'',estimatedPrice:'',category:'Eletrônicos',imageUrl:'',description:''}); user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true); }}
          onOpenAnalytics={() => isUserAdmin ? setIsAnalyticsOpen(true) : alert("Acesso restrito apenas ao gestor do site.")}
          totalProducts={products.length}
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setVisibleCount(INITIAL_ITEMS); }}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto py-0 sm:py-8 sm:px-4">
            <div className="hidden sm:block mb-8">
              <TopProductsCarousel products={products} />
            </div>

            {/* Categorias Mobile */}
            <div className="sm:hidden flex overflow-x-auto gap-4 p-4 scrollbar-hide border-b border-gray-100 bg-white sticky top-16 z-30">
               {['Todos', 'Eletrônicos', 'Moda', 'Casa', 'Beleza'].map(cat => (
                 <button 
                  key={cat} 
                  onClick={() => { setFilterCategory(cat); setVisibleCount(INITIAL_ITEMS); }}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 active:scale-90 transition-transform duration-75 p-1 rounded-xl`}
                 >
                   <div className={`w-14 h-14 rounded-full p-0.5 ${filterCategory === cat ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'bg-gray-200'}`}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden text-center p-1">
                        {cat}
                      </div>
                   </div>
                   <span className={`text-[11px] ${filterCategory === cat ? 'font-black text-gray-900' : 'font-medium text-gray-400'}`}>{cat}</span>
                 </button>
               ))}
            </div>

            {isAnalyticsOpen && isUserAdmin && (
              <div className="mb-12 p-6 bg-white rounded-3xl border border-gray-100 shadow-xl animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-gray-900">Estatísticas do Gestor</h2>
                   <button onClick={() => setIsAnalyticsOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 active:scale-90">Fechar Painel</button>
                </div>
                <AnalyticsDashboard products={products} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-6 lg:gap-8 max-w-lg sm:max-w-none mx-auto items-start align-top">
               {pagedProducts.map(p => (
                 <div key={p.id} className="self-start">
                   <ProductCard 
                     product={p} 
                     currentUser={user} 
                     onAuthRequired={() => setIsAuthModalOpen(true)}
                     onEdit={openEdit}
                     isAdmin={isUserAdmin}
                   />
                 </div>
               ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            {filteredProducts.length > visibleCount && (
              <div ref={observerTarget} className="w-full py-12 flex flex-col items-center justify-center gap-3">
                 <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Carregando mais ofertas...</p>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-20 px-4 animate-fadeIn">
                <p className="text-gray-400 italic">Nenhuma oferta encontrada para sua busca...</p>
              </div>
            )}
        </main>

        <Footer onOpenAdmin={() => user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true)} />

        <NotificationBell notifications={notifications} onClear={() => setNotifications([])} onMarkRead={() => {}} />

        {/* Modal de Postagem / Edição */}
        {isPostModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-auto">
               <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                 <div className="flex items-center gap-2">
                   <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                   <h2 className="font-bold text-gray-900">{editingProduct ? 'Editar Oferta' : 'Enviar Nova Oferta ML'}</h2>
                 </div>
                 <button onClick={() => setIsPostModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-600 active:scale-90 transition-transform">✕</button>
               </div>
               
               <form onSubmit={handleAddProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link do Mercado Livre</label>
                    <input 
                      required
                      type="url"
                      placeholder="https://mercadolivre.com/sec/..." 
                      value={formData.url} 
                      onChange={(e) => handleUrlChange(e.target.value)} 
                      className={`w-full border p-4 rounded-xl text-sm outline-none focus:ring-2 ${isValidMercadoLivreUrl(formData.url) || !formData.url ? 'focus:ring-brand-500' : 'focus:ring-red-500 border-red-200'}`} 
                    />
                    {!isValidMercadoLivreUrl(formData.url) && formData.url && (
                      <p className="text-[10px] text-red-500 mt-1 font-bold italic">Link inválido! Use apenas links do Mercado Livre.</p>
                    )}
                    {isEnriching && <p className="text-[10px] text-brand-600 animate-pulse mt-1 font-bold">Lendo dados do produto...</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título da Oferta</label>
                      <input required placeholder="Ex: iPhone 15 Pro Max" value={formData.title} onChange={(e)=>setFormData({...formData, title: e.target.value})} className="w-full border p-4 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Preço Atual</label>
                      <input required placeholder="Ex: R$ 7.499,00" value={formData.estimatedPrice} onChange={(e)=>setFormData({...formData, estimatedPrice: e.target.value})} className="w-full border p-4 rounded-xl text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição da Oferta</label>
                    <textarea 
                      placeholder="Fale um pouco sobre o produto..." 
                      value={formData.description} 
                      onChange={(e)=>setFormData({...formData, description: e.target.value})} 
                      className="w-full border p-4 rounded-xl text-sm min-h-[120px] resize-none focus:ring-2 focus:ring-brand-500 outline-none" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoria</label>
                      <select value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} className="w-full border p-4 rounded-xl text-sm bg-white">
                         <option>Eletrônicos</option><option>Moda</option><option>Casa</option><option>Beleza</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">URL da Imagem</label>
                      <input required type="url" placeholder="Copie o link da imagem" value={formData.imageUrl} onChange={(e)=>setFormData({...formData, imageUrl: e.target.value})} className="w-full border p-4 rounded-xl text-sm" />
                    </div>
                  </div>

                  <button 
                    disabled={!isValidMercadoLivreUrl(formData.url) || isEnriching}
                    type="submit" 
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {editingProduct ? 'Salvar Alterações' : 'Publicar Oferta Agora'}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  </button>
               </form>
            </div>
          </div>
        )}

        {/* Modal de Login */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl animate-slideUp">
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              </div>
              <h3 className="text-xl font-extrabold mb-2 text-gray-900">Entre para continuar</h3>
              <p className="text-xs text-gray-500 mb-8 leading-relaxed">Você precisa estar logado para postar ofertas e interagir com a comunidade!</p>
              <div ref={authModalGoogleRef} className="flex justify-center mb-6"></div>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-[11px] text-gray-400 font-bold uppercase tracking-widest active:scale-90 p-2">Fechar</button>
            </div>
          </div>
        )}
      </div>
    </HelmetProvider>
  );
}

export default App;