"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, Check, Info, CloudUpload, ChevronRight, XCircle, Loader2, Lightbulb, ToggleLeft, ToggleRight, Repeat2 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import Papa from 'papaparse'; // For CSV parsing
import * as XLSX from 'xlsx'; // For XLSX parsing
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch'; 
import { cn } from '@/lib/utils'; // Importando a função 'cn' que faltava

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
  status: 'new' | 'duplicate' | 'ignored';
  ignore: boolean;
  selectedLinkedAccountId: string | null;
  isTransferCandidate: boolean;
}

const ImportacaoExtratos = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
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

  const totalValid = processedTransactions.filter(t => t.status === 'new' && !t.ignore).length;
  const totalIgnored = processedTransactions.filter(t => t.ignore).length;
  const totalDuplicates = processedTransactions.filter(t => t.status === 'duplicate').length;

  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('usu_grupo')
          .eq('usu_id', user?.id)
          .single();

        if (!userData?.usu_grupo) {
          showError('Grupo do usuário não encontrado.');
          setLoading(false);
          return;
        }
        setGrupoId(userData.usu_grupo);

        const [accountsRes, categoriesRes, lancamentosRes] = await Promise.all([
          supabase.from('contas').select('con_id, con_nome, con_tipo, con_banco').eq('con_grupo', userData.usu_grupo),
          supabase.from('categorias').select('cat_id, cat_nome, cat_tipo').eq('cat_grupo', userData.usu_grupo),
          supabase.from('lancamentos').select('lan_data, lan_descricao, lan_valor, lan_categoria').eq('lan_grupo', userData.usu_grupo),
        ]);

        setAccounts(accountsRes.data || []);
        setCategories(categoriesRes.data || []);
        setExistingLancamentos(lancamentosRes.data || []);

        const transferenciaCat = categoriesRes.data?.find((cat: any) => cat.cat_nome === 'Transferência entre Contas' && cat.cat_tipo === 'sistema');
        setSystemCategories({
          transferenciaId: transferenciaCat?.cat_id || null,
        });

        if (accountsRes.data && accountsRes.data.length > 0) {
          setSelectedAccountId(accountsRes.data[0].con_id);
        }

      } catch (error) {
        console.error('Error fetching initial data:', error);
        showError('Erro ao carregar dados iniciais.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const detectAccountFromFile = useCallback((fileName: string, availableAccounts: Account[]): string | undefined => {
    const lowerFileName = fileName.toLowerCase();
    for (const acc of availableAccounts) {
      const accNameLower = acc.con_nome.toLowerCase();
      const bankNameLower = acc.con_banco?.toLowerCase();
      if (lowerFileName.includes(accNameLower) || (bankNameLower && lowerFileName.includes(bankNameLower))) {
        return acc.con_id;
      }
    }
    return undefined;
  }, []);

  const cleanAndParseFloat = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleanedValue = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleanedValue);
    }
    return 0;
  };

  const parseFile = useCallback(async (file: File): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (file.name.endsWith('.csv')) {
          Papa.parse(text, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
              resolve(results.data.map((row: any, index: number) => ({
                id: `temp-${index}`,
                date: String(row[0]),
                description: String(row[1]),
                value: cleanAndParseFloat(row[2]),
                originalRow: row,
              })).filter((tx: any) => tx.date && tx.description));
            },
            error: (err) => reject(err),
          });
        } else if (file.name.endsWith('.ofx')) {
          const transactions: ParsedTransaction[] = [];
          const transactionRegex = /<STMTTRN>[\s\S]*?<TRNTYPE>(.*?)<\/TRNTYPE>[\s\S]*?<DTPOSTED>(.*?)<\/DTPOSTED>[\s\S]*?<TRNAMT>(.*?)<\/TRNAMT>[\s\S]*?<MEMO>(.*?)<\/MEMO>[\s\S]*?<\/STMTTRN>/g;
          let match;
          let index = 0;
          while ((match = transactionRegex.exec(text)) !== null) {
            transactions.push({
              id: `temp-${index++}`,
              date: match[2].substring(0, 8),
              description: match[4] || match[1],
              value: cleanAndParseFloat(match[3]),
              originalRow: match[0],
            });
          }
          resolve(transactions);
        } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(text, { type: 'string' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];
          const headers = parsedData[0] as string[];
          const dateCol = headers.findIndex(h => h.toLowerCase().includes('data'));
          const descCol = headers.findIndex(h => h.toLowerCase().includes('descri'));
          const valueCol = headers.findIndex(h => h.toLowerCase().includes('valor'));
          resolve(parsedData.slice(1).map((row, index) => ({
            id: `temp-${index}`,
            date: String(row[dateCol]),
            description: String(row[descCol]),
            value: cleanAndParseFloat(row[valueCol]),
            originalRow: row,
          })));
        } else {
          reject(new Error('Formato não suportado.'));
        }
      };
      reader.readAsText(file);
    });
  }, []);

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return parseISO(dateStr);
    if (dateStr.match(/^\d{8}$/)) return new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)) - 1, parseInt(dateStr.substring(6, 8)));
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dateStr.split('/').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const processTransactions = useCallback(async (parsed: ParsedTransaction[], accountId: string) => {
    const processed: ProcessedTransaction[] = [];
    const existingMap = new Map<string, string>();
    const existingSet = new Set<string>();

    existingLancamentos.forEach(lan => {
      existingSet.add(`${lan.lan_data}-${lan.lan_descricao}-${lan.lan_valor}`);
      if (lan.lan_descricao) existingMap.set(lan.lan_descricao.toLowerCase(), lan.lan_categoria);
    });

    for (const tx of parsed) {
      const value = Number(tx.value);
      const formattedDate = format(parseDateString(tx.date), 'yyyy-MM-dd');
      let status: 'new' | 'duplicate' | 'ignored' = 'new';
      let suggestedCategoryId: string | null = null;
      let suggestedCategoryName: string | null = null;

      const lowerDesc = tx.description.toLowerCase();
      const isTransferCandidate = ['transferencia', 'ted', 'pix', 'doc', 'transferência'].some(k => lowerDesc.includes(k));

      if (existingSet.has(`${formattedDate}-${tx.description}-${value}`)) status = 'duplicate';

      if (useAiClassification && status === 'new') {
        if (!isTransferCandidate) {
          const matched = existingMap.get(lowerDesc);
          if (matched) {
            suggestedCategoryId = matched;
            suggestedCategoryName = categories.find(c => c.cat_id === matched)?.cat_nome || null;
          }
        }
      }

      processed.push({
        ...tx,
        id: Math.random().toString(36).substring(2, 11),
        date: formattedDate,
        value,
        type: value >= 0 ? 'receita' : 'despesa',
        suggestedCategoryId,
        suggestedCategoryName,
        status,
        ignore: status === 'duplicate',
        selectedLinkedAccountId: null,
        isTransferCandidate,
      });
    }
    setProcessedTransactions(processed);
    setUploadStep('preview');
  }, [existingLancamentos, categories, useAiClassification]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const detected = detectAccountFromFile(file.name, accounts);
      if (detected) setSelectedAccountId(detected);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setProcessedTransactions([]);
    setUploadStep('upload');
  };

  const handleProcessFile = async () => {
    if (!selectedFile || !selectedAccountId) return;
    setLoading(true);
    try {
      const parsed = await parseFile(selectedFile);
      await processTransactions(parsed, selectedAccountId);
    } catch (e: any) {
      showError(e.message || 'Erro ao processar arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    const toProcess = processedTransactions.filter(tx => tx.status === 'new' && !t.ignore);
    try {
      for (const tx of toProcess) {
        if (tx.suggestedCategoryId === systemCategories.transferenciaId && tx.selectedLinkedAccountId) {
          const isOut = tx.value < 0;
          const src = isOut ? selectedAccountId : tx.selectedLinkedAccountId;
          const dst = isOut ? tx.selectedLinkedAccountId : selectedAccountId;
          const val = Math.abs(tx.value);
          const srcName = accounts.find(a => a.con_id === src)?.con_nome;
          const dstName = accounts.find(a => a.con_id === dst)?.con_nome;

          const { data: oLeg } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: `Transferência para ${dstName}`, lan_valor: -val, lan_categoria: systemCategories.transferenciaId, lan_conta: src, lan_conciliado: true, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: dLeg } = await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: `Transferência de ${srcName}`, lan_valor: val, lan_categoria: systemCategories.transferenciaId, lan_conta: dst, lan_conciliado: true, lan_grupo: grupoId, lan_importado: true }).select().single();
          const { data: tra } = await supabase.from('transferencias').insert({ tra_grupo: grupoId, tra_data: tx.date, tra_descricao: tx.description, tra_valor: val, tra_conta_origem: src, tra_conta_destino: dst, tra_lancamento_origem: oLeg.lan_id, tra_lancamento_destino: dLeg.lan_id, tra_conciliado: true }).select().single();
          await supabase.from('lancamentos').update({ lan_transferencia: tra.tra_id }).in('lan_id', [oLeg.lan_id, dLeg.lan_id]);
        } else {
          await supabase.from('lancamentos').insert({ lan_data: tx.date, lan_descricao: tx.description, lan_valor: tx.value, lan_categoria: tx.suggestedCategoryId, lan_conta: selectedAccountId, lan_grupo: grupoId, lan_conciliado: true, lan_importado: true });
        }
      }
      showSuccess('Importação finalizada!');
      handleRemoveFile();
    } catch (e) {
      showError('Erro ao importar.');
    } finally {
      setIsImporting(false);
    }
  };

  const previewBalance = processedTransactions
    .filter(tx => !tx.ignore)
    .reduce((sum, tx) => sum + tx.value, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-text-main-light dark:text-white">Importação de Extratos</h1>
        <p className="text-text-secondary-light">Suba seu arquivo OFX ou CSV para processar os lançamentos.</p>
      </div>

      <Card className="bg-white dark:bg-[#1e1629] rounded-2xl shadow-soft border-border-light overflow-hidden">
        <div className="flex border-b border-border-light bg-background-light/50">
          <div className={cn("flex-1 p-4 flex items-center justify-center gap-2 border-b-2 font-bold text-sm", uploadStep === 'upload' ? "border-primary text-primary" : "border-transparent text-text-secondary-light")}>1. Upload</div>
          <div className={cn("flex-1 p-4 flex items-center justify-center gap-2 border-b-2 font-bold text-sm", uploadStep === 'preview' ? "border-primary text-primary" : "border-transparent text-text-secondary-light")}>2. Revisão</div>
        </div>

        <CardContent className="p-8 space-y-8">
          {uploadStep === 'upload' ? (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label>Conta de Destino Principal</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-[100]">
                    {accounts.map(a => <SelectItem key={a.con_id} value={a.con_id}>{a.con_nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Label className="flex-1 flex flex-col items-center justify-center min-h-[180px] rounded-xl border-2 border-dashed border-border-light hover:bg-primary/5 transition-all cursor-pointer">
                <CloudUpload className="text-primary mb-4" size={32} />
                <p className="text-sm font-bold">Clique ou arraste o extrato aqui</p>
                <Input type="file" className="hidden" onChange={handleFileChange} accept=".csv,.ofx" />
              </Label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">Revisar Lançamentos ({processedTransactions.length})</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setProcessedTransactions(prev => prev.map(t => ({...t, ignore: false})))}>Tudo</Button>
                  <Button variant="ghost" size="sm" onClick={() => setProcessedTransactions(prev => prev.map(t => ({...t, ignore: true})))}>Nenhum</Button>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-xl bg-white dark:bg-[#1e1629]">
                <Table className="min-w-[1000px]">
                  <TableHeader className="bg-background-light/50">
                    <TableRow>
                      <TableHead className="w-[100px] text-[10px] font-black uppercase">Data</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Descrição</TableHead>
                      <TableHead className="w-[250px] text-[10px] font-black uppercase">Categoria / Conta Vinc.</TableHead>
                      <TableHead className="w-[120px] text-right text-[10px] font-black uppercase">Valor</TableHead>
                      <TableHead className="w-[100px] text-center text-[10px] font-black uppercase">Status</TableHead>
                      <TableHead className="w-[80px] text-center text-[10px] font-black uppercase">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedTransactions.map((tx) => {
                      const isTransfer = tx.suggestedCategoryId === systemCategories.transferenciaId;
                      return (
                        <TableRow key={tx.id} className={cn("group", tx.ignore && "opacity-40 grayscale")}>
                          <TableCell className="text-xs font-bold">{format(parseDateString(tx.date), 'dd/MM/yy')}</TableCell>
                          <TableCell className="text-xs font-medium">{tx.description}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <Select 
                                value={tx.suggestedCategoryId || ''} 
                                onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? {...t, suggestedCategoryId: val} : t))}
                              >
                                <SelectTrigger className="h-8 text-[10px] font-bold rounded-lg bg-background-light/50">
                                  <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-[100]" position="popper">
                                  {categories.map(c => <SelectItem key={c.cat_id} value={c.cat_id}>{c.cat_nome}</SelectItem>)}
                                </SelectContent>
                              </Select>

                              {isTransfer && (
                                <div className="flex items-center gap-2 animate-in slide-in-from-top-2">
                                  <Repeat2 size={12} className="text-primary" />
                                  <Select 
                                    value={tx.selectedLinkedAccountId || ''} 
                                    onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? {...t, selectedLinkedAccountId: val} : t))}
                                  >
                                    <SelectTrigger className="h-8 text-[10px] font-bold rounded-lg border-primary/30 bg-primary/5">
                                      <SelectValue placeholder="Vincular Conta" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-[100]" position="popper">
                                      {accounts.filter(a => a.con_id !== selectedAccountId).map(a => <SelectItem key={a.con_id} value={a.con_id}>{a.con_nome}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-right font-black text-sm", tx.value > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(tx.value)}
                          </TableCell>
                          <TableCell className="text-center">
                            {tx.status === 'duplicate' ? <span className="text-[9px] font-black uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded-full">Duplicado</span> : <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">Novo</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? {...t, ignore: !t.ignore} : t))}>
                              {tx.ignore ? <Check className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-bold text-text-secondary-light uppercase">Resumo da Importação</p>
                  <p className="text-2xl font-black text-primary">{formatCurrency(previewBalance)}</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button variant="outline" className="flex-1 sm:flex-none rounded-xl h-12" onClick={handleRemoveFile}>Cancelar</Button>
                  <Button className="flex-1 sm:flex-none bg-primary text-white rounded-xl h-12 px-8 font-bold" onClick={handleConfirmImport} disabled={isImporting || totalValid === 0}>
                    {isImporting ? <Loader2 className="animate-spin mr-2" /> : <ArrowDown className="mr-2 rotate-180" />}
                    Importar {totalValid} Lançamentos
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {uploadStep === 'upload' && selectedFile && (
          <div className="px-8 py-4 bg-background-light/30 border-t flex justify-end">
            <Button className="bg-primary text-white rounded-xl font-bold h-11 px-6" onClick={handleProcessFile}>
              Pré-visualizar Extrato <ChevronRight className="ml-2" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ImportacaoExtratos;