"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, Check, Info, CloudUpload, ChevronRight, XCircle, Loader2, Lightbulb } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import Papa from 'papaparse'; 
import * as XLSX from 'xlsx'; 
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Interfaces for data
interface Account {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_banco: string | null;
  con_data_fechamento: number | null;
  con_data_vencimento: number | null;
}

interface Category {
  cat_id: string;
  cat_nome: string;
  cat_tipo: string;
}

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  originalRow: any;
}

interface ProcessedTransaction extends ParsedTransaction {
  type: 'receita' | 'despesa';
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  status: 'new' | 'duplicate' | 'ignored';
  ignore: boolean;
  isTransferCandidate: boolean;
  selectedLinkedAccountId: string | null;
  periodo: string; // YYYY-MM-DD (first day of month)
}

// Constantes de persistência movidas para fora do componente para evitar recriação e re-execução de efeitos
const LOCAL_STORAGE_KEYS = {
  selectedAccountId: 'import_selected_account_id',
  processedTransactions: 'import_processed_transactions',
  uploadStep: 'import_upload_step',
  useAiClassification: 'import_use_ai_classification',
  lastSelectedFileName: 'import_last_selected_file_name',
  lastSelectedFileSize: 'import_last_selected_file_size',
};

const ImportacaoExtratos = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview'>('upload');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingLancamentos, setExistingLancamentos] = useState<any[]>([]);
  const [grupoId, setGrupoId] = useState('');

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [processedTransactions, setProcessedTransactions] = useState<ProcessedTransaction[]>([]);
  const [useAiClassification, setUseAiClassification] = useState(true);
  const [systemCategories, setSystemCategories] = useState({ transferenciaId: null as string | null });

  const [lastSelectedFileName, setLastSelectedFileName] = useState<string | null>(null);
  const [lastSelectedFileSize, setLastSelectedFileSize] = useState<number | null>(null);

  // Helper to format currency
  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  const clearPersistedState = useCallback(() => {
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setLastSelectedFileName(null);
    setLastSelectedFileSize(null);
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedAccountId = localStorage.getItem(LOCAL_STORAGE_KEYS.selectedAccountId);
      const savedTransactions = localStorage.getItem(LOCAL_STORAGE_KEYS.processedTransactions);
      const savedStep = localStorage.getItem(LOCAL_STORAGE_KEYS.uploadStep);
      const savedAiClassification = localStorage.getItem(LOCAL_STORAGE_KEYS.useAiClassification);
      const savedFileName = localStorage.getItem(LOCAL_STORAGE_KEYS.lastSelectedFileName);
      const savedFileSize = localStorage.getItem(LOCAL_STORAGE_KEYS.lastSelectedFileSize);

      if (savedAccountId) setSelectedAccountId(savedAccountId);
      if (savedTransactions) setProcessedTransactions(JSON.parse(savedTransactions));
      if (savedStep) setUploadStep(savedStep as 'upload' | 'preview');
      if (savedAiClassification) setUseAiClassification(savedAiClassification === 'true');
      if (savedFileName) setLastSelectedFileName(savedFileName);
      if (savedFileSize) setLastSelectedFileSize(Number(savedFileSize));
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      clearPersistedState();
    }
  }, [clearPersistedState]);

  // Save state to localStorage
  useEffect(() => {
    if (selectedAccountId) localStorage.setItem(LOCAL_STORAGE_KEYS.selectedAccountId, selectedAccountId);
    if (processedTransactions.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.processedTransactions, JSON.stringify(processedTransactions));
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.uploadStep, uploadStep);
    localStorage.setItem(LOCAL_STORAGE_KEYS.useAiClassification, String(useAiClassification));
    if (lastSelectedFileName) localStorage.setItem(LOCAL_STORAGE_KEYS.lastSelectedFileName, lastSelectedFileName);
    if (lastSelectedFileSize) localStorage.setItem(LOCAL_STORAGE_KEYS.lastSelectedFileSize, String(lastSelectedFileSize));
  }, [selectedAccountId, processedTransactions, uploadStep, useAiClassification, lastSelectedFileName, lastSelectedFileSize]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('usu_grupo')
          .eq('usu_id', user?.id)
          .single();

        if (!userData?.usu_grupo) return;
        setGrupoId(userData.usu_grupo);

        const [accountsRes, categoriesRes, lancamentosRes] = await Promise.all([
          supabase.from('contas').select('con_id, con_nome, con_tipo, con_banco, con_data_fechamento, con_data_vencimento').eq('con_grupo', userData.usu_grupo),
          supabase.from('categorias').select('cat_id, cat_nome, cat_tipo').eq('cat_grupo', userData.usu_grupo),
          supabase.from('lancamentos').select('lan_data, lan_descricao, lan_valor, lan_categoria, lan_conta').eq('lan_grupo', userData.usu_grupo),
        ]);

        setAccounts(accountsRes.data || []);
        setCategories(categoriesRes.data || []);
        setExistingLancamentos(lancamentosRes.data || []);

        const transferenciaCat = categoriesRes.data?.find((cat: any) => 
          (cat.cat_nome.toLowerCase().includes('transferência') || cat.cat_nome.toLowerCase().includes('transferencia')) 
          && cat.cat_tipo === 'sistema'
        );
        
        setSystemCategories({ transferenciaId: transferenciaCat?.cat_id || null });

        if (!selectedAccountId && accountsRes.data && accountsRes.data.length > 0) {
          setSelectedAccountId(accountsRes.data[0].con_id);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchInitialData();
  }, [user, selectedAccountId]);

  const cleanAndParseFloat = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleanedValue = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleanedValue);
    }
    return 0;
  };

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return parseISO(dateStr);
    if (dateStr.match(/^\d{8}$/)) {
      return new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)) - 1, parseInt(dateStr.substring(6, 8)));
    }
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const extractPersonName = (description: string): string | null => {
    const lowerDescription = description.toLowerCase();
    const patterns = [
      /pix (recebido|enviado) para (.*?)(?:\s|$)/,
      /pix (recebido|enviado) de (.*?)(?:\s|$)/,
      /ted (para|de) (.*?)(?:\s|$)/,
      /transferência (para|de) (.*?)(?:\s|$)/,
      /transferencia (para|de) (.*?)(?:\s|$)/,
    ];
    for (const pattern of patterns) {
      const match = lowerDescription.match(pattern);
      if (match && match[2]) return match[2].split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    return null;
  };

  const classifyTransactionWithAI = useCallback(async (description: string, value: number, availableCategories: Category[]): Promise<string | null> => {
    try {
      const type = value >= 0 ? 'receita' : 'despesa';
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return null;

      const response = await fetch('https://wvhpwclgevtdzrfqtvvg.supabase.co/functions/v1/classify-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ description, categories: availableCategories, type }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.suggestedCategoryId;
    } catch (error) {
      return null;
    }
  }, []);

  const processTransactions = useCallback(async (parsed: ParsedTransaction[]) => {
    const processed: ProcessedTransaction[] = [];
    const existingDescriptionsMap = new Map<string, string>();
    const existingTransactionsSet = new Set<string>();
    const personCategoryMap = new Map<string, { categoryId: string, date: Date }>();

    // Filtrar lançamentos existentes APENAS para a conta selecionada para detecção de duplicados precisa
    existingLancamentos.forEach(lan => {
      if (lan.lan_conta === selectedAccountId) {
        const formattedExistingDate = format(parseISO(lan.lan_data), 'yyyy-MM-dd');
        // Usar toFixed(2) para garantir que a comparação numérica não falhe por precisão de string
        const duplicateKey = `${formattedExistingDate}-${Number(lan.lan_valor).toFixed(2)}`;
        existingTransactionsSet.add(duplicateKey);
      }
      
      if (lan.lan_descricao) existingDescriptionsMap.set(lan.lan_descricao.toLowerCase(), lan.lan_categoria);
      const personName = extractPersonName(lan.lan_descricao || '');
      if (personName) {
        const lanDate = parseISO(lan.lan_data);
        const lanCategory = categories.find(c => c.cat_id === lan.lan_categoria);
        if (lanCategory && lanCategory.cat_tipo !== 'sistema') {
          const currentEntry = personCategoryMap.get(personName);
          if (!currentEntry || lanDate > currentEntry.date) personCategoryMap.set(personName, { categoryId: lan.lan_categoria, date: lanDate });
        }
      }
    });

    for (const tx of parsed) {
      const value = Number(tx.value);
      const txDate = parseDateString(tx.date);
      const formattedDate = format(txDate, 'yyyy-MM-dd');
      
      // Calcular período da fatura
      let periodo = format(new Date(txDate.getFullYear(), txDate.getMonth(), 1), 'yyyy-MM-dd');
      const selectedAccount = accounts.find(a => a.con_id === selectedAccountId);
      
      if (selectedAccount?.con_tipo === 'cartao' && selectedAccount.con_data_fechamento) {
        const day = txDate.getDate();
        let month = txDate.getMonth();
        let year = txDate.getFullYear();

        // Se o dia da compra for após o fechamento, cai na fatura do próximo mês
        if (day > selectedAccount.con_data_fechamento) {
          month++;
          if (month > 11) {
            month = 0;
            year++;
          }
        }
        periodo = format(new Date(year, month, 1), 'yyyy-MM-dd');
      }

      // Checar duplicidade com formatação numérica idêntica à do Set
      const checkKey = `${formattedDate}-${value.toFixed(2)}`;
      let status: 'new' | 'duplicate' | 'ignored' = existingTransactionsSet.has(checkKey) ? 'duplicate' : 'new';
      
      let suggestedCategoryId: string | null = null;
      let isTransferCandidate = ['transferencia', 'ted', 'pix', 'doc', 'transferência'].some(k => tx.description.toLowerCase().includes(k));

      if (useAiClassification && status === 'new') {
        if (isTransferCandidate) {
          const personName = extractPersonName(tx.description);
          suggestedCategoryId = (personName && personCategoryMap.get(personName)?.categoryId) || systemCategories.transferenciaId;
        } else {
          suggestedCategoryId = await classifyTransactionWithAI(tx.description, tx.value, categories) || existingDescriptionsMap.get(tx.description.toLowerCase()) || null;
        }
      }

      processed.push({
        ...tx,
        id: Math.random().toString(36).substring(2, 11),
        date: formattedDate,
        value,
        type: value >= 0 ? 'receita' : 'despesa',
        suggestedCategoryId,
        suggestedCategoryName: categories.find(c => c.cat_id === suggestedCategoryId)?.cat_nome || null,
        status,
        ignore: status === 'duplicate',
        isTransferCandidate,
        selectedLinkedAccountId: null,
        periodo,
      });
    }
    setProcessedTransactions(processed);
    setUploadStep('preview');
  }, [existingLancamentos, categories, useAiClassification, systemCategories.transferenciaId, classifyTransactionWithAI, selectedAccountId]);

  const handleProcessFile = async () => {
    if (!selectedFile || !selectedAccountId) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        let parsed: ParsedTransaction[] = [];
        if (selectedFile.name.endsWith('.csv')) {
          Papa.parse(text, {
            complete: async (results) => {
              parsed = results.data.map((row: any, i: number) => ({
                id: `temp-${i}`,
                date: String(row[0]),
                description: String(row[1]),
                value: cleanAndParseFloat(row[2]),
                originalRow: row,
              })).filter((r: any) => r.date && r.description);
              await processTransactions(parsed);
              setLoading(false);
            }
          });
        } else if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(text, { type: 'string' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const dataRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          parsed = dataRows.slice(1).map((row: any, i: number) => ({
            id: `temp-${i}`,
            date: String(row[0]),
            description: String(row[1]),
            value: cleanAndParseFloat(row[2]),
            originalRow: row,
          })).filter((r: any) => r.date && r.description);
          await processTransactions(parsed);
          setLoading(false);
        }
      };
      reader.readAsText(selectedFile);
    } catch (error) {
      setLoading(false);
      showError('Erro ao processar arquivo.');
    }
  };

  const handleConfirmImport = async () => {
    if (!grupoId || !selectedAccountId) return;
    setIsImporting(true);
    const toProcess = processedTransactions.filter(tx => !tx.ignore);
    
    try {
      for (const tx of toProcess) {
        if (tx.suggestedCategoryId === systemCategories.transferenciaId && tx.selectedLinkedAccountId) {
          const sourceId = tx.value < 0 ? selectedAccountId : tx.selectedLinkedAccountId;
          const destId = tx.value < 0 ? tx.selectedLinkedAccountId : selectedAccountId;
          const val = Math.abs(tx.value);
          const sName = accounts.find(a => a.con_id === sourceId)?.con_nome;
          const dName = accounts.find(a => a.con_id === destId)?.con_nome;

          const { data: lO } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_periodo: tx.periodo, lan_descricao: `Transferência para ${dName}`, lan_valor: -val, lan_categoria: systemCategories.transferenciaId, lan_conta: sourceId, lan_conciliado: false, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: lD } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_periodo: tx.periodo, lan_descricao: `Transferência de ${sName}`, lan_valor: val, lan_categoria: systemCategories.transferenciaId, lan_conta: destId, lan_conciliado: false, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: nT } = await supabase.from('transferencias').insert({ tra_grupo: grupoId, tra_data: tx.date, tra_descricao: tx.description, tra_valor: val, tra_conta_origem: sourceId, tra_conta_destino: destId, tra_lancamento_origem: lO.lan_id, tra_lancamento_destino: lD.lan_id, tra_conciliado: false }).select().single();
          await supabase.from('lancamentos').update({ lan_transferencia: nT.tra_id }).in('lan_id', [lO.lan_id, lD.lan_id]);
        } else {
          await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_periodo: tx.periodo, lan_descricao: tx.description, lan_valor: tx.value, lan_categoria: tx.suggestedCategoryId, lan_conta: selectedAccountId, lan_grupo: grupoId, lan_conciliado: false, lan_importado: true });
        }
      }
      showSuccess('Importação concluída!');
      clearPersistedState();
      navigate('/lancamentos', { state: { refresh: true } });
    } catch (error) {
      showError('Erro na importação.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setProcessedTransactions([]);
    setUploadStep('upload');
    clearPersistedState();
  };

  const uniqueCategories = useMemo(() => {
    return categories.reduce((acc: Category[], current) => {
      const idx = acc.findIndex(item => item.cat_nome.toLowerCase() === current.cat_nome.toLowerCase());
      if (idx === -1) return acc.concat([current]);
      if (current.cat_tipo === 'sistema' && acc[idx].cat_tipo !== 'sistema') {
        const next = [...acc];
        next[idx] = current;
        return next;
      }
      return acc;
    }, []);
  }, [categories]);

  const summary = useMemo(() => ({
    toImport: processedTransactions.filter(tx => !tx.ignore).length,
    duplicates: processedTransactions.filter(tx => tx.status === 'duplicate').length,
    ignored: processedTransactions.filter(tx => tx.ignore).length,
    balance: processedTransactions.filter(tx => !tx.ignore).reduce((s, tx) => s + tx.value, 0)
  }), [processedTransactions]);

  const selectContentStyles = "bg-white dark:bg-[#1e1629] border border-border-light dark:border-[#3a3045] shadow-lg rounded-xl z-[100]";

  const selectedAccountName = useMemo(() => {
    return accounts.find(acc => acc.con_id === selectedAccountId)?.con_nome;
  }, [accounts, selectedAccountId]);

  if (loading && uploadStep === 'upload') {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-text-secondary-light text-sm mb-1">
          <a className="hover:text-primary-new" href="#">Financeiro</a>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-main-light font-medium">Importação</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-main-light">
          Importação de Extratos {selectedAccountName && <span className="text-primary-new">({selectedAccountName})</span>}
        </h1>
        <p className="text-text-secondary-light text-lg">Sincronize seus arquivos OFX, CSV ou XLS automaticamente.</p>
      </div>

      <Card className="bg-card-light rounded-2xl shadow-soft border border-border-light overflow-hidden">
        <div className="flex border-b border-border-light bg-background-light/50">
          <div className={cn("flex-1 p-4 flex items-center justify-center gap-2 border-b-2 font-bold text-sm", uploadStep === 'upload' ? "border-primary-new text-primary-new" : "border-transparent text-text-secondary-light")}>
            <span className={cn("size-6 rounded-full flex items-center justify-center text-xs", uploadStep === 'upload' ? "bg-primary-new text-white" : "bg-border-light text-text-secondary-light")}>1</span> Upload
          </div>
          <div className={cn("flex-1 p-4 flex items-center justify-center gap-2 border-b-2 font-bold text-sm", uploadStep === 'preview' ? "border-primary-new text-primary-new" : "border-transparent text-text-secondary-light")}>
            <span className={cn("size-6 rounded-full flex items-center justify-center text-xs", uploadStep === 'preview' ? "bg-primary-new text-white" : "bg-border-light text-text-secondary-light")}>2</span> Confirmação
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-8">
          {uploadStep === 'upload' ? (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="block">
                  <span className="text-text-main-light text-sm font-bold mb-2 block">Conta de Destino</span>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full rounded-xl border-border-light bg-card-light h-12 text-sm">
                      <SelectValue placeholder="Selecione uma conta..." />
                    </SelectTrigger>
                    <SelectContent className={selectContentStyles}>
                      {accounts.map(acc => <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Label>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3">
                  <Info className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-bold mb-1">Atenção ao formato</p>
                    <p>CSV padrão: Coluna 1 (Data), Coluna 2 (Descrição), Coluna 3 (Valor).</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-text-main-light text-sm font-bold mb-2 block">Arquivo do Extrato</span>
                <Label htmlFor="file-upload" className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-light bg-background-light/50 hover:bg-primary-new/5 hover:border-primary-new transition-all cursor-pointer group min-h-[180px]">
                  <div className="flex flex-col items-center p-4 text-center">
                    <CloudUpload className="text-primary-new mb-4" size={32} />
                    <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
                    <p className="text-xs text-text-secondary-light">OFX, CSV ou XLS (max. 10MB)</p>
                  </div>
                  <Input id="file-upload" type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setSelectedFile(f); setLastSelectedFileName(f.name); }
                  }} />
                </Label>
                {selectedFile && <div className="mt-2 text-xs flex items-center justify-between"><span>{selectedFile.name}</span><Button variant="ghost" size="icon" onClick={handleRemoveFile}><XCircle className="w-4 h-4 text-red-500" /></Button></div>}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-primary-new/5 rounded-xl border border-primary-new/10">
                <div className="flex items-center gap-3">
                  <Lightbulb className="text-primary-new" />
                  <div>
                    <p className="text-sm font-bold">Classificação Inteligente</p>
                    <p className="text-xs text-text-secondary-light">Categorização baseada no seu histórico.</p>
                  </div>
                </div>
                <Switch checked={useAiClassification} onCheckedChange={setUseAiClassification} />
              </div>

              <div className="overflow-x-auto rounded-xl border border-border-light">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background-light">
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[200px]">Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedTransactions.map((tx) => (
                      <TableRow key={tx.id} className={cn(tx.ignore && "opacity-50", tx.status === 'duplicate' && "bg-orange-50")}>
                        <TableCell className="text-xs font-medium">{format(parseDateString(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Select value={tx.suggestedCategoryId || ''} onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, suggestedCategoryId: val } : t))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                              <SelectContent className={selectContentStyles}>{uniqueCategories.map(c => <SelectItem key={c.cat_id} value={c.cat_id}>{c.cat_nome}</SelectItem>)}</SelectContent>
                            </Select>
                            {tx.suggestedCategoryId === systemCategories.transferenciaId && (
                              <Select value={tx.selectedLinkedAccountId || ''} onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, selectedLinkedAccountId: val } : t))}>
                                <SelectTrigger className="h-8 text-xs bg-emerald-50 border-emerald-100 text-emerald-700 font-bold"><SelectValue placeholder="Conta Vinculada" /></SelectTrigger>
                                <SelectContent className={selectContentStyles}>{accounts.filter(a => a.con_id !== selectedAccountId).map(a => <SelectItem key={a.con_id} value={a.con_id}>{a.con_nome}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold text-sm", tx.value >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(tx.value)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, ignore: !t.ignore } : t))}>
                            {tx.ignore ? <XCircle className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-emerald-500" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4"><p className="text-[10px] font-bold uppercase text-text-secondary-light">Importar</p><p className="text-xl font-bold text-emerald-600">{summary.toImport}</p></Card>
                <Card className="p-4"><p className="text-[10px] font-bold uppercase text-text-secondary-light">Duplicados</p><p className="text-xl font-bold text-orange-600">{summary.duplicates}</p></Card>
                <Card className="p-4"><p className="text-[10px] font-bold uppercase text-text-secondary-light">Ignorados</p><p className="text-xl font-bold text-gray-400">{summary.ignored}</p></Card>
                <Card className="p-4"><p className="text-[10px] font-bold uppercase text-text-secondary-light">Saldo Previsto</p><p className="text-xl font-bold text-primary-new">{formatCurrency(summary.balance)}</p></Card>
              </div>
            </div>
          )}
        </CardContent>

        <div className="px-6 py-4 bg-background-light/50 border-t border-border-light flex justify-end gap-3">
          <Button variant="outline" onClick={handleRemoveFile}>Cancelar</Button>
          {uploadStep === 'upload' ? (
            <Button onClick={handleProcessFile} disabled={!selectedFile || !selectedAccountId || loading} className="bg-primary-new text-white font-bold">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <ArrowDown className="mr-2 rotate-180" />} Pré-visualizar
            </Button>
          ) : (
            <Button onClick={handleConfirmImport} disabled={isImporting || summary.toImport === 0} className="bg-primary-new text-white font-bold">
              {isImporting ? <Loader2 className="animate-spin mr-2" /> : null} Importar {summary.toImport} Lançamentos
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ImportacaoExtratos;