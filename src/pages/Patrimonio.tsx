"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Landmark } from 'lucide-react';

interface Conta {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_limite: number;
}

const Patrimonio = () => {
  const { user } = useAuth();
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContas();
    }
  }, [user]);

  const fetchContas = async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { data, error } = await supabase
        .from('contas')
        .select('*')
        .eq('con_grupo', userData.usu_grupo);

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Error fetching contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const ativos = contas.filter(c => ['banco', 'investimento', 'ativo'].includes(c.con_tipo));
  const passivos = contas.filter(c => ['cartao', 'passivo'].includes(c.con_tipo));

  const totalAtivos = ativos.reduce((sum, c) => sum + (c.con_limite || 0), 0);
  const totalPassivos = passivos.reduce((sum, c) => sum + (c.con_limite || 0), 0);
  const patrimonioLiquido = totalAtivos - totalPassivos;

  if (loading) {
    return (
      <MainLayout title="Patrimônio">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Patrimônio">
      <div className="space-y-6">
        {/* Patrimônio Líquido */}
        <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-white">Patrimônio Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {formatCurrency(patrimonioLiquido)}
            </div>
            <p className="text-indigo-100 mt-2">
              Ativos - Passivos
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ativos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Ativos
              </CardTitle>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAtivos)}
              </span>
            </CardHeader>
            <CardContent>
              {ativos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum ativo cadastrado</p>
              ) : (
                <div className="space-y-3">
                  {ativos.map((conta) => (
                    <div
                      key={conta.con_id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center">
                        <Wallet className="h-4 w-4 mr-3 text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{conta.con_nome}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(conta.con_limite || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passivos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                Passivos
              </CardTitle>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(totalPassivos)}
              </span>
            </CardHeader>
            <CardContent>
              {passivos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum passivo cadastrado</p>
              ) : (
                <div className="space-y-3">
                  {passivos.map((conta) => (
                    <div
                      key={conta.con_id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center">
                        <Landmark className="h-4 w-4 mr-3 text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{conta.con_nome}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(conta.con_limite || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Patrimonio;