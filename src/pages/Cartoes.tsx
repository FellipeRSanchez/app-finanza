"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { CreditCard, Landmark, ReceiptText, Wallet, Plus, ArrowRight, TrendingUp, DollarSign, Settings, Trash2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PagamentoFaturaModal from '@/components/lancamentos/PagamentoFaturaModal';
import ContaModal from '@/components/contas/ContaModal'; // Import ContaModal
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { format, addMonths, subMonths, isBefore, isAfter, parseISO, getDay, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CardAccount {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_banco: string | null;
  con_limite: number;
  con_data_fechamento: number | null;
  con_data_vencimento: number | null;
  saldoAtual: number; // Calculated from lancamentos
  faturaAtual: number; // Calculated based on billing cycle
  faturaVencimento: Date | null;
  faturaFechamento: Date | null;
  faturaStatus: 'aberta' | 'fechada' | 'paga' | 'vencida';
  diasParaVencimento: number | null;
}

const Cartoes = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pagamentoFaturaModalOpen, setPagamentoFaturaModalOpen] = useState(false);
  const [contaModalOpen, setContaModalOpen] = useState(false); // State for ContaModal
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<CardAccount | undefined>(undefined);
  const [editingConta, setEditingConta] = useState<any>(null); // State for editing account
  const [accounts, setAccounts] = useState<any[]>([]); // All accounts
  const [creditCardAccounts, setCreditCardAccounts] = useState<CardAccount[]>([]); // Only credit card accounts
  const [groupId, setGroupId] = useState('');
  const [systemCategories, setSystemCategories] = useState({
    transferenciaId: null as string | null,
    pagamentoFaturaId: null as string | null,
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) {
        setLoading(false);
        return;
      }
      setGroupId(userData.usu_grupo);

      const [allAccountsData, categoriesData, lancamentosData] = await Promise.all([
        supabase.from('contas').select('*').eq('con_grupo', userData.usu_grupo),
        supabase.from('categorias').select('*').eq('cat_grupo', userData.usu_grupo),
        supabase.from('lancamentos').select('lan_valor, lan_data, lan_conta, lan_conciliado, lan_pagamento').eq('lan_grupo', userData.usu_grupo),
      ]);

      if (allAccountsData.error) throw allAccountsData.error;
      if (categoriesData.error) throw categoriesData.error;
      if (lancamentosData.error) throw lancamentosData.error;

      setAccounts(allAccountsData.data || []);

      const transferenciaCat = categoriesData.data?.find((cat: any) => cat.cat_nome === 'Transferência entre Contas' && cat.cat_tipo === 'sistema');
      const pagamentoFaturaCat = categoriesData.data?.find((cat: any) => cat.cat_nome === 'Pagamento de Fatura' && cat.cat_tipo === 'sistema');
      
      setSystemCategories({
        transferenciaId: transferenciaCat?.cat_id || null,
        pagamentoFaturaId: pagamentoFaturaCat?.cat_id || null,
      });

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      const processedCreditCards: CardAccount[] = (allAccountsData.data || [])
        .filter((acc: any) => acc.con_tipo === 'cartao')
        .map((card: any) => {
          const limite = Number(card.con_limite || 0);
          const diaFechamento = card.con_data_fechamento;
          const diaVencimento = card.con_data_vencimento;

          let faturaFechamento: Date | null = null;
          let faturaVencimento: Date | null = null;
          let faturaAtual = 0;
          let faturaStatus: 'aberta' | 'fechada' | 'paga' | 'vencida' = 'aberta';
          let diasParaVencimento: number | null = null;

          if (diaFechamento && diaVencimento) {
            // Determine current billing cycle
            let cycleStartDate: Date;
            let cycleEndDate: Date;
            let invoiceDueDate: Date;

            const currentMonthFechamento = new Date(currentYear, currentMonth, diaFechamento);
            const lastMonthFechamento = new Date(currentYear, currentMonth - 1, diaFechamento);

            if (today.getDate() > diaFechamento) {
              // Current cycle started last month, closes this month
              cycleStartDate = addMonths(new Date(currentYear, currentMonth - 1, diaFechamento + 1), 0);
              cycleEndDate = new Date(currentYear, currentMonth, diaFechamento);
              invoiceDueDate = new Date(currentYear, currentMonth + 1, diaVencimento);
            } else {
              // Current cycle started two months ago, closes last month
              cycleStartDate = addMonths(new Date(currentYear, currentMonth - 2, diaFechamento + 1), 0);
              cycleEndDate = new Date(currentYear, currentMonth - 1, diaFechamento);
              invoiceDueDate = new Date(currentYear, currentMonth, diaVencimento);
            }
            
            faturaFechamento = cycleEndDate;
            faturaVencimento = invoiceDueDate;

            // Calculate current invoice amount (unpaid transactions within the cycle)
            const cardTransactions = (lancamentosData.data || []).filter(
              (lan: any) => lan.lan_conta === card.con_id &&
              isAfter(parseISO(lan.lan_data), cycleStartDate) &&
              isBefore(parseISO(lan.lan_data), addMonths(cycleEndDate, 1)) && // Include transactions up to the closing date
              !lan.lan_pagamento // Exclude transactions that are part of a payment
            );

            faturaAtual = cardTransactions.reduce((sum, lan) => sum + Number(lan.lan_valor), 0);

            // Determine invoice status
            if (faturaAtual === 0) {
              faturaStatus = 'paga';
            } else if (isBefore(today, faturaFechamento)) {
              faturaStatus = 'aberta';
            } else if (isAfter(today, faturaVencimento)) {
              faturaStatus = 'vencida';
            } else {
              faturaStatus = 'fechada';
            }

            diasParaVencimento = Math.ceil((faturaVencimento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }

          // Calculate total balance (sum of all transactions for the card)
          const totalCardBalance = (lancamentosData.data || [])
            .filter((lan: any) => lan.lan_conta === card.con_id)
            .reduce((sum, lan) => sum + Number(lan.lan_valor), 0);

          return {
            ...card,
            saldoAtual: totalCardBalance, // This is the total outstanding balance
            faturaAtual: faturaAtual,
            faturaVencimento: faturaVencimento,
            faturaFechamento: faturaFechamento,
            faturaStatus: faturaStatus,
            diasParaVencimento: diasParaVencimento,
          };
        });
      setCreditCardAccounts(processedCreditCards);

    } catch (error) {
      console.error("[Cartoes] Error fetching initial data:", error);
      showError('Erro ao carregar dados das contas.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (card: CardAccount) => {
    setSelectedCardForPayment(card);
    setPagamentoFaturaModalOpen(true);
  };

  const handleOpenAddCardModal = () => {
    setEditingConta(null); // Clear any previous editing state
    setContaModalOpen(true);
  };

  const handleEditCard = (card: CardAccount) => {
    setEditingConta(card);
    setContaModalOpen(true);
  };

  const handleOpenDeleteConfirm = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('contas')
        .delete()
        .eq('con_id', deleteTarget.id);

      if (error) throw error;
      showSuccess(`${deleteTarget.name} excluído com sucesso!`);
      fetchInitialData(); // Refresh data
    } catch (error) {
      console.error("Erro ao excluir cartão:", error);
      showError(`Erro ao excluir ${deleteTarget.name}.`);
    } finally {
      setDeleteConfirmOpen(false);
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calculate summary metrics
  const totalLimiteAtivo = creditCardAccounts.reduce((sum, card) => sum + Number(card.con_limite || 0), 0);
  const faturaAtualEmAberto = creditCardAccounts.reduce((sum, card) => {
    // Only sum if status is 'aberta' or 'fechada' (not paid or overdue)
    if (card.faturaStatus === 'aberta' || card.faturaStatus === 'fechada' || card.faturaStatus === 'vencida') {
      return sum + Math.abs(card.faturaAtual);
    }
    return sum;
  }, 0);
  const disponivelParaUso = totalLimiteAtivo - faturaAtualEmAberto;
  const percentualLivre = totalLimiteAtivo > 0 ? (disponivelParaUso / totalLimiteAtivo) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[1200px] flex flex-col gap-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[#756189] text-sm font-medium">Gerenciamento</p>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[#141118] dark:text-white">Visão Geral de Crédito</h1>
          </div>
          <Button 
            onClick={handleOpenAddCardModal}
            className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            <Plus className="w-5 h-5" /> Adicionar Cartão
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Card 1: Limite Total Ativo */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Landmark className="w-5 h-5" />
              </div>
              <span className="text-[#756189] font-medium text-sm">Limite Total Ativo</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#141118] dark:text-white">{formatCurrency(totalLimiteAtivo)}</span>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[#078847] text-xs font-bold bg-[#078847]/10 px-2 py-1 rounded-md w-fit flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +5% esse mês {/* Placeholder */}
              </span>
              <span className="text-[#9ca3af] text-[10px] italic">Considera apenas cartões ativos</span>
            </div>
          </Card>

          {/* Card 2: Fatura Atual em Aberto */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                <ReceiptText className="w-5 h-5" />
              </div>
              <span className="text-[#756189] font-medium text-sm">Fatura Atual em Aberto</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#141118] dark:text-white">{formatCurrency(faturaAtualEmAberto)}</span>
            {creditCardAccounts.some(card => card.faturaStatus === 'vencida') ? (
              <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-md w-fit">Faturas vencidas!</span>
            ) : creditCardAccounts.some(card => card.diasParaVencimento !== null && card.diasParaVencimento <= 7 && card.diasParaVencimento > 0) ? (
              <span className="text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded-md w-fit">Vencem em breve</span>
            ) : (
              <span className="text-[#9ca3af] text-[10px] italic">Refere-se apenas ao ciclo vigente</span>
            )}
          </Card>

          {/* Card 3: Disponível para Uso */}
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 rounded-lg text-green-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[#756189] font-medium text-sm">Disponível para Uso</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#141118] dark:text-white">{formatCurrency(disponivelParaUso)}</span>
            <span className="text-[#756189] text-xs">{percentualLivre.toFixed(0)}% do limite livre</span>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#141118] dark:text-white">Seus Cartões</h3>
            <Button variant="link" className="text-sm font-semibold text-primary hover:text-primary/80">Gerenciar ordem</Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {creditCardAccounts.length === 0 ? (
              <div className="col-span-full py-10 text-center bg-background-light/50 rounded-3xl border-2 border-dashed border-border-light dark:border-[#2d2438]">
                <AlertCircle className="mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-4" size={48} />
                <p className="text-sm font-bold text-[#756189] uppercase tracking-widest">Nenhum cartão de crédito cadastrado.</p>
              </div>
            ) : (
              creditCardAccounts.map((card) => {
                const isNegativeBalance = card.saldoAtual < 0;
                const utilizedPercentage = card.con_limite > 0 ? (Math.abs(card.faturaAtual) / card.con_limite) * 100 : 0;
                const availableLimit = card.con_limite + card.saldoAtual; // saldoAtual is negative for debt

                let statusClass = '';
                let statusText = '';
                switch (card.faturaStatus) {
                  case 'aberta':
                    statusClass = 'bg-blue-50 text-blue-700 border-blue-100';
                    statusText = 'Fatura aberta';
                    break;
                  case 'fechada':
                    statusClass = 'bg-orange-50 text-orange-700 border-orange-100';
                    statusText = 'Fatura fechada';
                    break;
                  case 'paga':
                    statusClass = 'bg-green-50 text-green-700 border-green-100';
                    statusText = 'Fatura paga';
                    break;
                  case 'vencida':
                    statusClass = 'bg-red-50 text-red-700 border-red-100';
                    statusText = 'Fatura vencida';
                    break;
                  default:
                    statusClass = 'bg-gray-100 text-gray-700 border-gray-200';
                    statusText = 'Status desconhecido';
                }

                return (
                  <Card key={card.con_id} className="bg-white dark:bg-[#1e1629] rounded-2xl p-6 shadow-sm border border-[#f2f0f4] dark:border-[#2d2438] hover:shadow-md transition-all group flex flex-col justify-between h-full relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-50 dark:bg-primary/5 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div>
                      <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-8 rounded flex items-center justify-center shadow-sm" 
                            style={{ backgroundColor: card.con_banco === 'Nubank' ? '#820AD1' : card.con_banco === 'XP' ? '#141118' : '#FF7A00' }}
                          >
                            <div className="flex -space-x-1.5">
                              <div className="w-3.5 h-3.5 rounded-full bg-red-500 opacity-90"></div>
                              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 opacity-90"></div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#141118] dark:text-white">{card.con_nome}</h4>
                            <p className="text-xs text-[#756189] font-medium tracking-wider">•••• {card.con_id.slice(-4)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-[#756189]">Física</span> {/* Placeholder */}
                          <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border", statusClass)}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mb-6">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-[#756189]">Utilizado</span>
                          <span className="text-[#141118] dark:text-white">{formatCurrency(Math.abs(card.faturaAtual))}</span>
                        </div>
                        <div className="h-3 w-full bg-[#f2f0f4] dark:bg-[#3a3045] rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(utilizedPercentage, 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-[#756189]">Limite Total: {formatCurrency(card.con_limite)}</span>
                          <span className="text-[#078847] font-bold">Disponível: {formatCurrency(availableLimit)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[#f2f0f4] dark:border-[#2d2438] relative z-10">
                      <div className="flex gap-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-[#756189]">Fechamento</span>
                          <span className="text-sm font-medium text-[#141118] dark:text-white">
                            {card.faturaFechamento ? format(card.faturaFechamento, 'dd MMM', { locale: ptBR }) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-[#756189]">Vencimento</span>
                          <span className={cn("text-sm font-bold text-[#141118] dark:text-white flex items-center gap-1", card.faturaStatus === 'vencida' && 'text-red-600')}>
                            {card.faturaVencimento ? format(card.faturaVencimento, 'dd MMM', { locale: ptBR }) : 'N/A'}
                            {card.faturaStatus === 'vencida' && <AlertCircle className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditCard(card); }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(card.con_id, card.con_nome); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleOpenPaymentModal(card)}
                          disabled={card.faturaAtual === 0 || card.faturaStatus === 'paga'}
                          className="flex items-center gap-2 text-sm font-bold text-[#141118] dark:text-white bg-[#f2f0f4] dark:bg-[#3a3045] hover:bg-[#e8e6eb] px-4 py-2 rounded-xl transition-colors"
                        >
                          Pagar Fatura <DollarSign className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <Card className="rounded-2xl border-2 border-dashed border-[#d1d5db] dark:border-[#3a3045] bg-[#f9fafb] dark:bg-[#1e1629]/50 p-8 flex flex-col items-center justify-center text-center gap-3 hover:bg-[#f3f4f6] dark:hover:bg-[#2d2438]/50 transition-colors cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-white dark:bg-[#2c2435] flex items-center justify-center shadow-sm text-[#756189] group-hover:text-primary group-hover:scale-110 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-[#141118] dark:text-white">Solicitar novo cartão</h4>
          <p className="text-[#756189] text-sm max-w-md">Compare os melhores cartões com cashback, milhas e benefícios exclusivos para seu perfil.</p>
        </Card>
      </div>

      <PagamentoFaturaModal
        open={pagamentoFaturaModalOpen}
        onOpenChange={setPagamentoFaturaModalOpen}
        onSuccess={fetchInitialData} // Refresh data after payment
        accounts={accounts}
        creditCardAccounts={creditCardAccounts}
        grupoId={groupId}
        systemCategories={systemCategories}
        initialCard={selectedCardForPayment}
        hideValues={hideValues}
      />
      <ContaModal
        open={contaModalOpen}
        onOpenChange={setContaModalOpen}
        onSuccess={fetchInitialData}
        conta={editingConta}
        grupoId={groupId}
        hideValues={hideValues}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white rounded-3xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-[#141118]">Excluir {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente "{deleteTarget?.name}" e todos os seus lançamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 text-white rounded-xl">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Cartoes;