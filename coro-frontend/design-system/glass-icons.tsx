import {
  Activity, ArrowLeftRight, BadgeCheck, BarChart3, Bell, Building2, Calculator, CalendarCheck, CalendarDays,
  CalendarRange, ChevronDown, ClipboardList, Circle, Coins, FilePlus2, FileSignature, FileText, FileWarning,
  Files, FolderKanban, FolderTree, Gauge, Gem, Gift, Globe, HeartPulse, History, Landmark, LayoutDashboard,
  Library, ListChecks, Map as MapIcon, Menu, MessageSquare, Package, PenLine, Pilcrow, Radar, Route, Scale,
  Search, Settings, Shapes, ShieldCheck, SlidersHorizontal, Tags, Target, Timer, TrendingUp, UserCog, Users, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icônes Liquid Glass (Lucide). Utilisées UNIQUEMENT quand data-ui="glass" : en Legacy, les écrans
 * continuent d'afficher leurs emojis d'origine. La clé est la route de navigation (routes inchangées).
 */
const NAV_ICONS: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/projects': FolderKanban,
  '/activities/portfolio': CalendarDays,
  '/timelog': Timer,
  '/planning': CalendarRange,
  '/clients': Users,
  '/buildings': Building2,
  '/buildings/map': MapIcon,
  '/buildings/compliance': ShieldCheck,
  '/library': Library,
  '/settings': Settings,
  '/bookings': CalendarCheck,
  '/settings/users': UserCog,
  '/referrals': Gift,
  '/admin/mandates': ClipboardList,
  '/admin/capacity': Gauge,
  '/dashboard/rendement': BarChart3,
  '/settings/task-templates': ListChecks,
  '/settings/activity-types': Shapes,
  '/settings/timelog-categories': Tags,
  '/settings/feedback': MessageSquare,
  '/admin/control-center': Radar,
  '/admin/metering': Activity,
  '/admin/commercial': TrendingUp,
  '/admin/commercial/journey': Route,
  '/admin/commercial/prospects': Target,
  '/admin/commercial/contracts': FileSignature,
  '/admin/organizations': Landmark,
  '/admin/product-catalog': Package,
  '/admin/commercial/content': FileText,
  '/admin/commercial/legal-issuer': Scale,
  '/admin/commercial/simulator': Calculator,
  '/admin/commercial/proposals/new': FilePlus2,
  '/admin/commercial/entitlements': BadgeCheck,
  '/admin/commercial/reconciliation': ArrowLeftRight,
  '/admin/commercial/configuration': SlidersHorizontal,
  '/admin/commercial/assumptions/cost': Coins,
  '/admin/commercial/assumptions/value': Gem,
  '/admin/commercial/clauses': Pilcrow,
  '/admin/commercial/proposals': Files,
  '/admin/rex-reports': FileWarning,
  '/admin/referrals': Gift,
  '/admin/map': Globe,
  '/admin/health': HeartPulse,
  '/admin/projects': FolderTree,
  '/admin/procedures': ClipboardList,
  '/admin/task-templates': ListChecks,
  '/admin/feedback': MessageSquare,
  '/admin/changelog': History,
  '/blog': PenLine,
};

const UI_ICONS = { menu: Menu, close: X, bell: Bell, chevron: ChevronDown, search: Search } as const;

/** Icône de navigation (route inconnue : pastille neutre, jamais d'emoji). */
export function GlassNavIcon({ path }: { path: string }) {
  const Icon = NAV_ICONS[path] ?? Circle;
  return <Icon size={17} strokeWidth={1.8} aria-hidden="true" className="flex-shrink-0" />;
}

/** Icône d'interface (menu, fermer, notifications, chevron, recherche). */
export function GlassIcon({ name, size = 18 }: { name: keyof typeof UI_ICONS; size?: number }) {
  const Icon = UI_ICONS[name];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export const GLASS_NAV_ICON_PATHS = Object.keys(NAV_ICONS);
