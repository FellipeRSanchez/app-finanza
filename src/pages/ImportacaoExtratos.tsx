"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, Check, Info, CloudUpload, ChevronRight, XCircle, Loader2, Lightbulb, ToggleLeft, ToggleRight } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import Papa from 'papaparse'; // For CSV parsing
import * as XLSX from 'xlsx'; // For XLSX parsing
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch'; // Assuming shadcn switch

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
  isTransferCandidate: boolean; 
  selectedLinkedAccountId: string | null; 
  lan_id_duplicate?: string; 
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
          supabase.from('categories').select('cat_id, cat_nome, cat_tipo').eq('cat_grupo', userData.usu_grupo).order('cat_nome'),
          supabase.from('lancamentos').select('lan_data, lan_descricao, lan_valor, lan_categoria').eq('lan_grupo', userData.usu_grupo),
        ]);

        if (accountsRes.error) throw accountsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (lancamentosRes.error) throw lancamentosRes.error;

        setAccounts(accountsRes.data || []);
        setCategories(categoriesRes.data || []);
        setExistingLancamentos(lancamentosRes.data || []);

        const transferenciaCat = categoriesRes.data?.find((cat: any) => 
          (cat.cat_nome.toLowerCase().includes('transferência') || cat.cat_nome.toLowerCase().includes('transferencia')) 
          && cat.cat_tipo === 'sistema'
        );
        
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
        let parsedData: any[] = [];
        if (file.name.endsWith('.csv')) {
          Papa.parse(text, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
              parsedData = results.data;
              resolve(parsedData.map((row, index) => {
                if (!row[0] || !row[1] || !row[2]) return null;
                return {
                  id: `temp-${index}`,
                  date: String(row[0]),
                  description: String(row[1]),
                  value: cleanAndParseFloat(row[2]),
                  originalRow: row,
                };
              }).filter(Boolean) as ParsedTransaction[]);
            },
            error: (err) => reject(err),
          });
        } else if (file.name.endsWith('.ofx')) {
          const transactions: ParsedTransaction[] = [];
          const transactionRegex = /<STMTTRN>[\s\S]*?<TRNTYPE>(.*?)<\/TRNTYPE>[\s\S]*?<DTPOSTED>(.*?)<\/DTPOSTED>[\s\S]*?<TRNAMT>(.*?)<\/TRNAMT>[\s\S]*?<MEMO>(.*?)<\/MEMO>[\s\S]*?<\/STMTTRN>/g;
          let match;
          let index = 0;
          while ((match = transactionRegex.exec(text)) !== null) {
            const [, type, date, amount, memo] = match;
            transactions.push({
              id: `temp-${index++}`,
              date: date.substring(0, 8),
              description: memo || type,
              value: cleanAndParseFloat(amount),
              originalRow: match[0],
            });
          }
          resolve(transactions);
        } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(text, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headers = parsedData[0] as string[];
          const dataRows = parsedData.slice(1);
          const dateCol = headers.findIndex(h => h.toLowerCase().includes('data'));
          const descCol = headers.findIndex(h => h.toLowerCase().includes('descri'));
          const valueCol = headers.findIndex(h => h.toLowerCase().includes('valor') || h.toLowerCase().includes('amount'));
          if (dateCol === -1 || descCol === -1 || valueCol === -1) {
            reject(new Error('Colunas essenciais não encontradas.'));
            return;
          }
          resolve(dataRows.map((row: any, index) => {
            if (!row[dateCol] || !row[descCol] || !row[valueCol]) return null;
            return {
              id: `temp-${index}`,
              date: String(row[dateCol]),
              description: String(row[descCol]),
              value: cleanAndParseFloat(row[valueCol]),
              originalRow: row,
            };
          }).filter(Boolean) as ParsedTransaction[]);
        } else {
          reject(new Error('Formato de arquivo não suportado.'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }, []);

  const processTransactions = useCallback(async (parsed: ParsedTransaction[], accountId: string) => {
    const processed: ProcessedTransaction[] = [];
    const existingDescriptionsMap = new Map<string, string>(); 
    const existingTransactionsSet = new Set<string>(); 
    existingLancamentos.forEach(lan => {
      const key = `${lan.lan_data}-${lan.lan_descricao}-${lan.lan_valor}`;
      existingTransactionsSet.add(key);
      if (lan.lan_descricao) existingDescriptionsMap.set(lan.lan_descricao.toLowerCase(), lan.lan_categoria);
    });

    for (const tx of parsed) {
      const value = Number(tx.value);
      const type = value >= 0 ? 'receita' : 'despesa';
      const formattedDate = format(parseDateString(tx.date), 'yyyy-MM-dd');
      let status: 'new' | 'duplicate' | 'ignored' = 'new';
      let suggestedCategoryId: string | null = null;
      let suggestedCategoryName: string | null = null;
      let isTransferCandidate = false;
      const lowerDescription = tx.description.toLowerCase();
      const transferKeywords = ['transferencia', 'ted', 'pix', 'doc', 'transferência'];
      if (transferKeywords.some(keyword => lowerDescription.includes(keyword))) isTransferCandidate = true;
      if (!isTransferCandidate) {
        const duplicateKey = `${formattedDate}-${tx.description}-${value}`;
        if (existingTransactionsSet.has(duplicateKey)) status = 'duplicate';
      }
      if (useAiClassification && status === 'new') {
        if (isTransferCandidate && systemCategories.transferenciaId) {
          suggestedCategoryId = systemCategories.transferenciaId;
          suggestedCategoryName = categories.find(c => c.cat_id === systemCategories.transferenciaId)?.cat_nome || null;
        } else {
          const matchedCategoryId = existingDescriptionsMap.get(lowerDescription);
          if (matchedCategoryId) {
            suggestedCategoryId = matchedCategoryId;
            suggestedCategoryName = categories.find(c => c.cat_id === matchedCategoryId)?.cat_nome || null;
          }
        }
      }
      processed.push({
        ...tx,
        id: Math.random().toString(36).substring(2, 11),
        date: formattedDate,
        value: value,
        type: type,
        suggestedCategoryId,
        suggestedCategoryName,
        status,
        ignore: status === 'duplicate',
        isTransferCandidate: isTransferCandidate,
        selectedLinkedAccountId: null,
      });
    }
    setProcessedTransactions(processed);
    setUploadStep('preview');
  }, [existingLancamentos, categories, useAiClassification, systemCategories.transferenciaId]);

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return parseISO(dateStr);
    if (dateStr.match(/^\d{8}$/)) return new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)) - 1, parseInt(dateStr.substring(6, 8)));
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setFileError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      const detectedAccId = detectAccountFromFile(file.name, accounts);
      if (detectedAccId) setSelectedAccountId(detectedAccId);
    }
  }, [accounts, detectAccountFromFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const detectedAccId = detectAccountFromFile(file.name, accounts);
      if (detectedAccId) setSelectedAccountId(detectedAccId);
    }
  }, [accounts, detectAccountFromFile]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setProcessedTransactions([]);
    setUploadStep('upload');
    setFileError(null);
  }, []);

  const handleProcessFile = useCallback(async () => {
    if (!selectedFile || !selectedAccountId) {
      setFileError('Selecione arquivo e conta.');
      return;
    }
    setLoading(true);
    try {
      const parsed = await parseFile(selectedFile);
      await processTransactions(parsed, selectedAccountId);
    } catch (error: any) {
      setFileError(error.message || 'Erro ao processar arquivo.');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, selectedAccountId, parseFile, processTransactions]);

  const handleConfirmImport = async () => {
    if (!grupoId || !selectedAccountId) return;
    setIsImporting(true);
    const transactionsToProcess = processedTransactions.filter(tx => tx.status === 'new' && !tx.ignore);
    if (transactionsToProcess.length === 0) {
      showError('Nenhum lançamento válido.');
      setIsImporting(false);
      return;
    }
    try {
      for (const tx of transactionsToProcess) {
        if (tx.suggestedCategoryId === systemCategories.transferenciaId && tx.selectedLinkedAccountId) {
          const sourceAccountId = tx.value < 0 ? selectedAccountId : tx.selectedLinkedAccountId;
          const destinationAccountId = tx.value < 0 ? tx.selectedLinkedAccountId : selectedAccountId;
          const transferValue = Math.abs(tx.value);
          const sourceAccountName = accounts.find(a => a.con_id === sourceAccountId)?.con_nome;
          const destinationAccountName = accounts.find(a => a.con_id === destinationAccountId)?.con_nome;

          const { data: lanOrigem, error: loError } = await supabase.from('lancamentos').insert({
            lan_data: tx.date,
            lan_descricao: `Transferência para ${destinationAccountName}`,
            lan_valor: -transferValue,
            lan_categoria: systemCategories.transferenciaId,
            lan_conta: sourceAccountId,
            lan_conciliado: true,
            lan_grupo: grupoId,
            lan_importado: true,
          }).select().single();
          if (loError) throw loError;

          const { data: lanDestino, error: ldError } = await supabase.from('lancamentos').insert({
            lan_data: tx.date,
            lan_descricao: `Transferência de ${sourceAccountName}`,
            lan_valor: transferValue,
            lan_categoria: systemCategories.transferenciaId,
            lan_conta: destinationAccountId,
            lan_conciliado: true,
            lan_grupo: grupoId,
            lan_importado: true,
          }).select().single();
          if (ldError) throw ldError;

          const { data: newTra, error: traError } = await supabase.from('transferencias').insert({
            tra_grupo: grupoId,
            tra_data: tx.date,
            tra_descricao: tx.description,
            tra_valor: transferValue,
            tra_conta_origem: sourceAccountId,
            tra_conta_destino: destinationAccountId,
            tra_lancamento_origem: lanOrigem.lan_id,
            tra_lancamento_destino: lanDestino.lan_id,
            tra_conciliado: true,
          }).select().single();
          if (traError) throw traError;

          await supabase.from('lancamentos').update({ lan_transferencia: newTra.tra_id }).in('lan_id', [lanOrigem.lan_id, lanDestino.lan_id]);
        } else {
          const { error } = await supabase.from('lancamentos').insert({
            lan_data: tx.date,
            lan_descricao: tx.description,
            lan_valor: tx.value,
            lan_categoria: tx.suggestedCategoryId,
            lan_conta: selectedAccountId,
            lan_grupo: grupoId,
            lan_conciliado: true,
            lan_importado: true,
          });
          if (error) throw error;
        }
      }
      showSuccess('Importação concluída!');
      handleRemoveFile();
    } catch (error) {
      console.error(error);
      showError('Erro ao importar.');
    } finally {
      setIsImporting(false);
    }
  };

  const uniqueCategories = categories.reduce((acc: Category[], current) => {
    const existingIndex = acc.findIndex(item => item.cat_nome.toLowerCase() === current.cat_nome.toLowerCase());
    if (existingIndex === -1) return acc.concat([current]);
    if (current.cat_tipo === 'sistema' && acc[existingIndex].cat_tipo !== 'sistema') {
      const newAcc = [...acc];
      newAcc[existingIndex] = current;
      return newAcc;
    }
    return acc;
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark text-sm mb-1">
          <a className="hover:text-primary-new" href="#">Financeiro</a>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-main-light dark:text-text-main-dark font-medium">Importação</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-main-light dark:text-text-main-dark"> Importação de Extratos </h1>
      </div>

      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
        <div className="flex border-b border-border-light dark:border-[#2d2438] bg-background-light/50 dark:bg-background-dark/30">
          <div className={`flex-1 p-4 flex items-center justify-center gap-2 font-bold text-sm ${uploadStep === 'upload' ? 'border-b-2 border-primary-new text-primary-new' : 'text-text-secondary-light'}`}>
            <span className={`size-6 rounded-full flex items-center justify-center text-xs ${uploadStep === 'upload' ? 'bg-primary-new text-white' : 'bg-border-light text-text-secondary'}`}>1</span> Upload
          </div>
          <div className={`flex-1 p-4 flex items-center justify-center gap-2 font-medium text-sm ${uploadStep === 'preview' ? 'border-b-2 border-primary-new text-primary-new' : 'text-text-secondary-light'}`}>
            <span className={`size-6 rounded-full flex items-center justify-center text-xs ${uploadStep === 'preview' ? 'bg-primary-new text-white' : 'bg-border-light text-text-secondary'}`}>2</span> Confirmação
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-8">
          {uploadStep === 'upload' ? (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="block">
                  <span className="text-text-main-light dark:text-text-main-dark text-sm font-bold mb-2 block"> Conta Bancária de Destino </span>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full rounded-xl border-border-light dark:border-[#3a3045] h-12">
                      <SelectValue placeholder="Selecione conta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Label>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 rounded-xl flex gap-3">
                  <Info className="text-yellow-600 shrink-0" size={20} />
                  <p className="text-sm text-yellow-800">Verifique se o arquivo CSV segue o formato: Data, Descrição e Valor.</p>
                </div>
              </div>
              <Label htmlFor="file-upload" className="flex-1 flex flex-col items-center justify-center w-full min-h-[180px] rounded-xl border-2 border-dashed border-border-light cursor-pointer">
                <CloudUpload className="text-primary-new mb-4" size={24} />
                <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
                <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".ofx,.csv,.xls,.xlsx" />
              </Label>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="bg-card-light dark:bg-[#1e1629] p-6 border-border-light">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2"><Lightbulb className="text-primary-new" /> Classificação Inteligente</h3>
                  <Switch checked={useAiClassification} onCheckedChange={setUseAiClassification} />
                </div>
              </Card>

              <div className="overflow-x-auto rounded-xl border border-border-light">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background-light dark:bg-[#1e1629]">
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria / Conta</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedTransactions.map((tx) => (
                      <TableRow key={tx.id} className={tx.ignore ? 'opacity-50' : ''}>
                        <TableCell className="text-sm">{format(parseDateString(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Select value={tx.suggestedCategoryId || ''} onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, suggestedCategoryId: val } : t))}>
                              <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueCategories.map(cat => <SelectItem key={cat.cat_id} value={cat.cat_id}>{cat.cat_nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {tx.suggestedCategoryId === systemCategories.transferenciaId && (
                              <Select value={tx.selectedLinkedAccountId || ''} onValueChange={(val) => setProcessedTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, selectedLinkedAccountId: val } : t))}>
                                <SelectTrigger className="w-[180px] h-8 text-xs border-emerald-200">
                                  <SelectValue placeholder="Selecionar Banco" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.filter(acc => acc.con_id !== selectedAccountId).map(acc => <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${tx.value > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(tx.value)}</TableCell>
                        <TableCell className="text-center">
                          {tx.status === 'duplicate' ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Duplicado</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Novo</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleRemoveFile}>Cancelar</Button>
                <Button onClick={handleConfirmImport} disabled={isImporting || totalValid === 0} className="bg-primary-new text-white font-bold">
                  {isImporting ? <Loader2 className="animate-spin mr-2" /> : null}
                  Importar {totalValid} Lançamentos
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {uploadStep === 'upload' && (
          <div className="px-6 py-4 bg-background-light dark:bg-[#1e1429] border-t flex justify-end gap-3">
            <Button variant="outline" onClick={handleRemoveFile}>Limpar</Button>
            <Button onClick={handleProcessFile} disabled={!selectedFile || !selectedAccountId || loading} className="bg-primary-new text-white font-bold">
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Pré-visualizar Extrato
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ImportacaoExtratos;