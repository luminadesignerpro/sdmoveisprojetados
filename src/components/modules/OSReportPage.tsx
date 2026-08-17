import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, TrendingUp, CheckCircle, Clock, Calendar, Eye, Edit2, MessageCircle, Printer, X, Phone, MapPin, User, DollarSign, StickyNote } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

/* ----------- Função de Impressão ----------- */
const printOS = (os: any) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  const clientName = os.clients?.name || os.client_name || 'Cliente Avulso';
  const statusLabel = os.status === 'concluida' ? 'CONCLUÍDA' : os.status === 'em_andamento' ? 'EM ANDAMENTO' : 'PENDENTE';
  const statusColor = os.status === 'concluida' ? '#22c55e' : os.status === 'em_andamento' ? '#3b82f6' : '#f97316';
  const dateStr = os.created_at ? format(new Date(os.created_at), 'dd/MM/yyyy') : '-';
  const totalVal = os.total_value ? os.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00';
  win.document.write(`
    <!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>OS #${os.order_number}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#1e293b;padding:40px}
      .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden;max-width:800px;margin:0 auto}
      .header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;display:flex;justify-content:space-between;align-items:center}
      .logo{color:#f59e0b;font-size:24px;font-weight:900;letter-spacing:1px}
      .os-num{color:#fff;font-size:36px;font-weight:900}
      .body{padding:32px 40px}
      .badge{display:inline-block;padding:6px 18px;border-radius:99px;font-size:13px;font-weight:700;color:#fff;background:${statusColor};margin-bottom:20px}
      .section-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;margin-top:24px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
      .info-item label{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;display:block;margin-bottom:2px}
      .info-item span{font-size:15px;color:#1e293b;font-weight:500}
      .divider{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
      .value-box{background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;margin-top:16px}
      .value-label{font-size:13px;color:#166534;font-weight:600}
      .value-amount{font-size:28px;font-weight:900;color:#16a34a}
      .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="card">
      <div class="header">
        <div class="logo">SD MÓVEIS</div>
        <div class="os-num">#${os.order_number}</div>
      </div>
      <div class="body">
        <div class="badge">${statusLabel}</div>
        <div class="section-title">Dados do Cliente</div>
        <div class="info-grid">
          <div class="info-item"><label>Nome</label><span>${clientName}</span></div>
          <div class="info-item"><label>Data</label><span>${dateStr}</span></div>
          <div class="info-item"><label>Telefone</label><span>${os.client_phone || '-'}</span></div>
          <div class="info-item"><label>Endereço</label><span>${os.client_address || '-'}</span></div>
        </div>
        <hr class="divider"/>
        <div class="section-title">Descrição do Serviço</div>
        <p style="font-size:15px;color:#334155;line-height:1.6">${os.description || 'Sem descrição'}</p>
        ${os.notes ? `<div class="section-title" style="margin-top:16px">Observações</div><p style="font-size:14px;color:#64748b;line-height:1.6">${os.notes}</p>` : ''}
        <div class="value-box">
          <span class="value-label">Valor Total da OS</span>
          <span class="value-amount">R$ ${totalVal}</span>
        </div>
      </div>
      <div class="footer">SD Móveis Projetados &bull; Documento gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
    </div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>
  `);
  win.document.close();
};

