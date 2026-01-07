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

interface PagamentoFaturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pagamento?: any; // Can be a payment object for editing
  accounts: any[]; // All accounts
  creditCardAccounts: any[]; // Only credit card accounts
  grupoId: string;
  systemCategories: { transferenciaId: string | null; pagamentoFaturaId: string | null };
  initialCardId?: string; // For opening from Cartoes page
}

const PagamentoFaturaModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  pagamento, 
  accounts = [],
  creditCardAccounts = [],
  grupoId,
  systemCategories,
  initialCardId
}: PagamentoFaturaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pag_data: new Date().toISOString().split('T')[0],
    pag_valor: '',
    pag_conta_origem: '', // Bank account
    pag_conta_destino: '', // Credit card account
    pag_conciliado: false,
  });

  useEffect(() => {
    if (open) {
      if (pagamento) {
        setFormData({
          pag_data: pagamento.pag_data || new Date().toISOString().split('T')[0],
          pag_valor: Math.abs(Number(pagamento.pag_valor)).toString(),
          pag_conta_origem: pagamento.pag_conta_origem || '',
          pag_conta_destino: pagamento.pag_conta_destino || '',
          pag_conciliado: !!pagamento.pag_conciliado,
        });
      } else {
        setFormData({
          pag_data: new Date().toISOString().split('T')[0],
          pag_valor: '',
          pag_conta_origem: accounts.filter(acc => acc.con_tipo !== 'cartao').length > 0 ? accounts.filter(acc => acc.con_tipo !== 'cartao')[0].con_id : '',
          pag_conta_destino: initialCardId || (creditCardAccounts.length > 0 ? creditCardAccounts[0].con_id : ''),
          pag_conciliado: false,
        });
      }
    }
  }, [pagamento, open, accounts, creditCardAccounts, initialCardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pag_conta_origem || !formData.pag_conta_destino) {
      showError('Selecione uma conta de origem e um cartão de destino.');
      return;
    }
    if (!systemCategories.pagamentoFaturaId) {
      showError('Categoria de pagamento de fatura não encontrada. Contate o suporte.');
      return;
    }

    setLoading(true);
    try {
      const valor = parseFloat(formData.pag_valor.replace(',', '.'));

      if (pagamento) {
        // Update existing payment and its associated lancamentos
        const { error: updatePaymentError } = await supabase
          .from('pagamentos_fatura')
          .update({
            pag_data: formData.pag_data,
            pag_valor: valor,
            pag_conta_origem: formData.pag_conta_origem,
            pag_conta_destino: formData.pag_conta_destino,
            pag_conciliado: formData.pag_conciliado,
          })
          .eq('pag_id', pagamento.pag_id);
        if (updatePaymentError) throw updatePaymentError;

        // Update lancamento de origem (débito da conta bancária)
        const { error: updateOriginLancamentoError } = await supabase
          .from('lancamentos')
          .update({
            lan_data: formData.pag_data,
            lan_descricao: `Pagamento de Fatura: ${accounts.find(a => a.con_id === formData.pag_conta_destino)?.con_nome || 'Cartão'}`,
            lan_valor: -valor, // Débito
            lan_conta: formData.pag_conta_origem,
            lan_conciliado: formData.pag_conciliado,
          })
          .eq('lan_id', pagamento.pag_lancamento_origem);
        if (updateOriginLancamentoError) throw updateOriginLancamentoError;

        // Update lancamento de destino (crédito no cartão de crédito)
        const { error: updateDestinoLancamentoError } = await supabase
          .from('lancamentos')
          .update({
            lan_data: formData.pag_data,
            lan_descricao: `Crédito de Pagamento: ${accounts.find(a => a.con_id === formData.pag_conta_origem)?.con_nome || 'Conta'}`,
            lan_valor: valor, // Crédito
            lan_conta: formData.pag_conta_destino,
            lan_conciliado: formData.pag_conciliado,
          })
          .eq('lan_id', pagamento.pag_lancamento_destino);
        if (updateDestinoLancamentoError) throw updateDestinoLancamentoError;

        showSuccess('Pagamento de fatura atualizado!');

      } else {
        // Create new payment and its associated lancamentos
        // 1. Create two lancamentos first
        const { data: lancamentoOrigem, error: loError } = await supabase
          .from('lancamentos')
          .insert({
            lan_data: formData.pag_data,
            lan_descricao: `Pagamento de Fatura: ${accounts.find(a => a.con_id === formData.pag_conta_destino)?.con_nome || 'Cartão'}`,
            lan_valor: -valor, // Débito
            lan_categoria: systemCategories.pagamentoFaturaId,
            lan_conta: formData.pag_conta_origem,
            lan_conciliado: formData.pag_conciliado,
            lan_grupo: grupoId,
          })
          .select('lan_id')
          .single();
        if (loError) throw loError;

        const { data: lancamentoDestino, error: ldError } = await supabase
          .from('lancamentos')
          .insert({
            lan_data: formData.pag_data,
            lan_descricao: `Crédito de Pagamento: ${accounts.find(a => a.con_id === formData.pag_conta_origem)?.con_nome || 'Conta'}`,
            lan_valor: valor, // Crédito
            lan_categoria: systemCategories.pagamentoFaturaId,
            lan_conta: formData.pag_conta_destino,
            lan_conciliado: formData.pag_conciliado,
            lan_grupo: grupoId,
          })
          .select('lan_id')
          .single();
        if (ldError) throw ldError;

        // 2. Create the payment record linking the two lancamentos
        const { error: insertPaymentError } = await supabase
          .from('pagamentos_fatura')
          .insert({
            pag_grupo: grupoId,
            pag_data: formData.pag_data,
            pag_valor: valor,
            pag_conta_origem: formData.pag_conta_origem,
            pag_conta_destino: formData.pag_conta_destino,
            pag_lancamento_origem: lancamentoOrigem.lan_id,
            pag_lancamento_destino: lancamentoDestino.lan_id,
            pag_conciliado: formData.pag_conciliado,
          });
        if (insertPaymentError) throw insertPaymentError;

        showSuccess('Pagamento de fatura registrado!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar pagamento de fatura.');
    } finally {
      setLoading(false);
    }
  };

  const nonCreditCardAccounts = accounts.filter(acc => acc.con_tipo !== 'cartao');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {pagamento ? 'Editar Pagamento de Fatura' : 'Novo Pagamento de Fatura'}
          </DialogTitle>
        </DialogHeader>
        
        <form key={pagamento?.pag_id || 'new'} onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Data do Pagamento</Label>
            <Input 
              type="date" 
              value={formData.pag_data} 
              onChange={e => setFormData({...formData, pag_data: e.target.value})}
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor do Pagamento</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.pag_valor} 
              onChange={e => setFormData({...formData, pag_valor: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Conta de Origem (Banco)</Label>
            <Select 
              value={formData.pag_conta_origem} 
              onValueChange={val => setFormData({...formData, pag_conta_origem: val})}
              required
            >
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                <SelectValue placeholder="Selecione a conta bancária..." />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                {nonCreditCardAccounts.map(acc => (
                  <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Cartão de Crédito (Destino)</Label>
            <Select 
              value={formData.pag_conta_destino} 
              onValueChange={val => setFormData({...formData, pag_conta_destino: val})}
              required
            >
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                <SelectValue placeholder="Selecione o cartão..." />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                {creditCardAccounts.map(acc => (
                  <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Status do Pagamento</Label>
            <Select 
              value={formData.pag_conciliado ? "true" : "false"} 
              onValueChange={val => setFormData({...formData, pag_conciliado: val === "true"})}
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
              {loading ? 'Processando...' : pagamento ? 'Atualizar Pagamento' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoFaturaModal;