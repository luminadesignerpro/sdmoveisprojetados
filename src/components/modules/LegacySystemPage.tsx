import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Users, Search, Printer, Save, CheckSquare, Calculator, CreditCard } from 'lucide-react';

const db = supabase as any;

const LegacySystemPage: React.FC = () => {
  const { toast } = useToast();
  
  const [orderNo, setOrderNo] = useState('1012');
  const [date, setDate] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  
  const [isOS, setIsOS] = useState(true);
  const [isOrcamento, setIsOrcamento] = useState(false);
  const [vias, setVias] = useState('1 Via');
  
  const [tabAvista, setTabAvista] = useState(true);
  const [tabAprazo, setTabAprazo] = useState(false);
  const [tabAtacado, setTabAtacado] = useState(false);

  const [clientDesc, setClientDesc] = useState('SAMUEL DAVID CARVALHO DOS SANTOS');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('( ) -');
  const [responsavel, setResponsavel] = useState('');
  
  const [activeTab, setActiveTab] = useState('obs');
  
  const [servicoRealizado, setServicoRealizado] = useState('');
  const [problemasReparos, setProblemasReparos] = useState('');
  const [etapaServico, setEtapaServico] = useState('');
  
  const [showMetroImp, setShowMetroImp] = useState(false);
  const [showValoresImp, setShowValoresImp] = useState(false);
  const [situacaoAtual, setSituacaoAtual] = useState('Aguardando Aprovação');
  
  const [valorMaterial, setValorMaterial] = useState('0,00');
  const [valorServico, setValorServico] = useState('0,00');
  const [desconto, setDesconto] = useState('0,00');

  const handleSave = async () => {
    toast({
      title: 'Salvando...',
      description: 'Registro salvo com sucesso (Modo Legado)',
    });
  };

  const handleConsultar = () => {
    toast({
      title: 'Consultando clientes...',
      description: 'Abrindo tela de consulta de clientes.',
    });
  };

  const css = `
    .legacy-container {
      font-family: Tahoma, Arial, sans-serif;
      background-color: #f0f0f0;
      color: #000;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 4px;
      font-size: 11px;
    }
    .legacy-header {
      background-color: #fce4ec;
      color: #880e4f;
      padding: 4px 8px;
      font-size: 11px;
      border: 1px solid #dcdcdc;
      margin-bottom: 8px;
    }
    .legacy-panel {
      border: 1px solid #dcdcdc;
      padding: 8px;
      margin-bottom: 8px;
    }
    .legacy-input {
      border: 1px solid #a0a0a0;
      border-right-color: #e0e0e0;
      border-bottom-color: #e0e0e0;
      padding: 2px 4px;
      background-color: #fff;
      font-size: 12px;
      outline: none;
    }
    .legacy-input:read-only {
      background-color: #f0f0f0;
    }
    .legacy-label {
      font-size: 11px;
      color: #333;
      margin-bottom: 2px;
      display: inline-block;
    }
    .legacy-button {
      background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
      border: 1px solid #a0a0a0;
      border-right-color: #666;
      border-bottom-color: #666;
      padding: 4px 12px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #000;
      border-radius: 3px;
    }
    .legacy-button:active {
      border: 1px solid #666;
      border-right-color: #e0e0e0;
      border-bottom-color: #e0e0e0;
      background: #e0e0e0;
    }
    .legacy-tab-bar {
      display: flex;
      border-bottom: 1px solid #a0a0a0;
      margin-bottom: 0;
      background-color: #f0f0f0;
    }
    .legacy-tab {
      padding: 4px 8px;
      border: 1px solid #a0a0a0;
      border-bottom: none;
      background-color: #f0f0f0;
      margin-right: 2px;
      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      color: #333;
      position: relative;
      top: 1px;
    }
    .legacy-tab.active {
      background-color: #f0f0f0;
      border-bottom: 1px solid #f0f0f0;
      font-weight: bold;
      color: #000;
    }
    .legacy-tab-content {
      border: 1px solid #a0a0a0;
      border-top: none;
      padding: 8px;
      background-color: #f0f0f0;
      min-height: 250px;
    }
    .legacy-textarea {
      border: 1px solid #a0a0a0;
      border-right-color: #e0e0e0;
      border-bottom-color: #e0e0e0;
      background-color: #e8f5e9;
      width: 100%;
      resize: none;
      padding: 4px;
      font-size: 12px;
      outline: none;
    }
    .legacy-textarea-label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }
    .legacy-money-input {
      text-align: right;
      font-weight: bold;
      font-size: 14px;
    }
    .legacy-money-label {
      background-color: #ffffe0;
      border: 1px solid #a0a0a0;
      padding: 2px 6px;
      font-size: 11px;
      color: #000;
      text-transform: uppercase;
      width: 120px;
    }
    .legacy-checkbox {
      margin: 0 4px 0 0;
      vertical-align: middle;
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="legacy-container">
        <div className="legacy-header">
          DADOS ORÇAMENTOS E DAS ORDENS DE SERVIÇO &lt;&lt;&lt;
        </div>

        <div className="flex gap-4 mb-2 items-start">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div>
                <span className="legacy-label">Nº DA ORDEM</span><br/>
                <input type="text" className="legacy-input font-bold text-lg w-20 text-center" value={orderNo} readOnly />
              </div>
              <div>
                <span className="legacy-label">DATA</span><br/>
                <input type="text" className="legacy-input bg-yellow-100 font-bold w-24 text-center" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <span className="legacy-label">HORA</span><br/>
                <input type="text" className="legacy-input font-bold w-16 text-center" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col mt-1">
              <label className="flex items-center text-[11px]">
                <input type="checkbox" className="legacy-checkbox" checked={isOS} onChange={e => setIsOS(e.target.checked)} />
                ORDEM DE SERVIÇO
              </label>
              <label className="flex items-center text-[11px] mt-1">
                <input type="checkbox" className="legacy-checkbox" checked={isOrcamento} onChange={e => setIsOrcamento(e.target.checked)} />
                EFETUAR ORÇAMENTO
              </label>
            </div>
          </div>

          <div className="flex flex-col mt-6 gap-1">
            <label className="flex items-center text-[11px]">
              <input type="radio" name="vias" className="legacy-checkbox" checked={vias === '1 Via'} onChange={() => setVias('1 Via')} />
              1 Via
            </label>
            <label className="flex items-center text-[11px]">
              <input type="radio" name="vias" className="legacy-checkbox" checked={vias === '2 Vias'} onChange={() => setVias('2 Vias')} />
              2 Vias
            </label>
          </div>

          <div className="flex flex-col mt-3 ml-2 border border-gray-300 p-1">
            <label className="flex items-center text-[11px]">
              <span className="w-24">Tabela Avista</span>
              <input type="checkbox" className="legacy-checkbox" checked={tabAvista} onChange={e => setTabAvista(e.target.checked)} />
            </label>
            <label className="flex items-center text-[11px]">
              <span className="w-24">Tabela Aprazo</span>
              <input type="checkbox" className="legacy-checkbox" checked={tabAprazo} onChange={e => setTabAprazo(e.target.checked)} />
            </label>
            <label className="flex items-center text-[11px]">
              <span className="w-24">Tabela Atacado</span>
              <input type="checkbox" className="legacy-checkbox" checked={tabAtacado} onChange={e => setTabAtacado(e.target.checked)} />
            </label>
          </div>

          <div className="flex-1 ml-4">
            <div className="flex gap-2 mb-2 items-end">
              <div className="flex-1">
                <span className="legacy-label">Descrição do Cliente</span><br/>
                <input type="text" className="legacy-input w-full font-bold text-gray-500" value={clientDesc} onChange={e => setClientDesc(e.target.value)} />
              </div>
              <button className="legacy-button h-[26px]" onClick={handleConsultar}>
                <Users size={14} className="text-blue-600" /> Consultar
              </button>
              <button className="legacy-button h-[26px]">
                <Search size={14} className="text-blue-600" /> Pesquisar
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <span className="legacy-label">Nome do Contato / Outros</span><br/>
                <input type="text" className="legacy-input w-full border-b-2 border-b-blue-500" value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div className="w-28">
                <span className="legacy-label">Telefone</span><br/>
                <input type="text" className="legacy-input w-full" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="w-48">
                <span className="legacy-label">Responsavel:</span><br/>
                <select className="legacy-input w-full" value={responsavel} onChange={e => setResponsavel(e.target.value)}>
                  <option value=""></option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="legacy-tab-bar">
            <div className={`legacy-tab ${activeTab === 'obs' ? 'active' : ''}`} onClick={() => setActiveTab('obs')}>
              Observações Gerais do Serviço -&gt;
            </div>
            <div className={`legacy-tab ${activeTab === 'produtos' ? 'active' : ''}`} onClick={() => setActiveTab('produtos')}>
              Lista de Produtos e Serviços -&gt;
            </div>
            <div className={`legacy-tab ${activeTab === 'imagens' ? 'active' : ''}`} onClick={() => setActiveTab('imagens')}>
              Imagens do Trabalho / Serviço -&gt;
            </div>
            <div className={`legacy-tab ${activeTab === 'controle' ? 'active' : ''}`} onClick={() => setActiveTab('controle')}>
              Informações de Controle Interno / Registros Diversos
            </div>
            <div className="ml-auto">
              <button className="text-gray-500 font-bold border border-gray-400 px-2 rounded-sm text-xs bg-gray-200">?</button>
            </div>
          </div>
          <div className="legacy-tab-content">
            {activeTab === 'obs' && (
              <div className="flex flex-col h-full gap-2">
                <div className="flex gap-2 h-[120px]">
                  <div className="flex-1 flex flex-col">
                    <label className="legacy-textarea-label">
                      <input type="checkbox" className="legacy-checkbox" /> Serviço a ser Realizado:
                    </label>
                    <textarea 
                      className="legacy-textarea flex-1"
                      value={servicoRealizado}
                      onChange={e => setServicoRealizado(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="legacy-textarea-label">
                      <input type="checkbox" className="legacy-checkbox" /> Problemas e Reparos a Serem Feitos no Serviço:
                    </label>
                    <textarea 
                      className="legacy-textarea flex-1"
                      value={problemasReparos}
                      onChange={e => setProblemasReparos(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="flex-1 flex flex-col mt-2 h-[120px]">
                  <label className="legacy-textarea-label">
                    <input type="checkbox" className="legacy-checkbox" /> Etapa do Serviço Sendo Realizado:
                  </label>
                  <textarea 
                    className="legacy-textarea flex-1"
                    value={etapaServico}
                    onChange={e => setEtapaServico(e.target.value)}
                  ></textarea>
                </div>
              </div>
            )}
            {activeTab !== 'obs' && (
              <div className="flex items-center justify-center h-[250px] text-gray-500 font-bold text-lg">
                (Conteúdo da Aba: {activeTab})
              </div>
            )}
          </div>
        </div>

        <div className="flex mt-4 items-start gap-4">
          <div className="flex flex-col gap-2">
            <label className="flex items-center text-[11px]">
              <input type="checkbox" className="legacy-checkbox" checked={showMetroImp} onChange={e => setShowMetroImp(e.target.checked)} />
              Marcar para Mostrar Valor do Metro na Impressão
            </label>
            <label className="flex items-center text-[11px]">
              <input type="checkbox" className="legacy-checkbox" checked={showValoresImp} onChange={e => setShowValoresImp(e.target.checked)} />
              Marcar para sair os Valores na Impressão
            </label>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px]">Situação Atual</span>
              <select className="legacy-input w-48" value={situacaoAtual} onChange={e => setSituacaoAtual(e.target.value)}>
                <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]">DATA DA APROVAÇÃO</span>
              <input type="text" className="legacy-input bg-green-100 w-24 text-center" />
              <button className="legacy-button px-2"><span className="text-green-600 font-bold">...</span></button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-2">
            <button className="legacy-button h-10 flex-col items-center justify-center p-1">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-yellow-600" />
                <span>Formas de Pagamento</span>
              </div>
            </button>
            <button className="legacy-button h-10 flex-col items-center justify-center p-1">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-blue-400" />
                <span>Imprimir de Jato Tinta</span>
              </div>
            </button>
            <button className="legacy-button h-10 flex-col items-center justify-center p-1" onClick={handleSave}>
              <div className="flex items-center gap-2">
                <Save size={18} className="text-green-600" />
                <span className="font-bold">SALVAR</span>
              </div>
            </button>
            
            <button className="legacy-button h-10 flex-col items-center justify-center p-1">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-green-500" />
                <span>Tela da Calculadora</span>
              </div>
            </button>
            <button className="legacy-button h-10 flex-col items-center justify-center p-1">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-gray-500" />
                <span>Imprimir em Cupom</span>
              </div>
            </button>
            <button className="legacy-button h-10 flex-col items-center justify-center p-1" onClick={handleSave}>
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-green-600" />
                <span className="font-bold">FINALIZAR</span>
              </div>
            </button>
          </div>

          <div className="flex flex-col gap-1 ml-auto w-64 items-end">
            <div className="flex">
              <div className="legacy-money-label flex items-center justify-end">VALOR MATERIAL</div>
              <input type="text" className="legacy-input legacy-money-input w-24 ml-1" value={valorMaterial} onChange={e => setValorMaterial(e.target.value)} />
            </div>
            <div className="flex">
              <div className="legacy-money-label flex items-center justify-end">VALOR SERVIÇO</div>
              <input type="text" className="legacy-input legacy-money-input w-24 ml-1" value={valorServico} onChange={e => setValorServico(e.target.value)} />
            </div>
            <div className="flex">
              <div className="legacy-money-label flex items-center justify-end">DESCONTO</div>
              <span className="mx-1 mt-1 text-[11px]">(-)</span>
              <input type="text" className="legacy-input legacy-money-input w-24 text-red-600" value={desconto} onChange={e => setDesconto(e.target.value)} />
            </div>
            <div className="h-px w-full bg-gray-400 my-1"></div>
            <div className="flex">
              <div className="legacy-money-label flex items-center justify-end font-bold text-lg bg-transparent border-none">TOTAL</div>
              <input type="text" className="legacy-input legacy-money-input w-24 ml-1 text-blue-600 font-bold" value={"0,00"} readOnly />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegacySystemPage;
