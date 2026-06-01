'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import Module2Section from '@/components/editor/Module2Section';
import Module3Section from '@/components/editor/Module3Section';
import { ShiftType } from '@/components/editor/Module3MemberTable';
import Module4Section from '@/components/editor/Module4Section';
import {
  ROLES_INTERNES_BUREAU_FR,
  ROLES_INTERNES_BUREAU_EN,
  ROLES_INTERNES_INDUSTRIEL_FR,
  ROLES_INTERNES_INDUSTRIEL_EN,
  ALL_EQUIPEMENTS_FR,
  ALL_EQUIPEMENTS_EN,
} from '@/lib/module2.roles';

interface Section {
  id: string;
  title: string;
  content: string;
  isEditable?: boolean;
  type?: string;
  entries?: any[];
  orgRoles?: any[];
  members?: any[];
  activeShifts?: string[];
}

interface Module {
  moduleNumber: number;
  title: string;
  language: string;
  sections: Section[];
  procedures?: any[];
  customProcedureIds?: string[];
  directivesGenerales?: any;
}

interface DocumentContent {
  modules_fr: Module[];
  modules_en: Module[];
  config: any;
  generatedAt: string;
}

interface Document {
  id: string;
  title: string;
  content: DocumentContent;
  project: {
    name: string;
    documentType: string;
    client: { name: string };
    building: { 
      name: string;
      buildingType: string;
    };
    year: number;
  };
}

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [activeModule, setActiveModule] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchDocument();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const fetchDocument = async () => {
    try {
      const res = await api.get(`/generator/document/${projectId}`);
      setDocument(res.data);
    } catch (err) {
      console.error(err);
      router.push(`/projects/${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  const getModules = (): Module[] => {
    if (!document?.content) return [];
    return language === 'fr'
      ? document.content.modules_fr || []
      : document.content.modules_en || [];
  };

  const handleSaveSection = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const modules = getModules();
      const currentModule = modules[activeModule];
      const currentSection = currentModule.sections[activeSection];
      await api.put(
        `/generator/document/${document.id}/module/${currentModule.moduleNumber}/section/${currentSection.id}`,
        { content: editingContent, language }
      );
      // Mettre à jour localement
      const updatedDoc = { ...document };
      const modulesKey = language === 'fr' ? 'modules_fr' : 'modules_en';
      updatedDoc.content[modulesKey][activeModule].sections[activeSection].content = editingContent;
      setDocument(updatedDoc);
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSectionClick = (moduleIdx: number, sectionIdx: number) => {
    const modules = getModules();
    setActiveModule(moduleIdx);
    setActiveSection(sectionIdx);
    setEditingContent(modules[moduleIdx]?.sections?.[sectionIdx]?.content || '');
    setIsEditing(false);
  };

  const handleLanguageChange = (lang: 'fr' | 'en') => {
    setLanguage(lang);
    setActiveModule(0);
    setActiveSection(0);
    setIsEditing(false);
    const modules = lang === 'fr'
      ? document?.content.modules_fr || []
      : document?.content.modules_en || [];
    setEditingContent(modules[0]?.sections[0]?.content || '');
  };

  const formatContent = (content: string) => {
    if (!content) return '';
    const lines = content.split('\n');
    let html = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3 class="text-white font-bold mt-6 mb-2 text-base">${line.replace(/\*\*/g, '')}</h3>`;
      } else if (line.match(/^\*\*.*\*\*\s*:/) ) {
        if (inList) { html += '</ul>'; inList = false; }
        const parts = line.split(/\*\*(.*?)\*\*/);
        html += `<p class="text-gray-300 my-1"><strong class="text-white">${parts[1]}</strong>${parts[2] || ''}</p>`;
      } else if (line.startsWith('- ')) {
        if (!inList) { html += '<ul class="list-disc ml-6 my-2 space-y-1">'; inList = true; }
        html += `<li class="text-gray-300">${line.substring(2)}</li>`;
      } else if (line.startsWith('  - ')) {
        html += `<li class="text-gray-400 ml-4 text-sm">${line.substring(4)}</li>`;
      } else if (line.includes('|') && line.includes('---')) {
        // Skip table separator
      } else if (line.startsWith('|') && line.endsWith('|')) {
        if (inList) { html += '</ul>'; inList = false; }
        const cells = line.split('|').filter(c => c.trim());
        const isHeader = lines[i + 1]?.includes('---');
        if (isHeader) {
          html += `<table class="w-full border-collapse my-4"><thead><tr>${cells.map(c => `<th class="text-left text-white text-sm font-semibold border-b border-gray-700 py-2 px-3 bg-gray-800">${c.trim()}</th>`).join('')}</tr></thead><tbody>`;
        } else {
          const prevLine = lines[i - 1];
          if (!prevLine?.includes('---')) {
            html += `<tr class="border-b border-gray-800">${cells.map(c => `<td class="text-gray-300 text-sm py-2 px-3">${c.trim()}</td>`).join('')}</tr>`;
          }
        }
        // Close table if next non-empty line doesn't start with |
        const nextNonEmpty = lines.slice(i + 1).find(l => l.trim() !== '');
        if (nextNonEmpty && !nextNonEmpty.startsWith('|')) {
          html += '</tbody></table>';
        }
      } else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<br/>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="text-gray-300 leading-relaxed my-1">${line}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Chargement de l éditeur...</p>
    </div>
  );

  if (!document) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Document introuvable</p>
    </div>
  );

  const modules = getModules();
  const currentModule = modules[activeModule];
  const currentSection = currentModule?.sections?.[activeSection];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
            CO<span className="text-orange-500">RO</span>
          </h1>
          <span className="text-gray-600">|</span>
          <span className="text-gray-300 text-sm">Éditeur</span>
          <span className="text-gray-600">|</span>
          <span className="text-orange-400 text-sm font-medium">{document.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle FR/EN */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleLanguageChange('fr')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                language === 'fr'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'}`}>
              FR
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                language === 'en'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'}`}>
              EN
            </button>
          </div>

          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Retour au projet
          </button>

          {isEditing && (
            <>
              <button
                onClick={() => { setEditingContent(currentSection?.content || ''); setIsEditing(false); }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-3 py-1.5 rounded-lg">
                Annuler
              </button>
              <button
                onClick={handleSaveSection}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg">
                {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Colonne gauche — Navigation */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            <div className="mb-3 px-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                language === 'fr' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {language === 'fr' ? 'Version française' : 'English version'}
              </span>
            </div>
            {modules.map((mod, modIdx) => (
  <div key={mod.moduleNumber} className="mb-2">
    <div className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider mb-1 ${
      activeModule === modIdx ? 'text-orange-400' : 'text-gray-500'}`}>
      {language === 'fr' ? 'Module' : 'Module'} {mod.moduleNumber} — {mod.title}
    </div>

    {/* Module sans sections (ex: Module 4) */}
    {(mod.sections || []).length === 0 && (
      <button
        onClick={() => handleSectionClick(modIdx, 0)}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-0.5 transition-colors ${
          activeModule === modIdx
            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
        {language === 'fr' ? 'Voir les procédures' : 'View procedures'}
      </button>
    )}

    {/* Sections normales */}
    {(mod.sections || []).map((section, secIdx) => (
      <button
        key={section.id}
        onClick={() => handleSectionClick(modIdx, secIdx)}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-0.5 transition-colors ${
          activeModule === modIdx && activeSection === secIdx
            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
        {section.id} — {section.title}
      </button>
    ))}
  </div>
))}
          </div>
        </div>

        {/* Colonne centre — Contenu */}
        <div className="flex-1 overflow-y-auto">
          {(currentSection || currentModule?.moduleNumber === 4) && (
  <div className="max-w-4xl mx-auto p-8">

    {/* Module 2 — tableaux interactifs */}
{currentModule.moduleNumber === 4 ? (
  <Module4Section
    projectId={projectId}
    language={language}
    initialData={{
      directivesGenerales: currentModule.sections?.find(
        (s: any) => s.id === 'directives'
      ) || currentModule,
      procedures: currentModule.procedures || [],
      customProcedureIds: currentModule.customProcedureIds || [],
    }}
  />
) : currentModule.moduleNumber === 3 ? (
  <Module3Section
    projectId={projectId}
    language={language}
    initialData={{
      orgRoles:     currentModule.sections.find((s: any) => s.id === '3.1')?.orgRoles || [],
      members:      currentModule.sections.find((s: any) => s.id === '3.2')?.members  || [],
      activeShifts: (currentModule.sections.find((s: any) => s.id === '3.2')?.activeShifts || ['jour']) as ShiftType[],
    }}
  />
) : currentModule.moduleNumber === 2 ? (
  <Module2Section
    projectId={projectId}
    language={language}
    initialData={{
      section2_1: currentModule.sections.find((s: any) => s.id === '2.1')?.entries || [],
      section2_2: currentModule.sections.find((s: any) => s.id === '2.2')?.entries || [],
      section2_3: currentModule.sections.find((s: any) => s.id === '2.3')?.entries || [],
      section2_4: currentModule.sections.find((s: any) => s.id === '2.4')?.entries || [],
    }}
    availableRoles2_2={
      language === 'fr'
        ? (document.project.building.buildingType === 'industrial'
            ? ROLES_INTERNES_INDUSTRIEL_FR
            : ROLES_INTERNES_BUREAU_FR)
        : (document.project.building.buildingType === 'industrial'
            ? ROLES_INTERNES_INDUSTRIEL_EN
            : ROLES_INTERNES_BUREAU_EN)
    }
    availableRoles2_3={language === 'fr' ? ALL_EQUIPEMENTS_FR : ALL_EQUIPEMENTS_EN}
  />
    ) : (
      /* Modules texte (Module 1 etc.) — comportement existant */
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-500 text-xs mb-1">
              {language === 'fr' ? 'Module' : 'Module'} {currentModule.moduleNumber} — {currentModule.title}
            </p>
            <h2 className="text-xl font-bold text-white">
              {currentSection.id} — {currentSection.title}
            </h2>
          </div>
          {!isEditing && (
            <button
              onClick={() => { setEditingContent(currentSection.content); setIsEditing(true); }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
              ✏️ {language === 'fr' ? 'Modifier' : 'Edit'}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">
              {language === 'fr' ? 'Mode édition — Modifiez le texte directement' : 'Edit mode — Modify the text directly'}
            </p>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full h-[calc(100vh-280px)] bg-gray-900 border border-orange-500/30 rounded-xl p-6 text-gray-300 text-sm leading-relaxed focus:outline-none focus:border-orange-500 font-mono resize-none"
              spellCheck={false}/>
            <div className="flex gap-3">
              <button
                onClick={() => { setEditingContent(currentSection.content); setIsEditing(false); }}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveSection}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-2 rounded-lg text-sm">
                {saving ? '...' : language === 'fr' ? 'Sauvegarder les modifications' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <div dangerouslySetInnerHTML={{ __html: formatContent(currentSection.content) }}/>
          </div>
        )}
      </>
    )}
  </div>
)}
        </div>

        {/* Colonne droite — Infos */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h3 className="text-white font-semibold text-sm mb-4">
              {language === 'fr' ? 'Informations' : 'Information'}
            </h3>

            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-xs mb-3 font-medium">
                {language === 'fr' ? 'Document' : 'Document'}
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-gray-500 text-xs">{language === 'fr' ? 'Type' : 'Type'}</p>
                  <p className="text-white text-sm font-medium">{document.project?.documentType}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{language === 'fr' ? 'Client' : 'Client'}</p>
                  <p className="text-white text-sm">{document.project?.client?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{language === 'fr' ? 'Bâtiment' : 'Building'}</p>
                  <p className="text-white text-sm">{document.project?.building?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{language === 'fr' ? 'Année' : 'Year'}</p>
                  <p className="text-white text-sm">{document.project?.year}</p>
                </div>
              </div>
            </div>

            {/* Langue active */}
            <div className={`rounded-xl p-4 mb-4 ${
              language === 'fr' ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
              <p className={`text-xs font-medium mb-1 ${language === 'fr' ? 'text-orange-400' : 'text-blue-400'}`}>
                {language === 'fr' ? '🇫🇷 Version française active' : '🇺🇸 English version active'}
              </p>
              <p className="text-gray-400 text-xs">
                {language === 'fr'
                  ? 'Toutes les modifications s\'appliquent à la version française.'
                  : 'All edits apply to the English version.'}
              </p>
            </div>

            {/* Navigation rapide */}
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-3 font-medium">
                {language === 'fr' ? 'Navigation rapide' : 'Quick navigation'}
              </p>
              <div className="space-y-1">
                {modules.map((mod) => (
                  <div key={mod.moduleNumber}
                    className="text-gray-400 text-xs py-1 border-b border-gray-700">
                    <span className="text-orange-400 font-mono">M{mod.moduleNumber}</span>
                    {' '}{mod.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}