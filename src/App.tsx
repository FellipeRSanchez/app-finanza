import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Lancamentos from "./pages/Lancamentos";
import Patrimonio from "./pages/Patrimonio";
import Configuracoes from "./pages/Configuracoes";
import Cartoes from "./pages/Cartoes";
import Investimentos from "./pages/Investimentos";
import ImportacaoExtratos from "./pages/ImportacaoExtratos";
import Fechamento from "./pages/Fechamento";
import Relatorios from "./pages/Relatorios";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/layout/MainLayout";
import { useState } from "react";

const queryClient = new QueryClient();

// Helper function to get title based on path
const getTitleForPath = (pathname: string) => {
  switch (pathname) {
    case '/dashboard':
      return 'Visão Geral';
    case '/lancamentos':
      return 'Lançamentos';
    case '/patrimonio':
      return 'Patrimônio';
    case '/cartoes':
      return 'Meus Cartões';
    case '/investimentos':
      return 'Investimentos';
    case '/importacao-extratos':
      return 'Importação de Extratos';
    case '/fechamento':
      return 'Fechamento Mensal';
    case '/relatorios':
      return 'Relatórios';
    case '/configuracoes':
      return 'Configurações';
    default:
      return 'Finanças Pro';
  }
};

// Create a separate component for the app content that can use router hooks
const AppContent = () => {
  const [hideValues, setHideValues] = useState(false);
  const location = useLocation();
  const currentTitle = getTitleForPath(location.pathname);

  return (
    <AuthProvider>
      {/* MainLayout now wraps the entire authenticated content, including the Routes */}
      <MainLayout title={currentTitle} hideValues={hideValues} setHideValues={setHideValues}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          {/* Pass hideValues and setHideValues to page components that need them */}
          <Route path="/dashboard" element={<Dashboard hideValues={hideValues} />} />
          <Route path="/lancamentos" element={<Lancamentos hideValues={hideValues} />} />
          <Route path="/patrimonio" element={<Patrimonio hideValues={hideValues} setHideValues={setHideValues} />} />
          <Route path="/cartoes" element={<Cartoes hideValues={hideValues} setHideValues={setHideValues} />} />
          <Route path="/investimentos" element={<Investimentos hideValues={hideValues} setHideValues={setHideValues} />} />
          <Route path="/importacao-extratos" element={<ImportacaoExtratos hideValues={hideValues} setHideValues={setHideValues} />} />
          <Route path="/fechamento" element={<Fechamento hideValues={hideValues} setHideValues={setHideValues} />} />
          <Route path="/relatorios" element={<Relatorios hideValues={hideValues} setHideValues={setHideValues} />} />
          <Route path="/configuracoes" element={<Configuracoes hideValues={hideValues} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
    </AuthProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;