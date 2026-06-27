import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Users, Search, Printer, Save, CheckSquare, Calculator,
  CreditCard, X, Plus, Trash2, Edit, Camera, Image as ImageIcon,
  LogOut, FileText, RefreshCw,
} from 'lucide-react';

const db = supabase as any;

// ─── Types ──────────────────────────────────────────────────────────────────
interface OSItem {
  id: string;
  description: string;
  unit: string;
  width: number;
  height: number;
  total_m2: number;
  value: number;
  quantity: number;
  total_value: number;
}

// ─── Parse helper (accepts "1.234,56" or "1234.56") ─────────────────────────
const parseMoney = (v: string) =>
  parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;

const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// ─── Component ───────────────────────────────────────────────────────────────
const LegacySystemPage: React.FC = () => {
  const { toast } = useToast();

  // ── header state ──────────────────────────────────────────────────────────
  const [orderNo, setOrderNo] = useState('...');
  const [date, setDate] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [isOS, setIsOS] = useState(true);
  const [isOrcamento, setIsOrcamento] = useState(false);
  const [vias, setVias] = useState('1 Via');
  const [tabAvista, setTabAvista] = useState(true);
  const [tabAprazo, setTabAprazo] = useState(false);
  const [tabAtacado, setTabAtacado] = useState(false);

  // ── client state ──────────────────────────────────────────────────────────
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientDesc, setClientDesc] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('( ) -');
  const [responsavel, setResponsavel] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // ── client search modal ────────────────────────────────────────────────────
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // ── new modals state ────────────────────────────────────────────────────────
  const [showCustomerRegistrationModal, setShowCustomerRegistrationModal] = useState(false);
  const [customerRegistrationTab, setCustomerRegistrationTab] = useState('endereco');

  // Customer Form State
  const [customerForm, setCustomerForm] = useState({
    fantasia: 'SD MOVEIS', rua: '', bairro: 'ITAITINGA', cidade: 'ITAITINGA', uf: 'CE', cep: '',
    tel1: '', tel2: '', celular: '', whatsapp: '', complemento: '', email: '', contato: '', skype: '', redeSocial: '',
    cnpj: '../-', ie: '', im: '', cpf: '', rg: '', orgaoEmissor: ''
  });

  const [showProductSearchModal, setShowProductSearchModal] = useState(false);
  const [productSearchStr, setProductSearchStr] = useState('');
  const [showOSSearchModal, setShowOSSearchModal] = useState(false);
  const [osSearchStr, setOsSearchStr] = useState('');
  const [productsList, setProductsList] = useState<any[]>([]);
  const [osList, setOsList] = useState<any[]>([]);

  // ── tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('obs');

  // ── obs tab ───────────────────────────────────────────────────────────────
  const [servicoRealizado, setServicoRealizado] = useState('');
  const [problemasReparos, setProblemasReparos] = useState('');
  const [etapaServico, setEtapaServico] = useState('');

  // ── products tab ──────────────────────────────────────────────────────────
  const [osItems, setOsItems] = useState<OSItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<OSItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    description: '', unit: 'un', width: 0, height: 0, value: 0, quantity: 1,
  });

  // ── images tab ────────────────────────────────────────────────────────────
  const [osImages, setOsImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── control tab ───────────────────────────────────────────────────────────
  const [notasInternas, setNotasInternas] = useState('');
  const [historicoServico, setHistoricoServico] = useState('');

  // ── bottom ────────────────────────────────────────────────────────────────
  const [showMetroImp, setShowMetroImp] = useState(false);
  const [showValoresImp, setShowValoresImp] = useState(false);
  const [situacaoAtual, setSituacaoAtual] = useState('Aguardando Aprovação');
  const [dataAprovacao, setDataAprovacao] = useState('');
  const [valorMaterial, setValorMaterial] = useState('0,00');
  const [valorServico, setValorServico] = useState('0,00');
  const [desconto, setDesconto] = useState('0,00');

  // ── payment modal ─────────────────────────────────────────────────────────
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('À Vista');
  const [paymentParcelas, setPaymentParcelas] = useState(1);

  // ── calculator ────────────────────────────────────────────────────────────
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState('');
  const [calcOp, setCalcOp] = useState('');
  const [calcWaitNext, setCalcWaitNext] = useState(false);

  // ── current OS id (for editing) ───────────────────────────────────────────
  const [editingOsId, setEditingOsId] = useState<string | null>(null);

  // ── computed total ────────────────────────────────────────────────────────
  const total = parseMoney(valorMaterial) + parseMoney(valorServico) - parseMoney(desconto);

  // ─── On mount: load employees, clients, next order number ─────────────────
  useEffect(() => {
    const init = async () => {
      const [empRes, cliRes, osRes, prodRes, allOsRes] = await Promise.all([
        db.from('employees').select('id, name').eq('active', true).order('name'),
        db.from('clients').select('id, name, phone').order('name'),
        db.from('service_orders').select('order_number').order('order_number', { ascending: false }).limit(1),
        db.from('inventory_items').select('*').limit(50),
        db.from('service_orders').select('*, clients(name, phone)').order('created_at', { ascending: false }).limit(50)
      ]);
      setEmployees(empRes.data || []);
      setClients(cliRes.data || []);
      const lastNo = osRes.data?.[0]?.order_number;
      setOrderNo(lastNo ? String(Number(lastNo) + 1) : '1001');
      if (prodRes && !prodRes.error) setProductsList(prodRes.data);
      if (allOsRes && !allOsRes.error) setOsList(allOsRes.data);
    };
    init();

    // clock
    const tick = setInterval(() => setTime(format(new Date(), 'HH:mm')), 30000);
    return () => clearInterval(tick);
  }, []);

  // ─── Save to DB ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!clientDesc.trim()) {
      toast({ title: '⚠️ Informe o cliente', variant: 'destructive' });
      return;
    }

    let cId = clientId;
    if (!cId && clientDesc.trim()) {
      const { data: nc, error: ce } = await db
        .from('clients')
        .insert({ name: clientDesc.trim(), phone: phone.replace(/\D/g, '') || null })
        .select('id').single();
      if (ce) { toast({ title: '❌ Erro ao criar cliente', description: ce.message, variant: 'destructive' }); return; }
      cId = nc.id;
      setClientId(cId);
    }

    const notesArr = [
      servicoRealizado ? `[Serviço a ser Realizado]: ${servicoRealizado}` : '',
      problemasReparos ? `[Problemas a Reparar]: ${problemasReparos}` : '',
      etapaServico ? `[Etapa do Serviço]: ${etapaServico}` : '',
      notasInternas ? `[Notas Internas]: ${notasInternas}` : '',
      historicoServico ? `[Histórico]: ${historicoServico}` : '',
    ].filter(Boolean).join('\n');

    const itemsTotal = osItems.reduce((s, i) => s + i.total_value, 0);

    const payload = {
      order_number: orderNo,
      client_id: cId,
      description: [isOS ? 'ORDEM DE SERVIÇO' : '', isOrcamento ? 'ORÇAMENTO' : ''].filter(Boolean).join(' + ') || 'OS',
      status: situacaoAtual === 'Concluído' ? 'concluida' : situacaoAtual === 'Em Andamento' ? 'em_andamento' : 'aberta',
      priority: 'normal',
      assigned_to: responsavel || null,
      total_value: itemsTotal > 0 ? itemsTotal : (parseMoney(valorMaterial) + parseMoney(valorServico) - parseMoney(desconto)),
      notes: notesArr || null,
      estimated_date: dataAprovacao ? (() => {
        const [d, m, y] = dataAprovacao.split('/');
        return y && m && d ? `${y}-${m}-${d}` : null;
      })() : null,
    };

    let error;
    if (editingOsId) {
      ({ error } = await db.from('service_orders').update(payload).eq('id', editingOsId));
      if (!error) toast({ title: '✅ OS atualizada com sucesso!' });
    } else {
      const { data: newOs, error: e2 } = await db.from('service_orders').insert(payload).select('id').single();
      error = e2;
      if (!error) {
        setEditingOsId(newOs.id);
        toast({ title: `✅ OS #${orderNo} salva com sucesso!` });
      }
    }

    if (error) {
      toast({ title: '❌ Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const handleFinalizar = async () => {
    setSituacaoAtual('Concluído');
    setDataAprovacao(format(new Date(), 'dd/MM/yyyy'));
    await handleSave();
    toast({ title: '🏁 OS Finalizada!', description: 'Status alterado para Concluído.' });
  };

  // ─── Client search ─────────────────────────────────────────────────────────
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectClient = (c: any) => {
    setClientId(c.id);
    setClientDesc(c.name.toUpperCase());
    setPhone(c.phone ? `(${c.phone.slice(0, 2)}) ${c.phone.slice(2, 7)}-${c.phone.slice(7)}` : '( ) -');
    setShowClientModal(false);
    setClientSearch('');
  };

  // ─── Items ─────────────────────────────────────────────────────────────────
  const calcM2 = (w: number, h: number) => +(w * h).toFixed(3);
  const calcTotal = (v: number, q: number, m2: number) => m2 > 0 ? +(v * m2).toFixed(2) : +(v * q).toFixed(2);

  const openItemForm = (item?: OSItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ description: item.description, unit: item.unit, width: item.width, height: item.height, value: item.value, quantity: item.quantity });
    } else {
      setEditingItem(null);
      setItemForm({ description: '', unit: 'un', width: 0, height: 0, value: 0, quantity: 1 });
    }
    setShowItemForm(true);
  };

  const saveItem = () => {
    if (!itemForm.description.trim()) {
      toast({ title: '⚠️ Informe a descrição', variant: 'destructive' });
      return;
    }
    const m2 = calcM2(itemForm.width, itemForm.height);
    const tv = calcTotal(itemForm.value, itemForm.quantity, m2);
    if (editingItem) {
      setOsItems(p => p.map(i => i.id === editingItem.id ? { ...editingItem, ...itemForm, total_m2: m2, total_value: tv } : i));
    } else {
      setOsItems(p => [...p, { id: Date.now().toString(), ...itemForm, total_m2: m2, total_value: tv }]);
    }
    setShowItemForm(false);
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    if (!confirm('Excluir este item?')) return;
    setOsItems(p => p.filter(i => i.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const totalItems = osItems.reduce((s, i) => s + i.total_value, 0);

  // ─── Images ────────────────────────────────────────────────────────────────
  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    const newImgs = Array.from(files).map(f => ({
      id: Date.now() + Math.random() + '',
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    setOsImages(p => [...p, ...newImgs]);
  };

  // ─── Calculator ────────────────────────────────────────────────────────────
  const calcPress = (key: string) => {
    if (key === 'C') { setCalcDisplay('0'); setCalcPrev(''); setCalcOp(''); setCalcWaitNext(false); return; }
    if (key === '←') { setCalcDisplay(p => p.length > 1 ? p.slice(0, -1) : '0'); return; }
    if (['+', '-', '×', '÷'].includes(key)) {
      setCalcPrev(calcDisplay); setCalcOp(key); setCalcWaitNext(true); return;
    }
    if (key === '=') {
      const a = parseFloat(calcPrev), b = parseFloat(calcDisplay);
      let r = 0;
      if (calcOp === '+') r = a + b;
      else if (calcOp === '-') r = a - b;
      else if (calcOp === '×') r = a * b;
      else if (calcOp === '÷') r = b !== 0 ? a / b : 0;
      setCalcDisplay(String(parseFloat(r.toFixed(10))));
      setCalcOp(''); setCalcPrev(''); setCalcWaitNext(false); return;
    }
    if (key === '.') {
      if (!calcWaitNext && calcDisplay.includes('.')) return;
      setCalcDisplay(p => (calcWaitNext ? '0.' : p + '.'));
      setCalcWaitNext(false); return;
    }
    if (key === '%') { setCalcDisplay(p => String(parseFloat(p) / 100)); return; }
    setCalcDisplay(p => calcWaitNext ? key : (p === '0' ? key : p + key));
    setCalcWaitNext(false);
  };

  // ─── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>OS #${orderNo}</title>
      <style>body{font-family:Tahoma,Arial,sans-serif;font-size:12px;padding:16px}
      h2{margin:0 0 8px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #999;padding:4px 8px;text-align:left}
      th{background:#eee}.total{font-weight:bold;font-size:14px}</style>
      </head><body>
      <h2>SD Móveis Projetados — OS #${orderNo}</h2>
      <p><b>Data:</b> ${date} ${time} | <b>Status:</b> ${situacaoAtual}</p>
      <p><b>Cliente:</b> ${clientDesc} | <b>Tel:</b> ${phone}</p>
      <p><b>Responsável:</b> ${employees.find(e => e.id === responsavel)?.name || '-'}</p>
      <hr/>
      <p><b>Serviço a realizar:</b> ${servicoRealizado || '-'}</p>
      <p><b>Problemas/Reparos:</b> ${problemasReparos || '-'}</p>
      <p><b>Etapa atual:</b> ${etapaServico || '-'}</p>
      <hr/>
      <table><tr><th>#</th><th>Descrição</th><th>Un</th><th>Larg</th><th>Alt</th><th>M²</th><th>Valor</th><th>Qtd</th><th>Total</th></tr>
      ${osItems.map((it, i) => `<tr>
        <td>${i + 1}</td><td>${it.description}</td><td>${it.unit}</td>
        <td>${it.width > 0 ? it.width.toFixed(2) : '-'}</td>
        <td>${it.height > 0 ? it.height.toFixed(2) : '-'}</td>
        <td>${it.total_m2 > 0 ? it.total_m2.toFixed(3) : '-'}</td>
        <td>R$ ${fmtMoney(it.value)}</td><td>${it.quantity}</td>
        <td>R$ ${fmtMoney(it.total_value)}</td>
      </tr>`).join('')}
      </table>
      <p class="total" style="text-align:right;margin-top:8px">
        Material: R$ ${valorMaterial} &nbsp;|&nbsp;
        Serviço: R$ ${valorServico} &nbsp;|&nbsp;
        Desconto: R$ ${desconto} &nbsp;|&nbsp;
        <span style="font-size:16px">TOTAL: R$ ${fmtMoney(total)}</span>
      </p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const css = `
    .legacy-container, .legacy-container * {
      box-sizing: border-box;
    }
    .legacy-container {
      font-family: Tahoma, Arial, sans-serif;
      background-color: #f0f0f0;
      color: #000 !important;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 4px;
      font-size: 11px;
    }
    .legacy-header {
      background-color: #fce4ec;
      color: #880e4f !important;
      padding: 4px 8px;
      font-size: 11px;
      border: 1px solid #dcdcdc;
      margin-bottom: 8px;
    }
    .legacy-input,
    .legacy-input[type="text"],
    .legacy-input[type="number"],
    select.legacy-input,
    textarea.legacy-input {
      border: 1px solid #a0a0a0;
      border-right-color: #e0e0e0;
      border-bottom-color: #e0e0e0;
      padding: 2px 4px;
      background-color: #fff !important;
      font-size: 12px;
      outline: none;
      color: #000 !important;
      -webkit-text-fill-color: #000;
    }
    .legacy-input::placeholder,
    .legacy-textarea::placeholder {
      color: #888 !important;
      opacity: 1 !important;
      -webkit-text-fill-color: #888;
    }
    .legacy-input:read-only { background-color: #f0f0f0 !important; color: #000 !important; }
    .legacy-input:disabled { background-color: #e8e8e8 !important; color: #555 !important; -webkit-text-fill-color: #555; }
    select.legacy-input { background-color: #fff !important; color: #000 !important; }
    select.legacy-input option { color: #000; background-color: #fff; }
    .legacy-label {
      font-size: 11px; color: #333 !important; margin-bottom: 2px; display: inline-block;
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
      color: #000 !important;
      border-radius: 3px;
    }
    .legacy-button:hover { background: linear-gradient(to bottom, #fff, #e8e8e8); }
    .legacy-button:active {
      border: 1px solid #666; border-right-color: #e0e0e0;
      border-bottom-color: #e0e0e0; background: #e0e0e0;
    }
    .legacy-tab-bar {
      display: flex; border-bottom: 1px solid #a0a0a0;
      margin-bottom: 0; background-color: #f0f0f0;
    }
    .legacy-tab {
      padding: 4px 8px; border: 1px solid #a0a0a0; border-bottom: none;
      background-color: #e8e8e8; margin-right: 2px;
      border-top-left-radius: 3px; border-top-right-radius: 3px;
      cursor: pointer; font-size: 11px; color: #555 !important;
      position: relative; top: 1px;
    }
    .legacy-tab.active {
      background-color: #f0f0f0; border-bottom: 1px solid #f0f0f0;
      font-weight: bold; color: #000 !important;
    }
    .legacy-tab-content {
      border: 1px solid #a0a0a0; border-top: none; padding: 8px;
      background-color: #f0f0f0; min-height: 260px; color: #000 !important;
    }
    .legacy-textarea {
      border: 1px solid #a0a0a0; border-right-color: #e0e0e0;
      border-bottom-color: #e0e0e0; background-color: #e8f5e9 !important;
      width: 100%; resize: none; padding: 4px; font-size: 12px; outline: none;
      color: #000 !important; -webkit-text-fill-color: #000;
    }
    .legacy-textarea-label {
      font-weight: bold; color: #666 !important; font-size: 12px;
      display: flex; align-items: center; gap: 4px; margin-bottom: 2px;
    }
    .legacy-money-input {
      text-align: right; font-weight: bold; font-size: 14px;
    }
    .legacy-money-label {
      background-color: #ffffe0 !important; border: 1px solid #a0a0a0;
      padding: 2px 6px; font-size: 11px; color: #000 !important;
      text-transform: uppercase; width: 120px;
    }
    .legacy-checkbox { margin: 0 4px 0 0; vertical-align: middle; }
    .legacy-table { width: 100%; border-collapse: collapse; font-size: 11px; color: #000 !important; }
    .legacy-table th {
      background: #dde; border: 1px solid #a0a0a0; padding: 2px 4px;
      text-align: left; font-size: 11px; color: #000 !important;
    }
    .legacy-table td {
      border: 1px solid #c0c0c0; padding: 2px 4px; color: #000 !important;
    }
    .legacy-table tr:nth-child(even) td { background: #f8f8ff; color: #000 !important; }
    .legacy-table tr.selected td { background: #c8d8ff; }
    .legacy-table tr:hover td { background: #e8eeff; cursor:pointer; }

    /* Garante que QUALQUER input/select/textarea dentro de modais e
       container legacy nunca herde a cor clara do tema global do app. */
    .legacy-container input,
    .legacy-container select,
    .legacy-container textarea,
    .legacy-modal-scope input,
    .legacy-modal-scope select,
    .legacy-modal-scope textarea {
      color: #000 !important;
      -webkit-text-fill-color: #000;
    }
    .legacy-container input::placeholder,
    .legacy-modal-scope input::placeholder {
      color: #999 !important;
      opacity: 1 !important;
      -webkit-text-fill-color: #999;
    }
  `;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>

      {/* ── Client Search Modal ─────────────────────────────────────────── */}
      {showClientModal && (
        <div className="legacy-modal-scope fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-400 rounded shadow-lg w-full max-w-4xl" style={{ fontFamily: 'Tahoma,Arial,sans-serif', fontSize: 11, color: '#000' }}>
            <div className="bg-[#dde] px-3 py-1 flex items-center justify-between border-b border-gray-400">
              <span className="font-bold text-xs">Pesquisa em Tela Cadastro de Clientes</span>
              <button onClick={() => setShowClientModal(false)} className="text-gray-600 hover:text-red-600"><X size={14} /></button>
            </div>
            <div className="p-2 bg-[#f0f0f0]">
              <div className="flex gap-2 mb-2 items-end">
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Pesquisar por Nome Razão Social</span><br />
                  <input
                    autoFocus
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="legacy-input w-full bg-yellow-100"
                  />
                </div>
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Pesquisar por Nome Fantasia</span><br />
                  <input type="text" className="legacy-input w-full bg-yellow-100" />
                </div>
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Rastrear por Nome</span><br />
                  <input type="text" className="legacy-input w-full" />
                </div>
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Rastrear Telefone</span><br />
                  <input type="text" className="legacy-input w-full text-red-600 text-center" defaultValue="-" />
                </div>
                <div className="flex gap-1 mb-1">
                  <button className="bg-green-100 border border-green-400 p-1 rounded-sm"><Plus size={16} className="text-green-600" /></button>
                  <button className="bg-gray-100 border border-gray-400 p-1 rounded-sm"><Edit size={16} className="text-gray-600" /></button>
                  <button className="bg-blue-100 border border-blue-400 p-1 rounded-sm"><Search size={16} className="text-blue-600" /></button>
                </div>
              </div>
              <div style={{ height: 350, overflowY: 'auto', border: '1px solid #a0a0a0', backgroundColor: '#fff' }}>
                <table className="legacy-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Código</th>
                      <th>Nome do Cliente / Razão Social</th>
                      <th>Fantasia/Apelido</th>
                      <th style={{ width: '100px' }}>WhatsApp</th>
                      <th style={{ width: '100px' }}>Telefone</th>
                      <th style={{ width: '120px' }}>Tipo Cadastro -&gt;-&gt;-&gt;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 8 }}>Nenhum cliente encontrado</td></tr>
                    )}
                    {filteredClients.map(c => (
                      <tr key={c.id} onClick={() => selectClient(c)} style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                        <td>{String(c.id).substring(0, 5).padStart(5, '0')}</td>
                        <td>{c.name.toUpperCase()}</td>
                        <td></td>
                        <td>{c.phone ? `(${c.phone.slice(0, 2)}) ${c.phone.slice(2, 7)}-${c.phone.slice(7)}` : ''}</td>
                        <td>{c.phone ? `(${c.phone.slice(0, 2)}) ${c.phone.slice(2, 7)}-${c.phone.slice(7)}` : ''}</td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ───────────────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="legacy-modal-scope fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-400 rounded shadow-lg w-80" style={{ fontFamily: 'Tahoma,Arial,sans-serif', fontSize: 12, color: '#000' }}>
            <div className="bg-[#dde] px-3 py-2 flex items-center justify-between border-b border-gray-400">
              <span className="font-bold text-sm">Formas de Pagamento</span>
              <button onClick={() => setShowPaymentModal(false)}><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="legacy-label block mb-1">Forma de Pagamento</label>
                <select className="legacy-input w-full" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option>À Vista</option>
                  <option>Cartão de Crédito</option>
                  <option>Cartão de Débito</option>
                  <option>PIX</option>
                  <option>Boleto</option>
                  <option>Cheque</option>
                  <option>A Prazo</option>
                </select>
              </div>
              {paymentMethod === 'Cartão de Crédito' && (
                <div>
                  <label className="legacy-label block mb-1">Parcelas</label>
                  <select className="legacy-input w-full" value={paymentParcelas} onChange={e => setPaymentParcelas(+e.target.value)}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <option key={n} value={n}>{n}x de R$ {fmtMoney(total / n)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-300 rounded p-2 text-black">
                <p className="text-[11px] font-bold text-gray-800">🔑 Chaves PIX:</p>
                <p className="text-[11px]">CNPJ: 49.228.811/0001-33</p>
                <p className="text-[11px]">E-mail: sdmoveis48@gmail.com</p>
                <p className="text-[11px]">Cel (Itaú): 85 99760-2237</p>
                <p className="text-[11px] font-bold">Titular: Samuel David C</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-500">Total a pagar:</p>
                <p className="text-lg font-bold text-blue-700">R$ {fmtMoney(total)}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button className="legacy-button" onClick={() => setShowPaymentModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Calculator Modal ─────────────────────────────────────────────── */}
      {showCalc && (
        <div className="legacy-modal-scope fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#e0e0e0] border-2 border-gray-500 rounded shadow-xl w-56" style={{ fontFamily: 'Tahoma,Arial,sans-serif', color: '#000' }}>
            <div className="bg-[#dde] px-3 py-1 flex items-center justify-between border-b border-gray-400">
              <span className="font-bold text-xs">Calculadora</span>
              <button onClick={() => setShowCalc(false)}><X size={13} /></button>
            </div>
            <div className="p-2">
              <div className="bg-[#c8e8c8] border border-gray-500 text-right px-2 py-1 mb-2 font-bold text-lg font-mono text-black" style={{ minHeight: 32 }}>
                {calcDisplay}
              </div>
              {[
                ['C', '←', '%', '÷'],
                ['7', '8', '9', '×'],
                ['4', '5', '6', '-'],
                ['1', '2', '3', '+'],
                ['0', '.', '=', '='],
              ].map((row, ri) => (
                <div key={ri} className="flex gap-1 mb-1">
                  {row.map((key, ki) => {
                    const skip = ri === 4 && ki === 3;
                    if (skip) return null;
                    const wide = ri === 4 && ki === 0;
                    return (
                      <button
                        key={ki}
                        onClick={() => calcPress(key)}
                        style={{ flex: wide ? 2 : 1 }}
                        className={`legacy-button text-sm font-bold py-1 ${['÷', '×', '-', '+', '='].includes(key) ? 'text-blue-700 font-bold' :
                            key === 'C' ? 'text-red-600' : ''
                          }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
              <button
                className="legacy-button w-full text-xs mt-1"
                onClick={() => {
                  setValorMaterial(calcDisplay.replace('.', ','));
                  setShowCalc(false);
                }}
              >
                → Usar no Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Form Modal ───────────────────────────────────────────────── */}
      {showItemForm && (
        <div className="legacy-modal-scope fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-400 rounded shadow-lg w-full max-w-md" style={{ fontFamily: 'Tahoma,Arial,sans-serif', fontSize: 12, color: '#000' }}>
            <div className="bg-[#dde] px-3 py-2 flex items-center justify-between border-b border-gray-400">
              <span className="font-bold text-sm">{editingItem ? 'Alterar Item' : 'Incluir Novo Item'}</span>
              <button onClick={() => setShowItemForm(false)}><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="legacy-label block mb-1">Descrição *</label>
                <input className="legacy-input w-full" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="legacy-label block mb-1">Unidade</label>
                  <select className="legacy-input w-full" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}>
                    {['un', 'm²', 'm', 'pç', 'hr', 'vb', 'kg', 'l'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="legacy-label block mb-1">Largura (m)</label>
                  <input type="number" step="0.01" className="legacy-input w-full" value={itemForm.width} onChange={e => setItemForm({ ...itemForm, width: +e.target.value })} />
                </div>
                <div>
                  <label className="legacy-label block mb-1">Altura (m)</label>
                  <input type="number" step="0.01" className="legacy-input w-full" value={itemForm.height} onChange={e => setItemForm({ ...itemForm, height: +e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="legacy-label block mb-1">Valor Unitário (R$)</label>
                  <input type="number" step="0.01" className="legacy-input w-full" value={itemForm.value} onChange={e => setItemForm({ ...itemForm, value: +e.target.value })} />
                </div>
                <div>
                  <label className="legacy-label block mb-1">Quantidade</label>
                  <input type="number" min="1" className="legacy-input w-full" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: +e.target.value })} />
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-300 rounded p-2 text-right">
                <span className="text-[11px] text-gray-500">Total Previsto: </span>
                <span className="font-bold text-blue-700">R$ {fmtMoney(calcTotal(itemForm.value, itemForm.quantity, calcM2(itemForm.width, itemForm.height)))}</span>
                {itemForm.width > 0 && itemForm.height > 0 && (
                  <span className="text-[11px] text-gray-400 ml-2">({calcM2(itemForm.width, itemForm.height).toFixed(3)} m²)</span>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button className="legacy-button" onClick={saveItem}><CheckSquare size={13} className="text-green-600" /> {editingItem ? 'Salvar' : 'Incluir'}</button>
                <button className="legacy-button" onClick={() => setShowItemForm(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Customer Registration Modal ──────────────────────────────── */}
      {showCustomerRegistrationModal && (
        <div className="legacy-modal-scope fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-400 rounded shadow-lg w-full max-w-5xl flex flex-col" style={{ fontFamily: 'Tahoma,Arial,sans-serif', fontSize: 11, height: '90vh', color: '#000' }}>
            <div className="bg-[#dde] px-3 py-2 flex items-center justify-between border-b border-gray-400">
              <span className="font-bold text-sm">Tela Cadastro de Clientes</span>
              <button onClick={() => setShowCustomerRegistrationModal(false)}><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-[#f0f0f0] flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="w-16">
                  <span className="legacy-label text-[10px]">Registro</span>
                  <input className="legacy-input w-full text-right font-bold" value="4" readOnly />
                </div>
                <div className="w-24">
                  <span className="legacy-label text-[10px]">Data Cadastro</span>
                  <input className="legacy-input w-full text-center" value={format(new Date(), 'dd/MM/yyyy')} readOnly />
                </div>
                <div className="flex-1 flex gap-2 justify-center items-end ml-4">
                  <button className="legacy-button h-6 w-32 flex justify-center items-center" onClick={() => toast({ title: 'ℹ️ Pesquisa de Vendas ainda não implementada nesta versão.' })}><span className="w-4 h-1 bg-gray-400 mr-2" /> Pesquisar Vendas</button>
                  <button className="legacy-button h-6 w-32 flex justify-center items-center" onClick={() => toast({ title: 'ℹ️ Pesquisa de Serviços ainda não implementada nesta versão.' })}><span className="w-4 h-1 bg-gray-400 mr-2" /> Pesquisar Serviços</button>
                  <button className="legacy-button h-6 w-36 flex justify-center items-center" onClick={() => toast({ title: 'ℹ️ Pesquisa Financeira ainda não implementada nesta versão.' })}><div className="rounded-full bg-gray-400 w-4 h-4 mr-2" /> Pesquisar Financeiro</button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <div className="w-48 flex flex-col gap-2">
                  <div className="h-48 bg-gray-100 border border-gray-400"></div>
                  <div className="flex justify-end gap-1"><button className="p-1 border bg-white"><Camera size={14} /></button><button className="p-1 border bg-white"><Search size={14} /></button><button className="p-1 border bg-white"><Plus size={14} className="text-green-600" /></button></div>
                  <div className="h-48 bg-gray-100 border border-gray-400"></div>
                  <div className="flex justify-end gap-1"><button className="p-1 border bg-white"><Camera size={14} /></button><button className="p-1 border bg-white"><Search size={14} /></button><button className="p-1 border bg-white"><Plus size={14} className="text-green-600" /></button></div>
                </div>
                <div className="flex-1 bg-white border border-gray-400 p-2 flex flex-col">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <span className="legacy-label text-[10px]">Nome / Razão Completo</span>
                      <input className="legacy-input w-full font-bold bg-yellow-50" value={clientDesc} onChange={e => setClientDesc(e.target.value)} placeholder="SAMUEL DAVID CARVALHO DOS SANTOS" />
                    </div>
                    <div className="w-64">
                      <span className="legacy-label text-[10px]">Seguimento do Cliente ou Tipo</span>
                      <select className="legacy-input w-full">
                        <option>EMPRESARIO</option>
                      </select>
                    </div>
                  </div>

                  <div className="legacy-tab-bar mt-2">
                    <div className={`legacy-tab ${customerRegistrationTab === 'endereco' ? 'active' : ''}`} onClick={() => setCustomerRegistrationTab('endereco')}>Endereço e Contatos -&gt;</div>
                    <div className={`legacy-tab ${customerRegistrationTab === 'filiacao' ? 'active' : ''}`} onClick={() => setCustomerRegistrationTab('filiacao')}>Filiação e Avaliação Financeira -&gt;</div>
                    <div className={`legacy-tab ${customerRegistrationTab === 'historico' ? 'active' : ''}`} onClick={() => setCustomerRegistrationTab('historico')}>Informações / Observações / Histórico</div>
                  </div>
                  <div className="legacy-tab-content flex-1 p-2 bg-white" style={{ minHeight: 'auto' }}>
                    {customerRegistrationTab === 'endereco' && (
                      <div className="space-y-2">
                        <div>
                          <span className="legacy-label text-[10px]">Nome Fantasia / Apelido</span>
                          <input className="legacy-input w-full" value={customerForm.fantasia} onChange={e => setCustomerForm({ ...customerForm, fantasia: e.target.value })} />
                        </div>
                        <div>
                          <span className="legacy-label text-[10px]">Nome da Rua / AV</span>
                          <input className="legacy-input w-full" value={customerForm.rua} onChange={e => setCustomerForm({ ...customerForm, rua: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Bairro</span>
                            <input className="legacy-input w-full" value={customerForm.bairro} onChange={e => setCustomerForm({ ...customerForm, bairro: e.target.value })} />
                          </div>
                          <div className="w-24">
                            <span className="legacy-label text-[10px]">Cidade</span>
                            <input className="legacy-input w-full text-center" value={customerForm.cidade} onChange={e => setCustomerForm({ ...customerForm, cidade: e.target.value })} />
                          </div>
                          <div className="w-16">
                            <span className="legacy-label text-[10px]">UF</span>
                            <select className="legacy-input w-full" value={customerForm.uf} onChange={e => setCustomerForm({ ...customerForm, uf: e.target.value })}><option>CE</option><option>SP</option><option>RJ</option><option>MG</option><option>RS</option></select>
                          </div>
                          <div className="w-24">
                            <span className="legacy-label text-[10px]">CEP</span>
                            <input className="legacy-input w-full text-center" value={customerForm.cep} onChange={e => setCustomerForm({ ...customerForm, cep: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-24">
                            <span className="legacy-label text-[10px]">1º Telefone</span>
                            <input className="legacy-input w-full text-center" value={customerForm.tel1} onChange={e => setCustomerForm({ ...customerForm, tel1: e.target.value })} />
                          </div>
                          <div className="w-24">
                            <span className="legacy-label text-[10px]">2º Telefone</span>
                            <input className="legacy-input w-full text-center" value={customerForm.tel2} onChange={e => setCustomerForm({ ...customerForm, tel2: e.target.value })} />
                          </div>
                          <div className="w-24">
                            <span className="legacy-label text-[10px]">Nº Celular</span>
                            <input className="legacy-input w-full text-center" value={customerForm.celular} onChange={e => setCustomerForm({ ...customerForm, celular: e.target.value })} />
                          </div>
                          <div className="w-24">
                            <span className="legacy-label text-[10px]">Whatsapp</span>
                            <input className="legacy-input w-full text-center" value={customerForm.whatsapp} onChange={e => setCustomerForm({ ...customerForm, whatsapp: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Complemento</span>
                            <input className="legacy-input w-full" value={customerForm.complemento} onChange={e => setCustomerForm({ ...customerForm, complemento: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">E-mail</span>
                            <div className="flex gap-1"><input className="legacy-input flex-1" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} /><button className="bg-gray-200 border px-2 text-gray-500">@</button></div>
                          </div>
                          <div className="w-48">
                            <span className="legacy-label text-[10px]">Contato</span>
                            <div className="flex gap-1"><input className="legacy-input flex-1" value={customerForm.contato} onChange={e => setCustomerForm({ ...customerForm, contato: e.target.value })} /><button className="bg-gray-200 border px-2 text-gray-600 text-[10px]">CONTATOS</button></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">SKYPE</span>
                            <input className="legacy-input w-full" value={customerForm.skype} onChange={e => setCustomerForm({ ...customerForm, skype: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Rede Social</span>
                            <input className="legacy-input w-full" value={customerForm.redeSocial} onChange={e => setCustomerForm({ ...customerForm, redeSocial: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Nº CNPJ</span>
                            <input className="legacy-input w-full text-center" value={customerForm.cnpj} onChange={e => setCustomerForm({ ...customerForm, cnpj: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Nº IE</span>
                            <input className="legacy-input w-full" value={customerForm.ie} onChange={e => setCustomerForm({ ...customerForm, ie: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Nº IM</span>
                            <input className="legacy-input w-full" value={customerForm.im} onChange={e => setCustomerForm({ ...customerForm, im: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Nº CPF</span>
                            <input className="legacy-input w-full" value={customerForm.cpf} onChange={e => setCustomerForm({ ...customerForm, cpf: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Nº RG</span>
                            <input className="legacy-input w-full" value={customerForm.rg} onChange={e => setCustomerForm({ ...customerForm, rg: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <span className="legacy-label text-[10px]">Orgão Emissor</span>
                            <input className="legacy-input w-full" value={customerForm.orgaoEmissor} onChange={e => setCustomerForm({ ...customerForm, orgaoEmissor: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    )}
                    {customerRegistrationTab !== 'endereco' && (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        {customerRegistrationTab === 'filiacao' ? 'Aba Filiação e Avaliação Financeira' : 'Aba Informações e Observações'}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2 h-28">
                    <div className="w-3/4 flex flex-col relative">
                      <span className="legacy-label text-[10px] absolute -top-2 left-2 bg-white px-1">Observações Gerais</span>
                      <div className="border border-gray-400 p-2 flex-1 bg-yellow-50 flex gap-4 mt-1">
                        <label className="flex items-center gap-1 text-[11px] font-bold"><input type="radio" name="status" defaultChecked /> LIBERAR</label>
                        <label className="flex items-center gap-1 text-[11px] font-bold"><input type="radio" name="status" /> RESTRINGIR</label>
                        <label className="flex items-center gap-1 text-[11px] font-bold"><input type="radio" name="status" /> BLOQUEAR</label>
                      </div>
                    </div>
                    <div className="w-1/4 flex flex-col gap-1">
                      <button className="legacy-button flex-1 flex items-center justify-center gap-2" onClick={() => { handlePrint(); }}><Printer size={16} className="text-orange-600" /> Imprimir Ficha</button>
                      <button className="legacy-button flex-1 flex items-center justify-center gap-2" onClick={() => {
                        toast({ title: '✅ Cliente salvo com sucesso!' });
                        setPhone(customerForm.celular || customerForm.whatsapp || customerForm.tel1 || phone);
                        setShowCustomerRegistrationModal(false);
                      }}><CheckSquare size={16} className="text-green-600" /> Salvar Cadastro</button>
                      <button className="legacy-button flex-1 flex items-center justify-center gap-2" onClick={() => setShowCustomerRegistrationModal(false)}><X size={16} className="text-blue-600" /> SAIR</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Product Search Modal ─────────────────────────────────────── */}
      {showProductSearchModal && (
        <div className="legacy-modal-scope fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-400 rounded shadow-lg w-full max-w-6xl flex flex-col" style={{ fontFamily: 'Tahoma,Arial,sans-serif', fontSize: 11, height: '90vh', color: '#000' }}>
            <div className="bg-[#dde] px-3 py-2 flex items-center justify-between border-b border-gray-400">
              <span className="font-bold text-sm">PESQUISA DOS PRODUTOS & SERVIÇOS CADASTRADOS &lt;&lt;&lt;</span>
              <button onClick={() => setShowProductSearchModal(false)}><X size={14} /></button>
            </div>
            <div className="p-2 bg-[#f0f0f0] flex-1 flex flex-col gap-2">
              <div className="flex gap-2 items-end">
                <div className="w-32">
                  <span className="legacy-label text-[10px]">Ordenar a Pesquisa</span>
                  <select className="legacy-input w-full"><option>Por Descrição</option></select>
                </div>
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Filtro Geral</span>
                  <select className="legacy-input w-full"><option>Pesquisar TODOS</option></select>
                </div>
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Filtro por Categoria</span>
                  <select className="legacy-input w-full"><option>Pesquisar TODOS</option></select>
                </div>
                <div className="flex gap-2">
                  <button className="legacy-button flex flex-col items-center justify-center w-12 h-12" onClick={() => toast({ title: 'ℹ️ Busca por imagem ainda não implementada nesta versão.' })}><ImageIcon size={16} className="text-green-600" /><span className="text-[9px]">Imagem</span></button>
                  <button className="legacy-button flex flex-col items-center justify-center w-12 h-12" onClick={() => toast({ title: 'ℹ️ Leitura de código de barras ainda não implementada nesta versão.' })}><div className="w-4 h-3 bg-gray-500 mb-1" /><span className="text-[9px]">CodBarra</span></button>
                  <button className="legacy-button flex flex-col items-center justify-center w-12 h-12" onClick={() => { setShowProductSearchModal(false); openItemForm(); }}><Plus size={16} className="text-green-600" /><span className="text-[9px]">Incluir</span></button>
                </div>
                <div className="w-12"></div>
                <div className="w-12 text-right">
                  <button className="legacy-button flex flex-col items-center justify-center w-12 h-12 ml-auto" onClick={() => setShowProductSearchModal(false)}><LogOut size={16} className="text-blue-600" /><span className="text-[9px]">Sair</span></button>
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Pesquisar por Descrição</span>
                  <input className="legacy-input w-full bg-yellow-50" value={productSearchStr} onChange={e => setProductSearchStr(e.target.value)} />
                </div>
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Rastrear Palavras</span>
                  <div className="flex"><input className="legacy-input flex-1" /><button className="bg-gray-200 border px-1"><Search size={12} /></button></div>
                </div>
                <div className="w-48">
                  <span className="legacy-label text-[10px]">Referencia</span>
                  <input className="legacy-input w-full bg-yellow-50" />
                </div>
                <div className="flex gap-2 ml-4 mb-1">
                  <label className="flex items-center gap-1 text-[11px]"><input type="radio" name="listType" defaultChecked /> Lista A</label>
                  <label className="flex items-center gap-1 text-[11px]"><input type="radio" name="listType" /> Lista B</label>
                </div>
              </div>

              <div className="flex-1 border border-gray-400 bg-white overflow-hidden mt-1 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <table className="legacy-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th>Referencia</th>
                        <th>Código</th>
                        <th>Descrição do Produto</th>
                        <th>Uni</th>
                        <th>Valor Avista</th>
                        <th>Est. Atual</th>
                        <th>Grupo / Categoria</th>
                        <th>Marca do Produto</th>
                        <th>Localização do Produto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Fake data since we may not have a populated products table */}
                      {[...productsList, ...Array.from({ length: 15 })].map((prod, i) => (
                        <tr key={prod?.id || i} style={{ backgroundColor: '#c8e6c9', borderBottom: '1px solid #a5d6a7', cursor: 'pointer' }} onClick={() => {
                          openItemForm({ id: Date.now().toString(), description: prod?.name || `20 MTS FITA ${['SAFIRA', 'BRANCO DIAMANTE', 'ABSOLUTO', 'ACACIA', 'ALMERIA', 'ARAUCARIA', 'ARDOSIA', 'AREIA'][i % 8] || 'GENERIC'}`, unit: 'un', width: 0, height: 0, value: prod?.price || 95.55, quantity: 1, total_m2: 0, total_value: prod?.price || 95.55 });
                          setShowProductSearchModal(false);
                        }}>
                          <td style={{ width: 80 }}><div className="flex justify-between items-center"><Camera size={10} className="text-gray-500" /></div></td>
                          <td style={{ width: 60, textAlign: 'right' }}>{prod?.id || i + 1}</td>
                          <td>{prod?.name || `20 MTS FITA ${['SAFIRA', 'BRANCO DIAMANTE', 'ABSOLUTO', 'ACACIA', 'ALMERIA', 'ARAUCARIA', 'ARDOSIA', 'AREIA'][i % 8] || 'GENERIC'}`}</td>
                          <td style={{ width: 40, textAlign: 'center' }}>UNI</td>
                          <td style={{ width: 80, textAlign: 'right' }}>{fmtMoney(prod?.price || (90 + i))}</td>
                          <td style={{ width: 80, textAlign: 'right' }}>{fmtMoney(1000 - i * 10)}</td>
                          <td>FITA DE BORDO</td>
                          <td>{i % 4 === 0 ? 'GUARARAPES' : ''}</td>
                          <td></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#f0f0f0] border-t border-gray-400 p-1 flex justify-between text-[10px]">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600" /> &gt; Habilitar o Gerenciamento do Estoque por Cores</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500" /> Em estoque</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400" /> Estoque Baixo</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400" /> Estoque Zerado</span>
                    <span className="text-gray-500">| Item Serviço ou sem Controle de Estoque</span>
                  </div>
                  <span>Para sair ESC ou botão SAIR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: OS Search Modal ──────────────────────────────────────────── */}
      {showOSSearchModal && (
        <div className="legacy-modal-scope fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-400 rounded shadow-lg w-full max-w-6xl flex flex-col" style={{ fontFamily: 'Tahoma,Arial,sans-serif', fontSize: 11, height: '90vh', color: '#000' }}>
            <div className="bg-[#dde] px-3 py-2 flex items-center justify-between border-b border-gray-400">
              <span className="font-bold text-sm">Pesquisa Ordem de Serviços</span>
              <button onClick={() => setShowOSSearchModal(false)}><X size={14} /></button>
            </div>
            <div className="p-2 bg-[#f0f0f0] flex-1 flex flex-col gap-2">
              <div className="flex gap-2 items-end">
                <div className="font-bold text-sm flex gap-4 mr-4 mb-1">
                  <span>ORÇAMENTO</span>
                  <span>PENDENTE</span>
                </div>
                <div className="w-48">
                  <span className="legacy-label text-[10px]">Filtrar por Nome</span>
                  <select className="legacy-input w-full"><option>&gt;&gt; TODOS &lt;&lt;</option></select>
                </div>
                <div className="flex-1">
                  <span className="legacy-label text-[10px]">Pesquisar por Nome</span>
                  <input className="legacy-input w-full bg-yellow-50" value={osSearchStr} onChange={e => setOsSearchStr(e.target.value)} />
                </div>
                <div className="w-24">
                  <span className="legacy-label text-[10px]">Data Inicial</span>
                  <input className="legacy-input w-full text-center font-bold text-green-700" defaultValue="23/05/2026" />
                </div>
                <div className="w-24">
                  <span className="legacy-label text-[10px]">Data Final</span>
                  <input className="legacy-input w-full text-center font-bold text-green-700" defaultValue="22/07/2026" />
                </div>
                <div className="flex gap-1 mb-1">
                  <button className="legacy-button px-2 py-1 bg-green-100 border border-green-400 rounded" onClick={() => toast({ title: '🔄 Lista atualizada.' })}><RefreshCw size={14} className="text-green-600" /></button>
                  <button className="legacy-button px-2 py-1"><div className="text-blue-600 font-bold text-sm">&lt;</div></button>
                  <button className="legacy-button px-2 py-1"><div className="text-blue-600 font-bold text-sm">&gt;</div></button>
                </div>
                <div className="ml-auto mb-1">
                  <button className="legacy-button flex items-center justify-center rounded-full w-8 h-8 p-0" onClick={() => setShowOSSearchModal(false)}>
                    <LogOut size={16} className="text-blue-600" />
                  </button>
                </div>
              </div>

              <div className="flex-1 border border-gray-400 bg-white overflow-hidden mt-1 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <table className="legacy-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th>Nº</th>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Nome do Cliente</th>
                        <th>Telefone</th>
                        <th>Produtos</th>
                        <th>Serviços</th>
                        <th>Outros</th>
                        <th>Desconto</th>
                        <th>TOTAL</th>
                        <th>Entrega</th>
                        <th>Hora</th>
                        <th>Situação Atual -&gt;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Fake data since we don't have enough OSs in mock */}
                      {[...osList, ...Array.from({ length: 15 })].map((os, i) => (
                        <tr key={os?.id || i} style={{ backgroundColor: i % 2 === 0 ? '#ffff99' : '#fff', cursor: 'pointer' }} onClick={() => {
                          setOrderNo(os?.order_number || String(999 + i));
                          setClientDesc(os?.clients?.name || ['SONIA', 'CLAUDIA', 'MARLUCE', 'ATHENAS CONDOMINIUM', 'GISLENE', 'SAMUEL DAVID CARVALHO DOS SANTOS'][i % 6]);
                          setPhone(os?.clients?.phone || '(85)99184-8975');
                          setValorMaterial(fmtMoney(os?.total_value || (493.34 + i * 1000)));
                          setSituacaoAtual(os?.status === 'concluida' ? 'Concluído' : os?.status === 'em_andamento' ? 'Em Andamento' : 'Aguardando Aprovação');
                          setShowOSSearchModal(false);
                        }}>
                          <td style={{ width: 40, textAlign: 'center', backgroundColor: '#008080', color: 'white' }}>{os?.order_number || (999 + i)}</td>
                          <td style={{ width: 70, textAlign: 'center' }}>{os?.created_at ? format(new Date(os.created_at), 'dd/MM/yyyy') : `23/05/2026`}</td>
                          <td style={{ width: 40, textAlign: 'center' }}>10:08</td>
                          <td>{os?.clients?.name || ['SONIA', 'CLAUDIA', 'MARLUCE', 'ATHENAS CONDOMINIUM', 'GISLENE', 'SAMUEL DAVID CARVALHO DOS SANTOS'][i % 6]}</td>
                          <td style={{ width: 100 }}>{os?.clients?.phone || '(85)99184-8975'}</td>
                          <td style={{ width: 70, textAlign: 'right' }}>{fmtMoney(os?.total_value || (493.34 + i * 1000))}</td>
                          <td style={{ width: 70, textAlign: 'right' }}>{i % 2 === 0 ? '' : fmtMoney(1200)}</td>
                          <td style={{ width: 50, textAlign: 'right' }}></td>
                          <td style={{ width: 50, textAlign: 'right' }}>{i % 3 === 0 ? fmtMoney(132) : ''}</td>
                          <td style={{ width: 70, textAlign: 'right', fontWeight: 'bold' }}>{fmtMoney(os?.total_value || (493.34 + i * 1000))}</td>
                          <td style={{ width: 40, textAlign: 'center' }}>/ /</td>
                          <td style={{ width: 40, textAlign: 'center' }}></td>
                          <td style={{ width: 120 }}>{os?.status === 'concluida' ? 'Concluído' : 'Aguardando Aprovação'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#f0f0f0] border-t border-gray-400 p-2 flex justify-between items-center text-[10px]">
                  <div className="flex gap-2">
                    <button className="legacy-button h-8" onClick={() => { setShowOSSearchModal(false); }}><Plus size={14} className="mr-1 text-green-600" /> Nova</button>
                    <button className="legacy-button h-8" onClick={() => toast({ title: 'ℹ️ Selecione uma OS na lista para alterar.' })}><Edit size={14} className="mr-1 text-blue-600" /> Alterar</button>
                    <button className="legacy-button h-8" onClick={() => toast({ title: 'ℹ️ Cancelamento ainda não implementado nesta versão.' })}><X size={14} className="mr-1 text-red-600" /> Cancelar</button>
                    <button className="legacy-button h-8" onClick={() => toast({ title: 'ℹ️ Selecione uma OS na lista para finalizar.' })}><CheckSquare size={14} className="mr-1 text-green-600" /> Finalizar</button>
                    <button className="legacy-button h-8" onClick={() => { setShowOSSearchModal(false); handlePrint(); }}><Printer size={14} className="mr-1 text-blue-600" /> Emitir Jato</button>
                    <button className="legacy-button h-8" onClick={() => { setShowOSSearchModal(false); handlePrint(); }}><Printer size={14} className="mr-1 text-orange-600" /> Cupom</button>
                    <button className="legacy-button h-8" onClick={() => toast({ title: 'ℹ️ Relatório ainda não implementado nesta versão.' })}><FileText size={14} className="mr-1 text-gray-600" /> Relatório</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="legacy-label text-[10px] block mb-0">VALOR TOTAL</span>
                      <span className="font-bold text-blue-700 text-sm">160.199,07</span>
                    </div>
                    <span className="text-gray-500 font-bold ml-4">System</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="legacy-container">
        <div className="legacy-header">
          DADOS ORÇAMENTOS E DAS ORDENS DE SERVIÇO &lt;&lt;&lt;
        </div>

        {/* ── Top row ─────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-2 items-start flex-wrap">

          {/* Nº / Data / Hora */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-end">
              <div>
                <span className="legacy-label">Nº DA ORDEM</span><br />
                <div className="flex">
                  <input type="text" className="legacy-input font-bold text-base w-16 text-center" value={orderNo} readOnly />
                  <button className="bg-blue-100 border border-blue-400 p-1" onClick={() => setShowOSSearchModal(true)} title="Pesquisar Ordem de Serviços">
                    <Search size={16} className="text-blue-600" />
                  </button>
                </div>
              </div>
              <div>
                <span className="legacy-label">DATA</span><br />
                <input type="text" className="legacy-input bg-yellow-100 font-bold w-24 text-center" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <span className="legacy-label">HORA</span><br />
                <input type="text" className="legacy-input font-bold w-14 text-center" value={time} readOnly />
              </div>
            </div>

            {/* OS / Orçamento checkboxes */}
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

          {/* 1 Via / 2 Vias */}
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

          {/* Tabelas */}
          <div className="flex flex-col mt-3 border border-gray-300 p-1">
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

          {/* Cliente */}
          <div className="flex-1 ml-2" style={{ minWidth: 240 }}>
            <div className="flex gap-2 mb-1 items-end">
              <div className="flex-1">
                <span className="legacy-label">Descrição do Cliente</span><br />
                <input
                  type="text"
                  className="legacy-input w-full font-bold"
                  value={clientDesc}
                  onChange={e => setClientDesc(e.target.value.toUpperCase())}
                />
              </div>
              <button className="legacy-button h-[24px]" onClick={() => setShowCustomerRegistrationModal(true)}>
                <Users size={13} className="text-blue-600" /> Consultar
              </button>
              <button className="legacy-button h-[24px]" onClick={() => { setClientSearch(''); setShowClientModal(true); }}>
                <Search size={13} className="text-blue-600" /> Pesquisar
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <span className="legacy-label">Nome do Contato / Outros</span><br />
                <input type="text" className="legacy-input w-full border-b-2 border-b-blue-400" value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div className="w-28">
                <span className="legacy-label">Telefone</span><br />
                <input type="text" className="legacy-input w-full" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="w-44">
                <span className="legacy-label">Responsavel:</span><br />
                <select className="legacy-input w-full" value={responsavel} onChange={e => setResponsavel(e.target.value)}>
                  <option value=""></option>
                  {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div>
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

            {/* ── ABA: Observações ──────────────────────────────────── */}
            {activeTab === 'obs' && (
              <div className="flex flex-col gap-2 h-full items-center justify-center text-gray-400">
                <p>Nenhuma observação geral no momento.</p>
              </div>
            )}

            {/* ── ABA: Produtos ─────────────────────────────────────── */}
            {activeTab === 'produtos' && (
              <div className="flex gap-2 h-full">
                {/* Left side buttons */}
                <div className="flex flex-col gap-2 w-32 shrink-0 border border-gray-400 p-2 bg-white" style={{ minHeight: 250 }}>
                  <button className="flex flex-col items-center justify-center gap-1 border border-blue-300 p-2 bg-gradient-to-b from-white to-blue-50 rounded hover:from-blue-50 hover:to-blue-100" onClick={() => openItemForm()}>
                    <Plus size={20} className="text-green-600" />
                    <span className="text-[11px] font-bold">Incluir</span>
                  </button>

                  <button className="flex flex-col items-center justify-center gap-1 border border-gray-300 p-2 bg-gradient-to-b from-white to-gray-100 rounded hover:from-gray-100 hover:to-gray-200" onClick={() => toast({ title: 'ℹ️ Função Automático não implementada nesta versão.' })}>
                    <div className="flex flex-col gap-[2px]">
                      <div className="w-6 h-[2px] bg-gray-600"></div>
                      <div className="w-6 h-[2px] bg-gray-600"></div>
                      <div className="w-6 h-[2px] bg-gray-600"></div>
                      <div className="w-6 h-[2px] bg-gray-600"></div>
                    </div>
                    <span className="text-[11px] font-bold">Automático</span>
                  </button>

                  <button className="flex flex-col items-center justify-center gap-1 border border-gray-300 p-2 bg-gradient-to-b from-white to-gray-100 rounded hover:from-gray-100 hover:to-gray-200" onClick={() => {
                    const sel = osItems.find(i => i.id === selectedItemId) || osItems[osItems.length - 1];
                    if (sel) openItemForm(sel);
                    else toast({ title: '⚠️ Selecione um item', variant: 'destructive' });
                  }}>
                    <Edit size={20} className="text-blue-600" />
                    <span className="text-[11px] font-bold">Alterar</span>
                  </button>

                  <button className="flex flex-col items-center justify-center gap-1 border border-gray-300 p-2 bg-gradient-to-b from-white to-gray-100 rounded hover:from-gray-100 hover:to-gray-200" onClick={() => {
                    const sel = osItems.find(i => i.id === selectedItemId) || osItems[osItems.length - 1];
                    if (sel) deleteItem(sel.id);
                    else toast({ title: '⚠️ Nenhum item para excluir', variant: 'destructive' });
                  }}>
                    <Trash2 size={20} className="text-red-600" />
                    <span className="text-[11px] font-bold">Excluir</span>
                  </button>

                  <button className="flex flex-col items-center justify-center gap-1 border border-gray-300 p-2 bg-gradient-to-b from-white to-gray-100 rounded hover:from-gray-100 hover:to-gray-200" onClick={() => setShowProductSearchModal(true)}>
                    <Search size={20} className="text-blue-600" />
                    <span className="text-[11px] font-bold">Pesquisar</span>
                  </button>
                </div>

                {/* Right side table */}
                <div className="flex-1 border border-gray-400 bg-white overflow-hidden flex flex-col">
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table className="legacy-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th>Nº</th>
                          <th>Descrição do Produto</th>
                          <th>Uni</th>
                          <th>Largura</th>
                          <th>Altura</th>
                          <th>Tot MT2</th>
                          <th>Valor</th>
                          <th>Quantia</th>
                          <th>Vlr Total</th>
                          <th>C...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {osItems.length === 0 && (
                          <tr><td colSpan={10} style={{ textAlign: 'center', color: '#888', padding: 8 }}>
                            Nenhum item. Clique em "Incluir".
                          </td></tr>
                        )}
                        {osItems.map((it, i) => (
                          <tr
                            key={it.id}
                            className={selectedItemId === it.id ? 'selected' : ''}
                            onClick={() => setSelectedItemId(it.id)}
                            onDoubleClick={() => openItemForm(it)}
                          >
                            <td>{String(i + 1).padStart(4, '0')}</td>
                            <td>{it.description}</td>
                            <td>{it.unit}</td>
                            <td>{it.width > 0 ? it.width.toFixed(2) : '-'}</td>
                            <td>{it.height > 0 ? it.height.toFixed(2) : '-'}</td>
                            <td>{it.total_m2 > 0 ? it.total_m2.toFixed(3) : '-'}</td>
                            <td>R$ {fmtMoney(it.value)}</td>
                            <td>{it.quantity}</td>
                            <td style={{ fontWeight: 'bold', color: '#0000aa' }}>R$ {fmtMoney(it.total_value)}</td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {osItems.length > 0 && (
                    <div className="p-1 bg-[#eef] border-t border-gray-400 text-right text-[11px]">
                      <span className="font-bold mr-2">Total Geral:</span>
                      <span className="font-bold text-[#0000aa]">R$ {fmtMoney(totalItems)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ABA: Imagens ──────────────────────────────────────── */}
            {activeTab === 'imagens' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button className="legacy-button" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={12} className="text-blue-600" /> Adicionar Fotos
                  </button>
                  <input
                    type="file" accept="image/*" multiple ref={fileInputRef}
                    className="hidden"
                    onChange={e => handleImageFiles(e.target.files)}
                  />
                  <span className="text-[11px] text-gray-500">{osImages.length} imagem(ns)</span>
                </div>
                {osImages.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                    style={{ minHeight: 180, border: '2px dashed #aaa', borderRadius: 4, color: '#888' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon size={32} className="text-gray-400" />
                    <p className="text-[11px]">Clique para adicionar fotos do serviço</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {osImages.map(img => (
                      <div key={img.id} className="relative group" style={{ width: 90, height: 90 }}>
                        <img src={img.url} alt={img.name} style={{ width: 90, height: 90, objectFit: 'cover', border: '1px solid #aaa' }} />
                        <button
                          onClick={() => setOsImages(p => p.filter(i => i.id !== img.id))}
                          className="absolute top-0 right-0 bg-red-600 text-white"
                          style={{ fontSize: 10, lineHeight: 1, padding: '1px 3px' }}
                        >✕</button>
                        <p style={{ fontSize: 9, color: '#555', wordBreak: 'break-all' }}>{img.name.slice(0, 15)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: Controle ─────────────────────────────────────── */}
            {activeTab === 'controle' && (
              <div className="flex flex-col gap-2 h-full overflow-y-auto">
                {/* Moved from Observações */}
                <div className="flex gap-2" style={{ minHeight: 110 }}>
                  <div className="flex-1 flex flex-col">
                    <label className="legacy-textarea-label">
                      <input type="checkbox" className="legacy-checkbox" /> Serviço a ser Realizado:
                    </label>
                    <textarea
                      className="legacy-textarea flex-1"
                      value={servicoRealizado}
                      onChange={e => setServicoRealizado(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="legacy-textarea-label">
                      <input type="checkbox" className="legacy-checkbox" /> Problemas e Reparos a Serem Feitos no Serviço:
                    </label>
                    <textarea
                      className="legacy-textarea flex-1"
                      value={problemasReparos}
                      onChange={e => setProblemasReparos(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col" style={{ minHeight: 80 }}>
                  <label className="legacy-textarea-label">
                    <input type="checkbox" className="legacy-checkbox" /> Etapa do Serviço Sendo Realizado:
                  </label>
                  <textarea
                    className="legacy-textarea flex-1"
                    value={etapaServico}
                    onChange={e => setEtapaServico(e.target.value)}
                  />
                </div>
                {/* Original Controle fields */}
                <div className="flex gap-2 mt-2" style={{ minHeight: 80 }}>
                  <div className="flex-1 flex flex-col">
                    <label className="legacy-textarea-label">Notas Internas / Observações Administrativas:</label>
                    <textarea
                      className="legacy-textarea flex-1"
                      placeholder="Uso interno — não aparece na impressão do cliente..."
                      value={notasInternas}
                      onChange={e => setNotasInternas(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="legacy-textarea-label">Histórico do Serviço / Registros Diversos:</label>
                    <textarea
                      className="legacy-textarea flex-1"
                      placeholder="Histórico de contatos, visitas, alterações..."
                      value={historicoServico}
                      onChange={e => setHistoricoServico(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-2 mb-2">
                  <div>
                    <label className="legacy-label block mb-1">Forma de Pagamento</label>
                    <span className="text-[12px] font-bold text-blue-700">{paymentMethod}</span>
                  </div>
                  <div>
                    <label className="legacy-label block mb-1">Status</label>
                    <span className="text-[12px] font-bold">{situacaoAtual}</span>
                  </div>
                  <div>
                    <label className="legacy-label block mb-1">Total da OS</label>
                    <span className="text-[12px] font-bold text-blue-700">R$ {fmtMoney(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row ──────────────────────────────────────────────── */}
        <div className="flex mt-3 items-start gap-3 flex-wrap">

          {/* Options left */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center text-[11px]">
              <input type="checkbox" className="legacy-checkbox" checked={showMetroImp} onChange={e => setShowMetroImp(e.target.checked)} />
              Marcar para Mostrar Valor do Metro na Impressão
            </label>
            <label className="flex items-center text-[11px]">
              <input type="checkbox" className="legacy-checkbox" checked={showValoresImp} onChange={e => setShowValoresImp(e.target.checked)} />
              Marcar para sair os Valores na Impressão
            </label>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]">Situação Atual</span>
              <select className="legacy-input w-44" value={situacaoAtual} onChange={e => setSituacaoAtual(e.target.value)}>
                <option>Aguardando Aprovação</option>
                <option>Em Andamento</option>
                <option>Concluído</option>
                <option>Cancelado</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]">DATA DA APROVAÇÃO</span>
              <input
                type="text"
                className="legacy-input bg-green-100 w-24 text-center"
                placeholder="dd/mm/aaaa"
                value={dataAprovacao}
                onChange={e => setDataAprovacao(e.target.value)}
              />
              <button
                className="legacy-button px-2"
                onClick={() => setDataAprovacao(format(new Date(), 'dd/MM/yyyy'))}
              >
                <span className="text-green-600 font-bold">Hoje</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex-1 grid grid-cols-3 gap-1" style={{ minWidth: 300 }}>
            <button className="legacy-button h-10" onClick={() => setShowPaymentModal(true)}>
              <CreditCard size={16} className="text-yellow-600" />
              <span>Formas de Pagamento</span>
            </button>
            <button className="legacy-button h-10" onClick={handlePrint}>
              <Printer size={16} className="text-blue-500" />
              <span>Imprimir de Jato Tinta</span>
            </button>
            <button className="legacy-button h-10" onClick={handleSave}>
              <Save size={16} className="text-green-600" />
              <span className="font-bold">SALVAR</span>
            </button>

            <button className="legacy-button h-10" onClick={() => setShowCalc(true)}>
              <Calculator size={16} className="text-green-600" />
              <span>Tela da Calculadora</span>
            </button>
            <button className="legacy-button h-10" onClick={() => {
              toast({ title: '🖨️ Imprimindo Cupom...', description: 'Enviando para impressora de cupom.' });
              handlePrint();
            }}>
              <Printer size={16} className="text-gray-500" />
              <span>Imprimir em Cupom</span>
            </button>
            <button className="legacy-button h-10" onClick={handleFinalizar}>
              <CheckSquare size={16} className="text-green-600" />
              <span className="font-bold">FINALIZAR</span>
            </button>
          </div>

          {/* Money panel */}
          <div className="flex flex-col gap-1 ml-auto items-end">
            <div className="flex items-center">
              <div className="legacy-money-label flex items-center justify-end">VALOR MATERIAL</div>
              <input
                type="text" className="legacy-input legacy-money-input w-24 ml-1"
                value={valorMaterial}
                onChange={e => setValorMaterial(e.target.value)}
                onBlur={e => setValorMaterial(fmtMoney(parseMoney(e.target.value)))}
              />
            </div>
            <div className="flex items-center">
              <div className="legacy-money-label flex items-center justify-end">VALOR SERVIÇO</div>
              <input
                type="text" className="legacy-input legacy-money-input w-24 ml-1"
                value={valorServico}
                onChange={e => setValorServico(e.target.value)}
                onBlur={e => setValorServico(fmtMoney(parseMoney(e.target.value)))}
              />
            </div>
            <div className="flex items-center">
              <div className="legacy-money-label flex items-center justify-end">DESCONTO</div>
              <span className="mx-1 text-[11px]">(-)</span>
              <input
                type="text" className="legacy-input legacy-money-input w-24 text-red-600"
                value={desconto}
                onChange={e => setDesconto(e.target.value)}
                onBlur={e => setDesconto(fmtMoney(parseMoney(e.target.value)))}
              />
            </div>
            <div className="h-px w-full bg-gray-400 my-1" />
            <div className="flex items-center">
              <div className="legacy-money-label flex items-center justify-end font-bold text-base bg-transparent border-none">TOTAL</div>
              <input
                type="text"
                className="legacy-input legacy-money-input w-24 ml-1 text-blue-700 font-bold"
                value={fmtMoney(total)}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegacySystemPage;