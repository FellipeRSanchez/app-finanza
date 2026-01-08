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

interface ContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  conta?: any;
  grupoId: string;
}

const ContaModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  conta, 
  grupoId
}: ContaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    con_nome: '',
    con_tipo: 'banco',
    con_limite: '0', // Usado como saldo inicial
    con_banco: ''
  });

  // Definir tipos de conta predefinidos com seus rótulos de exibição
  const predefinedAccountTypes = [
    { value: 'banco', label: 'Banco / Corrente' },
    { value: 'cartao', label: 'Cartão de Crédito' },
    { value: 'dinheiro', label: 'Carteira (Dinheiro)' },
    { value: 'investimento', label: 'Investimentos' },
  ];

  useEffect(() => {
    if (open && conta) {
      console.log('Conta recebida:', conta); // Log para depuração
      setFormData({
        con_nome: conta.con_nome || '',
        con_tipo: conta.con_tipo || 'banco',
        con_limite: (conta.con_limite || 0).toString(),
        con_banco: conta.con_banco || ''
      });
    } else if (open && !conta) {
      setFormData({
        con_nome: '',
        con_tipo: 'banco',
        con_limite: '0',
        con_banco: ''
      });
    }
  }, [conta, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        con_nome: formData.con_nome,
        con_tipo: formData.con_tipo,
        con_limite: parseFloat(formData.con_limite),
        con_banco: formData.con_banco,
        con_grupo: grupoId
      };

      if (conta) {
        const { error } = await supabase
          .from('contas')
          .update(payload)
          .eq('con_id', conta.con_id);
        if (error) throw error;
        showSuccess('Conta atualizada!');
      } else {
        const { error } = await supabase
          .from('contas')
          .insert([payload]);
        if (error) throw error;
        showSuccess('Conta criada!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {conta ? 'Editar Conta' : 'Nova Conta'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Nome da Conta</Label>
            <Input 
              value={formData.con_nome} 
              onChange={e => setFormData({...formData, con_nome: e.target.value})}
              placeholder="Ex: Nubank, Carteira, XP..."
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Tipo</Label>
            <Select 
              value={formData.con_tipo} 
              onValueChange={val => setFormData({...formData, con_tipo: val})}
            >
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                <SelectValue>
                  {formData.con_tipo ? (
                    // Encontra o rótulo predefinido ou usa o valor como "Outro"
                    predefinedAccountTypes.find(type => type.value === formData.con_tipo)?.label || 
                    `${formData.con_tipo} (Outro)`
                  ) : (
                    <span className="text-gray-400">Selecione o tipo</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                {predefinedAccountTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
                {/* Adiciona o tipo atual como opção se não estiver na lista predefinida */}
                {formData.con_tipo && !predefinedAccountTypes.some(type => type.value === formData.con_tipo) && (
                  <SelectItem value={formData.con_tipo}>{formData.con_tipo} (Outro)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Saldo Inicial / Limite</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.con_limite} 
              onChange={e => setFormData({...formData, con_limite: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Instituição (Opcional)</Label>
            <Input 
              value={formData.con_banco} 
              onChange={e => setFormData({...formData, con_banco: e.target.value})}
              placeholder="Ex: Itaú, Bradesco..."
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/25"
            >
              {loading ? 'Salvando...' : 'Salvar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContaModal;