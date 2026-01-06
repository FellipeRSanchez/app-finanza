"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, CheckCircle } from 'lucide-react';

interface Fechamento {
  fem_id: string;
  fem_mes: number;
  fem_ano: number;
  fem_observacoes: string;
  fem_fechado: boolean;
}

const Fechamento = () => {
  const { user } = useAuth();
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    if (user) {
      fetchFechamento();
    }
  }, [user]);

  const fetchFechamento = async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { data, error } = await supabase
        .from('fechamentos_mensais')
        .select('*')
        .eq('fem_grupo', userData.usu_grupo)
        .eq('fem_mes', currentMonth)
        .eq('fem_ano', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFechamento(data);
        setObservacoes(data.fem_observacoes || '');
      }
    } catch (error) {
      console.error('Error fetching fechamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveObservacoes = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      if (fechamento) {
        await supabase
          .from('fechamentos_mensais')
          .update({ fem_observacoes: observacoes })
          .eq('fem_id', fechamento.fem_id);
      } else {
        const { data } = await supabase
          .from('fechamentos_mensais')
          .insert({
            fem_grupo: userData.usu_grupo,
            fem_mes: currentMonth,
            fem_ano: currentYear,
            fem_observacoes: observacoes,
            fem_fechado: false,
          })
          .select()
          .single();

        if (data) {
          setFechamento(data);
        }
      }
    } catch (error) {
      console.error('Error saving observacoes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFecharMes = async () => {
    setSaving(true);
    try {
      if (!fechamento) return;

      await supabase
        .from('fechamentos_mensais')
        .update({ fem_fechado: true })
        .eq('fem_id', fechamento.fem_id);

      setFechamento({ ...fechamento, fem_fechado: true });
    } catch (error) {
      console.error('Error closing month:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAbrirMes = async () => {
    setSaving(true);
    try {
      if (!fechamento) return;

      await supabase
        .from('fechamentos_mensais')
        .update({ fem_fechado: false })
        .eq('fem_id', fechamento.fem_id);

      setFechamento({ ...fechamento, fem_fechado: false });
    } catch (error) {
      console.error('Error opening month:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Fechamento Mensal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Fechamento Mensal">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {monthNames[currentMonth - 1]} {currentYear}
              </CardTitle>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                fechamento?.fem_fechado
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {fechamento?.fem_fechado ? (
                  <>
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">Mês Fechado</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span className="font-medium">Mês Aberto</span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Adicione observações sobre este mês..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={fechamento?.fem_fechado}
              rows={4}
            />
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSaveObservacoes}
                disabled={fechamento?.fem_fechado || saving}
              >
                Salvar Observações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent>
            {fechamento?.fem_fechado ? (
              <Button
                onClick={handleAbrirMes}
                disabled={saving}
                variant="outline"
                className="w-full"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Mês
              </Button>
            ) : (
              <Button
                onClick={handleFecharMes}
                disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Lock className="h-4 w-4 mr-2" />
                Fechar Mês
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        {fechamento?.fem_fechado && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">
                    Mês Fechado
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Este mês está fechado. Você não pode criar, editar ou excluir lançamentos deste período.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Fechamento;