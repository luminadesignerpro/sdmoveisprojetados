import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, TrendingUp, CheckCircle, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const OSReportPage: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('service_orders')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar OS', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    (o.order_number?.toString().includes(search)) ||
    (o.clients?.name?.toLowerCase().includes(search.toLowerCase())) ||
    (o.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_value || 0), 0);
  const completed = filteredOrders.filter(o => o.status === 'concluida').length;
  const pending = filteredOrders.filter(o => o.status !== 'concluida').length;

  return (
    <div className="p-6 h-full flex flex-col bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-yellow-200 bg-clip-text text-transparent flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Relatório de Ordens de Serviço
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhe métricas e resultados das OS da marcenaria.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 relative z-10">
        <div className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl p-5 flex flex-col justify-center shadow-lg transition-transform hover:-translate-y-1">
          <span className="text-muted-foreground text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Valor Total (Filtrado)</span>
          <span className="text-2xl font-black mt-2 text-primary">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl p-5 flex flex-col justify-center shadow-lg transition-transform hover:-translate-y-1">
          <span className="text-muted-foreground text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" /> Total OS</span>
          <span className="text-2xl font-black mt-2 text-blue-400">{filteredOrders.length}</span>
        </div>
        <div className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl p-5 flex flex-col justify-center shadow-lg transition-transform hover:-translate-y-1">
          <span className="text-muted-foreground text-sm font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> OS Concluídas</span>
          <span className="text-2xl font-black mt-2 text-green-500">{completed}</span>
        </div>
        <div className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl p-5 flex flex-col justify-center shadow-lg transition-transform hover:-translate-y-1">
          <span className="text-muted-foreground text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400" /> OS Pendentes</span>
          <span className="text-2xl font-black mt-2 text-orange-400">{pending}</span>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl shadow-xl flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por Nº, cliente ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-muted-foreground animate-pulse">Carregando relatório...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-20" />
              <p>Nenhuma ordem de serviço encontrada.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase border-b border-border/50">
                  <th className="pb-3 px-4 font-semibold">Nº</th>
                  <th className="pb-3 px-4 font-semibold">Data</th>
                  <th className="pb-3 px-4 font-semibold">Cliente</th>
                  <th className="pb-3 px-4 font-semibold">Descrição</th>
                  <th className="pb-3 px-4 font-semibold text-right">Valor</th>
                  <th className="pb-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(os => (
                  <tr key={os.id} className="border-b border-border/20 hover:bg-white/5 transition-colors group">
                    <td className="py-3 px-4 text-sm font-bold text-primary">#{os.order_number}</td>
                    <td className="py-3 px-4 text-sm text-foreground/80 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" /> 
                      {os.created_at ? format(new Date(os.created_at), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">{os.clients?.name || 'Cliente Avulso'}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground truncate max-w-[200px]">{os.description || '-'}</td>
                    <td className="py-3 px-4 text-sm font-bold text-right text-green-400">
                      R$ {os.total_value ? os.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        os.status === 'concluida' ? 'bg-green-500/20 text-green-400' :
                        os.status === 'em_andamento' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {os.status === 'concluida' ? 'CONCLUÍDA' : 
                         os.status === 'em_andamento' ? 'EM ANDAMENTO' : 'PENDENTE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OSReportPage;
