'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import AppLayout from '@/components/layout/AppLayout';
import { User, Building2, FileText, Users, Clock, MessageSquare, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => { initAuth(); }, []);
  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  if (!user) return null;

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

  const sections = [
    {
      title: 'Mon compte',
      items: [
        { icon: <User size={20} />, label: 'Mon profil', desc: 'Prénom, nom, titre, téléphones, certification', path: '/settings/profile', color: '#2980B9' },
      ]
    },
    ...(isAdmin ? [{
      title: 'Organisation',
      items: [
        { icon: <Building2 size={20} />, label: 'Organisation', desc: 'Logo, nom, téléphone, courriel de l\'entreprise', path: '/settings/organization', color: '#C0392B' },
        { icon: <FileText size={20} />, label: 'Modèle Module 1', desc: 'Sections personnalisées pour vos documents', path: '/settings/module1-template', color: '#8E44AD' },
        { icon: <Users size={20} />, label: 'Membres de l\'équipe', desc: 'Gérer les utilisateurs de votre organisation', path: '/settings/users', color: '#27AE60' },
      ]
    }] : []),
    {
      title: 'Outils',
      items: [
        { icon: <Clock size={20} />, label: 'Catégories de timelog', desc: 'Personnaliser les catégories de saisie des heures', path: '/settings/timelog-categories', color: '#E67E22' },
        { icon: <FileText size={20} />, label: 'Modèles de tâches', desc: 'Listes de tâches réutilisables pour vos mandats', path: '/settings/task-templates', color: '#16A085' },
        { icon: <MessageSquare size={20} />, label: 'Nous écrire', desc: 'Signaler un problème ou suggérer une amélioration', path: '/settings/feedback', color: '#6C757D' },
      ]
    }
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Paramètres</h2>
        <p className="text-sm mt-1" style={{ color: '#6C757D' }}>Gérez votre profil et votre organisation</p>
      </div>

      <div className="space-y-8">
        {sections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#ADB5BD' }}>
              {section.title}
            </p>
            <div className="space-y-2">
              {section.items.map(item => (
                <button key={item.path} onClick={() => router.push(item.path)}
                  className="w-full flex items-center gap-4 p-4 rounded-md text-left transition-all"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E9ECEF'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0"
                    style={{ backgroundColor: item.color + '15', color: item.color }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{item.desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: '#ADB5BD', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}