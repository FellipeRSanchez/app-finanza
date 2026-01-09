"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="p-6 bg-white flex justify-center items-center">
            <img 
              src="/logo.png" 
              alt="Logo Finanças" 
              className="h-20 w-20 object-contain drop-shadow-lg"
            />
          </div>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Finanças Pessoais</h1>
              <p className="text-gray-600 dark:text-gray-400">Entre para gerenciar suas finanças</p>
            </div>
            <Auth 
              supabaseClient={supabase} 
              providers={[]} 
              appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#4f46e5',
                      brandAccent: '#4338ca',
                    }
                  }
                }
              }} 
              theme="light"
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    button_label: 'Entrar',
                    loading_button_label: 'Entrando...',
                    social_provider_text: 'Entrar com',
                    link_text: 'Já tem uma conta? Entre',
                    email_input_placeholder: 'seu@email.com',
                    password_input_placeholder: 'Sua senha',
                  },
                  sign_up: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    button_label: 'Cadastrar',
                    loading_button_label: 'Cadastrando...',
                    social_provider_text: 'Cadastrar com',
                    link_text: 'Não tem uma conta? Cadastre-se',
                    email_input_placeholder: 'seu@email.com',
                    password_input_placeholder: 'Sua senha',
                  },
                  forgotten_password: {
                    email_label: 'Email',
                    button_label: 'Enviar instruções',
                    loading_button_label: 'Enviando...',
                    link_text: 'Esqueceu sua senha?',
                    email_input_placeholder: 'seu@email.com',
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;