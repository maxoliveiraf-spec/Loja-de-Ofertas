import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { Product, ProductStatus } from './types';
import { productService, isFirebaseConfigured } from './services/database';

// --- CONSTANTS ---
// IMPORTANTE: Substitua a string abaixo pelo seu CLIENT_ID criado no Google Cloud Console.
// Sem isso, o login não funcionará em produção.
const GOOGLE_CLIENT_ID = "14302060436-3nsfssbbrs3fgrphslk1g9nncura8nnb.apps.googleusercontent.com"; 
const ADMIN_EMAIL = "maxoliveiraf@gmail.com";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false); // Controls auth state
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Database Error State
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    estimatedPrice: '',
    category: 'Eletrônicos',
    imageUrl: '',
    description: ''
  });

  const [addStatus, setAddStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load products from Firebase (Realtime)
  useEffect(() => {
    const unsubscribe = productService.subscribe(
      (updatedProducts) => {
        setProducts(updatedProducts);
        setDbError(null); // Clear error on success
      },
      (error) => {
        // Check for common permission error
        if (error.code === 'permission-denied' || error.message.includes('Cloud Firestore API has not been used')) {
          setDbError('api_disabled');
        } else {
          setDbError('general');
        }
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Check previous session auth
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('isAuthorized');
    if (sessionAuth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  // Initialize Google Auth
  useEffect(() => {
    if (window.google && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID_HERE") {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback
        });
      } catch (e) {
        console.error("Erro ao inicializar Google Auth", e);
      }
    }
  }, []);

  const handleGoogleCallback = (response: any) => {
    try {
      // Simple JWT decode (Base64)
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      
      if (payload.email === ADMIN_EMAIL) {
        setIsAuthorized(true);
        setIsAdminOpen(true);
        sessionStorage.setItem('isAuthorized', 'true');
      } else {
        alert(`Acesso negado. O email ${payload.email} não tem permissão de gestor.`);
        setIsAuthorized(false);
        sessionStorage.removeItem('isAuthorized');
      }
    } catch (error) {
      console.error("Erro ao processar login", error);
      alert("Erro ao processar credenciais.");
    }
  };

  const handleOpenAdminAttempt = () => {
    if (isAuthorized) {
      setIsAdminOpen(true);
    } else {
      if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
        alert("CONFIGURAÇÃO NECESSÁRIA: Para fazer login, você precisa configurar o GOOGLE_CLIENT_ID no código (arquivo App.tsx). Enquanto isso, o acesso será liberado para testes.");
        // For demo purposes ONLY if ID is missing:
        setIsAuthorized(true);
        setIsAdminOpen(true);
        return;
      }

      if (window.google) {
        // Re-initialize to be sure
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback
        });
        window.google.accounts.id.prompt(); // Show the One Tap prompt or logic
      } else {
        alert("Erro: Serviço de login do Google não carregado.");
      }
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setIsAdminOpen(false);
    sessionStorage.removeItem('isAuthorized');
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add Product Logic
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseConfigured) {
      alert("ERRO: Firebase não configurado. Edite o arquivo services/database.ts com suas chaves.");
      return;
    }

    if (dbError) {
      alert("Erro: Banco de dados indisponível. Verifique o aviso no topo do site.");
      return;
    }

    // Basic Validation
    if (!formData.url || !formData.title || !formData.imageUrl) {
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 3000);
      return;
    }

    try {
      // Create product object (ID is handled by Firebase)
      const newProductData = {
        url: formData.url,
        title: formData.title,
        description: formData.description || "Sem descrição.",
        category: formData.category,
        estimatedPrice: formData.estimatedPrice,
        imageUrl: formData.imageUrl,
        status: ProductStatus.READY,
        addedAt: Date.now()
      };

      await productService.add(newProductData);
      
      // Reset form
      setFormData({
        url: '',
        title: '',
        estimatedPrice: '',
        category: 'Eletrônicos',
        imageUrl: '',
        description: ''
      });
      
      setAddStatus('success');
      setTimeout(() => setAddStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar no banco de dados. Verifique o console.");
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 3000);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    
    if (!isFirebaseConfigured) {
      alert("Firebase não configurado.");
      return;
    }
    
    if (dbError) {
      alert("Erro: Banco de dados indisponível. Ative o Firestore no console do Firebase.");
      return;
    }

    if (window.confirm('Tem certeza que deseja remover este produto?')) {
      try {
        await productService.delete(id);
      } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao deletar produto. Verifique sua conexão ou permissões.");
      }
    }
  };

  // Derived state for categories
  const availableCategories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    // Filter by Category
    const matchesCategory = filterCategory === 'Todos' || p.category === filterCategory;
    
    // Filter by Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      p.title.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  const commonCategories = [
    'Eletrônicos', 'Casa e Cozinha', 'Moda', 'Beleza', 'Esportes', 'Brinquedos', 'Livros', 'Outros'
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header 
        onOpenAdmin={handleOpenAdminAttempt}
        totalProducts={products.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Database Error Banners */}
      {dbError === 'api_disabled' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-4 text-center">
          <p className="text-sm text-red-800 font-bold mb-2">
            🛑 AÇÃO NECESSÁRIA: O Banco de Dados (Firestore) ainda não foi ativado.
          </p>
          <a 
            href="https://console.firebase.google.com/project/lojaofertas-73c65/firestore" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors"
          >
            CLIQUE AQUI PARA ATIVAR O BANCO DE DADOS
          </a>
          <p className="text-xs text-red-600 mt-2">
            No painel do Firebase, clique em <strong>"Criar banco de dados"</strong> e selecione <strong>"Modo de teste"</strong>.
          </p>
        </div>
      )}

      {dbError === 'general' && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 text-center">
          <p className="text-sm text-orange-800">
            ⚠️ Erro de conexão com o banco de dados. Verifique sua internet ou as regras do Firebase.
          </p>
        </div>
      )}

      {/* Configuration Warning Banner (only if keys are missing) */}
      {!isFirebaseConfigured && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center">
          <p className="text-sm text-yellow-800 font-medium">
            ⚠️ <strong>Atenção:</strong> O banco de dados não está conectado. 
            <br className="sm:hidden" /> 
            Configure o arquivo <code className="bg-yellow-100 px-1 py-0.5 rounded text-yellow-900">services/database.ts</code> com suas chaves do Firebase.
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Category Filter */}
        <div className="mb-10 border-b border-gray-200 pb-1">
          <div className="flex space-x-6 overflow-x-auto pb-2 scrollbar-hide">
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`
                  pb-1 whitespace-nowrap text-sm font-medium transition-colors
                  ${filterCategory === cat 
                    ? 'text-brand-600 border-b-2 border-brand-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                isAdmin={isAuthorized}
                onDelete={handleDeleteProduct}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum Produto Encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Ajuste o filtro ou a pesquisa.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Admin Modal */}
      {isAdminOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-start pt-10" onClick={() => setIsAdminOpen(false)}>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 my-8 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Painel de Gestor
              </h3>
              <button onClick={() => setIsAdminOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Adicionar Nova Oferta</h4>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700">Link da Oferta</label>
                  <input
                    type="url"
                    name="url"
                    id="url"
                    required
                    value={formData.url}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    placeholder="https://www.exemplo.com/oferta"
                  />
                </div>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    placeholder="Nome do Produto em Oferta"
                  />
                </div>
                <div>
                  <label htmlFor="estimatedPrice" className="block text-sm font-medium text-gray-700">Preço Estimado (R$)</label>
                  <input
                    type="text"
                    name="estimatedPrice"
                    id="estimatedPrice"
                    value={formData.estimatedPrice}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    placeholder="Ex: 99,90"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoria</label>
                  <select
                    name="category"
                    id="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border bg-white"
                  >
                    {commonCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">URL da Imagem</label>
                  <input
                    type="url"
                    name="imageUrl"
                    id="imageUrl"
                    required
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    placeholder="https://www.exemplo.com/imagem.jpg"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                    placeholder="Detalhes da oferta..."
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="submit"
                    className={`
                      inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
                      ${addStatus === 'success' ? 'bg-green-600' : addStatus === 'error' ? 'bg-red-600' : 'bg-brand-600 hover:bg-brand-700'}
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors
                    `}
                    disabled={addStatus !== 'idle'}
                  >
                    {addStatus === 'success' && 'Adicionado!'}
                    {addStatus === 'error' && 'Erro!'}
                    {addStatus === 'idle' && 'Adicionar Oferta'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Sair do Modo Gestor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Guia da Promoção. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