const OSReportPage: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewOS, setViewOS] = useState<any | null>(null);

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
                  <th className="pb-3 px-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(os => {
                  const clientPhone = os.client_phone || os.clients?.phone || '';
                  const clientName = os.clients?.name || os.client_name || 'Cliente Avulso';
                  const whatsappMsg = encodeURIComponent(
                    `Olá ${clientName}! 😊\n\nSegue o resumo da sua Ordem de Serviço:\n\n` +
                    `📋 OS #${os.order_number}\n` +
                    `📅 Data: ${os.created_at ? format(new Date(os.created_at), 'dd/MM/yyyy') : '-'}\n` +
                    `🔧 Serviço: ${os.description || 'Sem descrição'}\n` +
                    `💰 Valor Total: R$ ${os.total_value ? os.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}\n\n` +
                    `Em caso de dúvidas, estamos à disposição!\n\n_SD Móveis Projetados_`
                  );
                  const whatsappNumber = clientPhone.replace(/\D/g, '');
                  const whatsappUrl = whatsappNumber
                    ? `https://wa.me/55${whatsappNumber}?text=${whatsappMsg}`
                    : `https://wa.me/?text=${whatsappMsg}`;
                  return (
                  <tr key={os.id} className="border-b border-border/20 hover:bg-white/5 transition-colors group">
                    <td className="py-3 px-4 text-sm font-bold text-primary">#{os.order_number}</td>
                    <td className="py-3 px-4 text-sm text-foreground/80">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" /> 
                        {os.created_at ? format(new Date(os.created_at), 'dd/MM/yyyy') : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">{clientName}</td>
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
                    {/* ── BOTÕES DE AÇÃO ── */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* Visualizar */}
                        <button
                          onClick={() => setViewOS(os)}
                          title="Visualizar OS"
                          className="group/btn flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/20 hover:border-blue-400/50 text-blue-400 hover:text-blue-300 transition-all duration-200 hover:scale-110"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Editar */}
                        <button
                          onClick={() => toast({ title: `Editando OS #${os.order_number}`, description: 'Abra a aba Ordens de Serviço para editar.' })}
                          title="Editar OS"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 hover:border-amber-400/50 text-amber-400 hover:text-amber-300 transition-all duration-200 hover:scale-110"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {/* WhatsApp */}
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar WhatsApp"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/25 border border-green-500/20 hover:border-green-400/50 text-green-400 hover:text-green-300 transition-all duration-200 hover:scale-110"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        {/* Imprimir */}
                        <button
                          onClick={() => printOS(os)}
                          title="Imprimir OS"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 hover:border-purple-400/50 text-purple-400 hover:text-purple-300 transition-all duration-200 hover:scale-110"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* ── MODAL DE VISUALIZAÇÃO DA OS ── */}
      {viewOS && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setViewOS(null)}
        >
          <div
            className="bg-[#111111] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Ordem de Serviço</p>
                  <h2 className="text-xl font-black text-white">#{viewOS.order_number}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  viewOS.status === 'concluida' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  viewOS.status === 'em_andamento' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }`}>
                  {viewOS.status === 'concluida' ? 'CONCLUÍDA' : viewOS.status === 'em_andamento' ? 'EM ANDAMENTO' : 'PENDENTE'}
                </span>
                <button onClick={() => setViewOS(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Grid de infos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Cliente</p>
                  <p className="text-sm font-semibold text-white">{viewOS.clients?.name || viewOS.client_name || 'Cliente Avulso'}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data</p>
                  <p className="text-sm font-semibold text-white">{viewOS.created_at ? format(new Date(viewOS.created_at), 'dd/MM/yyyy') : '-'}</p>
                </div>
                {viewOS.client_phone && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</p>
                    <p className="text-sm font-semibold text-white">{viewOS.client_phone}</p>
                  </div>
                )}
                {viewOS.client_address && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Endereço</p>
                    <p className="text-sm font-semibold text-white truncate">{viewOS.client_address}</p>
                  </div>
                )}
              </div>

              {/* Descrição */}
              {viewOS.description && (
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Descrição</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{viewOS.description}</p>
                </div>
              )}

              {/* Observações */}
              {viewOS.notes && (
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Observações</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{viewOS.notes}</p>
                </div>
              )}

              {/* Valor total */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-green-300 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Valor Total</span>
                <span className="text-2xl font-black text-green-400">R$ {viewOS.total_value ? viewOS.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</span>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={() => { printOS(viewOS); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-sm font-semibold transition-all"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button
                onClick={() => setViewOS(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground text-sm font-semibold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OSReportPage;
