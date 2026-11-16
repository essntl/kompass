import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar, Card, Page, PageHeader } from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { MORE_NAV } from './navigation';

/** `/mer`: the destinations that do not fit in the bottom navigation. */
export function MorePage() {
  const profile = useSettingsStore((state) => state.profile);
  const schoolName = useSettingsStore((state) => state.schoolName);

  return (
    <Page>
      <PageHeader title="Mer" />

      <div className="flex items-center gap-3">
        <Avatar name={profile.name} color={1} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-heading font-semibold text-ink">{profile.name}</p>
          <p className="truncate text-small text-ink-2">
            {[profile.year, profile.programme, schoolName].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        <nav aria-label="Mer">
          <ul className="divide-y divide-line">
            {MORE_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="flex min-h-18 items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-surface-hover focus-visible:-outline-offset-2 active:bg-surface-2"
                  >
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-ink"
                    >
                      <Icon className="size-5.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-ink">{item.label}</span>
                      <span className="block text-small text-ink-2">{item.description}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Card>
    </Page>
  );
}
