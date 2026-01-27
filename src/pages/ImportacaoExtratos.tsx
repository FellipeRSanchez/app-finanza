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
import { cn } from '@/lib/utils'; // Adicionada a importação para 'cn'
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

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
  id: string; // Added id to interface to fix TS error
  date: string; // Original date string from file
  description: string;
  value: number;
  originalRow: any; // Keep original row data for debugging/flexibility
}

interface ProcessedTransaction extends ParsedTransaction {
  type: 'receita' | 'despesa';
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  status: 'new' | 'duplicate' | 'ignored';
  ignore: boolean; // User can toggle this
  isTransferCandidate: boolean; // New field
  selectedLinkedAccountId: string | null; // New field
  lan_id_duplicate?: string; // If duplicate, ID of existing lancamento
}

const ImportacaoExtratos = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate(); // Inicializar useNavigate
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview'>('upload');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingLancamentos, setExistingLancamentos] = useState<any[]>([]); // For duplicate detection and AI
  const [grupoId, setGrupoId] = useState('');

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [processedTransactions, setProcessedTransactions] = useState<ProcessedTransaction[]>([]);
  const [useAiClassification, setUseAiClassification] = useState(true);
  const [systemCategories, setSystemCategories] = useState({ transferenciaId: null as string | null });

  const [lastSelectedFileName, setLastSelectedFileName] = useState<string | null>(null);
  const [lastSelectedFileSize, setLastSelectedFileSize] = useState<number | null>(null);


  // Summary for confirmation
  const totalToImport = processedTransactions.filter(tx => !tx.ignore).length;
  const totalDuplicates = processedTransactions.filter(tx => tx.status === 'duplicate').length;
  const totalIgnored = processedTransactions.filter(tx => tx.ignore).length;


  // Helper to format currency
  const formatCurrency = useCallback((value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, [hideValues]);

  // --- Persistence Logic ---
  const localStorageKeys = {
    selectedAccountId: 'import_selected_account_id',
    processedTransactions: 'import_processed_transactions',
    uploadStep: 'import_upload_step',
    useAiClassification: 'import_use_ai_classification',
    lastSelectedFileName: 'import_last_selected_file_name',
    lastSelectedFileSize: 'import_last_selected_file_size',
  };

  const clearPersistedState = useCallback(() => {
    Object.values(localStorageKeys).forEach(key => localStorage.removeItem(key));
    setLastSelectedFileName(null);
    setLastSelectedFileSize(null);
  }, [localStorageKeys]);

  // Load state from localStorage on mount
  useEffect(() => {
    const loadState = () => {
      try {
        const savedAccountId = localStorage.getItem(localStorageKeys.selectedAccountId);
        const savedTransactions = localStorage.getItem(localStorageKeys.processedTransactions);
        const savedStep = localStorage.getItem(localStorageKeys.uploadStep);
        const savedAiClassification = localStorage.getItem(localStorageKeys.useAiClassification);
        const savedFileName = localStorage.getItem(localStorageKeys.lastSelectedFileName);
        const savedFileSize = localStorage.getItem(localStorageKeys.lastSelectedFileSize);

        if (savedAccountId) setSelectedAccountId(savedAccountId);
        if (savedTransactions) setProcessedTransactions(JSON.parse(savedTransactions));
        if (savedStep) setUploadStep(savedStep as 'upload' | 'preview');
        if (savedAiClassification) setUseAiClassification(savedAiClassification === 'true');
        if (savedFileName) setLastSelectedFileName(savedFileName);
        if (savedFileSize) setLastSelectedFileSize(Number(savedFileSize));

        if (savedTransactions && !savedFileName) {
          showError('O arquivo original não foi salvo. Por favor, selecione-o novamente para continuar.');
        }
      } catch (error) {
        console.error('Failed to load state from localStorage:', error);
        clearPersistedState(); // Clear corrupted state
      }
    };

    loadState();
  }, [clearPersistedState, localStorageKeys]);

  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    if (selectedAccountId) localStorage.setItem(localStorageKeys.selectedAccountId, selectedAccountId);
    if (processedTransactions.length > 0) localStorage.setItem(localStorageKeys.processedTransactions, JSON.stringify(processedTransactions));
    localStorage.setItem(localStorageKeys.uploadStep, uploadStep);
    localStorage.setItem(localStorageKeys.useAiClassification, String(useAiClassification));
    if (lastSelectedFileName) localStorage.setItem(localStorageKeys.lastSelectedFileName, lastSelectedFileName);
    if (lastSelectedFileSize) localStorage.setItem(localStorageKeys.lastSelectedFileSize, String(lastSelectedFileSize));
  }, [selectedAccountId, processedTransactions, uploadStep, useAiClassification, lastSelectedFileName, lastSelectedFileSize, localStorageKeys]);
  // --- End Persistence Logic ---


  // Fetch initial data (accounts, categories, existing lancamentos)
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

        // If no account is pre-selected from localStorage, default to first account
        if (!localStorage.getItem(localStorageKeys.selectedAccountId) && accountsRes.data && accountsRes.data.length > 0) {
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
  }, [user, localStorageKeys.selectedAccountId]);

  // Auto-detect account from file name
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

  // Helper to clean and parse numerical values
  const cleanAndParseFloat = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove thousands separators (dots) and replace decimal comma with dot
      const cleanedValue = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleanedValue);
    }
    return 0;
  };

  // Parse file content
  const parseFile = useCallback(async (file: File): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        let parsedData: any[] = [];

        if (file.name.endsWith('.csv')) {
          Papa.parse(text, {
            header: false, // Assume no header for standard format
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
              parsedData = results.data;
              // Expecting: Column 0 = Date, Column 1 = Description, Column 2 = Value
              resolve(parsedData.map((row, index) => {
                if (!row[0] || !row[1] || !row[2]) {
                  console.warn(`Skipping row ${index + 1} due to missing data:`, row);
                  return null; // Skip rows with missing essential data
                }
                return {
                  id: `temp-${index}`,
                  date: String(row[0]),
                  description: String(row[1]),
                  value: cleanAndParseFloat(row[2]),
                  originalRow: row,
                };
              }).filter(Boolean) as ParsedTransaction[]); // Filter out nulls
            },
            error: (err) => reject(err),
          });
        } else if (file.name.endsWith('.ofx')) {
          // Simplified OFX parsing (real OFX parsing is complex, this is a mock)
          const transactions: ParsedTransaction[] = [];
          const transactionRegex = /<STMTTRN>[\s\S]*?<TRNTYPE>(.*?)<\/TRNTYPE>[\s\S]*?<DTPOSTED>(.*?)<\/DTPOSTED>[\s\S]*?<TRNAMT>(.*?)<\/TRNAMT>[\s\S]*?<MEMO>(.*?)<\/MEMO>[\s\S]*?<\/STMTTRN>/g;
          let match;
          let index = 0;
          while ((match = transactionRegex.exec(text)) !== null) {
            const [, type, date, amount, memo] = match;
            const value = cleanAndParseFloat(amount); // Use helper for value
            transactions.push({
              id: `temp-${index++}`,
              date: date.substring(0, 8), // OFX date format YYYYMMDD
              description: memo || type,
              value: value,
              originalRow: match[0],
            });
          }
          resolve(transactions);
        } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(text, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Assuming first row is header, and specific columns for simplicity
          // This needs to be more robust in a real app (user mapping columns)
          const headers = parsedData[0] as string[];
          const dataRows = parsedData.slice(1);

          const dateCol = headers.findIndex(h => h.toLowerCase().includes('data'));
          const descCol = headers.findIndex(h => h.toLowerCase().includes('descri'));
          const valueCol = headers.findIndex(h => h.toLowerCase().includes('valor') || h.toLowerCase().includes('amount'));

          if (dateCol === -1 || descCol === -1 || valueCol === -1) {
            reject(new Error('Colunas essenciais (Data, Descrição, Valor) não encontradas no arquivo Excel.'));
            return;
          }

          resolve(dataRows.map((row: any, index) => {
            if (!row[dateCol] || !row[descCol] || !row[valueCol]) {
              console.warn(`Skipping row ${index + 1} due to missing data in Excel:`, row);
              return null; // Skip rows with missing essential data
            }
            return {
              id: `temp-${index}`,
              date: String(row[dateCol]),
              description: String(row[descCol]),
              value: cleanAndParseFloat(row[valueCol]), // Use helper for value
              originalRow: row,
            };
          }).filter(Boolean) as ParsedTransaction[]); // Filter out nulls

        } else {
          reject(new Error('Formato de arquivo não suportado.'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file); // Read as text for CSV/OFX, for XLSX it's more complex
    });
  }, []);

  // Helper to parse various date formats (YYYYMMDD, YYYY-MM-DD, DD/MM/YYYY)
  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    // Try YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return parseISO(dateStr);
    }
    // Try YYYYMMDD (OFX format)
    if (dateStr.match(/^\d{8}$/)) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      return new Date(year, month, day);
    }
    // Try DD/MM/YYYY
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    // Fallback to current date if parsing fails
    return new Date();
  };

  // Helper to extract person's name from description
  const extractPersonName = (description: string): string | null => {
    const lowerDescription = description.toLowerCase();
    // Regex to capture names after common transfer indicators
    // Example: "PIX Recebido - João Silva", "TED para Maria", "Transferência de Empresa X"
    const patterns = [
      /pix (recebido|enviado) para (.*?)(?:\s|$)/, // Added 'para'
      /pix (recebido|enviado) de (.*?)(?:\s|$)/, // Added 'de'
      /ted (para|de) (.*?)(?:\s|$)/,
      /transferência (para|de) (.*?)(?:\s|$)/,
      /transferencia (para|de) (.*?)(?:\s|$)/,
    ];

    for (const pattern of patterns) {
      const match = lowerDescription.match(pattern);
      if (match && match[2]) {
        // Capitalize first letter of each word for cleaner name
        return match[2].split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    return null;
  };

  // Function to call the Edge Function for classification
  const classifyTransactionWithAI = useCallback(async (description: string, value: number, availableCategories: Category[]): Promise<string | null> => {
    try {
      const type = value >= 0 ? 'receita' : 'despesa';
      const { data: sessionData } = await supabase.auth.getSession(); // Get session data
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        console.error("No access token available for AI classification.");
        return null;
      }

      const response = await fetch('https://wvhpwclgevtdzrfqtvvg.supabase.co/functions/v1/classify-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`, // Use user's access token
        },
        body: JSON.stringify({ description, categories: availableCategories, type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("AI Classification Edge Function error:", errorData);
        return null;
      }

      const data = await response.json();
      return data.suggestedCategoryId;
    } catch (error) {
      console.error("Error calling AI Classification Edge Function:", error);
      return null;
    }
  }, []);

  // Process transactions (duplicate detection, AI classification)
  const processTransactions = useCallback(async (parsed: ParsedTransaction[], accountId: string) => {
    const processed: ProcessedTransaction[] = [];
    const existingDescriptionsMap = new Map<string, string>(); // description -> category_id
    const existingTransactionsSet = new Set<string>(); // For duplicate detection (date + value)
    
    // personCategoryMap to store the latest NON-SYSTEM category for a person
    const personCategoryMap = new Map<string, { categoryId: string, date: Date }>();

    // Populate maps from existing lancamentos
    existingLancamentos.forEach(lan => {
      const formattedExistingDate = format(parseISO(lan.lan_data), 'yyyy-MM-dd');
      // Duplicate key: date + value
      const duplicateKey = `${formattedExistingDate}-${lan.lan_valor}`; 
      existingTransactionsSet.add(duplicateKey);

      // Populate existingDescriptionsMap for general AI classification
      if (lan.lan_descricao) {
        existingDescriptionsMap.set(lan.lan_descricao.toLowerCase(), lan.lan_categoria);
      }

      // Populate personCategoryMap for transfer classification, prioritizing non-system categories
      const personName = extractPersonName(lan.lan_descricao || '');
      if (personName) {
        const lanDate = parseISO(lan.lan_data);
        const lanCategory = categories.find(c => c.cat_id === lan.lan_categoria);
        
        // Only consider non-system categories for person-specific mapping
        if (lanCategory && lanCategory.cat_tipo !== 'sistema') {
          const currentEntry = personCategoryMap.get(personName);
          if (!currentEntry || lanDate > currentEntry.date) { // Keep the latest non-system category for a person
            personCategoryMap.set(personName, { categoryId: lan.lan_categoria, date: lanDate });
          }
        }
      }
    });

    for (const tx of parsed) {
      const value = Number(tx.value);
      const type = value >= 0 ? 'receita' : 'despesa';
      const formattedDate = format(parseDateString(tx.date), 'yyyy-MM-dd'); // Ensure consistent date format

      let status: 'new' | 'duplicate' | 'ignored' = 'new';
      let suggestedCategoryId: string | null = null;
      let suggestedCategoryName: string | null = null;
      let isTransferCandidate = false;

      const lowerDescription = tx.description.toLowerCase();
      const transferKeywords = ['transferencia', 'ted', 'pix', 'doc', 'transferência'];
      if (transferKeywords.some(keyword => lowerDescription.includes(keyword))) {
        isTransferCandidate = true;
      }

      // Duplicate detection (now only by date and value)
      const duplicateKey = `${formattedDate}-${value}`;
      if (existingTransactionsSet.has(duplicateKey)) {
        status = 'duplicate';
      }

      // AI Classification
      if (useAiClassification && status === 'new') {
        if (isTransferCandidate) {
          const personName = extractPersonName(tx.description);
          if (personName) {
            const matchedPersonCategory = personCategoryMap.get(personName);
            if (matchedPersonCategory) {
              // If a non-system category is found for the person, use it
              suggestedCategoryId = matchedPersonCategory.categoryId;
              suggestedCategoryName = categories.find(c => c.cat_id === suggestedCategoryId)?.cat_nome || null;
            } else {
              // If no specific non-system category found for person, default to system transfer category
              suggestedCategoryId = systemCategories.transferenciaId;
              suggestedCategoryName = categories.find(c => c.cat_id === systemCategories.transferenciaId)?.cat_nome || null;
            }
          } else {
            // If it's a transfer candidate but no person name extracted, default to system transfer category
            suggestedCategoryId = systemCategories.transferenciaId;
            suggestedCategoryName = categories.find(c => c.cat_id === systemCategories.transferenciaId)?.cat_nome || null;
          }
        } else {
          // For non-transfer candidates, use the OpenAI Edge Function
          const aiSuggestedId = await classifyTransactionWithAI(tx.description, tx.value, categories);
          if (aiSuggestedId) {
            suggestedCategoryId = aiSuggestedId;
            suggestedCategoryName = categories.find(c => c.cat_id === aiSuggestedId)?.cat_nome || null;
          } else {
            // Fallback to description matching if AI fails
            const matchedCategoryId = existingDescriptionsMap.get(lowerDescription);
            if (matchedCategoryId) {
              suggestedCategoryId = matchedCategoryId;
              suggestedCategoryName = categories.find(c => c.cat_id === matchedCategoryId)?.cat_nome || null;
            }
          }
        }
      }

      processed.push({
        ...tx,
        id: Math.random().toString(36).substring(2, 11), // Unique ID for React keys
        date: formattedDate,
        value: value,
        type: type,
        suggestedCategoryId,
        suggestedCategoryName,
        status,
        ignore: status === 'duplicate', // Ignore duplicates by default
        isTransferCandidate: isTransferCandidate,
        selectedLinkedAccountId: null, // Initialize, user will select if it's a transfer
      });
    }
    setProcessedTransactions(processed);
    setUploadStep('preview');
  }, [existingLancamentos, categories, useAiClassification, systemCategories.transferenciaId, classifyTransactionWithAI]);

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setFileError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setLastSelectedFileName(file.name);
      setLastSelectedFileSize(file.size);

      const detectedAccId = detectAccountFromFile(file.name, accounts);
      if (detectedAccId) {
        setSelectedAccountId(detectedAccId);
        showSuccess(`Conta "${accounts.find(a => a.con_id === detectedAccId)?.con_nome}" detectada automaticamente.`);
      }
    }
  }, [accounts, detectAccountFromFile]);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setLastSelectedFileName(file.name);
      setLastSelectedFileSize(file.size);

      const detectedAccId = detectAccountFromFile(file.name, accounts);
      if (detectedAccId) {
        setSelectedAccountId(detectedAccId);
        showSuccess(`Conta "${accounts.find(a => a.con_id === detectedAccId)?.con_nome}" detectada automaticamente.`);
      }
    }
  }, [accounts, detectAccountFromFile]);

  // Handle file removal
  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setProcessedTransactions([]);
    setUploadStep('upload');
    setFileError(null);
    clearPersistedState(); // Clear persisted state on explicit removal
  }, [clearPersistedState]);

  // Handle processing file after account selection
  const handleProcessFile = useCallback(async () => {
    if (!selectedFile) {
      setFileError('Por favor, selecione um arquivo.');
      return;
    }
    if (!selectedAccountId) {
      setFileError('Por favor, selecione uma conta de destino.');
      return;
    }

    setLoading(true);
    setFileError(null);
    try {
      const parsed = await parseFile(selectedFile);
      await processTransactions(parsed, selectedAccountId);
    } catch (error: any) {
      console.error('Error processing file:', error);
      setFileError(error.message || 'Erro ao processar o arquivo. Verifique o formato.');
      setProcessedTransactions([]);
      setUploadStep('upload');
      clearPersistedState(); // Clear state if processing fails
    } finally {
      setLoading(false);
    }
  }, [selectedFile, selectedAccountId, parseFile, processTransactions, clearPersistedState]);

  // Handle final import confirmation
  const handleConfirmImport = async () => {
    if (!grupoId || !selectedAccountId) {
      showError('Dados essenciais para importação estão faltando.');
      return;
    }

    setIsImporting(true);
    const transactionsToProcess = processedTransactions
      .filter(tx => !tx.ignore);

    if (transactionsToProcess.length === 0) {
      showError('Nenhum lançamento válido para importar.');
      setIsImporting(false);
      return;
    }

    // Validate that all transactions to be processed have a category
    const transactionsWithoutCategory = transactionsToProcess.filter(tx => !tx.suggestedCategoryId || tx.suggestedCategoryId === '');
    if (transactionsWithoutCategory.length > 0) {
      showError('Por favor, selecione uma categoria para todos os lançamentos válidos.');
      setIsImporting(false);
      return;
    }

    // New validation: Ensure linked account is selected for transfer candidates
    const transfersWithoutLinkedAccount = transactionsToProcess.filter(tx =>
      tx.suggestedCategoryId === systemCategories.transferenciaId && !tx.selectedLinkedAccountId
    );
    if (transfersWithoutLinkedAccount.length > 0) {
      showError('Por favor, selecione a conta vinculada para todas as transferências.');
      setIsImporting(false);
      return;
    }

    try {
      for (const tx of transactionsToProcess) {
        const catId = tx.suggestedCategoryId; // Now guaranteed to be non-null/empty by validation

        if (catId === systemCategories.transferenciaId && tx.selectedLinkedAccountId) {
          // Logic for creating two-leg transfer
          const sourceAccountId = tx.value < 0 ? selectedAccountId : tx.selectedLinkedAccountId;
          const destinationAccountId = tx.value < 0 ? tx.selectedLinkedAccountId : selectedAccountId;
          const transferValue = Math.abs(tx.value);

          const sourceAccountName = accounts.find(a => a.con_id === sourceAccountId)?.con_nome;
          const destinationAccountName = accounts.find(a => a.con_id === destinationAccountId)?.con_nome;

          // Create debit leg
          const { data: lanOrigem, error: loError } = await supabase
            .from('lancamentos')
            .insert({
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

          // Create credit leg
          const { data: lanDestino, error: ldError } = await supabase
            .from('lancamentos')
            .insert({
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

          // Create the transfer record
          const { data: newTra, error: traError } = await supabase
            .from('transferencias')
            .insert({
              tra_grupo: grupoId,
              tra_data: tx.date,
              tra_descricao: tx.description, // Use original description for transfer record
              tra_valor: transferValue,
              tra_conta_origem: sourceAccountId,
              tra_conta_destino: destinationAccountId,
              tra_lancamento_origem: lanOrigem.lan_id,
              tra_lancamento_destino: lanDestino.lan_id,
              tra_conciliado: true,
            }).select().single();
          if (traError) throw traError;

          // Link lancamentos back to transfer
          await supabase
            .from('lancamentos')
            .update({ lan_transferencia: newTra.tra_id })
            .in('lan_id', [lanOrigem.lan_id, lanDestino.lan_id]);

        } else {
          // Insert as a single lancamento
          const { error } = await supabase
            .from('lancamentos')
            .insert({
              lan_data: tx.date,
              lan_descricao: tx.description,
              lan_valor: tx.value,
              lan_categoria: catId,
              lan_conta: selectedAccountId, // Use current state here
              lan_grupo: grupoId,
              lan_conciliado: true,
              lan_importado: true,
            });
          if (error) throw error;
        }
      }
      showSuccess(`${transactionsToProcess.length} lançamentos importados com sucesso!`);
      handleRemoveFile(); // Clear form after successful import
      setUploadStep('upload');
      clearPersistedState(); // Clear persisted state on successful import
      navigate('/lancamentos', { state: { refresh: true } }); // Navegar e sinalizar refresh
    } catch (error) {
      console.error('Error importing transactions:', error);
      showError('Erro ao importar lançamentos.');
    } finally {
      setIsImporting(false);
    }
  };

  // Calculate totals for preview
  const previewTotalIncome = processedTransactions
    .filter(tx => tx.type === 'receita' && !tx.ignore)
    .reduce((sum, tx) => sum + Math.abs(tx.value), 0);
  const previewTotalExpenses = processedTransactions
    .filter(tx => tx.type === 'despesa' && !tx.ignore)
    .reduce((sum, tx) => sum + Math.abs(tx.value), 0);
  const previewBalance = previewTotalIncome - previewTotalExpenses;

  // Filter unique categories by name (CASE-INSENSITIVE) and prefer 'sistema'
  const uniqueCategories = categories.reduce((acc: Category[], current) => {
    const existingIndex = acc.findIndex(item => item.cat_nome.toLowerCase() === current.cat_nome.toLowerCase());
    
    if (existingIndex === -1) {
      return acc.concat([current]);
    } else {
      // If a duplicate name is found, prefer the one with type 'sistema'
      if (current.cat_tipo === 'sistema' && acc[existingIndex].cat_tipo !== 'sistema') {
        const newAcc = [...acc];
        newAcc[existingIndex] = current;
        return newAcc;
      }
      return acc;
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Page Heading */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark text-sm mb-1">
          <a className="hover:text-primary-new" href="#">Financeiro</a>
          <ChevronRight className="w-4 h-4" />
          <span className="text-text-main-light dark:text-text-main-dark font-medium">Importação</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-main-light dark:text-text-main-dark">
          Importação de Extratos
        </h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark text-lg max-w-2xl">
          Carregue seus arquivos OFX, CSV ou XLS para sincronizar suas finanças automaticamente.
        </p>
      </div>

      {/* Main Import Card */}
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] overflow-hidden">
        {/* Progress / Steps Indicator */}
        <div className="flex border-b border-border-light dark:border-[#2d2438] bg-background-light/50 dark:bg-background-dark/30">
          <div className="flex-1 p-4 flex items-center justify-center gap-2 border-b-2 border-primary-new text-primary-new font-bold text-sm">
            <span className="size-6 rounded-full bg-primary-new text-white flex items-center justify-center text-xs">1</span> Upload e Configuração
          </div>
          <div className="flex-1 p-4 flex items-center justify-center gap-2 text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm">
            <span className="size-6 rounded-full bg-border-light dark:bg-[#3a3045] text-text-secondary-light dark:text-text-secondary-dark flex items-center justify-center text-xs">2</span> Confirmação
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-8">
          {/* Step 1: Configuration & Upload */}
          {uploadStep === 'upload' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="block">
                  <span className="text-text-main-light dark:text-text-main-dark text-sm font-bold mb-2 block">
                    Conta Bancária de Destino
                  </span>
                  <Select key={selectedAccountId} value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={loading}>
                    <SelectTrigger id="account-select" className="w-full rounded-xl border-border-light dark:border-[#3a3045] bg-card-light dark:bg-[#1e1629] h-12 pl-4 pr-10 text-sm">
                      <SelectValue placeholder="Selecione uma conta..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card-light dark:bg-card-dark z-50" position="popper" sideOffset={5}>
                      {accounts.map(acc => (
                        <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome} ({acc.con_tipo})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">
                    Os lançamentos serão vinculados a esta conta.
                  </p>
                </Label>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl flex gap-3">
                  <Info className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-bold mb-1">Atenção ao formato</p>
                    <p>
                      Para arquivos CSV, utilize o formato padrão: **Coluna 1: Data (DD/MM/AAAA ou AAAA-MM-DD), Coluna 2: Descrição, Coluna 3: Valor (1.234,56 ou 1234.56)**.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-text-main-light dark:text-text-main-dark text-sm font-bold mb-2 block">
                  Arquivo do Extrato
                </span>
                <Label
                  htmlFor="file-upload"
                  className="flex-1 flex flex-col items-center justify-center w-full min-h-[180px] rounded-xl border-2 border-dashed border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629]/50 hover:bg-primary-new/5 hover:border-primary-new dark:hover:border-primary-new/50 transition-all cursor-pointer group"
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className="size-12 rounded-full bg-card-light dark:bg-[#1e1629] shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <CloudUpload className="text-primary-new" size={24} />
                    </div>
                    <p className="mb-2 text-sm text-text-main-light dark:text-text-main-dark font-medium">
                      <span className="font-bold text-primary-new">Clique para enviar</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                      OFX, CSV ou XLS (max. 10MB)
                    </p>
                  </div>
                  <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".ofx,.csv,.xls,.xlsx" />
                </Label>
                {selectedFile && (
                  <div className="mt-2 flex items-center justify-between text-sm text-text-main-light dark:text-text-main-dark">
                    <span>Arquivo selecionado: <span className="font-bold">{selectedFile.name}</span> ({Math.round(selectedFile.size / 1024)} KB)</span>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="text-red-500 hover:bg-red-100">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {lastSelectedFileName && !selectedFile && (
                  <div className="mt-2 flex items-center justify-between text-sm text-text-main-light dark:text-text-main-dark">
                    <span>Último arquivo: <span className="font-bold">{lastSelectedFileName}</span> ({lastSelectedFileSize ? `${Math.round(lastSelectedFileSize / 1024)} KB` : 'Tamanho desconhecido'})</span>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="text-red-500 hover:bg-red-100">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {fileError && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4" /> {fileError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Preview and Confirmation */}
          {uploadStep === 'preview' && (
            <>
              {/* AI Classification Card */}
              <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl shadow-soft border border-border-light dark:border-[#2d2438] p-6">
                <CardHeader className="flex-row items-center justify-between p-0 pb-4 border-b border-border-light dark:border-[#2d2438]">
                  <CardTitle className="text-text-main-light dark:text-text-main-dark text-lg font-bold flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-new" /> Classificação Inteligente
                  </CardTitle>
                  <Switch
                    checked={useAiClassification}
                    onCheckedChange={setUseAiClassification}
                    disabled={loading || isImporting}
                  />
                </CardHeader>
                <CardContent className="p-0 pt-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  <p>Usamos inteligência artificial para classificar seus lançamentos automaticamente, reutilizando categorias já usadas anteriormente.</p>
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-primary-new">
                    IA {useAiClassification ? 'Ativada' : 'Desativada'}
                  </p>
                </CardContent>
              </Card>

              {/* Preview Section */}
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
                    Lançamentos Encontrados
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-primary-new/10 text-primary-new">
                      {processedTransactions.length}
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setProcessedTransactions(prev => prev.map(tx => ({ ...tx, ignore: false })))} className="text-xs font-medium text-text-secondary-light hover:text-primary-new transition-colors">
                      Desmarcar Todos
                    </Button>
                    <Button variant="ghost" onClick={() => setProcessedTransactions(prev => prev.map(tx => ({ ...tx, ignore: true })))} className="text-xs font-medium text-text-secondary-light hover:text-primary-new transition-colors">
                      Ignorar Todos
                    </Button>
                  </div>
                </div>
                {/* Table Wrapper */}
                <div className="overflow-x-auto rounded-xl border border-border-light dark:border-[#3a3045]">
                  <Table className="min-w-[850px]">
                    <TableHeader>
                      <TableRow className="bg-background-light dark:bg-[#1e1629] border-b border-border-light dark:border-[#3a3045]">
                        <TableHead className="w-[100px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                          Data
                        </TableHead>
                        <TableHead className="flex-1 min-w-[200px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                          Descrição
                        </TableHead>
                        <TableHead className="w-[220px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                          Categoria / Conta
                        </TableHead>
                        <TableHead className="w-[120px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider text-right">
                          Valor
                        </TableHead>
                        <TableHead className="w-[110px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider text-center">
                          Status
                        </TableHead>
                        <TableHead className="w-[80px] px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider text-center">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border-light dark:divide-[#3a3045]">
                      {processedTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-text-secondary-light dark:text-text-secondary-dark">
                            Nenhum lançamento para pré-visualizar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        processedTransactions.map((transaction) => (
                          <TableRow key={transaction.id} className={cn(`hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors`,
                            transaction.status === 'duplicate' && 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20',
                            transaction.ignore && 'opacity-50'
                          )}>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-text-main-light dark:text-text-main-dark font-medium">
                              {format(parseDateString(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-text-main-light dark:text-text-main-dark">
                              {transaction.description}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-2">
                                <Select
                                  value={transaction.suggestedCategoryId || ''}
                                  onValueChange={(value) => {
                                    setProcessedTransactions(prev => prev.map(tx =>
                                      tx.id === transaction.id
                                        ? { ...tx, suggestedCategoryId: value, suggestedCategoryName: categories.find(c => c.cat_id === value)?.cat_nome || null }
                                        : tx
                                    ));
                                  }}
                                  disabled={transaction.ignore}
                                >
                                  <SelectTrigger className="w-[200px] h-8 rounded-lg text-xs bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#3a3045]">
                                    <SelectValue placeholder="Selecione Categoria" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-card-light dark:bg-card-dark z-50" position="popper" sideOffset={5}>
                                    {uniqueCategories.map(cat => (
                                      <SelectItem key={cat.cat_id} value={cat.cat_id}>{cat.cat_nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {transaction.suggestedCategoryId === systemCategories.transferenciaId && (
                                  <Select
                                    key={`${transaction.id}-linked-account`} {/* Adicionando key aqui */}
                                    value={transaction.selectedLinkedAccountId || ''}
                                    onValueChange={(value) => {
                                      setProcessedTransactions(prev => prev.map(tx =>
                                        tx.id === transaction.id ? { ...tx, selectedLinkedAccountId: value } : tx
                                      ));
                                    }}
                                    disabled={transaction.ignore}
                                  >
                                    <SelectTrigger className="w-[200px] h-8 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold">
                                      <SelectValue placeholder="Selecionar Conta Vinculada" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card-light dark:bg-card-dark z-50" position="popper" sideOffset={5}>
                                      {accounts.filter(acc => acc.con_id !== selectedAccountId).map(acc => (
                                        <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right font-mono ${
                              transaction.value > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(transaction.value)}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                              {transaction.status === 'new' && !transaction.ignore ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <Check className="w-3 h-3" /> Novo
                                </span>
                              ) : transaction.status === 'duplicate' && !transaction.ignore ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  <Info className="w-3 h-3" /> Duplicado (Importar)
                                </span>
                              ) : transaction.status === 'duplicate' && transaction.ignore ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                  <Info className="w-3 h-3" /> Duplicado (Ignorado)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                  <XCircle className="w-3 h-3" /> Ignorado
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProcessedTransactions(prev => prev.map(tx =>
                                  tx.id === transaction.id ? { ...tx, ignore: !tx.ignore } : tx
                                ))}
                                className={cn("h-8 w-8", transaction.ignore ? "text-red-500 hover:bg-red-100" : "text-green-500 hover:bg-green-100")}
                              >
                                {transaction.ignore ? <XCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary for Confirmation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-background-light dark:bg-[#2d2438] p-4 rounded-xl border border-border-light dark:border-[#3a3045]">
                  <p className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">A Importar</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{totalToImport}</p>
                </Card>
                <Card className="bg-background-light dark:bg-[#2d2438] p-4 rounded-xl border border-border-light dark:border-[#3a3045]">
                  <p className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">Duplicados</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">{totalDuplicates}</p>
                </Card>
                <Card className="bg-background-light dark:bg-[#2d2438] p-4 rounded-xl border border-border-light dark:border-[#3a3045]">
                  <p className="text-xs font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">Ignorados</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-2">{totalIgnored}</p>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border-light dark:border-[#2d2438]">
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Saldo do Arquivo (Lançamentos Válidos)</p>
                  <p className="text-xl font-black text-primary-new dark:text-white">{formatCurrency(previewBalance)}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleRemoveFile} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-transparent text-sm font-bold text-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={isImporting || totalToImport === 0}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-new hover:bg-primary-new/90 text-white shadow-lg shadow-primary-new/30 text-sm font-bold transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        Importar {totalToImport} Lançamentos
                        <ArrowDown className="h-4 w-4 rotate-180" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>

        {/* Footer for Upload Step */}
        {uploadStep === 'upload' && (
          <div className="px-6 py-4 md:px-8 bg-background-light dark:bg-[#1e1429] border-t border-border-light dark:border-[#3a3045] flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="outline" onClick={handleRemoveFile} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-transparent text-sm font-bold text-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              Cancelar
            </Button>
            <Button
              onClick={handleProcessFile}
              disabled={!selectedFile || !selectedAccountId || loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-new hover:bg-primary-new/90 text-white shadow-lg shadow-primary-new/30 text-sm font-bold transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Pré-visualizar Extrato
                  <ArrowDown className="h-4 w-4 rotate-180" />
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex justify-center gap-6 text-sm text-text-secondary-light dark:text-text-secondary-dark pt-8">
        <a className="hover:underline" href="#">Ajuda</a>
        <a className="hover:underline" href="#">Privacidade</a>
        <a className="hover:underline" href="#">Termos</a>
      </div>
    </div>
  );
};

export default ImportacaoExtratos;