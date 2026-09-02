import React from 'react';

export function PageTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 style={{
        fontSize: 'clamp(20px, 4vw, 24px)',
        fontWeight: 700,
        lineHeight: 1.2,
        color: 'var(--text-primary)',
        margin: 0,
        letterSpacing: '-0.3px',
      }}>
        {children}
      </h1>
      {subtitle && (
        <p style={{
          fontSize: 'clamp(12px, 2vw, 13px)',
          color: 'var(--text-muted)',
          margin: '4px 0 0',
          lineHeight: 1.4,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 'clamp(14px, 3vw, 16px)',
      fontWeight: 600,
      lineHeight: 1.3,
      color: 'var(--text-primary)',
      margin: '0 0 16px',
      paddingBottom: '10px',
      borderBottom: '1px solid #E9ECEF',
    }}>
      {children}
    </h2>
  );
}

export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label style={{
      display: 'block',
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: '6px',
    }}>
      {children}
      {required && (
        <span style={{ color: 'var(--primary)', marginLeft: '3px' }}>*</span>
      )}
    </label>
  );
}

export function MetaText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'clamp(11px, 2vw, 13px)',
      color: 'var(--text-muted)',
      margin: 0,
      lineHeight: 1.4,
    }}>
      {children}
    </p>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'clamp(13px, 2.5vw, 14px)',
      fontWeight: 600,
      color: 'var(--text-primary)',
      margin: 0,
      lineHeight: 1.4,
    }}>
      {children}
    </p>
  );
}