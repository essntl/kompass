import {
  BookOpen,
  Briefcase,
  Calendar,
  Compass,
  FileText,
  Globe,
  GraduationCap,
  Link,
  Mail,
  MessageCircle,
  Notebook,
  School,
  Users,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/**
 * The icons a quick link can use, keyed by lucide's kebab-case name (as stored in
 * `QuickLink.icon`). A fixed, static map on purpose: importing the whole icon set
 * dynamically would pull hundreds of kilobytes into the bundle.
 */
export const QUICK_LINK_ICONS: ReadonlyArray<{ name: string; label: string; Icon: LucideIcon }> = [
  { name: 'mail', label: 'E-post', Icon: Mail },
  { name: 'users', label: 'Personer', Icon: Users },
  { name: 'school', label: 'Skole', Icon: School },
  { name: 'compass', label: 'Kompass', Icon: Compass },
  { name: 'book-open', label: 'Bok', Icon: BookOpen },
  { name: 'notebook', label: 'Notatbok', Icon: Notebook },
  { name: 'file-text', label: 'Dokument', Icon: FileText },
  { name: 'calendar', label: 'Kalender', Icon: Calendar },
  { name: 'message-circle', label: 'Melding', Icon: MessageCircle },
  { name: 'video', label: 'Video', Icon: Video },
  { name: 'graduation-cap', label: 'Utdanning', Icon: GraduationCap },
  { name: 'briefcase', label: 'Jobb', Icon: Briefcase },
  { name: 'wrench', label: 'Verktøy', Icon: Wrench },
  { name: 'globe', label: 'Nettside', Icon: Globe },
  { name: 'link', label: 'Lenke', Icon: Link },
];

const BY_NAME = new Map(QUICK_LINK_ICONS.map((entry) => [entry.name, entry.Icon]));

/** The icon for a stored name; unknown or missing names get the link icon. */
export function quickLinkIcon(name: string | undefined): LucideIcon {
  return (name && BY_NAME.get(name)) || Link;
}
