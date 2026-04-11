import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Laptop, 
  Download, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Terminal,
  FileCode,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

const LocalIntegrationPanel: React.FC = () => {
  const [protocolsStatus, setProtocolsStatus] = useState<'checking' | 'active' | 'inactive'>('inactive');
  const { toast } = useToast();

  const downloadRegFile = () => {
    const regContent = `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\fpqsystem]
@="URL:fpqsystem Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\fpqsystem\\shell]

[HKEY_CLASSES_ROOT\\fpqsystem\\shell\\open]

[HKEY_CLASSES_ROOT\\fpqsystem\\shell\\open\\command]
@="\\"C:\\\\FpqSystem\\\\FpqSyncAgent.exe\\" \\"%1\\""

[HKEY_CLASSES_ROOT\\promobsystem]
@="URL:promobsystem Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\promobsystem\\shell]

[HKEY_CLASSES_ROOT\\promobsystem\\shell\\open]

[HKEY_CLASSES_ROOT\\promobsystem\\shell\\open\\command]
@="\\"C:\\\\Program Files\\\\Promob\\\\Promob Plus v5.60.12.4\\\\Program\\\\Bin\\\\Promob5.exe\\" \\"%1\\""
`;
    const blob = new Blob([regContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registrar_protocolos.reg';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8 bg-[#0a0a0a] min-h-screen text-white">
      <header className="flex justify-between items-center bg-gray-900/50 p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl relative overflow-hidden">
        <div className="z-10">
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Laptop className="w-10 h-10 text-amber-500" />
            Integração Local
          </h1>
          <p className="text-gray-400 mt-2">Configure a conexão entre este painel web e os softwares do seu PC.</p>
        </div>
        <div className="z-10 bg-amber-500/10 p-4 rounded-3xl border border-amber-500/20">
          <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px]" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FPQ SYSTEM Section */}
        <Card className="bg-gray-900/40 border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
          <CardHeader className="bg-green-500/10 border-b border-white/5 p-8">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <FileCode className="w-6 h-6 text-green-500" />
                FPQ System
              </CardTitle>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Protocolo: fpqsystem://</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <p className="text-gray-400 leading-relaxed">
              O sincronizador permite que o painel web envie medidas e orçamentos diretamente para o banco de dados do FPQ System no seu computador.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-green-500 mt-1" />
                <div>
                  <h4 className="font-bold text-white text-sm">Requisito de Instalação</h4>
                  <p className="text-xs text-gray-500">O Agent deve estar instalado em <code className="text-green-400 bg-gray-800 px-1 rounded">C:\FpqSystem\FpqSyncAgent.exe</code></p>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                <Terminal className="w-6 h-6 text-green-500 mt-1" />
                <div>
                  <h4 className="font-bold text-white text-sm">Registro de Protocolo</h4>
                  <p className="text-xs text-gray-500">Necessário para permitir que o navegador "chame" o software local.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button onClick={downloadRegFile} className="w-full bg-green-600 hover:bg-green-500 text-black font-black rounded-2xl py-6 text-lg">
                <Download className="w-5 h-5 mr-3" /> 1. BAIXAR REGISTRO (.REG)
              </Button>
              <a href="/installers/FpqSyncAgent.exe" download>
                <Button variant="outline" className="w-full border-white/10 text-white rounded-2xl py-6 hover:bg-white/5">
                  <Download className="w-5 h-5 mr-3" /> 2. BAIXAR SYNC AGENT (.EXE)
                </Button>
              </a>
              <Button 
                onClick={() => {
                  window.location.href = 'fpqsystem://test';
                  toast({ title: "🚀 Abrindo Agent...", description: "Se o Agent estiver instalado, ele abrirá agora." });
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl py-6"
              >
                <Zap className="w-5 h-5 mr-3" /> 3. TESTAR CONEXÃO (ABRIR PC)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PROMOB Section */}
        <Card className="bg-gray-900/40 border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
          <CardHeader className="bg-red-500/10 border-b border-white/5 p-8">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Laptop className="w-6 h-6 text-red-500" />
                Promob Plus
              </CardTitle>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Protocolo: promobsystem://</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <p className="text-gray-400 leading-relaxed">
              Integração direta com o Promob Plus para abertura automática de projetos 3D e exportação de XML de medidas do Studio AR.
            </p>

            <div className="p-6 bg-amber-500/10 rounded-[2.5rem] border border-amber-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-amber-500" />
                <h4 className="font-black text-amber-500 text-sm uppercase">Dica de Produtividade</h4>
              </div>
              <p className="text-xs text-amber-200/70 leading-relaxed">
                Ao registrar os protocolos, você poderá clicar nos botões "FPQ PC" e "Promob PC" na barra lateral e o software correspondente será aberto instantaneamente no seu computador.
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-sm font-medium">Status do Protocolo</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">Desconhecido</span>
                </div>
              </div>
              <Button 
                onClick={() => {
                  window.location.href = 'promobsystem://';
                  toast({ title: "🚀 Abrindo Promob...", description: "Tentando iniciar o Promob Plus instalado." });
                }}
                variant="outline"
                className="w-full border-red-500/20 text-white rounded-2xl py-6 hover:bg-red-500/5 mt-2"
              >
                <Laptop className="w-5 h-5 mr-3 text-red-500" /> TESTAR ABERTURA PROMOB
              </Button>
              <p className="text-[10px] text-gray-500 text-center italic">
                Recomendamos executar o arquivo .reg, mover o Agent para C:\FpqSystem\ e reiniciar o navegador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900/20 border-white/5 rounded-[2.5rem] p-8 border-dashed border-2">
        <h3 className="text-xl font-bold text-white mb-4">Guia Rápido de Instalação</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-amber-500">1</div>
            <p className="font-bold text-sm">Baixe o .reg</p>
            <p className="text-xs text-gray-500">Baixe o arquivo de registro clicando no botão verde acima.</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-amber-500">2</div>
            <p className="font-bold text-sm">Execute o Arquivo</p>
            <p className="text-xs text-gray-500">Dê um duplo clique no arquivo baixado e confirme o aviso do Windows.</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-amber-500">3</div>
            <p className="font-bold text-sm">Acesso Direto</p>
            <p className="text-xs text-gray-500">Agora você pode usar os ícones de PC na barra lateral normalmente.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LocalIntegrationPanel;
