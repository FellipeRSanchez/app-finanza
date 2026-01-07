"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { showSuccess, showError } from '@/utils/toast';

const PreferencesSettings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [hideBalances, setHideBalances] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Implement actual dark mode toggle logic here
    showSuccess(`Modo Escuro ${!darkMode ? 'ativado' : 'desativado'}.`);
  };

  const handleToggleHideBalances = () => {
    setHideBalances(!hideBalances);
    // Implement actual hide balances logic here
    showSuccess(`Saldos ${!hideBalances ? 'ocultos' : 'visíveis'}.`);
  };

  const handleToggleWeeklyReports = () => {
    setWeeklyReports(!weeklyReports);
    // Implement actual weekly reports logic here
    showSuccess(`Relatórios Semanais ${!weeklyReports ? 'ativados' : 'desativados'}.`);
  };

  return (
    <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438] flex flex-col h-full">
      <CardHeader className="px-0 pt-0 pb-6">
        <CardTitle className="text-text-main-light dark:text-text-main-dark text-xl font-bold">Preferências</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0 flex flex-col divide-y divide-border-light dark:divide-[#2d2438]">
        {/* Toggle Item: Dark Mode */}
        <div className="flex items-center justify-between py-4 first:pt-0">
          <div className="flex flex-col">
            <Label htmlFor="darkMode" className="text-text-main-light dark:text-text-main-dark font-medium">Modo Escuro</Label>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Usar tema escuro na interface.</p>
          </div>
          <Switch
            id="darkMode"
            checked={darkMode}
            onCheckedChange={handleToggleDarkMode}
          />
        </div>
        {/* Toggle Item: Hide Balances */}
        <div className="flex items-center justify-between py-4">
          <div className="flex flex-col">
            <Label htmlFor="hideBalances" className="text-text-main-light dark:text-text-main-dark font-medium">Ocultar Saldos</Label>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Esconder valores na tela inicial.</p>
          </div>
          <Switch
            id="hideBalances"
            checked={hideBalances}
            onCheckedChange={handleToggleHideBalances}
          />
        </div>
        {/* Toggle Item: Weekly Reports */}
        <div className="flex items-center justify-between py-4">
          <div className="flex flex-col">
            <Label htmlFor="weeklyReports" className="text-text-main-light dark:text-text-main-dark font-medium">Relatórios Semanais</Label>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Receber resumo por e-mail.</p>
          </div>
          <Switch
            id="weeklyReports"
            checked={weeklyReports}
            onCheckedChange={handleToggleWeeklyReports}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PreferencesSettings;