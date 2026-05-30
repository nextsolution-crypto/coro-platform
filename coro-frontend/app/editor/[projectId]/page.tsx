'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

interface Section {
  id: string;
  title: string;
  content: string;
  isEditable?: boolean;
}

interface Module {
  moduleNumber: number;
  title: string;
  sections: Section[];
}

interface Document {
  id: string;
  title: string;
  content: {
    modules: Module[];
  };
  project: {
    name: string;
    documentType: string;
    client: { name: string };
    building: { name: string };
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
      if (res.data?.content?.modules?.[0]?.sections?.[0]) {
        setEditingContent(res.data.content.modules[0].sections[0].content);
      }
    } catch (err) {
      console.error(err);
      router.push(`/projects/${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const currentModule = document.content.modules[activeModule];
      const currentSection = currentModule.sections[activeSection];
      await api.put(
        `/generator/document/${document.id}/module/${currentModule.moduleNumber}/section/${currentSection.id}`,
        { content: editingContent }
      );
      const updatedDoc = { ...document };
      updatedDoc.content.modules[activeModule].sections[activeSection].content = editingContent;
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
    setActiveModule(moduleIdx);
    setActiveSection(sectionIdx);
    setEditingContent(document?.content.modules[moduleIdx].sections[sectionIdx].content || '');
    setIsEditing(false);
  };

  const formatContent = (content: string) => {
    if (!content) return '';
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return `<p key="${i}" class="font-bold text-white mt-4 mb-2">${line.replace(/\*\*/g, '')}</p>`;
        }
        if (line.startsWith('- ')) {
          return `<li key="${i}" class="ml-4 text-gray-300 list-disc">${line.substring(2)}</li>`;
        }
        if (line.startsWith('  - ')) {
          return `<li key="${i}" class="ml-8 text-gray-400 list-disc text-sm">${line.substring(4)}</li>`;
        }
        if (line.includes('|') && line.includes('---')) return '';
        if (line.startsWith('|')) {
          const cells = line.split('|').filter(c => c.trim());
          return `<div key="${i}" class="flex gap-2 border-b border-gray-800 py-1">${cells.map(c => `<span class="flex-1 text-gray-300 text-sm">${c.trim()}</span>`).join('')}</div>`;
        }
        if (line.trim() === '') return `<br key="${i}"/>`;
        return `<p key="${i}" class="text-gray-300 leading-relaxed">${line}</p>`;
      })
      .join('');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Chargement de l editeur...</p>
    </div>
  );

  if (!document) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Document introuvable</p>
    </div>
  );

  const modules = document.content?.modules || [];
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
          <span className="text-gray-300 text-sm">Editeur</span>
          <span className="text-gray-600">|</span>
          <span className="text-orange-400 text-sm font-medium">{document.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Retour au projet
          </button>
          {isEditing && (
            <>
              <button
                onClick={() => {
                  setEditingContent(currentSection?.content || '');
                  setIsEditing(false);
                }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-3 py-1.5 rounded-lg transition-colors">
                Annuler
              </button>
              <button
                onClick={handleSaveSection}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegarde' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Colonne gauche — Navigation modules */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            {modules.map((mod, modIdx) => (
              <div key={mod.moduleNumber} className="mb-2">
                <div className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider mb-1 ${
                  activeModule === modIdx ? 'text-orange-400' : 'text-gray-500'}`}>
                  Module {mod.moduleNumber} — {mod.title}
                </div>
                {mod.sections.map((section, secIdx) => (
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
          {currentSection && (
            <div className="max-w-4xl mx-auto p-8">
              {/* Header section */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-gray-500 text-xs mb-1">
                    Module {currentModule.moduleNumber} — {currentModule.title}
                  </p>
                  <h2 className="text-xl font-bold text-white">
                    {currentSection.id} — {currentSection.title}
                  </h2>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    ✏️ Modifier
                  </button>
                )}
              </div>

              {/* Contenu */}
              {isEditing ? (
                <div className="space-y-3">
                  <p className="text-gray-500 text-xs">
                    Mode edition — Modifiez le texte directement
                  </p>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full h-[calc(100vh-280px)] bg-gray-900 border border-orange-500/30 rounded-xl p-6 text-gray-300 text-sm leading-relaxed focus:outline-none focus:border-orange-500 font-mono resize-none"
                    spellCheck={false}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditingContent(currentSection.content); setIsEditing(false); }}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveSection}
                      disabled={saving}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-2 rounded-lg text-sm">
                      {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 prose prose-invert max-w-none">
                  <div
                    className="space-y-2"
                    dangerouslySetInnerHTML={{ __html: formatContent(currentSection.content) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Colonne droite — Infos et validations */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h3 className="text-white font-semibold text-sm mb-4">Informations</h3>

            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-xs mb-3 font-medium">Document</p>
              <div className="space-y-2">
                <div>
                  <p className="text-gray-500 text-xs">Type</p>
                  <p className="text-white text-sm font-medium">{document.project?.documentType}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Client</p>
                  <p className="text-white text-sm">{document.project?.client?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Batiment</p>
                  <p className="text-white text-sm">{document.project?.building?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Annee</p>
                  <p className="text-white text-sm">{document.project?.year}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-xs mb-3 font-medium">Navigation rapide</p>
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

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-blue-400 text-xs font-medium mb-2">ℹ Comment editer</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Cliquez sur une section dans la colonne gauche, puis sur le bouton "Modifier" pour editer son contenu.
                Sauvegardez avec le bouton orange.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}