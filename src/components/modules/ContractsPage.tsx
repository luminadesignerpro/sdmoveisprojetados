import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Search, Download, Trash2, X, User, Calendar, Briefcase, CheckCircle, ShieldCheck } from 'lucide-react';
import ContractGenerator from './ContractGenerator';
import { format } from 'date-fns';

const db = supabase as any;

const ContractsPage: React.FC = () => {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await db.from('contracts').select('*, clients(name, document, email), projects(name, value)').order('created_at', { ascending: false });
    setContracts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este contrato permanentemente?')) {
      await db.from('contracts').delete().eq('id', id);
      toast({ title: 'Contrato removido' });
      fetchData();
    }
  };

  const filtered = contracts.filter(c => 
    (c.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.projects?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a]">
              <ShieldCheck className="w-8 h-8 text-black" />
            </div>
            Gestão Jurídica
          </h1>
          <p className="text-gray-400 mt-1 font-medium italic">Documentação Legal e Segurança de Projetos</p>
        </div>
        <button 
          onClick={() => setShowGenerator(true)} 
          className="px-8 py-4 rounded-2xl font-black text-xs tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl text-black flex items-center gap-3 w-full sm:w-auto justify-center"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583, #b8952a)', boxShadow: '0 8px 32px rgba(212,175,55,0.35)' }}
        >
          <Plus className="w-5 h-5" /> GERAR CONTRATO
        </button>
      </header>

      <div className="relative max-w-md z-10">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-amber-500/50" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Buscar contrato por cliente ou projeto..." 
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-[#111111] text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filtered.map(c => (
          <div key={c.id} className="group bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl hover:border-amber-500/30 transition-all cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full translate-x-12 -translate-y-12 group-hover:bg-amber-500/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500/50 group-hover:text-amber-500 transition-colors border border-white/5">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20 shadow-lg">
                <CheckCircle className="w-3 h-3" /> Ativo
              </div>
            </div>

            <h3 className="text-xl font-black text-white mb-2 group-hover:text-[#D4AF37] transition-colors">{c.projects?.name || 'Projeto s/ Nome'}</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-400 font-bold text-xs flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500/50" /> {c.clients?.name || 'Cliente s/ Nome'}
              </p>
              <p className="text-gray-400 font-bold text-xs flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-500/50" /> R$ {(c.projects?.value || 0).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <Calendar className="w-4 h-4 text-amber-500/20" />
                {format(new Date(c.created_at), 'dd MMM, yyyy')}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedContract(c)} 
                  className="p-3 bg-white/5 hover:bg-amber-500/10 text-gray-600 hover:text-amber-500 rounded-xl transition-all active:scale-95 border border-white/5 hover:border-amber-500/20"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(c.id)} 
                  className="p-3 bg-white/5 hover:bg-red-500/10 text-gray-600 hover:text-red-500 rounded-xl transition-all active:scale-95 border border-white/5 hover:border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 bg-[#111111] border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 text-center">
            <ShieldCheck className="w-16 h-16 text-gray-800 animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-white font-black text-xl uppercase tracking-widest">Nenhum Contrato s/ Base</h3>
              <p className="text-gray-500 italic font-medium">Capture as assinaturas e organize seu jurídico.</p>
            </div>
          </div>
        )}
      </div>

      {showGenerator && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 overflow-auto flex flex-col p-4 sm:p-12 animate-in fade-in duration-500">
          <div className="max-w-6xl w-full mx-auto">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Motor de Contratos SD</h2>
              </div>
              <button 
                onClick={() => { setShowGenerator(false); fetchData(); }} 
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-[3rem] p-1 shadow-[0_32px_120px_rgba(0,0,0,0.8)]">
              <ContractGenerator onComplete={() => { setShowGenerator(false); fetchData(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;
