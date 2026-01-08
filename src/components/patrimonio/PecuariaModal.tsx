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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess, showError } from '@/utils/toast';

interface PecuariaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pecuariaItem?: any;
  hideValues?: boolean; // Added hideValues prop
}

const PecuariaModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  pecuariaItem,
  hideValues
}: PecuariaModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pec_nome: '',
    pec_tipo: 'bovino',
    pec_quantidade: '',
    pec_valor_unitario: '',
    pec_valor_total: '',
    pec_data_atualizacao: new Date().toISOString().split('T')[0],
    pec_descricao: ''
  });

  useEffect(() => {
    if (open) {
      if (pecuariaItem) {
        setFormData({
          pec_nome: pecuariaItem.pec_nome || '',
          pec_tipo: pecuariaItem.pec_tipo || 'bovino',
          pec_quantidade: (pecuariaItem.pec_quantidade || 0).toString(),
          pec_valor_unitario: (pecuariaItem.pec_valor_unitario || 0).toString(),
          pec_valor_total: (pecuariaItem.pec_valor_total || 0).toString(),
          pec_data_atualizacao: pecuariaItem.pec_data_atualizacao || new Date().toISOString().split('T')[0],
          pec_descricao: pecuariaItem.pec_descricao || ''
        });
      } else {
        setFormData({
          pec_nome: '',
          pec_tipo: 'bovino',
          pec_quantidade: '',
          pec_valor_unitario: '',
          pec_valor_total: '',
          pec_data_atualizacao: new Date().toISOString().split('T')[0],
          pec_descricao: ''
        });
      }
    }
  }, [pecuariaItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        showError('Usuário não autenticado.');
        return;
      }
      if (!formData.pec_nome || !formData.pec_tipo || !formData.pec_quantidade || !formData.pec_valor_total) {
        showError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      const payload = {
        user_id: user.id,
        pec_nome: formData.pec_nome,
        pec_tipo: formData.pec_tipo,
        pec_quantidade: parseInt(formData.pec_quantidade),
        pec_valor_unitario: parseFloat(formData.pec_valor_unitario) || null,
        pec_valor_total: parseFloat(formData.pec_valor_total),
        pec_data_atualizacao: formData.pec_data_atualizacao,
        pec_descricao: formData.pec_descricao || null
      };

      if (pecuariaItem) {
        const { error } = await supabase
          .from('pecuaria')
          .update(payload)
          .eq('pec_id', pecuariaItem.pec_id);
        if (error) throw error;
        showSuccess('Registro de pecuária atualizado!');
      } else {
        const { error } = await supabase
          .from('pecuaria')
          .insert([payload]);
        if (error) throw error;
        showSuccess('Registro de pecuária adicionado!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar registro de pecuária.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {pecuariaItem ? 'Editar Registro de Pecuária' : 'Novo Registro de Pecuária'}
          </DialogTitle>
          <DialogDescription>
            {pecuariaItem ? 'Edite os detalhes do seu rebanho ou lote.' : 'Adicione um novo registro de pecuária.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Nome/Lote</Label>
            <Input 
              value={formData.pec_nome} 
              onChange={e => setFormData({...formData, pec_nome: e.target.value})}
              placeholder="Ex: Rebanho Bovino, Lote Suínos 2023"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Tipo</Label>
            <Select 
              value={formData.pec_tipo} 
              onValueChange={val => setFormData({...formData, pec_tipo: val})}
              required
            >
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                <SelectItem value="bovino">Bovino</SelectItem>
                <SelectItem value="suino">Suíno</SelectItem>
                <SelectItem value="ovino">Ovino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Quantidade</Label>
            <Input 
              type="number" 
              value={formData.pec_quantidade} 
              onChange={e => setFormData({...formData, pec_quantidade: e.target.value})}
              placeholder="0"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor Unitário (Opcional)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.pec_valor_unitario} 
              onChange={e => setFormData({...formData, pec_valor_unitario: e.target.value})}
              placeholder="0,00"
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor Total</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.pec_valor_total} 
              onChange={e => setFormData({...formData, pec_valor_total: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Data de Atualização</Label>
            <Input 
              type="date" 
              value={formData.pec_data_atualizacao} 
              onChange={e => setFormData({...formData, pec_data_atualizacao: e.target.value})}
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Descrição (Opcional)</Label>
            <Textarea 
              value={formData.pec_descricao} 
              onChange={e => setFormData({...formData, pec_descricao: e.target.value})}
              placeholder="Detalhes adicionais sobre o rebanho/lote..."
              rows={3}
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/25"
            >
              {loading ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PecuariaModal;