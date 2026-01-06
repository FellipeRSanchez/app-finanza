"use client";

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Relatorios = () => {
  return (
    <MainLayout title="Relatórios">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatórios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">Módulo de relatórios em desenvolvimento</p>
              <p className="text-sm">
                Em breve você terá acesso a relatórios detalhados das suas finanças
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Relatorios;