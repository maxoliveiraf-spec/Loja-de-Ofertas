import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { getFirestore, collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

interface AnalyticsDashboardProps {
  products: Product[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ products }) => {
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calculate total product clicks from current products state (realtime)
    const clicks = products.reduce((sum, p) => sum + (p.clicks || 0), 0);
    setTotalClicks(clicks);

    // Fetch visits from Firestore
    const fetchStats = async () => {
      try {
        const db = getFirestore();
        // This is a simplified count. In a real app with millions of records, use aggregation queries.
        // For this scale, counting recent documents is okay.
        const q = query(collection(db, "site_visits"), limit(1000)); 
        const snapshot = await getDocs(q);
        setTotalVisits(snapshot.size); // Basic count of docs in sample
      } catch (e) {
        console.error("Error fetching analytics", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [products]);

  const topProducts = [...products]
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Estatísticas da Loja</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Visitas Totais</div>
           <div className="mt-2 flex items-baseline gap-2">
             <span className="text-3xl font-extrabold text-gray-900">
               {loading ? '...' : totalVisits}
             </span>
             {/* <span className="text-xs text-green-600 font-bold">↑ 12%</span> */}
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cliques em Produtos</div>
           <div className="mt-2 flex items-baseline gap-2">
             <span className="text-3xl font-extrabold text-brand-600">
               {totalClicks}
             </span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Taxa de Interesse</div>
           <div className="mt-2 flex items-baseline gap-2">
             <span className="text-3xl font-extrabold text-gray-900">
               {totalVisits > 0 ? ((totalClicks / totalVisits) * 100).toFixed(1) : 0}%
             </span>
             <span className="text-xs text-gray-400">Cliques/Visita</span>
           </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Produtos Mais Populares</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cliques</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topProducts.map((product) => {
                const percentage = totalClicks > 0 ? ((product.clicks || 0) / totalClicks) * 100 : 0;
                return (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                          <img className="h-8 w-8 object-contain" src={product.imageUrl} alt="" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={product.title}>{product.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.estimatedPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      {product.clicks || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px]">
                        <div className="bg-brand-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum dado de clique registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};