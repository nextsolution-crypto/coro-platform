'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

// ── Composants éditeur ──────────────────────────────────────
import Module2Section from '@/components/editor/Module2Section';
import Module3Section from '@/components/editor/Module3Section';
import Module4Section from '@/components/editor/Module4Section';
import Module6Section from '@/components/editor/Module6Section';
import Module7Section from '@/components/editor/Module7Section';
import Module8Section from '@/components/editor/Module8Section';
import SpellCheckedTextarea from '@/components/editor/SpellCheckedTextarea';

// ── Types & constantes ──────────────────────────────────────
import { ShiftType } from '@/components/editor/Module3MemberTable';
import {
  ROLES_INTERNES_BUREAU_FR, ROLES_INTERNES_BUREAU_EN,
  ROLES_INTERNES_INDUSTRIEL_FR, ROLES_INTERNES_INDUSTRIEL_EN,
  ALL_EQUIPEMENTS_FR, ALL_EQUIPEMENTS_EN,
} from '@/lib/module2.roles';

// ============================================================
// TYPES
// ============================================================

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
    building: { name: string; buildingType: string };
    year: number;
  };
}

// ============================================================
// MODULES SPÉCIAUX (sans sections dans la nav)
// ============================================================

const SPECIAL_MODULES = [4, 6, 7, 8];

