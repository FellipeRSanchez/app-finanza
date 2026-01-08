"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess, showError } from '@/utils/toast';

interface EmprestimoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  emprestimo?: any;
  hideValues?: boolean; // Added hideValues prop
}

const EmprestimoModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  emprestimo,
  hideValues
}: EmprestimoModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emp_nome: '',
    emp_valor_total: '',
    emp_saldo_devedor: '',
    emp_parcela_mensal: '',
    emp_data_inicio: '',
    emp_data_fim: '',
    emp_instituicao: ''
  });

  useEffect(() => {
    if (open) {
      if (emprestimo) {
        setFormData({
          emp_nome: emprestimo.emp_nome || '',
          emp_valor_total: (emprestimo.emp_valor_total || 0).toString(),
          emp_saldo_devedor: (emprestimo.emp_saldo_devedor || 0).toString(),
          emp_parcela_mensal: (emprestimo.emp_parcela_mensal || 0).toString(),
          emp_data_inicio: emprestimo.emp_data_inicio || '',
          emp_data_fim: emprestimo.emp_data_fim || '',
          emp_instituicao: emprestimo.emp_instituicao || ''
        });
      } else {
        setFormData({
          emp_nome: '',
          emp_valor_total: '',
          emp_saldo_devedor: '',
          emp_parcela_mensal: '',
          emp_data_inicio: '',
          emp_data_fim: '',
          emp_instituicao: ''
        });
      }
    }
  }, [emprestimo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        showError('Usuário não autenticado.');
        return;
      }
      if (!formData.emp_nome || !formData.emp_valor_total || !formData.emp_saldo_devedor || !formData.emp_data_inicio) {
        showError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      const payload = {
        user_id: user.id,
        emp_nome: formData.emp_nome,
        emp_valor_total: parseFloat(formData.emp_valor_total),
        emp_saldo_devedor: parseFloat(formData.emp_saldo_devedor),
        emp_parcela_mensal: parseFloat(formData.emp_parcela_mensal) || null,
        emp_data_inicio: formData.emp_data_inicio,
        emp_data_fim: formData.emp_data_fim || null,
        emp_instituicao: formData.emp_instituicao || null
      };

      if (emprestimo) {
        const { error } = await supabase
          .from('emprestimos')
          .update(payload)
          .eq('emp_id', emprestimo.emp_id);
        if (error) throw error;
        showSuccess('Empréstimo atualizado!');
      } else {
        const { error } = await supabase
          .from('emprestimos')
          .insert([payload]);
        if (error) throw error;
        showSuccess('Empréstimo adicionado!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar empréstimo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {emprestimo ? 'Editar Empréstimo' : 'Novo Empréstimo'}
          </DialogTitle>
          <DialogDescription>
            {emprestimo ? 'Edite os detalhes do seu empréstimo.' : 'Adicione um novo empréstimo ou financiamento.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Nome do Empréstimo</Label>
            <Input 
              value={formData.emp_nome} 
              onChange={e => setFormData({...formData, emp_nome: e.target.value})}
              placeholder="Ex: Financiamento Carro, Empréstimo Pessoal"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor Total</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.emp_valor_total} 
              onChange={e => setFormData({...formData, emp_valor_total: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Saldo Devedor Atual</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.emp_saldo_devedor} 
              onChange={e => setFormData({...formData, emp_saldo_devedor: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Parcela Mensal (Opcional)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.emp_parcela_mensal} 
              onChange={e => setFormData({...formData, emp_parcela_mensal: e.target.value})}
              placeholder="0,00"
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Data de Início</Label>
              <Input 
                type="date" 
                value={formData.emp_data_inicio} 
                onChange={e => setFormData({...formData, emp_data_inicio: e.target.value})}
                required
                className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Data de Fim (Opcional)</Label>
              <Input 
                type="date" 
                value={formData.emp_data_fim} 
                onChange={e => setFormData({...formData, emp_data_fim: e.target.value})}
                className="rounded-xl border-border-light bg-background-light/50 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Instituição (Opcional)</Label>
            <Input 
              value={formData.emp_instituicao} 
              onChange={e => setFormData({...formData, emp_instituicao: e.target.value})}
              placeholder="Ex: Banco do Brasil, Caixa Econômica"
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/25"
            >
              {loading ? 'Salvando...' : 'Salvar Empréstimo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmprestimoModal;