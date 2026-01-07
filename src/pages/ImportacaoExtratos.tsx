"use client";
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, ArrowDown, Check, Info, CloudUpload } from 'lucide-react';
import { useState } from 'react';

const ImportacaoExtratos = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    
    setIsImporting(true);
    // Simulate import process
    setTimeout(() => {
      setIsImporting(false);
      alert('Importação concluída com sucesso!');
    }, 2000);
  };

  // Sample data for preview
  const sampleTransactions = [
    {
      id: 1,
      date: '12/10/2023',
      description: 'Uber *Trip Help.Uber',
      category: 'Transporte',
      value: '-R$ 24,90',
      status: 'Novo'
    },
    {
      id: 2,
      date: '12/10/2023',
      description: 'Spotify Family',
      category: 'Assinaturas',
      value: '-R$ 34,90',
      status: 'Duplicado'
    },
    {
      id: 3,
      date: '11/10/2023',
      description: 'PIX Recebido - João M.',
      category: 'Outras Receitas',
      value: '+R$ 150,00',
      status: 'Novo'
    },
    {
      id: 4,
      date: '10/10/2023',
      description: 'Supermercado Extra',
      category: 'Alimentação',
      value: '-R$ 450,25',
      status: 'Novo'
    }
  ];

  return (
    <MainLayout title="Importação de Extratos">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* Page Heading */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark text-sm mb-1">
            <a className="hover:text-primary-new" href="#">Financeiro</a>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
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
              <span className="size-6 rounded-full bg-primary-new text-white flex items-center justify-center text-xs">1</span>
              Upload e Configuração
            </div>
            <div className="flex-1 p-4 flex items-center justify-center gap-2 text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm">
              <span className="size-6 rounded-full bg-border-light dark:bg-[#3a3045] text-text-secondary-light dark:text-text-secondary-dark flex items-center justify-center text-xs">2</span>
              Confirmação
            </div>
          </div>

          <CardContent className="p-6 md:p-8 space-y-8">
            {/* Step 1: Configuration */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="block">
                  <span className="text-text-main-light dark:text-text-main-dark text-sm font-bold mb-2 block">
                    Conta Bancária de Destino
                  </span>
                  <Select>
                    <SelectTrigger className="w-full rounded-xl border-border-light dark:border-[#3a3045] bg-card-light dark:bg-[#1e1629] h-12 pl-4 pr-10 text-sm">
                      <SelectValue placeholder="Selecione uma conta..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nubank">NuBank - Conta Corrente</SelectItem>
                      <SelectItem value="itau">Itaú Personalité</SelectItem>
                      <SelectItem value="bradesco">Bradesco Prime</SelectItem>
                      <SelectItem value="wallet">Carteira Manual</SelectItem>
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
                      Para arquivos CSV, certifique-se que as colunas de data e valor estejam corretamente formatadas (dd/mm/aaaa).
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div className="flex flex-col">
                <span className="text-text-main-light dark:text-text-main-dark text-sm font-bold mb-2 block">
                  Arquivo do Extrato
                </span>
                <Label className="flex-1 flex flex-col items-center justify-center w-full min-h-[180px] rounded-xl border-2 border-dashed border-border-light dark:border-[#3a3045] bg-background-light/50 dark:bg-[#1e1629]/50 hover:bg-primary-new/5 hover:border-primary-new dark:hover:border-primary-new/50 transition-all cursor-pointer group">
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
                  <Input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".ofx,.csv,.xls,.xlsx"
                  />
                </Label>
                {selectedFile && (
                  <p className="mt-2 text-sm text-text-main-light dark:text-text-main-dark">
                    Arquivo selecionado: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-light dark:border-[#3a3045]"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card-light dark:bg-[#1e1629] px-3 text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1">
                  <ArrowDown size={16} />
                  Pré-visualização
                </span>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
                  Lançamentos Encontrados
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-primary-new/10 text-primary-new">
                    {sampleTransactions.length}
                  </span>
                </h3>
                <div className="flex gap-2">
                  <Button variant="ghost" className="text-xs font-medium text-text-secondary-light hover:text-primary-new transition-colors">
                    Limpar Tudo
                  </Button>
                </div>
              </div>

              {/* Table Wrapper */}
              <div className="overflow-x-auto rounded-xl border border-border-light dark:border-[#3a3045]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background-light dark:bg-[#1e1629] border-b border-border-light dark:border-[#3a3045]">
                      <TableHead className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                        Data
                      </TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                        Descrição
                      </TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                        Categoria
                      </TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider text-right">
                        Valor
                      </TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider text-center">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border-light dark:divide-[#3a3045]">
                    {sampleTransactions.map((transaction) => (
                      <TableRow 
                        key={transaction.id} 
                        className={`hover:bg-background-light dark:hover:bg-[#2d2438] transition-colors ${
                          transaction.status === 'Duplicado' ? 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20' : ''
                        }`}
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-text-main-light dark:text-text-main-dark font-medium">
                          {transaction.date}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-text-main-light dark:text-text-main-dark">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            {transaction.category}
                          </span>
                        </TableCell>
                        <TableCell className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right font-mono ${
                          transaction.value.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.value}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                          {transaction.status === 'Novo' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <span className="size-1.5 rounded-full bg-green-500"></span>
                              {transaction.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                              <Info size={14} />
                              {transaction.status}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>

          {/* Footer / Actions */}
          <div className="px-6 py-4 md:px-8 bg-background-light dark:bg-[#1e1629] border-t border-border-light dark:border-[#3a3045] flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="outline" className="w-full sm:w-auto px-6 py-3 rounded-xl border border-transparent text-sm font-bold text-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              Cancelar
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-new hover:bg-primary-new/90 text-white shadow-lg shadow-primary-new/30 text-sm font-bold transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : (
                <>
                  Importar {sampleTransactions.length} Lançamentos
                  <ArrowDown size={18} className="rotate-180" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Footer Links */}
        <div className="flex justify-center gap-6 text-sm text-text-secondary-light dark:text-text-secondary-dark pt-8">
          <a className="hover:underline" href="#">Ajuda</a>
          <a className="hover:underline" href="#">Privacidade</a>
          <a className="hover:underline" href="#">Termos</a>
        </div>
      </div>
    </MainLayout>
  );
};

export default ImportacaoExtratos;