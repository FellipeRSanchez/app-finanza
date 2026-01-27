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
  status: 'new' | 'duplicate' | 'potential_duplicate';
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

  // Helper to format currency
  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  const clearPersistedState = useCallback(() => {
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  // Load initial data
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
          supabase.from('contas').select('con_id, con_nome, con_tipo, con_banco').eq('con_grupo', userData.usu_grupo),
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
  }, [user]);

  const cleanAndParseFloat = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleanedValue = value.trim().replace(/\./g, '').replace(',', '.');
      return parseFloat(cleanedValue);
    }
    return 0;
  };

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const cleanDateStr = dateStr.trim();
    if (cleanDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return parseISO(cleanDateStr);
    if (cleanDateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = cleanDateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
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
    
    // 1. Mapear ocorrências de Data+Valor na conta de destino (para detecção de duplicados)
    // Usamos um Map de counts para lidar com múltiplos lançamentos de mesmo valor no mesmo dia
    const duplicateCounter = new Map<string, number>();
    
    existingLancamentos.forEach(lan => {
      if (lan.lan_conta === selectedAccountId) {
        const dateKey = format(parseISO(lan.lan_data), 'yyyy-MM-dd');
        const valKey = Number(lan.lan_valor).toFixed(2);
        const key = `${dateKey}|${valKey}`;
        duplicateCounter.set(key, (duplicateCounter.get(key) || 0) + 1);
      }
    });

    // 2. Mapear categorias por descrição (histórico)
    const historyMap = new Map<string, string>();
    existingLancamentos.forEach(lan => {
      if (lan.lan_descricao) historyMap.set(lan.lan_descricao.toLowerCase().trim(), lan.lan_categoria);
    });

    for (const tx of parsed) {
      const value = Number(tx.value);
      const formattedDate = format(parseDateString(tx.date), 'yyyy-MM-dd');
      const valKey = value.toFixed(2);
      const key = `${formattedDate}|${valKey}`;
      
      // Checar se "ainda existe" uma ocorrência disponível no contador de duplicados
      const availableDuplicates = duplicateCounter.get(key) || 0;
      let status: 'new' | 'duplicate' | 'potential_duplicate' = 'new';
      
      if (availableDuplicates > 0) {
        status = 'duplicate';
        duplicateCounter.set(key, availableDuplicates - 1); // Consumir a duplicata
      }
      
      let suggestedCategoryId: string | null = null;
      const isTransferCandidate = ['transferencia', 'ted', 'pix', 'doc', 'transferência'].some(k => tx.description.toLowerCase().includes(k));

      if (useAiClassification && status === 'new') {
        suggestedCategoryId = await classifyTransactionWithAI(tx.description, tx.value, categories) || historyMap.get(tx.description.toLowerCase().trim()) || null;
      } else {
        suggestedCategoryId = historyMap.get(tx.description.toLowerCase().trim()) || null;
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
      });
    }
    setProcessedTransactions(processed);
    setUploadStep('preview');
  }, [existingLancamentos, categories, useAiClassification, classifyTransactionWithAI, selectedAccountId]);

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
            skipEmptyLines: true,
            complete: async (results) => {
              parsed = results.data
                .map((row: any, i: number) => ({
                  id: `temp-${i}`,
                  date: String(row[0] || ''),
                  description: String(row[1] || ''),
                  value: cleanAndParseFloat(row[2]),
                  originalRow: row,
                }))
                .filter((r: any) => r.date && r.description && !isNaN(r.value));
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
            date: String(row[0] || ''),
            description: String(row[1] || ''),
            value: cleanAndParseFloat(row[2]),
            originalRow: row,
          })).filter((r: any) => r.date && r.description && !isNaN(r.value));
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

          const { data: lO } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: `Transferência para ${dName}`, lan_valor: -val, lan_categoria: systemCategories.transferenciaId, lan_conta: sourceId, lan_conciliado: true, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: lD } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: `Transferência de ${sName}`, lan_valor: val, lan_categoria: systemCategories.transferenciaId, lan_conta: destId, lan_conciliado: true, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: nT } = await supabase.from('transferencias').insert({ tra_grupo: grupoId, tra_data: tx.date, tra_descricao: tx.description, tra_valor: val, tra_conta_origem: sourceId, tra_conta_destino: destId, tra_lancamento_origem: lO.lan_id, tra_lancamento_destino: lD.lan_id, tra_conciliado: true }).select().single();
          await supabase.from('lancamentos').update({ lan_transferencia: nT.tra_id }).in('lan_id', [lO.lan_id, lD.lan_id]);
        } else {
          await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: tx.description, lan_valor: tx.value, lan_categoria: tx.suggestedCategoryId, lan_conta: selectedAccountId, lan_grupo: grupoId, lan_conciliado: true, lan_importado: true });
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
  };

  const uniqueCategories = useMemo(() => {
    return categories.reduce((acc: Category[], current) => {
      const idx = acc.findIndex(item => item.cat_nome.toLowerCase() === current.cat_nome.toLowerCase());
      if (idx === -1) return acc.concat([current]);
      return acc;
    }, []);
  }, [categories]);

  const summary = useMemo(() => ({
    toImport: processedTransactions.filter(tx => !tx.ignore).length,
    duplicates: processedTransactions.filter(tx => tx.status === 'duplicate').length,
    totalParsed: processedTransactions.length,
    balance: processedTransactions.filter(tx => !tx.ignore).reduce((s, tx) => s + tx.value, 0)
  }), [processedTransactions]);

  const selectContentStyles = "bg-white dark:bg-[#1e1629] border border-border-light dark:border-[#3a3045] shadow-lg rounded-xl z-[100]";

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
        <h1 className="text-3xl font-black tracking-tight text-text-main-light">Importação de Extratos</h1>
        <p className="text-text-secondary-light text-lg">Compare e concilie seus lançamentos bancários.</p>
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
                    <p className="font-bold mb-1">Dica de Duplicados</p>
                    <p>Lançamentos com mesma data e valor na conta selecionada serão marcados como duplicados automaticamente.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-text-main-light text-sm font-bold mb-2 block">Arquivo do Extrato</span>
                <Label htmlFor="file-upload" className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-light bg-background-light/50 hover:bg-primary-new/5 hover:border-primary-new transition-all cursor-pointer group min-h-[180px]">
                  <div className="flex flex-col items-center p-4 text-center">
                    <CloudUpload className="text-primary-new mb-4" size={32} />
                    <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
                    <p className="text-xs text-text-secondary-light">CSV ou XLS (max. 10MB)</p>
                  </div>
                  <Input id="file-upload" type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
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
                    <p className="text-xs text-text-secondary-light">Categorização baseada no seu histórico e IA.</p>
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
                      <TableRow key={tx.id} className={cn(tx.ignore && "bg-gray-50/50 opacity-60", tx.status === 'duplicate' && "bg-orange-50/30")}>
                        <TableCell className="text-xs font-medium">{format(parseDateString(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span>{tx.description}</span>
                            {tx.status === 'duplicate' && <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Possível duplicata encontrada no sistema</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Select value={tx.suggestedCategoryId || ''} onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, suggestedCategoryId: val } : t))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                              <SelectContent className={selectContentStyles}>{uniqueCategories.map(c => <SelectItem key={c.cat_id} value={c.cat_id}>{c.cat_nome}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold text-sm", tx.value >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(tx.value)}</TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, ignore: !t.ignore } : t))}
                            className={cn("rounded-lg font-bold text-[10px] uppercase", tx.ignore ? "text-red-500 bg-red-50" : "text-emerald-600 bg-emerald-50")}
                          >
                            {tx.ignore ? "Ignorar" : "Importar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center justify-between">
                  <div><p className="text-[10px] font-bold uppercase text-text-secondary-light">Lançamentos Novos</p><p className="text-xl font-bold text-emerald-600">{summary.toImport}</p></div>
                  <Check className="text-emerald-500 opacity-20" size={32} />
                </Card>
                <Card className="p-4 flex items-center justify-between">
                  <div><p className="text-[10px] font-bold uppercase text-text-secondary-light">Duplicados Ocultos</p><p className="text-xl font-bold text-orange-600">{summary.duplicates}</p></div>
                  <AlertTriangle className="text-orange-500 opacity-20" size={32} />
                </Card>
                <Card className="p-4 flex items-center justify-between">
                  <div><p className="text-[10px] font-bold uppercase text-text-secondary-light">Saldo do Período</p><p className="text-xl font-bold text-primary-new">{formatCurrency(summary.balance)}</p></div>
                  <ArrowDown className="text-primary-new opacity-20" size={32} />
                </Card>
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
              {isImporting ? <Loader2 className="animate-spin mr-2" /> : null} Confirmar Importação ({summary.toImport})
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ImportacaoExtratos;