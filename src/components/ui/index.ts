/**
 * Kompass component library. Import everything from `@/components/ui`.
 * Live examples of every component: /dev/ui (src/app/dev/UiGallery.tsx).
 */

// layout
export { Page, type PageProps } from './Page';
export { PageHeader, type PageHeaderProps } from './PageHeader';
export { Section, type SectionProps } from './Section';
export { Card, type CardProps, type CardTone, type CardPadding } from './Card';

// actions
export { Button, ButtonLink, type ButtonProps, type ButtonLinkProps } from './Button';
export { IconButton, type IconButtonProps } from './IconButton';
export { type ButtonVariant, type ButtonSize } from './buttonStyles';
export { Chip, ChipGroup, type ChipProps, type ChipGroupProps } from './Chip';

// status
export { Badge, DemoBadge, type BadgeProps, type BadgeTone } from './Badge';
export { Avatar, initialsOf, type AvatarProps } from './Avatar';
export { Skeleton, SkeletonText, type SkeletonProps, type SkeletonTextProps } from './Skeleton';
export { Spinner, type SpinnerProps } from './Spinner';
export { EmptyState, ErrorState, type EmptyStateProps, type ErrorStateProps } from './EmptyState';

// forms
export { Field, type FieldProps, type FieldControlProps } from './Field';
export { Input, type InputProps } from './Input';
export { Textarea, type TextareaProps } from './Textarea';
export { Select, type SelectProps, type SelectOption } from './Select';
export { Switch, type SwitchProps } from './Switch';
export { Slider, type SliderProps } from './Slider';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from './SegmentedControl';
export { ThemeSwitcher, type ThemeSwitcherProps } from './ThemeSwitcher';

// overlays
export { Sheet, type SheetProps } from './Sheet';
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export { Toaster } from './Toaster';
export { toast, type ToastOptions } from './toast';

// motion and disclosure
export { Stagger, StaggerItem, type StaggerProps, type StaggerItemProps } from './Stagger';
export { Collapse, type CollapseProps } from './Collapse';
export { Tabs, TabPanel, type TabsProps, type TabItem, type TabPanelProps } from './Tabs';

// brand
export { BrandMark, type BrandMarkProps } from './BrandMark';

// helpers and hooks
export { subjectColor, type SubjectColorClasses } from './subjectColor';
export { useMediaQuery, useIsDesktop } from './useMediaQuery';
export { useAiStatus, type AiStatus } from './useAiStatus';
export { cn } from '@/lib/cn';
