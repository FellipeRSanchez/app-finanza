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
import ConferenciaBancaria from "./pages/ConferenciaBancaria";
import ConferenciaCartao from "./pages/ConferenciaCartao"; // Import the new page
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
    case '/conferencia-bancaria':
      return 'Conferência Bancária';
    case '/conferencia-cartao': // New route title
      return 'Conferência de Cartão';
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
      <Routes>
        {/* Rotas Públicas - NÃO envolvidas pelo MainLayout */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />

        {/* Rotas Autenticadas - Envolvidas pelo MainLayout */}
        <Route path="*" element={
          <MainLayout title={currentTitle} hideValues={hideValues} setHideValues={setHideValues}>
            <Routes>
              {/* Essas rotas só serão renderizadas se a verificação de autenticação do MainLayout passar */}
              <Route path="/dashboard" element={<Dashboard hideValues={hideValues} />} />
              <Route path="/lancamentos" element={<Lancamentos hideValues={hideValues} />} />
              <Route path="/patrimonio" element={<Patrimonio hideValues={hideValues} />} />
              <Route path="/cartoes" element={<Cartoes hideValues={hideValues} />} />
              <Route path="/investimentos" element={<Investimentos hideValues={hideValues} />} />
              <Route path="/importacao-extratos" element={<ImportacaoExtratos hideValues={hideValues} />} />
              <Route path="/fechamento" element={<Fechamento hideValues={hideValues} />} />
              <Route path="/relatorios" element={<Relatorios hideValues={hideValues} />} />
              <Route path="/conferencia-bancaria" element={<ConferenciaBancaria hideValues={hideValues} />} />
              <Route path="/conferencia-cartao" element={<ConferenciaCartao hideValues={hideValues} />} /> {/* New route */}
              <Route path="/configuracoes" element={<Configuracoes hideValues={hideValues} />} />
              <Route path="*" element={<NotFound />} /> {/* Este NotFound é para rotas autenticadas */}
            </Routes>
          </MainLayout>
        } />
      </Routes>
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