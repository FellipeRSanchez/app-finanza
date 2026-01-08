"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { showError, showSuccess } from '@/utils/toast';

interface AddInvestmentFormProps {
  onInvestmentAdded: () => void;
  hideValues?: boolean; // Added hideValues prop
}

const AddInvestmentForm = ({ onInvestmentAdded, hideValues }: AddInvestmentFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [investmentAccounts, setInvestmentAccounts] = useState<any[]>([]);
  
  const [invSymbol, setInvSymbol] = useState('');
  const [invName, setInvName] = useState('');
  const [invType, setInvType] = useState('');
  const [invAvgPrice, setInvAvgPrice] = useState('');
  const [invCurrentValue, setInvCurrentValue] = useState('');
  const [invPerformanceValue, setInvPerformanceValue] = useState('');
  const [invPerformancePercent, setInvPerformancePercent] = useState('');
  const [invContaId, setInvContaId] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      fetchInvestmentAccounts();
    }
  }, [user, isOpen]);

  const fetchInvestmentAccounts = async () => {
    if (!user) return;
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { data, error } = await supabase
        .from('contas')
        .select('con_id, con_nome')
        .eq('con_grupo', userData.usu_grupo)
        .eq('con_tipo', 'investimento'); // Fetch only accounts of type 'investimento'

      if (error) throw error;
      setInvestmentAccounts(data || []);
      if (data && data.length > 0 && !invContaId) {
        setInvContaId(data[0].con_id); // Set default if not already set
      }
    } catch (error) {
      console.error('Error fetching investment accounts:', error);
      showError('Erro ao carregar contas de investimento.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate inputs
      if (!invSymbol || !invName || !invType || !invContaId) {
        showError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      
      const avgPriceNum = parseFloat(invAvgPrice) || 0;
      const currentValueNum = parseFloat(invCurrentValue) || 0;
      const performanceValueNum = parseFloat(invPerformanceValue) || 0;
      const performancePercentNum = parseFloat(invPerformancePercent) || 0;
      
      // Calculate positive status
      const positive = performanceValueNum >= 0;
      
      // Insert into Supabase
      const { error } = await supabase
        .from('investimentos')
        .insert({
          user_id: user?.id,
          inv_conta_id: invContaId,
          inv_symbol: invSymbol,
          inv_name: invName,
          inv_type: invType,
          inv_avg_price: avgPriceNum,
          inv_current_value: currentValueNum,
          inv_performance_value: performanceValueNum,
          inv_performance_percent: performancePercentNum,
          inv_positive: positive
        });
        
      if (error) throw error;
      
      showSuccess('Investimento adicionado com sucesso!');
      onInvestmentAdded(); // Refresh the investment list
      setIsOpen(false); // Close the dialog
      
      // Reset form
      setInvSymbol('');
      setInvName('');
      setInvType('');
      setInvAvgPrice('');
      setInvCurrentValue('');
      setInvPerformanceValue('');
      setInvPerformancePercent('');
      setInvContaId('');
    } catch (error) {
      console.error('Error adding investment:', error);
      showError('Erro ao adicionar investimento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-new px-5 text-sm font-semibold text-white shadow-lg shadow-primary-new/30 transition-all hover:bg-primary-new/90 focus:ring-2 focus:ring-primary-new focus:ring-offset-2 dark:focus:ring-offset-[#191022]">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Novo Aporte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card-light dark:bg-[#1e1629] border border-border-light dark:border-[#2d2438]">
        <DialogHeader>
          <DialogTitle className="text-text-main-light dark:text-text-main-dark">Adicionar Novo Investimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invContaId" className="text-text-main-light dark:text-text-main-dark">Conta de Investimento *</Label>
            <Select value={invContaId} onValueChange={setInvContaId} required>
              <SelectTrigger className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark">
                <SelectValue placeholder="Selecione a conta de investimento" />
              </SelectTrigger>
              <SelectContent>
                {investmentAccounts.map(account => (
                  <SelectItem key={account.con_id} value={account.con_id}>{account.con_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invSymbol" className="text-text-main-light dark:text-text-main-dark">Símbolo *</Label>
            <Input
              id="invSymbol"
              value={invSymbol}
              onChange={(e) => setInvSymbol(e.target.value)}
              placeholder="Ex: AAPL34"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invName" className="text-text-main-light dark:text-text-main-dark">Nome *</Label>
            <Input
              id="invName"
              value={invName}
              onChange={(e) => setInvName(e.target.value)}
              placeholder="Ex: Apple Inc."
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invType" className="text-text-main-light dark:text-text-main-dark">Tipo *</Label>
            <Select value={invType} onValueChange={setInvType} required>
              <SelectTrigger className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ações BDR">Ações BDR</SelectItem>
                <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                <SelectItem value="Ações Brasil">Ações Brasil</SelectItem>
                <SelectItem value="Cripto">Cripto</SelectItem>
                <SelectItem value="FIIs">FIIs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invAvgPrice" className="text-text-main-light dark:text-text-main-dark">Preço Médio (R$)</Label>
            <Input
              id="invAvgPrice"
              type="number"
              value={invAvgPrice}
              onChange={(e) => setInvAvgPrice(e.target.value)}
              placeholder="Ex: 42.50"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invCurrentValue" className="text-text-main-light dark:text-text-main-dark">Saldo Atual (R$)</Label>
            <Input
              id="invCurrentValue"
              type="number"
              value={invCurrentValue}
              onChange={(e) => setInvCurrentValue(e.target.value)}
              placeholder="Ex: 18450.00"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invPerformanceValue" className="text-text-main-light dark:text-text-main-dark">Rentabilidade (R$)</Label>
            <Input
              id="invPerformanceValue"
              type="number"
              value={invPerformanceValue}
              onChange={(e) => setInvPerformanceValue(e.target.value)}
              placeholder="Ex: 2450.00"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invPerformancePercent" className="text-text-main-light dark:text-text-main-dark">Rentabilidade (%)</Label>
            <Input
              id="invPerformancePercent"
              type="number"
              value={invPerformancePercent}
              onChange={(e) => setInvPerformancePercent(e.target.value)}
              placeholder="Ex: 15.31"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark hover:bg-background-light dark:hover:bg-[#2d2438]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary-new hover:bg-primary-new/90 text-white"
            >
              {loading ? 'Adicionando...' : 'Adicionar Investimento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddInvestmentForm;