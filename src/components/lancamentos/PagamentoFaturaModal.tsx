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
import { format } from 'date-fns';

interface CardAccount {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_banco: string | null;
  con_limite: number;
  con_data_fechamento: number | null;
  con_data_vencimento: number | null;
  saldoAtual: number;
  faturaAtual: number;
  faturaVencimento: Date | null;
  faturaFechamento: Date | null;
  faturaStatus: 'aberta' | 'fechada' | 'paga' | 'vencida';
  diasParaVencimento: number | null;
}

interface PagamentoFaturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pagamento?: any;
  accounts: any[];
  creditCardAccounts: CardAccount[];
  grupoId: string;
  systemCategories: { transferenciaId: string | null; pagamentoFaturaId: string | null };
  initialCard?: CardAccount; // Changed to CardAccount
  hideValues?: boolean; // Added hideValues prop
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
  initialCard,
  hideValues
}: PagamentoFaturaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pag_data: new Date().toISOString().split('T')[0],
    pag_valor: '',
    pag_conta_origem: '',
    pag_conta_destino: '',
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
        // Pre-fill with initialCard data if available
        const defaultCardId = initialCard?.con_id || (creditCardAccounts.length > 0 ? creditCardAccounts[0].con_id : '');
        const defaultCard = creditCardAccounts.find(card => card.con_id === defaultCardId);
        
        setFormData({
          pag_data: new Date().toISOString().split('T')[0],
          pag_valor: defaultCard ? Math.abs(defaultCard.faturaAtual).toFixed(2) : '', // Pre-fill with current invoice
          pag_conta_origem: accounts.filter(acc => acc.con_tipo !== 'cartao').length > 0 ? accounts.filter(acc => acc.con_tipo !== 'cartao')[0].con_id : '',
          pag_conta_destino: defaultCardId,
          pag_conciliado: false,
        });
      }
    }
  }, [pagamento, open, accounts, creditCardAccounts, initialCard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pag_conta_origem || !formData.pag_conta_destino) {
      showError('Selecione uma conta de origem e um cartão de destino.');
      return;
    }
    if (!systemCategories.pagamentoFaturaId) {
      showError('Categoria de pagamento não encontrada.');
      return;
    }

    setLoading(true);
    try {
      const valor = parseFloat(formData.pag_valor.replace(',', '.'));
      const contaDestinoNome = accounts.find(a => a.con_id === formData.pag_conta_destino)?.con_nome;
      const contaOrigemNome = accounts.find(a => a.con_id === formData.pag_conta_origem)?.con_nome;

      if (pagamento) {
        const { error: updateError } = await supabase
          .from('pagamentos_fatura')
          .update({
            pag_data: formData.pag_data,
            pag_valor: valor,
            pag_conta_origem: formData.pag_conta_origem,
            pag_conta_destino: formData.pag_conta_destino,
            pag_conciliado: formData.pag_conciliado,
          })
          .eq('pag_id', pagamento.pag_id);
        if (updateError) throw updateError;

        await supabase.from('lancamentos').update({
          lan_data: formData.pag_data,
          lan_valor: -valor,
          lan_conta: formData.pag_conta_origem,
          lan_descricao: `Pagamento de Fatura: ${contaDestinoNome}`,
          lan_conciliado: formData.pag_conciliado,
        }).eq('lan_id', pagamento.pag_lancamento_origem);

        await supabase.from('lancamentos').update({
          lan_data: formData.pag_data,
          lan_valor: valor,
          lan_conta: formData.pag_conta_destino,
          lan_descricao: `Crédito de Pagamento: ${contaOrigemNome}`,
          lan_conciliado: formData.pag_conciliado,
        }).eq('lan_id', pagamento.pag_lancamento_destino);

        showSuccess('Pagamento atualizado!');
      } else {
        const { data: lanOrigem, error: loError } = await supabase
          .from('lancamentos')
          .insert({
            lan_data: formData.pag_data,
            lan_descricao: `Pagamento de Fatura: ${contaDestinoNome}`,
            lan_valor: -valor,
            lan_categoria: systemCategories.pagamentoFaturaId,
            lan_conta: formData.pag_conta_origem,
            lan_conciliado: formData.pag_conciliado,
            lan_grupo: grupoId,
          }).select().single();
        if (loError) throw loError;

        const { data: lanDestino, error: ldError } = await supabase
          .from('lancamentos')
          .insert({
            lan_data: formData.pag_data,
            lan_descricao: `Crédito de Pagamento: ${contaOrigemNome}`,
            lan_valor: valor,
            lan_categoria: systemCategories.pagamentoFaturaId,
            lan_conta: formData.pag_conta_destino,
            lan_conciliado: formData.pag_conciliado,
            lan_grupo: grupoId,
          }).select().single();
        if (ldError) throw ldError;

        const { data: newPag, error: pagError } = await supabase
          .from('pagamentos_fatura')
          .insert({
            pag_grupo: grupoId,
            pag_data: formData.pag_data,
            pag_valor: valor,
            pag_conta_origem: formData.pag_conta_origem,
            pag_conta_destino: formData.pag_conta_destino,
            pag_lancamento_origem: lanOrigem.lan_id,
            pag_lancamento_destino: lanDestino.lan_id,
            pag_conciliado: formData.pag_conciliado,
          }).select().single();
        if (pagError) throw pagError;

        // Link back (IMPORTANT)
        await supabase
          .from('lancamentos')
          .update({ lan_pagamento: newPag.pag_id })
          .in('lan_id', [lanOrigem.lan_id, lanDestino.lan_id]);

        showSuccess('Pagamento registrado!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCreditCard = creditCardAccounts.find(card => card.con_id === formData.pag_conta_destino);
  const currentInvoiceValue = selectedCreditCard ? Math.abs(selectedCreditCard.faturaAtual) : 0;
  const invoiceDueDate = selectedCreditCard?.faturaVencimento ? format(selectedCreditCard.faturaVencimento, 'dd/MM/yyyy') : 'N/A';

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {pagamento ? 'Editar Pagamento' : 'Novo Pagamento de Fatura'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Data</Label>
            <Input type="date" value={formData.pag_data} onChange={e => setFormData({...formData, pag_data: e.target.value})} required className="rounded-xl border-border-light bg-background-light/50 font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Cartão de Destino</Label>
            <Select value={formData.pag_conta_destino} onValueChange={val => setFormData({...formData, pag_conta_destino: val})} required>
                <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg rounded-xl">
                  {creditCardAccounts.map(acc => (
                    <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          {selectedCreditCard && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-[#756189]">Fatura Atual ({invoiceDueDate})</Label>
              <Input 
                type="text" 
                value={formatCurrency(currentInvoiceValue)} 
                disabled 
                className="rounded-xl border-border-light bg-background-light/50 font-bold text-text-main-light dark:text-text-main-dark" 
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor do Pagamento</Label>
            <Input type="number" step="0.01" value={formData.pag_valor} onChange={e => setFormData({...formData, pag_valor: e.target.value})} placeholder="0,00" required className="rounded-xl border-border-light bg-background-light/50 font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Conta de Origem</Label>
            <Select value={formData.pag_conta_origem} onValueChange={val => setFormData({...formData, pag_conta_origem: val})} required>
                <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg rounded-xl">
                  {accounts.filter(a => a.con_tipo !== 'cartao').map(acc => (
                    <SelectItem key={acc.con_id} value={acc.con_id}>{acc.con_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/25">
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoFaturaModal;