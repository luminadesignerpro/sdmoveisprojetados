import React from 'react';
import { Shield, Calendar, CheckCircle, FileText } from 'lucide-react';

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
    'Estrutura e carcaça dos módulos',
    'Ferragens de portas e gavetas',
    'Acabamento e revestimento de superfícies',
    'Nivelamento e alinhamento das peças',
    'Defeitos de fabricação em geral',
  ];

  const exclusions = [
    'Danos por uso inadequado ou impacto',
    'Desgaste natural de materiais',
    'Modificações sem autorização',
    'Infiltrações e umidade excessiva',
  ];

  return (
    <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-3xl p-8 shadow-xl border-2 border-amber-200 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-400/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-amber-500 mx-auto mb-3" />
          <h2 className="text-2xl font-black text-gray-900">Certificado de Garantia</h2>
          <p className="text-gray-500 text-sm">SD Móveis Projetados</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Cliente</p>
            <p className="font-bold text-gray-900">{clientName}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Projeto</p>
            <p className="font-bold text-gray-900">{projectName}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Material</p>
            <p className="font-bold text-gray-900">{material || 'MDF Premium'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Tipo</p>
            <p className="font-bold text-gray-900">{projectType || 'Móvel sob medida'}</p>
          </div>
        </div>

        {/* Validity */}
        <div className="bg-green-50 rounded-xl p-6 border border-green-200 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <p className="font-bold text-green-800">Validade da Garantia: {warrantyYears}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-green-600 font-bold uppercase">Início</p>
              <p className="font-bold text-green-800">{startDate.toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 font-bold uppercase">Término</p>
              <p className="font-bold text-green-800">{endDate.toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Coverage */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> O que a garantia cobre
          </h3>
          <div className="space-y-2">
            {coverage.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Exclusions */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" /> Exclusões
          </h3>
          <div className="space-y-2">
            {exclusions.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-5 h-5 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-xs">✕</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-amber-200">
          <p className="text-xs text-gray-400">
            Este certificado digital tem validade legal conforme os termos do contrato assinado.
          </p>
          <p className="text-xs text-amber-500 font-bold mt-1">SD Móveis Projetados — Qualidade e Confiança</p>
        </div>
      </div>
    </div>
  );
}
