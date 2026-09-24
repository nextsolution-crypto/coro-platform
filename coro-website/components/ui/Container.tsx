import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import styles from './primitives.module.css';

type Props<T extends ElementType> = { as?: T; children: ReactNode; className?: string } & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;
export function Container<T extends ElementType = 'div'>({ as, children, className = '', ...props }: Props<T>) {
  const Component = as ?? 'div';
  return <Component className={`${styles.container} ${className}`} {...props}>{children}</Component>;
}
