import React from 'react';
import { Shield, Calendar, CheckCircle, FileText, Award, ShieldCheck, Zap } from 'lucide-react';

interface WarrantyCertificateProps {
  projectName: string;
  clientName: string;
  signedAt: string | null;
  warranty: string | null;
  material: string | null;
  projectType: string | null;
}

export default function WarrantyCertificate({ projectName, clientName, signedAt, warranty, material, projectType }: WarrantyCertificateProps) {
  const warrantyYears = warranty || '5 Anos';
  const startDate = signedAt ? new Date(signedAt) : new Date();
  const endDate = new Date(startDate);
  const yearsNum = parseInt(warrantyYears) || 5;
  endDate.setFullYear(endDate.getFullYear() + yearsNum);

  const coverage = [
    'Estrutura e carcaça dos módulos MDF/MDP',
    'Ferragens de alto padrão (portas e gavetas)',
    'Acabamento e revestimento de superfícies premium',
    'Nivelamento e alinhamento técnico das peças',
    'Defeitos de fabricação e montagem especializada',
  ];

  const exclusions = [
    'Danos por uso inadequado ou impacto severo',
    'Desgaste natural decorrente do tempo de uso',
    'Modificações por terceiros sem autorização',
    'Infiltrações, umidade ou exposição solar excessiva',
  ];

  return (
    <div className="bg-[#111111] rounded-[2.5rem] p-10 sm:p-14 shadow-2xl border border-[#D4AF37]/20 relative overflow-hidden animate-in zoom-in-95 duration-700">
      {/* Decorative Premium Elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Gold Seal Effect */}
      <div className="absolute top-10 right-10 opacity-20 hover:opacity-100 transition-opacity duration-500">
        <Award className="w-24 h-24 text-[#D4AF37]" strokeWidth={1} />
      </div>

      <div className="relative z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-[2rem] bg-gradient-to-br from-[#D4AF37] to-[#b8952a] shadow-[0_0_40px_rgba(212,175,55,0.3)] border border-white/10 mb-2">
            <ShieldCheck className="w-12 h-12 text-black" />
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase">Certificado de Garantia <span className="text-[#D4AF37]">Premium</span></h2>
            <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[10px] mt-2">SD Móveis Projetados — Excelência em Marcenaria AI</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 group hover:border-amber-500/20 transition-all">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Titular do Projeto</p>
            <p className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors uppercase italic">{clientName}</p>
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 group hover:border-amber-500/20 transition-all">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Identificação do Projeto</p>
            <p className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors uppercase italic">{projectName}</p>
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 group hover:border-amber-500/20 transition-all">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Especificação de Material</p>
            <p className="font-bold text-white group-hover:text-amber-400 transition-colors italic">{material || 'MDF Ultra Premium'}</p>
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 group hover:border-amber-500/20 transition-all">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Categoria de Entrega</p>
            <p className="font-bold text-white group-hover:text-amber-400 transition-colors italic">{projectType || 'Mobiliário Sob Medida'}</p>
          </div>
        </div>

        {/* Validity Period */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent rounded-3xl p-8 border border-amber-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 blur-3xl rounded-full" />
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500"><Calendar className="w-6 h-6" /></div>
            <div>
              <p className="font-black text-white text-xl uppercase italic tracking-tighter">Período de Proteção Total: {warrantyYears}</p>
              <p className="text-amber-500/50 text-[10px] font-black uppercase tracking-widest">Cobertura integral contra vícios ocultos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Ativação</p>
              <p className="text-xl font-black text-white italic">{startDate.toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Expiração</p>
              <p className="text-xl font-black text-[#D4AF37] italic">{endDate.toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Coverage Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" /> Itens Assegurados
            </h3>
            <ul className="space-y-3">
              {coverage.map((item, i) => (
                <li key={i} className="flex items-start gap-4 group">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)] shrink-0" />
                  <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-500" /> Exclusões de Responsabilidade
            </h3>
            <ul className="space-y-3">
              {exclusions.map((item, i) => (
                <li key={i} className="flex items-start gap-4 group">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-800 shrink-0" />
                  <span className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors font-medium italic">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="pt-10 border-t border-white/5 text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/5">
             <FileText className="w-4 h-4 text-gray-600" />
             <p className="text-[10px] text-gray-500 font-medium italic">
               Certificado digital autenticado. Verifique a validade técnica no manual do proprietário.
             </p>
          </div>
          <div>
            <p className="text-xs font-black text-amber-500 uppercase tracking-[0.3em]">SD Móveis Projetados — Qualidade e Confiança</p>
            <p className="text-[9px] text-gray-700 mt-1 uppercase font-bold">CNPJ: 00.000.000/0001-00 • sdmprojetos.vercel.app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
