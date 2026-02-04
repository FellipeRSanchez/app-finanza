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

interface AtivoPatrimonialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ativo?: any;
  hideValues?: boolean; // Added hideValues prop
}

const AtivoPatrimonialModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  ativo,
  hideValues
}: AtivoPatrimonialModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    apa_nome: '',
    apa_tipo: 'imovel',
    apa_valor_estimado: '',
    apa_data_aquisicao: '',
    apa_descricao: ''
  });

  useEffect(() => {
    if (open) {
      if (ativo) {
        setFormData({
          apa_nome: ativo.apa_nome || '',
          apa_tipo: ativo.apa_tipo || 'imovel',
          apa_valor_estimado: (ativo.apa_valor_estimado || 0).toString(),
          apa_data_aquisicao: ativo.apa_data_aquisicao || '',
          apa_descricao: ativo.apa_descricao || ''
        });
      } else {
        setFormData({
          apa_nome: '',
          apa_tipo: 'imovel',
          apa_valor_estimado: '',
          apa_data_aquisicao: '',
          apa_descricao: ''
        });
      }
    }
  }, [ativo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        showError('Usuário não autenticado.');
        return;
      }
      if (!formData.apa_nome || !formData.apa_tipo || !formData.apa_valor_estimado) {
        showError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      const payload = {
        user_id: user.id,
        apa_nome: formData.apa_nome,
        apa_tipo: formData.apa_tipo,
        apa_valor_estimado: parseFloat(formData.apa_valor_estimado),
        apa_data_aquisicao: formData.apa_data_aquisicao || null,
        apa_descricao: formData.apa_descricao || null
      };

      if (ativo) {
        const { error } = await supabase
          .from('ativos_patrimoniais')
          .update(payload)
          .eq('apa_id', ativo.apa_id);
        if (error) throw error;
        showSuccess('Ativo patrimonial atualizado!');
      } else {
        const { error } = await supabase
          .from('ativos_patrimoniais')
          .insert([payload]);
        if (error) throw error;
        showSuccess('Ativo patrimonial adicionado!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar ativo patrimonial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border border-border-light shadow-xl p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#141118]">
            {ativo ? 'Editar Ativo Patrimonial' : 'Novo Ativo Patrimonial'}
          </DialogTitle>
          <DialogDescription>
            {ativo ? 'Edite os detalhes do seu ativo patrimonial.' : 'Adicione um novo item ao seu patrimônio (imóveis, veículos, etc.).'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Nome do Ativo</Label>
            <Input 
              value={formData.apa_nome} 
              onChange={e => setFormData({...formData, apa_nome: e.target.value})}
              placeholder="Ex: Apartamento Centro, Carro Familiar"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Tipo</Label>
            <Select 
              value={formData.apa_tipo} 
              onValueChange={val => setFormData({...formData, apa_tipo: val})}
              required
            >
              <SelectTrigger className="rounded-xl border-border-light bg-background-light/50 font-bold">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg rounded-xl">
                <SelectItem value="imovel">Imóvel</SelectItem>
                <SelectItem value="veiculo">Veículo</SelectItem>
                <SelectItem value="maquina">Máquina/Equipamento</SelectItem>
                <SelectItem value="consorcio">Consórcio</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Valor Estimado (R$)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.apa_valor_estimado} 
              onChange={e => setFormData({...formData, apa_valor_estimado: e.target.value})}
              placeholder="0,00"
              required
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Data de Aquisição (Opcional)</Label>
            <Input 
              type="date" 
              value={formData.apa_data_aquisicao} 
              onChange={e => setFormData({...formData, apa_data_aquisicao: e.target.value})}
              className="rounded-xl border-border-light bg-background-light/50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[#756189]">Descrição (Opcional)</Label>
            <Textarea 
              value={formData.apa_descricao} 
              onChange={e => setFormData({...formData, apa_descricao: e.target.value})}
              placeholder="Detalhes adicionais sobre o ativo..."
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
              {loading ? 'Salvando...' : 'Salvar Ativo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AtivoPatrimonialModal;