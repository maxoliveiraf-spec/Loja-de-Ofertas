
import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { getSiteStats, getNotificationStats, interestService } from '../services/database';

interface AnalyticsDashboardProps {
  products: Product[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ products }) => {
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clicks = products.reduce((sum, p) => sum + (p.clicks || 0), 0);
    setTotalClicks(clicks);

    const fetchStats = async () => {
      try {
        const [visits, notifs, fetchedLeads] = await Promise.all([
          getSiteStats(),
          getNotificationStats(),
          interestService.getLeads()
        ]);
        
        setTotalVisits(visits);
        setTotalNotifications(notifs);
        setLeads(fetchedLeads);
      } catch (e) {
        console.error("Erro ao carregar métricas admin:", e);
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
    <div className="space-y-10 animate-fadeIn">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visitas Totais</div>
           <div className="mt-2 flex items-baseline gap-2">
             <span className="text-3xl font-black text-gray-900">{loading ? '...' : totalVisits}</span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interesse em Ofertas</div>
           <div className="mt-2 flex items-baseline gap-2">
             <span className="text-3xl font-black text-brand-600">{totalClicks}</span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mails Capturados</div>
           <div className="mt-2 flex items-baseline gap-2">
             <span className="text-3xl font-black text-purple-600">{leads.length}</span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conversão</div>
           <div className="mt-2 flex items-baseline gap-2">
             <span className="text-3xl font-black text-gray-900">
               {totalVisits > 0 ? ((totalClicks / totalVisits) * 100).toFixed(1) : 0}%
             </span>
           </div>
        </div>
      </div>

      {/* Leads Section */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">E-mails de Clientes Interessados</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Lista de Leads</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/30">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{lead.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate">{lead.productTitle || lead.productId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-[10px] text-gray-400 font-bold">
                    {new Date(lead.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase tracking-widest italic">
                    Nenhum e-mail capturado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Produtos Mais Clicados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <tbody className="bg-white divide-y divide-gray-50">
              {topProducts.map((product) => {
                const percentage = totalClicks > 0 ? ((product.clicks || 0) / totalClicks) * 100 : 0;
                return (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 object-contain bg-gray-50 rounded-lg p-1" src={product.imageUrl} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{product.title}</div>
                          <div className="text-[10px] font-black text-brand-600 uppercase">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <span className="text-sm font-black text-gray-900">{product.clicks || 0}</span>
                       <span className="text-[10px] text-gray-400 ml-1 font-bold">Cliques</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 ml-auto">
                        <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
