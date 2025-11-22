import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { Product, ProductStatus } from './types';

// --- CONSTANTS ---
// IMPORTANTE: Substitua a string abaixo pelo seu CLIENT_ID criado no Google Cloud Console.
// Sem isso, o login não funcionará em produção.
// Exemplo: "123456789-abcde.apps.googleusercontent.com"
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; 
const ADMIN_EMAIL = "maxoliveiraf@gmail.com";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false); // Controls auth state
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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

  // Load state from local storage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      try {
        const parsedProducts: Product[] = JSON.parse(savedProducts);
        // DATA MIGRATION: Ensure all products have an ID to prevent delete bugs
        const sanitizedProducts = parsedProducts.map(p => ({
          ...p,
          id: p.id || crypto.randomUUID() // Generate ID if missing from legacy data
        }));
        setProducts(sanitizedProducts);
      } catch (e) {
        console.error("Failed to parse products", e);
        setProducts([]);
      }
    }
    
    // Check if user was previously authorized in this session
    const sessionAuth = sessionStorage.getItem('isAuthorized');
    if (sessionAuth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  // Save state to local storage whenever products change
  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

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
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Validation
    if (!formData.url || !formData.title || !formData.imageUrl) {
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 3000);
      return;
    }

    try {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        url: formData.url,
        title: formData.title,
        description: formData.description || "Sem descrição.",
        category: formData.category,
        estimatedPrice: formData.estimatedPrice,
        imageUrl: formData.imageUrl,
        status: ProductStatus.READY,
        addedAt: Date.now()
      };

      setProducts(prev => [newProduct, ...prev]);
      
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
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 3000);
    }
  };

  const handleDeleteProduct = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default button behavior
    e.stopPropagation(); // Stop event bubbling
    
    if (window.confirm('Tem certeza que deseja remover este produto?')) {
      setProducts(prev => {
        const newProducts = prev.filter(p => p.id !== id);
        return newProducts;
      });
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Category Filter - Cleaner Look */}
        <div className="mb-10 border-b border-gray-200 pb-1">
          <div className="flex space-x-6 overflow-x-auto pb-2 scrollbar-hide">
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-sm font-medium whitespace-nowrap transition-all duration-200 px-1 pb-3 border-b-2 ${
                  filterCategory === cat 
                    ? 'border-brand-600 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-200">
            <div className="mx-auto w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sua vitrine está vazia</h2>
            <p className="text-gray-500 max-w-sm mx-auto mb-8 text-sm">
              Comece a adicionar produtos manualmente através da área do gestor para montar sua loja.
            </p>
            <button
              onClick={handleOpenAdminAttempt}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 transition-all"
            >
              Adicionar Produto
            </button>
          </div>
        )}

        {/* No Search Results State */}
        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block p-4 rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Nenhum produto encontrado</h3>
            <p className="text-gray-500 mt-1">Tente buscar por outro termo ou categoria.</p>
            <button 
              onClick={() => {setSearchQuery(''); setFilterCategory('Todos');}}
              className="mt-4 text-brand-600 hover:text-brand-800 text-sm font-medium"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </main>

      {/* Admin Modal */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setIsAdminOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
              {/* Modal Header */}
              <div className="bg-white px-4 py-4 sm:px-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg leading-6 font-bold text-gray-900">
                    Painel do Gestor
                  </h3>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold uppercase tracking-wide">
                    Logado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleLogout}
                    className="text-xs font-medium text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Sair da Conta
                  </button>
                  <button onClick={() => setIsAdminOpen(false)} className="text-gray-400 hover:text-gray-500 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-4 py-5 sm:p-6 bg-gray-50">
                
                {/* Add New Product Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-6">Cadastrar Novo Produto</h4>
                  
                  <form onSubmit={handleAddProduct} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="col-span-2">
                        <label htmlFor="url" className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                          Link de Afiliado *
                        </label>
                        <input
                          type="text"
                          name="url"
                          id="url"
                          required
                          value={formData.url}
                          onChange={handleInputChange}
                          className="bg-white text-gray-900 shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 border transition-shadow"
                          placeholder="https://amazon.com/..."
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        <label htmlFor="title" className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                          Título do Produto *
                        </label>
                        <input
                          type="text"
                          name="title"
                          id="title"
                          required
                          value={formData.title}
                          onChange={handleInputChange}
                          className="bg-white text-gray-900 shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 border transition-shadow"
                          placeholder="Ex: Smartphone Galaxy S23"
                        />
                      </div>

                       <div className="col-span-2 md:col-span-1">
                        <label htmlFor="estimatedPrice" className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                          Preço
                        </label>
                        <input
                          type="text"
                          name="estimatedPrice"
                          id="estimatedPrice"
                          value={formData.estimatedPrice}
                          onChange={handleInputChange}
                          className="bg-white text-gray-900 shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 border transition-shadow"
                          placeholder="Ex: R$ 2.500,00"
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1">
                         <label htmlFor="category" className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                          Categoria
                        </label>
                        <select
                          name="category"
                          id="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="bg-white text-gray-900 shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 border transition-shadow"
                        >
                          {commonCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        <label htmlFor="imageUrl" className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                          URL da Imagem *
                        </label>
                        <input
                          type="text"
                          name="imageUrl"
                          id="imageUrl"
                          required
                          value={formData.imageUrl}
                          onChange={handleInputChange}
                          className="bg-white text-gray-900 shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 border transition-shadow"
                          placeholder="https://..."
                        />
                      </div>
                      
                      {/* Image Preview */}
                      {formData.imageUrl && (
                        <div className="col-span-2 bg-gray-100 p-4 rounded-lg flex justify-center">
                          <img src={formData.imageUrl} alt="Preview" className="h-40 object-contain rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}

                      <div className="col-span-2">
                        <label htmlFor="description" className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                          Descrição
                        </label>
                        <textarea
                          name="description"
                          id="description"
                          rows={3}
                          value={formData.description}
                          onChange={handleInputChange}
                          className="bg-white text-gray-900 shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 border transition-shadow"
                          placeholder="Destaque os benefícios do produto..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                      <button
                        type="submit"
                        className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all"
                      >
                        Adicionar à Loja
                      </button>
                    </div>
                  </form>

                  {addStatus === 'success' && (
                    <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm text-center font-medium border border-green-100">
                      Produto adicionado com sucesso!
                    </div>
                  )}
                  {addStatus === 'error' && (
                     <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm text-center font-medium border border-red-100">
                      Por favor, preencha todos os campos obrigatórios.
                    </div>
                  )}
                </div>

                {/* Product List */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Produtos Ativos ({products.length})</h4>
                  <div className="bg-white rounded-lg border border-gray-200 max-h-80 overflow-y-auto shadow-sm">
                    <ul className="divide-y divide-gray-100">
                      {products.length === 0 ? (
                         <li className="px-6 py-8 text-sm text-gray-500 text-center">Nenhum produto cadastrado.</li>
                      ) : (
                        products.map((product) => (
                          <li key={product.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-12 h-12 bg-white border border-gray-200 rounded p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {product.videoUrl ? (
                                   <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                     <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                                   </svg>
                                ) : (
                                  product.imageUrl && (
                                    <img src={product.imageUrl} alt="" className="w-full h-full object-contain" />
                                  )
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {product.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {product.category} • {product.estimatedPrice || 'Sem preço'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-4">
                              <a 
                                href={product.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-gray-400 hover:text-brand-600 p-2 rounded-full hover:bg-brand-50 transition-colors"
                                title="Ver link"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteProduct(product.id, e)}
                                className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                title="Remover"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  onClick={() => setIsAdminOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;