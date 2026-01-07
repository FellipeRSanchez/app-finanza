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

interface TransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  transferencia?: any; // Can be a transfer object for editing
  accounts: any[];
  grupoId: string;
  systemCategories: { transferenciaId: string | null; pagamentoFaturaId: string | null };
}

const TransferenciaModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  transferencia, 
  accounts = [],
  grupoId,
  systemCategories
}: TransferenciaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tra_data: new Date().toISOString().split('T')[0],
    tra_descricao: '',
    tra_valor: '',
    tra_conta_origem: '',
    tra_conta_destino: '',
    tra_conciliado: false,
  });

  useEffect(() => {
    if (open) {
      if (transferencia) {
        setFormData({
          tra_data: transferencia.tra_data || new Date().toISOString().split('T')[0],
          tra_descricao: transferencia.tra_descricao || '',
          tra_valor: Math.abs(Number(transferencia.tra_valor)).toString(),
          tra_conta_origem: transferencia.tra_conta_origem || '',
          tra_conta_destino: transferencia.tra_conta_destino || '',
          tra_conciliado: !!transferencia.tra_conciliado,
        });
      } else {
        setFormData({
          tra_data: new Date().toISOString().split('T')[0],
          tra_descricao: '',
          tra_valor: '',
          tra_conta_origem: accounts.length > 0 ? accounts[0].con_id : '',
          tra_conta_destino: accounts.length > 1 ? accounts[1].con_id : '',
          tra_conciliado: false,
        });
      }
    }
  }, [transferencia, open, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tra_conta_origem || !formData.tra_conta_destino || formData.tra_conta_origem === formData.tra_conta_destino) {
      showError('Selecione contas de origem e destino diferentes.');
      return;
    }
    if (!systemCategories.transferenciaId) {
      showError('Categoria de transferência não encontrada. Contate o suporte.');
      return;
    }

    setLoading(true);
    try {
      const valor = parseFloat(formData.tra_valor.replace(',', '.'));

      if (transferencia) {
        // Update existing transfer and its associated lancamentos
        const { error: updateTransferError } = await supabase
          .from('transferencias')
          .update({
            tra_data: formData.tra_data,
            tra_descricao: formData.tra_descricao,
            tra_valor: valor,
            tra_conta_origem: formData.tra_conta_origem,
            tra_conta_destino: formData.tra_conta_destino,
            tra_conciliado: formData.tra_conciliado,
          })
          .eq('tra_id', transferencia.tra_id);
        if (updateTransferError) throw updateTransferError;

        // Update lancamento de origem (débito)
        const { error: updateOriginLancamentoError } = await supabase
          .from('lancamentos')
          .update({
            lan_data: formData.tra_data,
            lan_descricao: `Transferência para ${accounts.find(a => a.con_id === formData.tra_conta_destino)?.con_nome || 'outra conta'}`,
            lan_valor: -valor, // Débito
            lan_conta: formData.tra_conta_origem,
            lan_conciliado: formData.tra_conciliado,
          })
          .eq('lan_id', transferencia.tra_lancamento_origem);
        if (updateOriginLancamentoError) throw updateOriginLancamentoError;

        // Update lancamento de destino (crédito)
        const { error: updateDestinoLancamentoError } = await supabase
          .from('lancamentos')
          .update({
            lan_data: formData.tra_data,
            lan_descricao: `Transferência de ${accounts.find(a => a.con_id === formData.tra_conta_origem)?.con_nome || 'outra conta'}`,
            lan_valor: valor, // Crédito
            lan_conta: formData.tra_conta_destino,
            lan_conciliado: formData.tra_conciliado,
          })
          .eq('lan_id', transferencia.tra_lancamento_destino);
        if (updateDestinoLancamentoError) throw updateDestinoLancamentoError;

        showSuccess('Transferência atualizada!');

      } else {
        // Create new transfer and its associated lancamentos
        // 1. Create two lancamentos first
        const { data: lancamentoOrigem, error: loError } = await supabase
          .from('lancamentos')
          .insert({
            lan_data: formData.tra_data,
            lan_descricao: `Transferência para ${accounts.find(a => a.con_id === formData.tra_conta_destino)?.con_nome || 'outra conta'}`,
            lan_valor: -valor, // Débito
            lan_categoria: systemCategories.transferenciaId,
            lan_conta: formData.tra_conta_origem,
            lan_conciliado: formData.tra_conciliado,
            lan_grupo: grupoId,
          })
          .select('lan_id')
          .single();
        if (loError) throw loError;

        const { data: lancamentoDestino, error: ldError } = await supabase
          .from('lancamentos')
          .insert({
            lan_data: formData.tra_data,
            lan_descricao: `Transferência de ${accounts.find(a => a.con_id === formData.tra_conta_origem)?.con_nome || 'outra conta'}`,
            lan_valor: valor, // Crédito
            lan_categoria: systemCategories.transferenciaId,
            lan_conta: formData.tra_conta_destino,
            lan_conciliado: formData.tra_conciliado,
            lan_grupo: grupoId,
          })
          .select('lan_id')
          .single();
        if (ldError) throw ldError;

        // 2. Create the transfer record linking the two lancamentos
        const { error: insertTransferError } = await supabase
          .from('transferencias')
          .insert({
            tra_grupo: grupoId,
            tra_data: formData.tra_data,
            tra_descricao: formData.tra_descricao,
            tra_valor: valor,
            tra_conta_origem: formData.tra_conta_origem,
            tra_conta_destino: formData.tra_conta_destino,
            tra_lancamento_origem: lancamentoOrigem.lan_id,
            tra_lancamento_destino: lancamentoDestino.lan_id,
            tra_conciliado: formData.tra_conciliado,
          });
        if (insertTransferError) throw insertTransferError;

        showSuccess('Transferência criada!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar transferência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {transferencia ? 'Editar Transferência' : 'Nova Transferência'}
          </DialogTitle>
        </DialogHeader>
        
        <form key={transferencia?.tra_id || 'new'} onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Data</Label>
            <Input 
              type="date" 
              value={formData.tra_data} 
              onChange={e => setFormData({...formData, tra_data: e.target.value})}
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Descrição (Opcional)</Label>
            <Input 
              value={formData.tra_descricao} 
              onChange={e => setFormData({...formData, tra_descricao: e.target.value})}
              placeholder="Ex: Transferência para poupança"
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.tra_valor} 
              onChange={e => setFormData({...formData, tra_valor: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Conta de Origem</Label>
              <Select 
                value={formData.tra_conta_origem} 
                onValueChange={val => setFormData({...formData, tra_conta_origem: val})}
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
              <Label className="text-[10px] font-black uppercase text-[#756189]">Conta de Destino</Label>
              <Select 
                value={formData.tra_conta_destino} 
                onValueChange={val => setFormData({...formData, tra_conta_destino: val})}
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
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Status da Transferência</Label>
            <Select 
              value={formData.tra_conciliado ? "true" : "false"} 
              onValueChange={val => setFormData({...formData, tra_conciliado: val === "true"})}
            >
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                <SelectItem value="true">Confirmada</SelectItem>
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
              {loading ? 'Processando...' : transferencia ? 'Atualizar Transferência' : 'Criar Transferência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferenciaModal;