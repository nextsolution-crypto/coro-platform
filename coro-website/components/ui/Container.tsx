import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import styles from './primitives.module.css';

type Props<T extends ElementType> = { as?: T; children: ReactNode; className?: string; width?: 'content' | 'reading' } & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;
export function Container<T extends ElementType = 'div'>({ as, children, className = '', width = 'content', ...props }: Props<T>) {
  const Component = as ?? 'div';
  return <Component className={`${styles.container} ${width === 'reading' ? styles.reading : ''} ${className}`} {...props}>{children}</Component>;
}
