'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, GripVertical } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface ProcedureStep {
  id: string;
  textFR: string;
  textEN: string;
  isBold?: boolean;
  isRed?: boolean;
  isCommentable?: boolean;
  isList?: boolean;
  subSteps?: ProcedureStep[];
  comment?: string; // Commentaire éditable par l'utilisateur
}

export interface RoleSection {
  roleCode: string;
  roleLabelFR: string;
  roleLabelEN: string;
  headerColor: string;
  steps: ProcedureStep[];
}

export interface Procedure {
  id: string;
  code: string;
  sectionNumber?: string;
  titleFR: string;
  titleEN: string;
  icon?: string;
  headerColor: string;
  directivesGenerales?: ProcedureStep[];
  roleSections: RoleSection[];
}

interface Module4ProcedureCardProps {
  procedure: Procedure;
  language?: 'fr' | 'en';
  overrides?: Record<string, string>; // stepId → texte modifié
  comments?: Record<string, string>;  // stepId → commentaire
  onOverride?: (stepId: string, text: string) => void;
  onComment?: (stepId: string, comment: string) => void;
  defaultExpanded?: boolean;
}

// ============================================================
// RENDU D'UNE ÉTAPE
// ============================================================

function StepRenderer({
  step,
  language,
  override,
  comment,
  onOverride,
  onComment,
  depth = 0,
}: {
  step: ProcedureStep;
  language: 'fr' | 'en';
  override?: string;
  comment?: string;
  onOverride?: (id: string, text: string) => void;
  onComment?: (id: string, comment: string) => void;
  depth?: number;
}) {
  const [editingComment, setEditingComment] = useState(false);
  const [editingStep, setEditingStep] = useState(false);

  const rawText = language === 'fr' ? step.textFR : step.textEN;
  const displayText = override || rawText;
  const isFr = language === 'fr';

  // Parse le texte : **mot** → gras, [9-1-1] → rouge
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const indent = depth > 0 ? 'ml-6' : '';
  const bullet = step.isList ? '•' : '';

  return (
    <div className={`${indent} mb-1`}>
      <div className={`group flex items-start gap-2 py-1 px-2 rounded
        hover:bg-gray-50 transition-colors
        ${step.isRed ? 'text-red-600' : 'text-gray-800'}`}>

        {/* Puce */}
        {bullet && (
          <span className="text-gray-400 mt-0.5 flex-shrink-0 text-xs">{bullet}</span>
        )}

        {/* Texte */}
        <div className="flex-1 text-sm leading-relaxed">
          {editingStep ? (
            <div className="space-y-1">
              <textarea
                defaultValue={displayText}
                onBlur={e => {
                  onOverride?.(step.id, e.target.value);
                  setEditingStep(false);
                }}
                autoFocus
                className="w-full text-sm border border-orange-300 rounded px-2 py-1
                  focus:outline-none focus:border-orange-500 bg-white text-gray-800
                  resize-none"
                rows={3}
              />
            </div>
          ) : (
            <span
              onClick={() => setEditingStep(true)}
              className="cursor-text hover:bg-yellow-50 rounded px-0.5 transition-colors"
              title={isFr ? 'Cliquer pour modifier' : 'Click to edit'}
            >
              {renderText(displayText)}
              {override && (
                <span className="ml-1 text-xs text-orange-400 font-normal">
                  ✎
                </span>
              )}
            </span>
          )}
        </div>

        {/* Bouton commentaire */}
        {step.isCommentable && (
          <button
            onClick={() => setEditingComment(!editingComment)}
            className={`flex-shrink-0 p-0.5 rounded transition-colors mt-0.5
              ${comment
                ? 'text-orange-500 bg-orange-50'
                : 'text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100'}`}
            title={isFr ? 'Ajouter un commentaire' : 'Add a comment'}
          >
            <MessageSquare size={13} />
          </button>
        )}
      </div>

      {/* Champ commentaire */}
      {step.isCommentable && (editingComment || comment) && (
        <div className="ml-6 mt-1 mb-2">
          <textarea
            value={comment || ''}
            onChange={e => onComment?.(step.id, e.target.value)}
            placeholder={isFr ? 'Ajouter une note spécifique à ce bâtiment...' : 'Add a building-specific note...'}
            className="w-full text-xs border border-orange-200 rounded px-2 py-1.5
              focus:outline-none focus:border-orange-400 bg-orange-50
              text-gray-700 resize-none"
            rows={2}
          />
        </div>
      )}

      {/* Sous-étapes */}
      {step.subSteps?.map(sub => (
        <StepRenderer
          key={sub.id}
          step={sub}
          language={language}
          override={override}
          onOverride={onOverride}
          onComment={onComment}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module4ProcedureCard({
  procedure,
  language = 'fr',
  overrides = {},
  comments = {},
  onOverride,
  onComment,
  defaultExpanded = true,
}: Module4ProcedureCardProps) {

  const [expanded, setExpanded] = useState(defaultExpanded);
  const isFr = language === 'fr';

  const title = isFr ? procedure.titleFR : procedure.titleEN;

  return (
    <div className="mb-6 rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">

      {/* Header procédure */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left
          hover:opacity-90 transition-opacity"
        style={{ backgroundColor: procedure.headerColor }}
      >
        <div className="flex items-center gap-3">
          {procedure.sectionNumber && (
            <span className="text-white/80 text-sm font-mono font-bold">
              {procedure.sectionNumber}
            </span>
          )}
          {procedure.icon && (
            <span className="text-lg">{procedure.icon}</span>
          )}
          <span className="text-white font-bold text-sm uppercase tracking-wide">
            {title}
          </span>
        </div>
        <div className="text-white/70">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Contenu */}
      {expanded && (
        <div>
          {/* Directives générales */}
          {procedure.directivesGenerales && procedure.directivesGenerales.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <div className="border border-red-200 rounded p-3 bg-red-50">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  {isFr ? 'Directives générales' : 'General directives'}
                </p>
                <ul className="space-y-1">
                  {procedure.directivesGenerales.map(step => (
                    <StepRenderer
                      key={step.id}
                      step={step}
                      language={language}
                      override={overrides[step.id]}
                      comment={comments[step.id]}
                      onOverride={onOverride}
                      onComment={onComment}
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Sections par rôle */}
          {procedure.roleSections.map(section => (
            <div key={section.roleCode} className="border-b border-gray-100 last:border-0">

              {/* Header rôle */}
              <div
                className="px-4 py-2 text-white text-xs font-bold uppercase tracking-wide"
                style={{ backgroundColor: section.headerColor }}
              >
                {section.roleCode === 'TOUS'
                  ? (isFr ? section.roleLabelFR : section.roleLabelEN)
                  : `${section.roleCode} — ${isFr ? section.roleLabelFR : section.roleLabelEN}`
                }
              </div>

              {/* Étapes */}
              <div className="px-4 py-3">
                {section.steps.map(step => (
                  <StepRenderer
                    key={step.id}
                    step={step}
                    language={language}
                    override={overrides[step.id]}
                    comment={comments[step.id]}
                    onOverride={onOverride}
                    onComment={onComment}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}