'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface DragDropUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload?: (file: File) => Promise<string>;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'free';
  previewHeight?: number;
  mode?: 'upload' | 'base64';
  onBase64?: (base64: string, file: File) => void;
}

export default function DragDropUpload({
  value,
  onChange,
  onUpload,
  accept = 'image/*',
  maxSizeMB = 10,
  label = 'Téléverser une image',
  hint,
  aspectRatio = 'free',
  previewHeight = 160,
  mode = 'upload',
  onBase64,
}: DragDropUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Fichier trop volumineux — maximum ${maxSizeMB} MB`);
      return;
    }
    if (accept === 'image/*' && !file.type.startsWith('image/')) {
      setError('Format non supporté — images uniquement');
      return;
    }
    if (mode === 'base64') {
      const reader = new FileReader();
      reader.onload = ev => {
        const base64 = ev.target?.result as string;
        onChange(base64);
        onBase64?.(base64, file);
      };
      reader.readAsDataURL(file);
      return;
    }
    setUploading(true);
    try {
      const url = await onUpload!(file);
      onChange(url);
    } catch (err) {
      setError('Erreur lors du téléversement');
    } finally {
      setUploading(false);
    }
  }, [accept, maxSizeMB, onUpload, onChange, mode, onBase64]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const objectFit = aspectRatio === 'free' ? 'contain' : 'cover';

  return (
    <div>
      {value ? (
        // Aperçu avec image
        <div className="relative rounded-md overflow-hidden"
          style={{ border: '1px solid #DEE2E6', height: previewHeight }}>
          <img
            src={value}
            alt="Aperçu"
            style={{ width: '100%', height: '100%', objectFit }}
          />
          {/* Overlay au survol */}
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              <Upload size={13} /> Changer
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: 'rgba(192,57,43,0.7)', border: '1px solid rgba(192,57,43,0.8)' }}
            >
              <X size={13} /> Supprimer
            </button>
          </div>
        </div>
      ) : (
        // Zone de drag & drop
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className="rounded-md flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
          style={{
            height: previewHeight,
            border: `2px dashed ${dragging ? '#C0392B' : '#CED4DA'}`,
            backgroundColor: dragging ? '#FDEDEC' : '#F8F9FA',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#C0392B', borderTopColor: 'transparent' }} />
              <p className="text-xs" style={{ color: '#6C757D' }}>Téléversement...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: dragging ? '#FDEDEC' : '#FFFFFF', border: `1px solid ${dragging ? '#F1948A' : '#DEE2E6'}` }}>
                {dragging
                  ? <Upload size={18} color="#C0392B" />
                  : <ImageIcon size={18} color="#ADB5BD" />
                }
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-medium" style={{ color: dragging ? '#C0392B' : '#495057' }}>
                  {dragging ? 'Déposer ici' : label}
                </p>
                <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                  {hint || `Glisser-déposer ou cliquer · Max ${maxSizeMB} MB`}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs mt-1.5 font-medium" style={{ color: '#C0392B' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="hidden"
      />
    </div>
  );
}