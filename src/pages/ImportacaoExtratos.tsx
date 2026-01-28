"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, Check, Info, CloudUpload, ChevronRight, XCircle, Loader2, Lightbulb, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import Papa from 'papaparse'; 
import * as XLSX from 'xlsx'; 
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interfaces for data
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
  status: 'new' | 'duplicate';
  duplicateReason?: string;
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

  // Load state from localStorage on mount
  useEffect(() => {
    const savedAccountId = localStorage.getItem(LOCAL_STORAGE_KEYS.selectedAccountId);
    const savedTransactions = localStorage.getItem(LOCAL_STORAGE_KEYS.processedTransactions);
    const savedStep = localStorage.getItem(LOCAL_STORAGE_KEYS.uploadStep);
    
    if (savedAccountId) setSelectedAccountId(savedAccountId);
    if (savedTransactions) setProcessedTransactions(JSON.parse(savedTransactions));
    if (savedStep) setUploadStep(savedStep as 'upload' | 'preview');
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (selectedAccountId) localStorage.setItem(LOCAL_STORAGE_KEYS.selectedAccountId, selectedAccountId);
    if (processedTransactions.length > 0) localStorage.setItem(LOCAL_STORAGE_KEYS.processedTransactions, JSON.stringify(processedTransactions));
    localStorage.setItem(LOCAL_STORAGE_KEYS.uploadStep, uploadStep);
  }, [selectedAccountId, processedTransactions, uploadStep]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.from('usuarios').select('usu_grupo').eq('usu_id', user?.id).single();
        if (!userData?.usu_grupo) return;
        setGrupoId(userData.usu_grupo);

        const [accountsRes, categoriesRes, lancamentosRes] = await Promise.all([
          supabase.from('contas').select('*').eq('con_grupo', userData.usu_grupo),
          supabase.from('categorias').select('*').eq('cat_grupo', userData.usu_grupo),
          supabase.from('lancamentos').select('*').eq('lan_grupo', userData.usu_grupo).order('lan_data', { ascending: false }).limit(200),
        ]);

        setAccounts(accountsRes.data || []);
        setCategories(categoriesRes.data || []);
        setExistingLancamentos(lancamentosRes.data || []);

        const transferenciaCat = categoriesRes.data?.find((cat: any) => 
          cat.cat_nome.toLowerCase().includes('transferência') && cat.cat_tipo === 'sistema'
        );
        setSystemCategories({ transferenciaId: transferenciaCat?.cat_id || null });

        if (!selectedAccountId && accountsRes.data && accountsRes.data.length > 0) {
          setSelectedAccountId(accountsRes.data[0].con_id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchInitialData();
  }, [user, selectedAccountId]);

  const analyzeTransactionWithAI = useCallback(async (tx: ParsedTransaction, availableCategories: Category[], recentTransactions: any[]): Promise<any> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return null;

      const response = await fetch('https://wvhpwclgevtdzrfqtvvg.supabase.co/functions/v1/classify-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          description: tx.description, 
          value: tx.value, 
          date: tx.date,
          categories: availableCategories, 
          type: tx.value >= 0 ? 'receita' : 'despesa',
          recentTransactions: recentTransactions.map(r => ({
            lan_data: format(parseISO(r.lan_data), 'dd/MM/yyyy'),
            lan_descricao: r.lan_descricao,
            lan_valor: r.lan_valor
          }))
        }),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }, []);

  const processTransactions = useCallback(async (parsed: ParsedTransaction[]) => {
    const processed: ProcessedTransaction[] = [];
    
    // Filtramos os lançamentos existentes apenas da conta selecionada para a análise
    const accountRecentTransactions = existingLancamentos.filter(lan => lan.lan_conta === selectedAccountId);

    for (const tx of parsed) {
      const value = Number(tx.value);
      const formattedDate = format(parseDateString(tx.date), 'yyyy-MM-dd');
      
      let aiResult = null;
      if (useAiClassification) {
        aiResult = await analyzeTransactionWithAI({ ...tx, date: formattedDate, value }, categories, accountRecentTransactions);
      }

      const isDuplicate = aiResult?.isPossibleDuplicate || false;

      processed.push({
        ...tx,
        id: Math.random().toString(36).substring(2, 11),
        date: formattedDate,
        value,
        type: value >= 0 ? 'receita' : 'despesa',
        suggestedCategoryId: aiResult?.suggestedCategoryId || null,
        suggestedCategoryName: categories.find(c => c.cat_id === aiResult?.suggestedCategoryId)?.cat_nome || null,
        status: isDuplicate ? 'duplicate' : 'new',
        duplicateReason: aiResult?.reason,
        ignore: isDuplicate,
        isTransferCandidate: ['transferencia', 'ted', 'pix', 'doc'].some(k => tx.description.toLowerCase().includes(k)),
        selectedLinkedAccountId: null,
      });
    }
    setProcessedTransactions(processed);
    setUploadStep('preview');
  }, [existingLancamentos, categories, useAiClassification, selectedAccountId, analyzeTransactionWithAI]);

  const parseDateString = (dateStr: string): Date => {
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return parseISO(dateStr);
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const handleProcessFile = async () => {
    if (!selectedFile || !selectedAccountId) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (selectedFile.name.endsWith('.csv')) {
        Papa.parse(text, {
          complete: async (results) => {
            const parsed = results.data.map((row: any, i: number) => ({
              id: `temp-${i}`,
              date: String(row[0]),
              description: String(row[1]),
              value: typeof row[2] === 'string' ? parseFloat(row[2].replace(/\./g, '').replace(',', '.')) : parseFloat(row[2]),
              originalRow: row,
            })).filter((r: any) => r.date && r.description && !isNaN(r.value));
            await processTransactions(parsed);
            setLoading(false);
          }
        });
      } else {
        const workbook = XLSX.read(text, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const dataRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const parsed = dataRows.slice(1).map((row: any, i: number) => ({
          id: `temp-${i}`,
          date: String(row[0]),
          description: String(row[1]),
          value: typeof row[2] === 'string' ? parseFloat(row[2].replace(/\./g, '').replace(',', '.')) : parseFloat(row[2]),
          originalRow: row,
        })).filter((r: any) => r.date && r.description && !isNaN(r.value));
        await processTransactions(parsed);
        setLoading(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmImport = async () => {
    if (!grupoId || !selectedAccountId) return;
    setIsImporting(true);
    try {
      const toProcess = processedTransactions.filter(tx => !tx.ignore);
      for (const tx of toProcess) {
        if (tx.suggestedCategoryId === systemCategories.transferenciaId && tx.selectedLinkedAccountId) {
          const sourceId = tx.value < 0 ? selectedAccountId : tx.selectedLinkedAccountId;
          const destId = tx.value < 0 ? tx.selectedLinkedAccountId : selectedAccountId;
          const val = Math.abs(tx.value);
          const sName = accounts.find(a => a.con_id === sourceId)?.con_nome;
          const dName = accounts.find(a => a.con_id === destId)?.con_nome;

          const { data: lO } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: `Transferência para ${dName}`, lan_valor: -val, lan_categoria: systemCategories.transferenciaId, lan_conta: sourceId, lan_conciliado: true, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: lD } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: `Transferência de ${sName}`, lan_valor: val, lan_categoria: systemCategories.transferenciaId, lan_conta: destId, lan_conciliado: true, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: nT } = await supabase.from('transferencias').insert({ tra_grupo: grupoId, tra_data: tx.date, tra_descricao: tx.description, tra_valor: val, tra_conta_origem: sourceId, tra_conta_destino: destId, tra_lancamento_origem: lO.lan_id, tra_lancamento_destino: lD.lan_id, tra_conciliado: true }).select().single();
          await supabase.from('lancamentos').update({ lan_transferencia: nT.tra_id }).in('lan_id', [lO.lan_id, lD.lan_id]);
        } else {
          await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: tx.description, lan_valor: tx.value, lan_categoria: tx.suggestedCategoryId, lan_conta: selectedAccountId, lan_grupo: grupoId, lan_conciliado: true, lan_importado: true });
        }
      }
      showSuccess('Importação concluída!');
      localStorage.removeItem(LOCAL_STORAGE_KEYS.processedTransactions);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.uploadStep);
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
    localStorage.removeItem(LOCAL_STORAGE_KEYS.processedTransactions);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.uploadStep);
  };

  const selectContentStyles = "bg-white dark:bg-[#1e1629] border border-border-light dark:border-[#3a3045] shadow-lg rounded-xl z-[100]";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-text-secondary-light text-sm mb-1">
          <a className="hover:text-primary-new" href="#">Financeiro</a>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-main-light font-medium">Importação</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-main-light">Importação de Extratos</h1>
        <p className="text-text-secondary-light text-lg">IA detecta duplicados e sugere categorias automaticamente.</p>
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
                <div className="p-4 bg-primary-new/5 border border-primary-new/10 rounded-xl flex gap-3">
                  <Lightbulb className="text-primary-new shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-text-main-light">
                    <p className="font-bold mb-1">Dica de IA</p>
                    <p>Ative a classificação inteligente para que o sistema identifique se o lançamento já foi importado anteriormente.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-text-main-light text-sm font-bold mb-2 block">Arquivo do Extrato</span>
                <Label htmlFor="file-upload" className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-light bg-background-light/50 hover:bg-primary-new/5 hover:border-primary-new transition-all cursor-pointer group min-h-[180px]">
                  <div className="flex flex-col items-center p-4 text-center">
                    <CloudUpload className="text-primary-new mb-4" size={32} />
                    <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
                    <p className="text-xs text-text-secondary-light">CSV ou XLS (Data, Descrição, Valor)</p>
                  </div>
                  <Input id="file-upload" type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
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
                    <p className="text-sm font-bold">Classificação Inteligente Ativa</p>
                    <p className="text-xs text-text-secondary-light">IA analisando categorias e duplicados.</p>
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
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedTransactions.map((tx) => (
                      <TableRow key={tx.id} className={cn(tx.ignore && "bg-orange-50/50 opacity-80")}>
                        <TableCell className="text-xs font-medium">{format(parseDateString(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Select value={tx.suggestedCategoryId || ''} onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, suggestedCategoryId: val } : t))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                              <SelectContent className={selectContentStyles}>{categories.map(c => <SelectItem key={c.cat_id} value={c.cat_id}>{c.cat_nome}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold text-sm", tx.value >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(tx.value)}</TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, ignore: !t.ignore } : t))}>
                                  {tx.status === 'duplicate' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : tx.ignore ? <XCircle className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-emerald-500" />}
                                </Button>
                              </TooltipTrigger>
                              {tx.status === 'duplicate' && <TooltipContent><p>{tx.duplicateReason || "Provável duplicado detectado pela IA."}</p></TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>

        <div className="px-6 py-4 bg-background-light/50 border-t border-border-light flex justify-end gap-3">
          <Button variant="outline" onClick={handleRemoveFile}>Cancelar</Button>
          {uploadStep === 'upload' ? (
            <Button onClick={handleProcessFile} disabled={!selectedFile || !selectedAccountId || loading} className="bg-primary-new text-white font-bold">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <ArrowDown className="mr-2 rotate-180" />} Analisar e Importar
            </Button>
          ) : (
            <Button onClick={handleConfirmImport} disabled={isImporting || processedTransactions.filter(t => !t.ignore).length === 0} className="bg-primary-new text-white font-bold">
              {isImporting ? <Loader2 className="animate-spin mr-2" /> : null} Importar Selecionados
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ImportacaoExtratos;