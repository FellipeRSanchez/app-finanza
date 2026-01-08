"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Settings, Banknote, CreditCard, Landmark, Wallet } from 'lucide-react'; // Adicionados ícones para categorias e contas
import { cn } from '@/lib/utils';
import ProfileSettingsForm from '@/components/settings/ProfileSettingsForm';
import PreferencesSettings from '@/components/settings/PreferencesSettings';
import { showSuccess, showError } from '@/utils/toast';

interface Conta {
  con_id: string;
  con_nome: string;
  con_tipo: string;
  con_banco: string;
  con_limite: number;
}

interface Categoria {
  cat_id: string;
  cat_nome: string;
  cat_tipo: string;
}

const Configuracoes = ({ hideValues }: { hideValues: boolean }) => {
  const { user } = useAuth();
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContaNome, setNewContaNome] = useState('');
  const [newContaTipo, setNewContaTipo] = useState('banco');
  const [newCategoriaNome, setNewCategoriaNome] = useState('');
  const [newCategoriaTipo, setNewCategoriaTipo] = useState('despesa');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const [contasData, categoriasData] = await Promise.all([
        supabase.from('contas').select('*').eq('con_grupo', userData.usu_grupo),
        supabase.from('categorias').select('*').eq('cat_grupo', userData.usu_grupo),
      ]);

      if (contasData.error) throw contasData.error;
      if (categoriasData.error) throw categoriasData.error;

      setContas(contasData.data || []);
      setCategorias(categoriasData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Erro ao carregar dados de configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConta = async () => {
    if (!newContaNome.trim()) return;

    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { error } = await supabase.from('contas').insert({
        con_nome: newContaNome,
        con_tipo: newContaTipo,
        con_grupo: userData.usu_grupo,
      });

      if (error) throw error;

      setNewContaNome('');
      fetchData();
      showSuccess('Conta adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding conta:', error);
      showError('Erro ao adicionar conta.');
    }
  };

  const handleDeleteConta = async (id: string) => {
    try {
      const { error } = await supabase.from('contas').delete().eq('con_id', id);
      if (error) throw error;
      fetchData();
      showSuccess('Conta excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting conta:', error);
      showError('Erro ao excluir conta.');
    }
  };

  const handleAddCategoria = async () => {
    if (!newCategoriaNome.trim()) return;

    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('usu_grupo')
        .eq('usu_id', user?.id)
        .single();

      if (!userData?.usu_grupo) return;

      const { error } = await supabase.from('categorias').insert({
        cat_nome: newCategoriaNome,
        cat_tipo: newCategoriaTipo,
        cat_grupo: userData.usu_grupo,
      });

      if (error) throw error;

      setNewCategoriaNome('');
      fetchData();
      showSuccess('Categoria adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding categoria:', error);
      showError('Erro ao adicionar categoria.');
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    try {
      const { error } = await supabase.from('categorias').delete().eq('cat_id', id);
      if (error) throw error;
      fetchData();
      showSuccess('Categoria excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting categoria:', error);
      showError('Erro ao excluir categoria.');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'banco': return <Landmark className="w-5 h-5" />;
      case 'cartao': return <CreditCard className="w-5 h-5" />;
      case 'investimento': return <Banknote className="w-5 h-5" />;
      case 'ativo': return <Wallet className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const getCategoryColorClass = (index: number) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500',
      'bg-pink-500', 'bg-cyan-500', 'bg-green-500', 'bg-indigo-500'
    ];
    return colors[index % colors.length];
  };

  const formatCurrency = (value: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:px-12 md:py-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-text-main-light dark:text-text-main-dark text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Configurações</h1>
        <p className="text-text-secondary-light dark:text-text-secondary-dark text-lg font-normal leading-normal">Gerencie suas informações pessoais, categorias e preferências da conta.</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Section: Profile Card */}
        <ProfileSettingsForm />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section: Categories */}
          <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438] flex flex-col h-full">
            <CardHeader className="px-0 pt-0 pb-6 flex-row justify-between items-center">
              <CardTitle className="text-text-main-light dark:text-text-main-dark text-xl font-bold">Categorias Principais</CardTitle>
              <Button variant="link" className="text-primary-new hover:text-primary-new/80 text-sm font-semibold">Gerenciar</Button>
            </CardHeader>
            <CardContent className="px-0 py-0 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {categorias.map((categoria, index) => (
                  <div key={categoria.cat_id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-light dark:border-gray-700 bg-card-light dark:bg-gray-800 shadow-sm">
                    <span className={cn("size-2.5 rounded-full", getCategoryColorClass(index))}></span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{categoria.cat_nome}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border-light dark:border-gray-600 hover:border-primary-new text-gray-500 hover:text-primary-new cursor-pointer transition-colors bg-transparent">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Nova</span>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-border-light dark:border-[#2d2438]">
                <h4 className="text-xs font-semibold text-text-secondary-light dark:text-gray-500 uppercase tracking-wider mb-4">Resumo Mensal</h4>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Receitas</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(12450.00)}</span> {/* Placeholder */}
                  </div>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Despesas</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(4320.00)}</span> {/* Placeholder */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Preferences */}
          <PreferencesSettings />
        </div>

        {/* Section: Accounts List */}
        <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
          <CardHeader className="px-0 pt-0 pb-6 flex-row justify-between items-center">
            <div className="flex flex-col">
              <CardTitle className="text-text-main-light dark:text-text-main-dark text-xl font-bold">Contas Conectadas</CardTitle>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Gerencie suas conexões bancárias.</p>
            </div>
            <Button className="flex items-center gap-2 bg-background-light dark:bg-[#2d2438] hover:bg-background-light/70 dark:hover:bg-[#2d2438]/70 text-text-main-light dark:text-text-main-dark font-semibold py-2 px-4 rounded-xl text-sm transition-colors">
              <Plus className="w-4 h-4" />
              Adicionar Conta
            </Button>
          </CardHeader>
          <CardContent className="px-0 py-0 space-y-4">
            {contas.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma conta cadastrada</p>
            ) : (
              contas.map((conta) => (
                <div key={conta.con_id} className="flex items-center justify-between p-4 rounded-xl border border-border-light dark:border-gray-700 bg-card-light dark:bg-[#1e1629]/50 hover:border-primary-new/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "size-12 rounded-full flex items-center justify-center text-white",
                      conta.con_tipo === 'banco' ? 'bg-blue-600' :
                      conta.con_tipo === 'cartao' ? 'bg-purple-600' :
                      conta.con_tipo === 'investimento' ? 'bg-yellow-600' :
                      conta.con_tipo === 'ativo' ? 'bg-green-600' :
                      'bg-gray-600'
                    )}>
                      {getAccountIcon(conta.con_tipo)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-text-main-light dark:text-text-main-dark font-bold">{conta.con_nome}</span>
                      <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark capitalize">{conta.con_tipo} • Final {conta.con_id.slice(-4)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden md:block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wide">Ativa</span>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary-new">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-6 text-sm text-text-secondary-light dark:text-gray-500">
          <p>FinApp v2.4.0</p>
          <div className="flex gap-4">
            <a className="hover:text-primary-new" href="#">Termos de Uso</a>
            <a className="hover:text-primary-new" href="#">Privacidade</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;