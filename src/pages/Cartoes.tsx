"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { CreditCard, Landmark, ReceiptText, Wallet, Plus, ArrowRight, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PagamentoFaturaModal from '@/components/lancamentos/PagamentoFaturaModal';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const Cartoes = () => {
  const { user } = useAuth();
  const [pagamentoFaturaModalOpen, setPagamentoFaturaModalOpen] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<string | undefined>(undefined);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [creditCardAccounts, setCreditCardAccounts] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [systemCategories, setSystemCategories] = useState({
    transferenciaId: null as string | null,
    pagamentoFaturaId: null as string | null,
  });

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;
      setGroupId(userData.usu_grupo);

      const [aData, cData] = await Promise.all([
        supabase.from('contas').select('*').eq('con_grupo', userData.usu_grupo),
        supabase.from('categorias').select('*').eq('cat_grupo', userData.usu_grupo)
      ]);

      setAccounts(aData.data || []);
      setCreditCardAccounts(aData.data?.filter((acc: any) => acc.con_tipo === 'cartao') || []);

      const transferenciaCat = cData.data?.find((cat: any) => cat.cat_nome === 'Transferência entre Contas' && cat.cat_tipo === 'sistema');
      const pagamentoFaturaCat = cData.data?.find((cat: any) => cat.cat_nome === 'Pagamento de Fatura' && cat.cat_tipo === 'sistema');
      
      setSystemCategories({
        transferenciaId: transferenciaCat?.cat_id || null,
        pagamentoFaturaId: pagamentoFaturaCat?.cat_id || null,
      });

    } catch (error) {
      console.error("[Cartoes] Error fetching initial data:", error);
      showError('Erro ao carregar dados das contas.');
    }
  };

  const handleOpenPaymentModal = (cardId: string) => {
    setSelectedCardForPayment(cardId);
    setPagamentoFaturaModalOpen(true);
  };

  return (
    <MainLayout title="Meus Cartões">
      <div className="mx-auto max-w-[1200px] flex flex-col gap-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[#756189] text-sm font-medium">Gerenciamento</p>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[#141118] dark:text-white">Visão Geral de Crédito</h1>
          </div>
          <Button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:translate-y-0">
            <Plus className="w-5 h-5" /> Adicionar Cartão
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Landmark className="w-5 h-5" />
              </div>
              <span className="text-[#756189] font-medium text-sm">Limite Total Ativo</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#141118] dark:text-white">R$ 82.000,00</span>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[#078847] text-xs font-bold bg-[#078847]/10 px-2 py-1 rounded-md w-fit flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +5% esse mês
              </span>
              <span className="text-[#9ca3af] text-[10px] italic">Considera apenas cartões ativos</span>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                <ReceiptText className="w-5 h-5" />
              </div>
              <span className="text-[#756189] font-medium text-sm">Faturas Abertas</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#141118] dark:text-white">R$ 18.250,00</span>
            <span className="text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded-md w-fit">Vencem em 5 dias</span>
          </Card>

          <Card className="bg-white dark:bg-[#1e1629] p-6 rounded-2xl border border-[#f2f0f4] dark:border-[#2d2438] shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 rounded-lg text-green-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[#756189] font-medium text-sm">Disponível para uso</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#141118] dark:text-white">R$ 63.750,00</span>
            <span className="text-[#756189] text-xs">77% do limite livre</span>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#141118] dark:text-white">Seus Cartões</h3>
            <Button variant="link" className="text-sm font-semibold text-primary hover:text-primary/80">Gerenciar ordem</Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {creditCardAccounts.map((card, i) => (
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
                      <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border", 
                        true ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100' // Placeholder for status
                      )}>Fatura aberta</span> {/* Placeholder */}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-[#756189]">Utilizado</span>
                      <span className="text-[#141118] dark:text-white">R$ 4.500,00</span> {/* Placeholder */}
                    </div>
                    <div className="h-3 w-full bg-[#f2f0f4] dark:bg-[#3a3045] rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '45%' }}></div> {/* Placeholder */}
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-[#756189]">Limite Total: R$ 10.000,00</span> {/* Placeholder */}
                      <span className="text-[#078847] font-bold">Disponível: R$ 5.500,00</span> {/* Placeholder */}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[#f2f0f4] dark:border-[#2d2438] relative z-10">
                  <div className="flex gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#756189]">Fechamento</span>
                      <span className="text-sm font-medium text-[#141118] dark:text-white">08 OUT</span> {/* Placeholder */}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#756189]">Vencimento</span>
                      <span className="text-sm font-bold text-[#141118] dark:text-white">15 OUT</span> {/* Placeholder */}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleOpenPaymentModal(card.con_id)}
                    className="flex items-center gap-2 text-sm font-bold text-[#141118] dark:text-white bg-[#f2f0f4] dark:bg-[#3a3045] hover:bg-[#e8e6eb] px-4 py-2 rounded-xl transition-colors"
                  >
                    Pagar Fatura <DollarSign className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
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
        initialCardId={selectedCardForPayment}
      />
    </MainLayout>
  );
};

export default Cartoes;