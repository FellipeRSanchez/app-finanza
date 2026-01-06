"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2 } from 'lucide-react';

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

const Configuracoes = () => {
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
    } catch (error) {
      console.error('Error adding conta:', error);
    }
  };

  const handleDeleteConta = async (id: string) => {
    try {
      const { error } = await supabase.from('contas').delete().eq('con_id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting conta:', error);
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
    } catch (error) {
      console.error('Error adding categoria:', error);
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    try {
      const { error } = await supabase.from('categorias').delete().eq('cat_id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting categoria:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Configurações">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Configurações">
      <div className="space-y-6">
        <Tabs defaultValue="contas" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contas">Contas</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
          </TabsList>

          <TabsContent value="contas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Nova Conta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input
                    placeholder="Nome da conta"
                    value={newContaNome}
                    onChange={(e) => setNewContaNome(e.target.value)}
                  />
                  <select
                    value={newContaTipo}
                    onChange={(e) => setNewContaTipo(e.target.value)}
                    className="px-4 py-2 border rounded-md"
                  >
                    <option value="banco">Banco</option>
                    <option value="cartao">Cartão</option>
                    <option value="investimento">Investimento</option>
                    <option value="ativo">Ativo</option>
                    <option value="passivo">Passivo</option>
                  </select>
                  <Button onClick={handleAddConta}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {contas.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhuma conta cadastrada</p>
                ) : (
                  <div className="space-y-3">
                    {contas.map((conta) => (
                      <div
                        key={conta.con_id}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {conta.con_nome}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">{conta.con_tipo}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteConta(conta.con_id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categorias" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Nova Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input
                    placeholder="Nome da categoria"
                    value={newCategoriaNome}
                    onChange={(e) => setNewCategoriaNome(e.target.value)}
                  />
                  <select
                    value={newCategoriaTipo}
                    onChange={(e) => setNewCategoriaTipo(e.target.value)}
                    className="px-4 py-2 border rounded-md"
                  >
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                  <Button onClick={handleAddCategoria}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorias Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {categorias.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhuma categoria cadastrada</p>
                ) : (
                  <div className="space-y-3">
                    {categorias.map((categoria) => (
                      <div
                        key={categoria.cat_id}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {categoria.cat_nome}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">{categoria.cat_tipo}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategoria(categoria.cat_id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Configuracoes;