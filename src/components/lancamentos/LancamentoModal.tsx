"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';

interface LancamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lancamento?: any;
  categories: any[];
  accounts: any[];
  userId: string;
  grupoId: string;
}

const LancamentoModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  lancamento, 
  categories, 
  accounts,
  userId,
  grupoId
}: LancamentoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lan_data: new Date().toISOString().split('T')[0],
    lan_descricao: '',
    lan_valor: '',
    lan_categoria: '',
    lan_conta: '',
    lan_conciliado: false,
    cat_tipo: 'despesa' // This will be 'receita' or 'despesa' based on user selection
  });

  useEffect(() => {
    if (lancamento) {
      // When editing, derive cat_tipo from lan_valor sign
      const isIncome = lancamento.lan_valor > 0;
      setFormData({
        lan_data: lancamento.lan_data,
        lan_descricao: lancamento.lan_descricao || '',
        lan_valor: Math.abs(lancamento.lan_valor).toString(), // Always display positive in input
        lan_categoria: lancamento.lan_categoria || '',
        lan_conta: lancamento.lan_conta || '',
        lan_conciliado: lancamento.lan_conciliado || false,
        cat_tipo: isIncome ? 'receita' : 'despesa'
      });
    } else {
      setFormData({
        lan_data: new Date().toISOString().split('T')[0],
        lan_descricao: '',
        lan_valor: '',
        lan_categoria: '',
        lan_conta: '',
        lan_conciliado: false,
        cat_tipo: 'despesa' // Default for new transactions
      });
    }
  }, [lancamento, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valor = parseFloat(formData.lan_valor);
      // Determine final value sign based on selected cat_tipo in the modal
      const finalValor = formData.cat_tipo === 'receita' ? Math.abs(valor) : -Math.abs(valor);

      const payload = {
        lan_data: formData.lan_data,
        lan_descricao: formData.lan_descricao,
        lan_valor: finalValor,
        lan_categoria: formData.lan_categoria,
        lan_conta: formData.lan_conta,
        lan_conciliado: formData.lan_conciliado,
        lan_grupo: grupoId
      };

      if (lancamento) {
        const { error } = await supabase
          .from('lancamentos')
          .update(payload)
          .eq('lan_id', lancamento.lan_id);
        if (error) throw error;
        showSuccess('Lançamento atualizado!');
      } else {
        const { error } = await supabase
          .from('lancamentos')
          .insert([payload]);
        if (error) throw error;
        showSuccess('Lançamento criado!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.cat_tipo === formData.cat_tipo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {lancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Data</Label>
              <Input 
                type="date" 
                value={formData.lan_data} 
                onChange={e => setFormData({...formData, lan_data: e.target.value})}
                required
                className="rounded-xl border-border-light bg-background-light/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Tipo</Label>
              <Select 
                value={formData.cat_tipo} 
                onValueChange={val => {
                  setFormData(prev => ({
                    ...prev, 
                    cat_tipo: val, 
                    lan_categoria: '' // Reset category when type changes
                  }));
                }}
              >
                <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg rounded-xl">
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Descrição</Label>
            <Input 
              value={formData.lan_descricao} 
              onChange={e => setFormData({...formData, lan_descricao: e.target.value})}
              placeholder="Ex: Aluguel, Salário..."
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.lan_valor} 
              onChange={e => setFormData({...formData, lan_valor: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Conta</Label>
              <Select 
                value={formData.lan_conta} 
                onValueChange={val => setFormData({...formData, lan_conta: val})}
                required
              >
                <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg rounded-xl">
                  {accounts.map(acc => (
                    <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Categoria</Label>
              <Select 
                value={formData.lan_categoria} 
                onValueChange={val => setFormData({...formData, lan_categoria: val})}
                required
              >
                <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg rounded-xl">
                  {filteredCategories.map(cat => (
                    <SelectItem key={cat.cat_id} value={cat.cat_id}>{cat.cat_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Status</Label>
            <Select 
              value={formData.lan_conciliado ? "true" : "false"} 
              onValueChange={val => setFormData({...formData, lan_conciliado: val === "true"})}
            >
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                <SelectItem value="true">Confirmado</SelectItem>
                <SelectItem value="false">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/25"
            >
              {loading ? 'Salvando...' : 'Salvar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LancamentoModal;