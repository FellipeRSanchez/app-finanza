"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, UserCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

const ProfileSettingsForm = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
      } else {
        // If no profile exists, create a basic one
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user?.id, first_name: user?.user_metadata.full_name || user?.email?.split('@')[0] || '', last_name: '' })
          .select()
          .single();
        if (insertError) throw insertError;
        setProfile(newProfile);
        setFirstName(newProfile.first_name || '');
        setLastName(newProfile.last_name || '');
      }

      // Fetch email from auth.users or current user object
      setEmail(user?.email || '');

    } catch (error) {
      console.error('Error fetching profile:', error);
      showError('Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() })
        .eq('id', user?.id);

      if (error) throw error;

      showSuccess('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-light dark:bg-[#1e1629] rounded-2xl p-6 md:p-8 shadow-soft border border-border-light dark:border-[#2d2438]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-border-light dark:border-[#2d2438] pb-8">
          <div className="flex gap-5 items-center">
            <div className="relative group cursor-pointer">
              <div className="bg-center bg-no-repeat bg-cover rounded-full size-24 md:size-28 shadow-md ring-4 ring-white dark:ring-gray-700 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="User profile photo" className="rounded-full size-full object-cover" />
                ) : (
                  <UserCircle className="w-full h-full text-gray-400 dark:text-gray-600" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-lg border-2 border-white dark:border-[#2d2438] flex items-center justify-center transition-transform hover:scale-110">
                <Edit className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-text-main-light dark:text-text-main-dark text-xl font-bold">Foto de Perfil</h3>
              <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm mt-1">PNG ou JPG até 5MB.</p>
            </div>
          </div>
          <Button variant="outline" className="bg-background-light dark:bg-[#2d2438] hover:bg-background-light/70 dark:hover:bg-[#2d2438]/70 text-text-main-light dark:text-text-main-dark font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors">
            Remover Foto
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName" className="text-text-main-light dark:text-gray-200 text-sm font-semibold">Primeiro Nome</Label>
            <Input
              id="firstName"
              className="w-full rounded-xl border-border-light dark:border-gray-600 bg-card-light dark:bg-[#1e1629] h-12 px-4 text-text-main-light dark:text-text-main-dark placeholder:text-text-secondary-light focus-visible:border-primary-new focus-visible:ring-1 focus-visible:ring-primary-new outline-none transition-all"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName" className="text-text-main-light dark:text-gray-200 text-sm font-semibold">Sobrenome</Label>
            <Input
              id="lastName"
              className="w-full rounded-xl border-border-light dark:border-gray-600 bg-card-light dark:bg-[#1e1629] h-12 px-4 text-text-main-light dark:text-text-main-dark placeholder:text-text-secondary-light focus-visible:border-primary-new focus-visible:ring-1 focus-visible:ring-primary-new outline-none transition-all"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-text-main-light dark:text-gray-200 text-sm font-semibold">E-mail</Label>
            <Input
              id="email"
              className="w-full rounded-xl border-border-light dark:border-gray-600 bg-card-light dark:bg-[#1e1629] h-12 px-4 text-text-main-light dark:text-text-main-dark placeholder:text-text-secondary-light focus-visible:border-primary-new focus-visible:ring-1 focus-visible:ring-primary-new outline-none transition-all"
              type="email"
              value={email}
              disabled // Email is usually managed by auth provider, not directly editable here
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="text-text-main-light dark:text-gray-200 text-sm font-semibold">Telefone</Label>
            <Input
              id="phone"
              className="w-full rounded-xl border-border-light dark:border-gray-600 bg-card-light dark:bg-[#1e1629] h-12 px-4 text-text-main-light dark:text-text-main-dark placeholder:text-text-secondary-light focus-visible:border-primary-new focus-visible:ring-1 focus-visible:ring-primary-new outline-none transition-all"
              type="tel"
              placeholder="(XX) XXXXX-XXXX"
              disabled={saving}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf" className="text-text-main-light dark:text-gray-200 text-sm font-semibold">CPF</Label>
            <Input
              id="cpf"
              className="w-full rounded-xl border border-border-light dark:border-gray-700 bg-background-light dark:bg-[#1e1629]/50 h-12 px-4 text-gray-400 cursor-not-allowed"
              disabled
              type="text"
              value="***.***.890-**"
            />
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t border-border-light dark:border-[#2d2438] mt-2">
          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-95"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProfileSettingsForm;