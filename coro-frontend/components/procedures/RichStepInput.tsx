'use client';

// Champ d'une étape de procédure : le gras s'affiche en gras (bouton G ou Ctrl+B)
// et une étape « Rouge » s'affiche en rouge. Le texte est enregistré au même
// format qu'avant (« **Vérifiez** le panneau »), celui que lit le PDF.

import { useEffect, useRef } from 'react';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** « **Vérifiez** le panneau » → « <strong>Vérifiez</strong> le panneau » */
export function markdownToHtml(value: string): string {
  return escapeHtml(value || '').replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
}

/** Inverse : seuls le texte et le gras sont gardés. */
export function htmlToMarkdown(root: Node): string {
  let out = '';
  const walk = (node: Node, bold: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').replace(/ /g, ' ');
      out += bold && text.trim() ? `**${text}**` : text;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName;
    if (tag === 'BR') {
      out += ' ';
      return;
    }
    const isBold =
      bold || tag === 'STRONG' || tag === 'B' || /bold|[6-9]00/.test(element.style?.fontWeight || '');
    element.childNodes.forEach((child) => walk(child, isBold));
    if (tag === 'DIV' || tag === 'P') out += ' ';
  };
  root.childNodes.forEach((child) => walk(child, false));
  return normalizeMarkdown(out);
}

/** Fusionne « **a****b** », sort les espaces du gras, retire le gras vide. */
export function normalizeMarkdown(value: string): string {
  let text = value.replace(/\*\*\*\*/g, '');
  text = text.replace(/\*\*(\s*)([^*]*?)(\s*)\*\*/g, (_all, before, inner, after) =>
    inner ? `${before}**${inner}**${after}` : `${before}${after}`,
  );
  return text.replace(/[ \t]{2,}/g, ' ').trim();
}

export default function RichStepInput({
  value,
  onChange,
  red = false,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  red?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  // Contenu affiché : seulement quand la valeur change de l'extérieur
  // (sinon on perdrait la position du curseur pendant la saisie).
  useEffect(() => {
    if (!ref.current) return;
    if (value === lastEmitted.current) return;
    ref.current.innerHTML = markdownToHtml(value);
    lastEmitted.current = value;
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const next = htmlToMarkdown(ref.current);
    lastEmitted.current = next;
    onChange(next);
  };

  const toggleBold = () => {
    ref.current?.focus();
    document.execCommand('bold');
    emit();
  };

  return (
    <div className="rounded" style={{ border: '1px solid #DEE2E6', backgroundColor: '#FFFFFF' }}>
      <div className="flex items-center gap-1 px-1.5 py-1" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <button
          type="button"
          title="Gras (Ctrl+B)"
          aria-label="Gras"
          onMouseDown={(e) => {
            e.preventDefault(); // garde la sélection dans le champ
            toggleBold();
          }}
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#F8F9FA' }}
        >
          G
        </button>
        <span className="text-[11px]" style={{ color: '#ADB5BD' }}>
          Sélectionnez un mot puis G (ou Ctrl+B) pour le mettre en gras
        </span>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="false"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault(); // une étape = un paragraphe
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
          document.execCommand('insertText', false, text);
        }}
        className="text-sm px-2 py-1.5 focus:outline-none min-h-[2.5rem] empty:before:content-[attr(data-placeholder)] empty:before:[color:#ADB5BD]"
        style={{ color: red ? '#C0392B' : '#2C3E50', lineHeight: 1.5, wordBreak: 'break-word' }}
      />
    </div>
  );
}
