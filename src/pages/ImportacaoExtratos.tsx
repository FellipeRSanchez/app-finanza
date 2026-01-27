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

interface Account {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_banco: string | null;
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
}

const LOCAL_STORAGE_KEYS = {
  selectedAccountId: 'import_selected_account_id',
  processedTransactions: 'import_processed_transactions',
  uploadStep: 'import_upload_step',
  useAiClassification: 'import_use_ai_classification',
};

const ImportacaoExtratos = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview'>('upload');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingLancamentos, setExistingLancamentos] = useState<any[]>([]);
  const [grupoId, setGrupoId] = useState('');

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [processedTransactions, setProcessedTransactions] = useState<ProcessedTransaction[]>([]);
  const [useAiClassification, setUseAiClassification] = useState(true);
  const [systemCategories, setSystemCategories] = useState({ transferenciaId: null as string | null });

  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  useEffect(() => {
    try {
      const savedAccountId = localStorage.getItem(LOCAL_STORAGE_KEYS.selectedAccountId);
      const savedTransactions = localStorage.getItem(LOCAL_STORAGE_KEYS.processedTransactions);
      const savedStep = localStorage.getItem(LOCAL_STORAGE_KEYS.uploadStep);
      const savedAi = localStorage.getItem(LOCAL_STORAGE_KEYS.useAiClassification);

      if (savedAccountId) setSelectedAccountId(savedAccountId);
      if (savedTransactions) setProcessedTransactions(JSON.parse(savedTransactions));
      if (savedStep) setUploadStep(savedStep as 'upload' | 'preview');
      if (savedAi) setUseAiClassification(savedAi === 'true');
    } catch (error) {
      console.error('Storage error:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId) localStorage.setItem(LOCAL_STORAGE_KEYS.selectedAccountId, selectedAccountId);
    if (processedTransactions.length > 0) localStorage.setItem(LOCAL_STORAGE_KEYS.processedTransactions, JSON.stringify(processedTransactions));
    localStorage.setItem(LOCAL_STORAGE_KEYS.uploadStep, uploadStep);
    localStorage.setItem(LOCAL_STORAGE_KEYS.useAiClassification, String(useAiClassification));
  }, [selectedAccountId, processedTransactions, uploadStep, useAiClassification]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.from('usuarios').select('usu_grupo').eq('usu_id', user?.id).single();
        if (!userData?.usu_grupo) return;
        setGrupoId(userData.usu_grupo);

        const [accountsRes, categoriesRes, lancamentosRes] = await Promise.all([
          supabase.from('contas').select('con_id, con_nome, con_tipo, con_banco').eq('con_grupo', userData.usu_grupo),
          supabase.from('categorias').select('cat_id, cat_nome, cat_tipo').eq('cat_grupo', userData.usu_grupo),
          supabase.from('lancamentos').select('lan_data, lan_valor, lan_conta').eq('lan_grupo', userData.usu_grupo),
        ]);

        setAccounts(accountsRes.data || []);
        setCategories(categoriesRes.data || []);
        setExistingLancamentos(lancamentosRes.data || []);

        const transferenciaCat = categoriesRes.data?.find((cat: any) => 
          cat.cat_nome.toLowerCase().includes('transferência') && cat.cat_tipo === 'sistema'
        );
        setSystemCategories({ transferenciaId: transferenciaCat?.cat_id || null });

        if (!selectedAccountId && accountsRes.data?.[0]) setSelectedAccountId(accountsRes.data[0].con_id);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchInitialData();
  }, [user]);

  const cleanAndParseFloat = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const clean = dateStr.trim();
    if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return parseISO(clean);
    if (clean.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = clean.split('/').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const processTransactions = useCallback(async (parsed: ParsedTransaction[]) => {
    const processed: ProcessedTransaction[] = [];
    const existingTransactionsSet = new Set<string>();

    // Criar chave de duplicados baseada APENAS em DATA e VALOR (em centavos) para a conta selecionada
    existingLancamentos.forEach(lan => {
      if (lan.lan_conta === selectedAccountId) {
        const dateKey = format(parseISO(lan.lan_data), 'yyyy-MM-dd');
        const valueCents = Math.round(Number(lan.lan_valor) * 100);
        existingTransactionsSet.add(`${dateKey}|${valueCents}`);
      }
    });

    for (const tx of parsed) {
      const val = Number(tx.value);
      const dateKey = format(parseDateString(tx.date), 'yyyy-MM-dd');
      const valueCents = Math.round(val * 100);
      
      const isDuplicate = existingTransactionsSet.has(`${dateKey}|${valueCents}`);
      
      processed.push({
        ...tx,
        id: Math.random().toString(36).substring(7),
        date: dateKey,
        value: val,
        type: val >= 0 ? 'receita' : 'despesa',
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        status: isDuplicate ? 'duplicate' : 'new',
        ignore: isDuplicate,
        isTransferCandidate: false,
        selectedLinkedAccountId: null,
      });
    }
    setProcessedTransactions(processed);
    setUploadStep('preview');
  }, [existingLancamentos, selectedAccountId]);

  const handleProcessFile = async () => {
    if (!selectedFile || !selectedAccountId) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      let parsed: ParsedTransaction[] = [];
      if (selectedFile.name.endsWith('.csv')) {
        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: async (results) => {
            parsed = results.data.map((row: any, i: number) => ({
              id: `t-${i}`,
              date: String(row[0] || ''),
              description: String(row[1] || ''),
              value: cleanAndParseFloat(row[2]),
              originalRow: row,
            })).filter((r: any) => r.date && r.description && r.date.length > 5);
            await processTransactions(parsed);
            setLoading(false);
          }
        });
      } else {
        try {
          const wb = XLSX.read(text, { type: 'string' });
          const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
          parsed = data.slice(1).map((row: any, i: number) => ({
            id: `t-${i}`,
            date: String(row[0] || ''),
            description: String(row[1] || ''),
            value: cleanAndParseFloat(row[2]),
            originalRow: row,
          })).filter((r: any) => r.date && r.description);
          await processTransactions(parsed);
        } catch { showError('Erro ao ler Excel.'); }
        setLoading(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmImport = async () => {
    if (!grupoId || !selectedAccountId) return;
    setIsImporting(true);
    const toProcess = processedTransactions.filter(tx => !tx.ignore);
    try {
      for (const tx of toProcess) {
        await supabase.from('lancamentos').insert({ 
          lan_data: tx.date, 
          lan_descricao: tx.description, 
          lan_valor: tx.value, 
          lan_categoria: tx.suggestedCategoryId, 
          lan_conta: selectedAccountId, 
          lan_grupo: grupoId, 
          lan_conciliado: true, 
          lan_importado: true 
        });
      }
      showSuccess('Importação concluída!');
      localStorage.removeItem(LOCAL_STORAGE_KEYS.processedTransactions);
      navigate('/lancamentos', { state: { refresh: true } });
    } catch { showError('Erro na importação.'); } finally { setIsImporting(false); }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setProcessedTransactions([]);
    setUploadStep('upload');
    localStorage.removeItem(LOCAL_STORAGE_KEYS.processedTransactions);
  };

  const summary = useMemo(() => ({
    toImport: processedTransactions.filter(tx => !tx.ignore).length,
    duplicates: processedTransactions.filter(tx => tx.status === 'duplicate').length,
    ignored: processedTransactions.filter(tx => tx.ignore).length,
    balance: processedTransactions.filter(tx => !tx.ignore).reduce((s, tx) => s + tx.value, 0)
  }), [processedTransactions]);

  const selectContentStyles = "bg-white dark:bg-[#1e1629] border border-border-light dark:border-[#3a3045] shadow-lg rounded-xl z-[100]";

  if (loading && uploadStep === 'upload') return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-text-main-light">Importação de Extratos</h1>
        <p className="text-text-secondary-light text-lg">Validação simplificada por Data e Valor.</p>
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
                  <div className="text-sm text-yellow-800"><p className="font-bold mb-1">Aviso de Duplicados</p><p>O sistema agora detecta lançamentos que tenham a <b>mesma data e o mesmo valor</b> nesta conta específica.</p></div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-text-main-light text-sm font-bold mb-2 block">Arquivo do Extrato</span>
                <Label htmlFor="file-upload" className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-light bg-background-light/50 hover:bg-primary-new/5 hover:border-primary-new transition-all cursor-pointer group min-h-[180px]">
                  <CloudUpload className="text-primary-new mb-4" size={32} />
                  <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
                  <Input id="file-upload" type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </Label>
                {selectedFile && <div className="mt-2 text-xs flex items-center justify-between"><span>{selectedFile.name}</span><Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}><XCircle className="w-4 h-4 text-red-500" /></Button></div>}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-xl border border-border-light">
                <Table>
                  <TableHeader><TableRow className="bg-background-light"><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Importar?</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {processedTransactions.map((tx) => (
                      <TableRow key={tx.id} className={cn(tx.ignore && "opacity-50", tx.status === 'duplicate' && "bg-orange-50/50")}>
                        <TableCell className="text-xs">{format(parseDateString(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm">
                          {tx.description}
                          {tx.status === 'duplicate' && <span className="block text-[9px] font-bold text-orange-600 uppercase mt-1">Já existe na conta</span>}
                        </TableCell>
                        <TableCell>
                          <Select value={tx.suggestedCategoryId || ''} onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, suggestedCategoryId: val } : t))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                            <SelectContent className={selectContentStyles}>{categories.filter(c => c.cat_tipo !== 'sistema').map(c => <SelectItem key={c.cat_id} value={c.cat_id}>{c.cat_nome}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold text-sm", tx.value >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(tx.value)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, ignore: !t.ignore } : t))}>
                            {tx.ignore ? <XCircle className="w-5 h-5 text-red-500" /> : <Check className="w-5 h-5 text-emerald-500" />}
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
            <Button onClick={handleProcessFile} disabled={!selectedFile || !selectedAccountId} className="bg-primary-new text-white font-bold">
              <ArrowDown className="mr-2 rotate-180" /> Pré-visualizar
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