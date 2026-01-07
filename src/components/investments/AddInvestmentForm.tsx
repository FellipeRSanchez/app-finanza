"use client";

import { useState } from 'react';
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
}

const AddInvestmentForm = ({ onInvestmentAdded }: AddInvestmentFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [performanceValue, setPerformanceValue] = useState('');
  const [performancePercent, setPerformancePercent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate inputs
      if (!symbol || !name || !type) {
        showError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      
      const avgPriceNum = parseFloat(avgPrice) || 0;
      const currentValueNum = parseFloat(currentValue) || 0;
      const performanceValueNum = parseFloat(performanceValue) || 0;
      const performancePercentNum = parseFloat(performancePercent) || 0;
      
      // Calculate positive status
      const positive = performanceValueNum >= 0;
      
      // Insert into Supabase
      const { error } = await supabase
        .from('investimentos')
        .insert({
          user_id: user?.id,
          symbol,
          name,
          type,
          avg_price: avgPriceNum,
          current_value: currentValueNum,
          performance_value: performanceValueNum,
          performance_percent: performancePercentNum,
          positive
        });
        
      if (error) throw error;
      
      showSuccess('Investimento adicionado com sucesso!');
      onInvestmentAdded(); // Refresh the investment list
      setIsOpen(false); // Close the dialog
      
      // Reset form
      setSymbol('');
      setName('');
      setType('');
      setAvgPrice('');
      setCurrentValue('');
      setPerformanceValue('');
      setPerformancePercent('');
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
            <Label htmlFor="symbol" className="text-text-main-light dark:text-text-main-dark">Símbolo *</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Ex: AAPL34"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name" className="text-text-main-light dark:text-text-main-dark">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Apple Inc."
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type" className="text-text-main-light dark:text-text-main-dark">Tipo *</Label>
            <Select value={type} onValueChange={setType} required>
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
            <Label htmlFor="avgPrice" className="text-text-main-light dark:text-text-main-dark">Preço Médio (R$)</Label>
            <Input
              id="avgPrice"
              type="number"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              placeholder="Ex: 42.50"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentValue" className="text-text-main-light dark:text-text-main-dark">Saldo Atual (R$)</Label>
            <Input
              id="currentValue"
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="Ex: 18450.00"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="performanceValue" className="text-text-main-light dark:text-text-main-dark">Rentabilidade (R$)</Label>
            <Input
              id="performanceValue"
              type="number"
              value={performanceValue}
              onChange={(e) => setPerformanceValue(e.target.value)}
              placeholder="Ex: 2450.00"
              className="bg-background-light dark:bg-[#1e1629] border-border-light dark:border-[#2d2438] text-text-main-light dark:text-text-main-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="performancePercent" className="text-text-main-light dark:text-text-main-dark">Rentabilidade (%)</Label>
            <Input
              id="performancePercent"
              type="number"
              value={performancePercent}
              onChange={(e) => setPerformancePercent(e.target.value)}
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