function getSpecialModuleLabel(moduleNumber: number, lang: 'fr' | 'en'): string {
  const labels: Record<number, [string, string]> = {
    4: ['Voir les procédures',   'View procedures'],
    6: ['Plans techniques',      'Technical plans'],
    7: ['Description du site',   'Site description'],
    8: ['Registres et annexes',  'Records and appendices'],
  };
  return labels[moduleNumber]?.[lang === 'fr' ? 0 : 1] ?? '';
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function EditorPage() {
  const router    = useRouter();
  const params    = useParams();
  const projectId = params.projectId as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [document,       setDocument]       = useState<Document | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [language,       setLanguage]       = useState<'fr' | 'en'>('fr');
  const [activeModule,   setActiveModule]   = useState(0);
  const [activeSection,  setActiveSection]  = useState(0);
  const [editingContent, setEditingContent] = useState('');
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [isEditing,      setIsEditing]      = useState(false);

  // ── Init ────────────────────────────────────────────────

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

  // ── Helpers ─────────────────────────────────────────────

  const getModules = (): Module[] => {
    if (!document?.content) return [];
    return language === 'fr'
      ? document.content.modules_fr || []
      : document.content.modules_en || [];
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

  const handleSaveSection = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const modules = getModules();
      const currentModule  = modules[activeModule];
      const currentSection = currentModule.sections[activeSection];
      await api.put(
        `/generator/document/${document.id}/module/${currentModule.moduleNumber}/section/${currentSection.id}`,
        { content: editingContent, language }
      );
      const updatedDoc  = { ...document };
      const modulesKey  = language === 'fr' ? 'modules_fr' : 'modules_en';
      updatedDoc.content[modulesKey][activeModule].sections[activeSection].content = editingContent;
      setDocument(updatedDoc);
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Formatage texte (Module 1) ───────────────────────────

  const formatContent = (content: string) => {
    if (!content) return '';
    const lines = content.split('\n');
    let html = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3 style="color:#2C3E50;font-weight:700;margin:20px 0 8px;font-size:14px">${line.replace(/\*\*/g, '')}</h3>`;
      } else if (line.match(/^\*\*.*\*\*\s*:/)) {
        if (inList) { html += '</ul>'; inList = false; }
        const parts = line.split(/\*\*(.*?)\*\*/);
        html += `<p style="color:#495057;margin:4px 0"><strong style="color:#2C3E50">${parts[1]}</strong>${parts[2] || ''}</p>`;
      } else if (line.startsWith('- ')) {
        if (!inList) { html += '<ul style="list-style:disc;margin-left:24px;margin:8px 0">'; inList = true; }
        html += `<li style="color:#495057;margin:2px 0">${line.substring(2)}</li>`;
      } else if (line.startsWith('  - ')) {
        html += `<li style="color:#6C757D;margin-left:16px;font-size:13px">${line.substring(4)}</li>`;
      } else if (line.includes('|') && line.includes('---')) {
        // skip
      } else if (line.startsWith('|') && line.endsWith('|')) {
        if (inList) { html += '</ul>'; inList = false; }
        const cells    = line.split('|').filter(c => c.trim());
        const isHeader = lines[i + 1]?.includes('---');
        if (isHeader) {
          html += `<table style="width:100%;border-collapse:collapse;margin:16px 0"><thead><tr>${
            cells.map(c => `<th style="text-align:left;color:#2C3E50;font-size:13px;font-weight:600;border-bottom:2px solid #DEE2E6;padding:8px 12px;background:#F8F9FA">${c.trim()}</th>`).join('')
          }</tr></thead><tbody>`;
        } else {
          const prevLine = lines[i - 1];
          if (!prevLine?.includes('---')) {
            html += `<tr style="border-bottom:1px solid #E9ECEF">${
              cells.map(c => `<td style="color:#495057;font-size:13px;padding:8px 12px">${c.trim()}</td>`).join('')
            }</tr>`;
          }
        }
        const nextNonEmpty = lines.slice(i + 1).find(l => l.trim() !== '');
        if (nextNonEmpty && !nextNonEmpty.startsWith('|')) html += '</tbody></table>';
      } else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<br/>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p style="color:#495057;line-height:1.6;margin:4px 0">${line}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  };

  // ── États de chargement ─────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement de l'éditeur...</p>
    </div>
  );

  if (!document) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm" style={{ color: '#ADB5BD' }}>Document introuvable</p>
    </div>
  );

  const modules        = getModules();
  const currentModule  = modules[activeModule];
  const currentSection = currentModule?.sections?.[activeSection];
  const isSpecialModule = SPECIAL_MODULES.includes(currentModule?.moduleNumber);
  const isBureau = document.project.building.buildingType !== 'industrial';

  // ============================================================
  // RENDU DU CONTENU CENTRAL
  // ============================================================

  const renderModuleContent = () => {
    const n = currentModule.moduleNumber;

    if (n === 8) return (
      <Module8Section
        projectId={projectId}
        language={language}
        initialData={{ sections: currentModule.sections || [] }}
      />
    );

    if (n === 7) return (
      <Module7Section projectId={projectId} language={language} />
    );

    if (n === 6) return (
      <Module6Section projectId={projectId} language={language} />
    );

    if (n === 4) return (
      <Module4Section
        projectId={projectId}
        language={language}
        initialData={{
          directivesGenerales: null,
          procedures: currentModule.procedures || [],
          customProcedureIds: currentModule.customProcedureIds || [],
        }}
      />
    );

    if (n === 3) return (
      <Module3Section
        projectId={projectId}
        language={language}
        initialData={{
          orgRoles:     currentModule.sections.find((s: any) => s.id === '3.1')?.orgRoles || [],
          members:      currentModule.sections.find((s: any) => s.id === '3.2')?.members  || [],
          activeShifts: (currentModule.sections.find((s: any) => s.id === '3.2')?.activeShifts || ['jour']) as ShiftType[],
        }}
      />
    );

    if (n === 2) return (
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
            ? (isBureau ? ROLES_INTERNES_BUREAU_FR : ROLES_INTERNES_INDUSTRIEL_FR)
            : (isBureau ? ROLES_INTERNES_BUREAU_EN : ROLES_INTERNES_INDUSTRIEL_EN)
        }
        availableRoles2_3={language === 'fr' ? ALL_EQUIPEMENTS_FR : ALL_EQUIPEMENTS_EN}
      />
    );

    // Module 1 — texte éditable
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs mb-1" style={{ color: '#ADB5BD' }}>
              Module {currentModule.moduleNumber} — {currentModule.title}
            </p>
            <h2 className="text-xl font-bold" style={{ color: '#2C3E50' }}>
              {currentSection?.id} — {currentSection?.title}
            </h2>
          </div>
          {!isEditing && (
            <button
              onClick={() => { setEditingContent(currentSection?.content || ''); setIsEditing(true); }}
              className="text-sm px-4 py-2 rounded transition-colors flex items-center gap-2 font-medium"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✏️ {language === 'fr' ? 'Modifier' : 'Edit'}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: '#ADB5BD' }}>
              {language === 'fr' ? 'Mode édition — Modifiez le texte directement' : 'Edit mode — Modify the text directly'}
            </p>
            <SpellCheckedTextarea
              value={editingContent}
              onChange={val => setEditingContent(val)}
              language={language}
              className="w-full rounded-md p-6 text-sm leading-relaxed focus:outline-none font-mono resize-none"
              style={{ height: 'calc(100vh - 280px)', backgroundColor: '#FFFFFF', border: '1px solid #C0392B', color: '#2C3E50' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditingContent(currentSection?.content || ''); setIsEditing(false); }}
                className="px-4 py-2 rounded text-sm font-medium"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveSection}
                disabled={saving}
                className="text-white font-medium px-6 py-2 rounded text-sm transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
              >
                {saving ? '...' : language === 'fr' ? 'Sauvegarder les modifications' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div dangerouslySetInnerHTML={{ __html: formatContent(currentSection?.content || '') }} />
          </div>
        )}
      </>
    );
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F9FA' }}>

      {/* ── Topbar ── */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0 sticky top-0 z-40"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DEE2E6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold cursor-pointer" style={{ color: '#2C3E50' }}
            onClick={() => router.push('/dashboard')}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </h1>
          <span style={{ color: '#DEE2E6' }}>|</span>
          <span className="text-sm" style={{ color: '#6C757D' }}>Éditeur</span>
          <span style={{ color: '#DEE2E6' }}>|</span>
          <span className="text-sm font-medium" style={{ color: '#C0392B' }}>{document.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle FR / EN */}
          <div className="flex items-center rounded p-1 gap-1"
            style={{ backgroundColor: '#F8F9FA', border: '1px solid #DEE2E6' }}>
            {(['fr', 'en'] as const).map(lang => (
              <button key={lang} onClick={() => handleLanguageChange(lang)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: language === lang ? '#C0392B' : 'transparent',
                  color: language === lang ? '#FFFFFF' : '#6C757D',
                }}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <button onClick={() => router.push(`/projects/${projectId}`)}
            className="text-sm transition-colors" style={{ color: '#6C757D' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2C3E50')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6C757D')}>
            ← Retour au projet
          </button>

          {isEditing && (
            <>
              <button
                onClick={() => { setEditingContent(currentSection?.content || ''); setIsEditing(false); }}
                className="text-sm px-3 py-1.5 rounded transition-colors"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                Annuler
              </button>
              <button onClick={handleSaveSection} disabled={saving}
                className="text-white text-sm font-medium px-4 py-1.5 rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = saved ? '#1E8449' : '#A93226'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = saved ? '#27AE60' : '#C0392B'; }}>
                {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Navigation gauche ── */}
        <div className="w-60 overflow-y-auto flex-shrink-0"
          style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #DEE2E6' }}>
          <div className="p-3">
            <div className="mb-3 px-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: language === 'fr' ? '#FDEDEC' : '#EBF5FB',
                  color: language === 'fr' ? '#C0392B' : '#2980B9',
                }}>
                {language === 'fr' ? 'Version française' : 'English version'}
              </span>
            </div>

            {modules.map((mod, modIdx) => (
              <div key={mod.moduleNumber} className="mb-2">
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: activeModule === modIdx ? '#C0392B' : '#ADB5BD' }}>
                  M{mod.moduleNumber} — {mod.title}
                </div>

                {/* Modules spéciaux — bouton unique */}
                {(mod.sections || []).length === 0 && (
                  <button
                    onClick={() => handleSectionClick(modIdx, 0)}
                    className="w-full text-left px-3 py-2 rounded text-xs mb-0.5 transition-colors font-medium"
                    style={{
                      backgroundColor: activeModule === modIdx ? '#FDEDEC' : 'transparent',
                      color: activeModule === modIdx ? '#C0392B' : '#495057',
                      border: activeModule === modIdx ? '1px solid #F1948A' : '1px solid transparent',
                    }}
                    onMouseEnter={e => { if (activeModule !== modIdx) e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
                    onMouseLeave={e => { if (activeModule !== modIdx) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {getSpecialModuleLabel(mod.moduleNumber, language)}
                  </button>
                )}

                {/* Sections normales */}
                {(mod.sections || []).map((section, secIdx) => {
                  const isActive = activeModule === modIdx && activeSection === secIdx;
                  return (
                    <button key={section.id}
                      onClick={() => handleSectionClick(modIdx, secIdx)}
                      className="w-full text-left px-3 py-2 rounded text-xs mb-0.5 transition-colors"
                      style={{
                        backgroundColor: isActive ? '#FDEDEC' : 'transparent',
                        color: isActive ? '#C0392B' : '#495057',
                        border: isActive ? '1px solid #F1948A' : '1px solid transparent',
                        fontWeight: isActive ? '600' : '400',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {section.id} — {section.title}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Contenu central ── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F8F9FA' }}>
          {(currentSection || isSpecialModule) && (
            <div className="max-w-4xl mx-auto p-8">
              {renderModuleContent()}
            </div>
          )}
        </div>

        {/* ── Panneau droite — Infos ── */}
        <div className="w-64 overflow-y-auto flex-shrink-0"
          style={{ backgroundColor: '#FFFFFF', borderLeft: '1px solid #DEE2E6' }}>
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-4" style={{ color: '#2C3E50' }}>
              {language === 'fr' ? 'Informations' : 'Information'}
            </h3>

            <div className="rounded-md p-4 mb-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-medium mb-3" style={{ color: '#ADB5BD' }}>Document</p>
              <div className="space-y-2">
                {[
                  { label: language === 'fr' ? 'Type'      : 'Type',     value: document.project?.documentType },
                  { label: language === 'fr' ? 'Client'    : 'Client',   value: document.project?.client?.name },
                  { label: language === 'fr' ? 'Bâtiment'  : 'Building', value: document.project?.building?.name },
                  { label: language === 'fr' ? 'Année'     : 'Year',     value: document.project?.year?.toString() },
                ].map(info => (
                  <div key={info.label}>
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>{info.label}</p>
                    <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{info.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md p-4 mb-4"
              style={{
                backgroundColor: language === 'fr' ? '#FDEDEC' : '#EBF5FB',
                border: `1px solid ${language === 'fr' ? '#F1948A' : '#AED6F1'}`,
              }}>
              <p className="text-xs font-medium mb-1"
                style={{ color: language === 'fr' ? '#C0392B' : '#2980B9' }}>
                {language === 'fr' ? '🇫🇷 Version française active' : '🇺🇸 English version active'}
              </p>
              <p className="text-xs" style={{ color: '#6C757D' }}>
                {language === 'fr' ? 'Modifications en français uniquement.' : 'Edits apply to English version only.'}
              </p>
            </div>

            <div className="rounded-md p-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-medium mb-3" style={{ color: '#ADB5BD' }}>
                {language === 'fr' ? 'Navigation rapide' : 'Quick navigation'}
              </p>
              <div className="space-y-1">
                {modules.map(mod => (
                  <div key={mod.moduleNumber} className="text-xs py-1"
                    style={{ borderBottom: '1px solid #E9ECEF', color: '#495057' }}>
                    <span className="font-mono font-bold" style={{ color: '#C0392B' }}>M{mod.moduleNumber}</span>
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