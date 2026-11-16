import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Field, Input, Page, PageHeader, Select, ThemeSwitcher } from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { WalkSpeedControl } from '@/features/travel/components/WalkSpeedControl';
import { AiStatusRow } from './components/AiStatusRow';
import { ResetDemoRow } from './components/ResetDemoRow';
import { SettingsGroup } from './components/SettingsGroup';

const YEARS = [
  { value: 'VG1', label: 'VG1' },
  { value: 'VG2', label: 'VG2' },
  { value: 'VG3', label: 'VG3' },
];

export function SettingsPage() {
  const profile = useSettingsStore((s) => s.profile);
  const setProfile = useSettingsStore((s) => s.setProfile);
  const schoolName = useSettingsStore((s) => s.schoolName);
  const school = useSettingsStore((s) => s.school);
  const setSchool = useSettingsStore((s) => s.setSchool);
  const home = useSettingsStore((s) => s.home);
  const setHome = useSettingsStore((s) => s.setHome);

  const years = YEARS.some((y) => y.value === profile.year)
    ? YEARS
    : [...YEARS, { value: profile.year, label: profile.year }];

  return (
    <Page>
      <PageHeader title="Innstillinger" />

      <SettingsGroup title="Profil">
        <Input
          label="Navn"
          value={profile.name}
          autoComplete="name"
          onChange={(event) => setProfile({ name: event.target.value })}
        />
        <Select
          label="Trinn"
          value={profile.year}
          options={years}
          onChange={(event) => setProfile({ year: event.target.value })}
        />
        <Input
          label="Utdanningsprogram"
          value={profile.programme}
          onChange={(event) => setProfile({ programme: event.target.value })}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Skole"
        footer="Du legger inn skolen én gang. Timer uten eget sted regnes som timer på skolen."
      >
        <Input
          label="Navn på skolen"
          value={schoolName}
          autoComplete="organization"
          onChange={(event) => setSchool(school, event.target.value)}
        />
        <AddressAutocomplete
          label="Skolens adresse"
          value={school}
          onChange={(place) => setSchool(place)}
          placeholder="Søk etter adresse"
          focus={home ?? undefined}
        />
      </SettingsGroup>

      <SettingsGroup title="Hjem" footer="Brukes bare til å finne reisen til og fra skolen.">
        <AddressAutocomplete
          label="Hjemmeadresse"
          value={home}
          onChange={setHome}
          placeholder="Søk etter adresse"
          focus={school ?? undefined}
        />
      </SettingsGroup>

      <SettingsGroup title="Reise">
        <WalkSpeedControl />
      </SettingsGroup>

      <SettingsGroup title="Utseende">
        <Field label="Tema" as="group">
          {(control) => <ThemeSwitcher aria-labelledby={control['aria-labelledby']} />}
        </Field>
      </SettingsGroup>

      <SettingsGroup title="Om appen" variant="list">
        <AiStatusRow />
        <ResetDemoRow />
      </SettingsGroup>
    </Page>
  );
}
