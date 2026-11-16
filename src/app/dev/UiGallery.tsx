/*
 * Dev-only component gallery: /dev/ui
 *
 * This file doubles as usage documentation for `@/components/ui`. Every block
 * shows a component the way a feature page would use it, with realistic copy.
 * It is not shipped in production builds (see src/app/router.tsx).
 */
import type { SubjectColor } from '@shared/types';
import {
  ArrowRight,
  Bookmark,
  Bus,
  CalendarPlus,
  Camera,
  ChevronDown,
  CircleCheck,
  Clock,
  Footprints,
  Inbox,
  MapPin,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Send,
  Share2,
  TrainFront,
  TramFront,
  Trash,
  TriangleExclamationPoint,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  BrandMark,
  Button,
  ButtonLink,
  Card,
  Chip,
  ChipGroup,
  cn,
  Collapse,
  ConfirmDialog,
  DemoBadge,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Page,
  PageHeader,
  Section,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  SkeletonText,
  Slider,
  Spinner,
  Stagger,
  StaggerItem,
  subjectColor,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  ThemeSwitcher,
  toast,
  useAiStatus,
  useIsDesktop,
} from '@/components/ui';

const SUBJECT_COLORS: SubjectColor[] = [1, 2, 3, 4, 5, 6, 7, 8];
const SUBJECT_NAMES = [
  'Produksjon',
  'Konstruksjon',
  'Norsk',
  'Matematikk',
  'Naturfag',
  'Engelsk',
  'Kroppsøving',
  'YFF',
];

/** A labelled row of examples. */
function Demo({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-semibold tracking-wide text-ink-3 uppercase">{label}</p>
      <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
    </div>
  );
}

function Swatch({ className, name }: { className: string; name: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={cn('h-12 w-full rounded-sm border border-line', className)} />
      <span className="text-caption text-ink-2">{name}</span>
    </div>
  );
}

export function UiGallery() {
  const isDesktop = useIsDesktop();
  const aiStatus = useAiStatus();

  return (
    <Page width="wide">
      <PageHeader
        title="Komponenter"
        subtitle={`@/components/ui · ${isDesktop ? 'skrivebord' : 'mobil'} · AI-status: ${aiStatus}`}
        back="/"
        actions={<IconButton label="Del siden" icon={<Share2 />} />}
      />

      <Card>
        <Field label="Utseende" as="group" hint="Bytter tema for hele appen. Lagres i innstillingene.">
          {(control) => <ThemeSwitcher aria-labelledby={control['aria-labelledby']} />}
        </Field>
      </Card>

      <FoundationsSection />
      <ButtonsSection />
      <CardsSection />
      <ChipsAndBadgesSection />
      <FormsSection />
      <TabsAndCollapseSection />
      <LoadingSection />
      <StatesSection />
      <OverlaysSection />
      <StaggerSection />
    </Page>
  );
}

// ---------------------------------------------------------------- foundations

function FoundationsSection() {
  return (
    <Section title="Typografi og farger">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="font-display text-title font-semibold tracking-tight">Kompass</span>
        </div>
        <p className="font-display text-hero font-semibold tracking-tight">
          <time>08:15</time>
        </p>
        <p className="font-display text-display font-semibold tracking-tight">text-display · 32</p>
        <p className="font-display text-title font-semibold tracking-tight">text-title · 24</p>
        <p className="text-heading font-semibold">text-heading · 19 · Første time i dag</p>
        <p className="text-body">text-body · 16 · Du har norsk i rom B204 med Kari Haugen.</p>
        <p className="text-small text-ink-2">text-small · 14 · text-ink-2 · Oppdatert for 2 minutter siden</p>
        <p className="text-caption text-ink-3">text-caption · 12 · text-ink-3 · Kilde: Entur</p>
      </Card>

      <div className="grid grid-cols-3 gap-3 desktop:grid-cols-6">
        <Swatch className="bg-bg" name="bg" />
        <Swatch className="bg-surface" name="surface" />
        <Swatch className="bg-surface-2" name="surface-2" />
        <Swatch className="bg-primary" name="primary" />
        <Swatch className="bg-primary-soft" name="primary-soft" />
        <Swatch className="bg-accent" name="accent" />
        <Swatch className="bg-accent-soft" name="accent-soft" />
        <Swatch className="bg-danger-soft" name="danger-soft" />
        <Swatch className="bg-success-soft" name="success-soft" />
        <Swatch className="bg-info-soft" name="info-soft" />
        <Swatch className="bg-line" name="line" />
        <Swatch className="bg-line-strong" name="line-strong" />
      </div>

      <Demo label="subjectColor(n) – soft + ink, solid som stripe">
        {SUBJECT_COLORS.map((n, index) => {
          const color = subjectColor(n);
          return (
            <div
              key={n}
              className={cn('flex items-center gap-2 rounded-sm py-1.5 pr-3 pl-2', color.soft, color.ink)}
            >
              <span className={cn('h-5 w-1 rounded-full', color.solid)} />
              <span className="text-small font-semibold">{SUBJECT_NAMES[index]}</span>
            </div>
          );
        })}
      </Demo>
    </Section>
  );
}

// ---------------------------------------------------------------- buttons

function ButtonsSection() {
  const [saving, setSaving] = useState(false);

  function fakeSave() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast.success('Endringene er lagret');
    }, 1400);
  }

  return (
    <Section title="Knapper">
      <Demo label="variant">
        <Button>Meld fravær</Button>
        <Button variant="secondary">Avbryt</Button>
        <Button variant="soft">Legg til oppføring</Button>
        <Button variant="ghost">Hopp over</Button>
        <Button variant="danger">Slett oppføring</Button>
      </Demo>
      <Demo label="size: sm · md · lg">
        <Button size="sm">Se alle</Button>
        <Button size="md">Lagre</Button>
        <Button size="lg">Send søknad</Button>
      </Demo>
      <Demo label="icon · iconRight">
        <Button icon={<Plus />}>Legg til time</Button>
        <Button variant="secondary" iconRight={<ArrowRight />}>
          Se reiseforslag
        </Button>
        <Button variant="soft" size="sm" icon={<CalendarPlus />}>
          Legg i kalender
        </Button>
      </Demo>
      <Demo label="loading (holder bredden) · disabled">
        <Button loading={saving} onClick={fakeSave}>
          Lagre endringer
        </Button>
        <Button variant="secondary" loading>
          Henter avganger
        </Button>
        <Button disabled>Send søknad</Button>
        <Button variant="secondary" disabled>
          Avbryt
        </Button>
      </Demo>
      <Demo label="fullWidth" className="max-w-sm">
        <Button fullWidth size="lg" icon={<Send />}>
          Send melding
        </Button>
      </Demo>
      <Demo label="ButtonLink (ruter-lenke og ekstern lenke)">
        <ButtonLink to="/timeplan" variant="soft" iconRight={<ArrowRight />}>
          Åpne timeplanen
        </ButtonLink>
        <ButtonLink to="https://www.vilbli.no/" variant="secondary">
          Åpne vilbli.no
        </ButtonLink>
      </Demo>
      <Demo label="IconButton – krever label">
        <IconButton label="Rediger" icon={<Pencil />} />
        <IconButton label="Lagre annonsen" icon={<Bookmark />} variant="secondary" />
        <IconButton label="Legg til" icon={<Plus />} variant="soft" />
        <IconButton label="Ny melding" icon={<Send />} variant="primary" />
        <IconButton label="Oppdater" icon={<RotateCw />} size="sm" />
        <IconButton label="Ta bilde" icon={<Camera />} size="lg" variant="soft" />
        <IconButton label="Slett" icon={<Trash />} disabled />
        <IconButton label="Oppdaterer" icon={<RotateCw />} loading />
      </Demo>
    </Section>
  );
}

// ---------------------------------------------------------------- cards

function CardsSection() {
  const norsk = subjectColor(3);
  return (
    <Section title="Kort">
      <div className="grid grid-cols-1 gap-3 desktop:grid-cols-2">
        <Card tone="primary" padding="lg">
          <p className="text-small font-medium opacity-85">Dra hjemmefra</p>
          <p className="mt-1 font-display text-hero font-semibold tracking-tight">
            <time>07:42</time>
          </p>
          <p className="mt-2 text-body">Buss 31 fra Sinsen T. Du er framme 12 minutter før norsk.</p>
        </Card>

        <Card tone="accent" padding="lg">
          <div className="flex items-start gap-3">
            <TriangleExclamationPoint aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Knapt med tid i dag</p>
              <p className="mt-1 text-small">
                Neste avgang gir deg bare 4 minutter før første time. Vurder å dra ti minutter
                tidligere.
              </p>
            </div>
          </div>
        </Card>

        <Card interactive as="button" type="button" onClick={() => toast('Åpner timen')}>
          <div className="flex items-center gap-3">
            <span className={cn('h-10 w-1 shrink-0 rounded-full', norsk.solid)} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">Norsk</p>
              <p className="truncate text-small text-ink-2">
                <time>08:15</time>–<time>09:45</time> · Rom B204 · Kari Haugen
              </p>
            </div>
            <Badge tone="primary" icon={<Clock />}>
              Om 35 min
            </Badge>
          </div>
        </Card>

        <Card tone="sunken">
          <p className="text-small text-ink-2">tone="sunken"</p>
          <p className="mt-1">Brukes for bakgrunnsinfo og innfelte flater.</p>
        </Card>

        <Card tone="primary-soft">
          <p className="font-semibold">tone="primary-soft"</p>
          <p className="mt-1 text-small">Rolig framheving, for eksempel et tips eller et AI-svar.</p>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="grid h-28 place-items-center bg-surface-2 text-small text-ink-2">
            padding="none" – bilde går helt ut
          </div>
          <div className="p-4">
            <p className="font-semibold">Sveiset hyllebrakett</p>
            <p className="text-small text-ink-2">12. november · Produksjon</p>
          </div>
        </Card>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- chips, badges, avatars

function ChipsAndBadgesSection() {
  const [modes, setModes] = useState<string[]>(['buss', 'trikk']);
  const [county, setCounty] = useState('Oslo');

  const toggle = (mode: string) =>
    setModes((current) =>
      current.includes(mode) ? current.filter((entry) => entry !== mode) : [...current, mode],
    );

  return (
    <Section title="Chips, merker og avatarer">
      <Demo label="Chip med selected (filter, flere valg)">
        <ChipGroup label="Reisemåter">
          <Chip icon={<Bus />} selected={modes.includes('buss')} onClick={() => toggle('buss')}>
            Buss
          </Chip>
          <Chip icon={<TramFront />} selected={modes.includes('trikk')} onClick={() => toggle('trikk')}>
            Trikk
          </Chip>
          <Chip icon={<TrainFront />} selected={modes.includes('tog')} onClick={() => toggle('tog')}>
            Tog
          </Chip>
          <Chip icon={<Footprints />} selected={modes.includes('gange')} onClick={() => toggle('gange')}>
            Gange
          </Chip>
          <Chip selected={false} disabled>
            Båt
          </Chip>
        </ChipGroup>
      </Demo>

      <Demo label={'ChipGroup layout="scroll" (ett valg, ruller sidelengs på mobil)'} className="block">
        <ChipGroup label="Fylke" layout="scroll">
          {['Oslo', 'Akershus', 'Buskerud', 'Østfold', 'Innlandet', 'Vestfold', 'Telemark', 'Agder'].map(
            (name) => (
              <Chip key={name} selected={county === name} onClick={() => setCounty(name)}>
                {name}
              </Chip>
            ),
          )}
        </ChipGroup>
      </Demo>

      <Demo label="Chip uten selected (forslag)">
        <ChipGroup label="Forslag til spørsmål">
          <Chip onClick={() => toast('Spør: Hva er et fagbrev?')}>Hva er et fagbrev?</Chip>
          <Chip onClick={() => toast('Spør: Hvor mye tjener en lærling?')}>Hvor mye tjener en lærling?</Chip>
          <Chip onClick={() => toast('Spør: Hva gjør et opplæringskontor?')}>
            Hva gjør et opplæringskontor?
          </Chip>
        </ChipGroup>
      </Demo>

      <Demo label="Badge tone">
        <Badge>VG1</Badge>
        <Badge tone="primary">3 plasser</Badge>
        <Badge tone="accent" icon={<Clock />}>
          Frist om 3 dager
        </Badge>
        <Badge tone="danger" icon={<TriangleExclamationPoint />}>
          Fravær
        </Badge>
        <Badge tone="success" icon={<CircleCheck />}>
          Søknad sendt
        </Badge>
        <Badge tone="info" icon={<MapPin />}>
          Utplassering
        </Badge>
        <DemoBadge />
      </Demo>

      <Demo label="Avatar – size og shape">
        <Avatar name="Kari Haugen" color={3} size="sm" />
        <Avatar name="Jonas Berg" color={4} />
        <Avatar name="Amina Yusuf" color={6} size="lg" />
        <Avatar name="Sara Nilsen" color={1} size="xl" />
        <Avatar name="Nordre Mekaniske" color={2} shape="square" size="lg" initials="NM" />
        <Avatar name="Fjordkraft Verksted" color={5} shape="square" size="lg" initials="FV" />
      </Demo>
    </Section>
  );
}

// ---------------------------------------------------------------- forms

function FormsSection() {
  const [view, setView] = useState<'dag' | 'uke'>('dag');
  const [reason, setReason] = useState<'sykdom' | 'lege' | 'annet'>('sykdom');
  const [speed, setSpeed] = useState(1.3);
  const [notify, setNotify] = useState(true);
  const [wholeDay, setWholeDay] = useState(false);
  const [title, setTitle] = useState('');

  return (
    <Section title="Skjema">
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <Input
            label="Tittel"
            placeholder="For eksempel Sveiset hyllebrakett"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            hint="Kort og beskrivende. Vises i porteføljen."
            enterKeyHint="next"
          />
          <Input
            label="Hjemmeadresse"
            leading={<Search />}
            placeholder="Søk etter adresse"
            autoComplete="street-address"
            enterKeyHint="search"
          />
          <Input
            label="E-post til kontaktperson"
            type="email"
            defaultValue="kari.haugen@"
            error="Skriv hele adressen, for eksempel navn@skole.no."
          />
          <Input label="Rom" optional placeholder="B204" trailing="rom" />
          <Select
            label="Fag"
            placeholder="Velg fag"
            defaultValue=""
            options={SUBJECT_NAMES.map((name) => ({ value: name, label: name }))}
          />
          <Textarea
            label="Hva gjorde du?"
            autoGrow
            rows={3}
            placeholder="Beskriv arbeidet med egne ord"
            hint="Vokser med teksten (autoGrow)."
          />
          <Input label="Skolens navn" defaultValue="Kuben videregående skole" disabled />
        </Card>

        <Card className="flex flex-col gap-5">
          <Field label="Visning" as="group">
            {(control) => (
              <SegmentedControl
                aria-labelledby={control['aria-labelledby']}
                value={view}
                onChange={setView}
                options={[
                  { value: 'dag', label: 'Dag' },
                  { value: 'uke', label: 'Uke' },
                ]}
              />
            )}
          </Field>

          <Field label="Årsak" as="group" hint="Læreren ser årsaken du velger.">
            {(control) => (
              <SegmentedControl
                aria-labelledby={control['aria-labelledby']}
                aria-describedby={control['aria-describedby']}
                value={reason}
                onChange={setReason}
                options={[
                  { value: 'sykdom', label: 'Sykdom' },
                  { value: 'lege', label: 'Lege' },
                  { value: 'annet', label: 'Annet' },
                ]}
              />
            )}
          </Field>

          <Demo label='size="sm" fullWidth={false}'>
            <SegmentedControl
              aria-label="Sortering"
              size="sm"
              fullWidth={false}
              value={view}
              onChange={setView}
              options={[
                { value: 'dag', label: 'Nyeste' },
                { value: 'uke', label: 'Frist' },
              ]}
            />
          </Demo>

          <Field
            label="Gangfart"
            as="group"
            hint={`${speed.toFixed(1).replace('.', ',')} m/s – brukes når vi regner ut reisetiden.`}
          >
            {(control) => (
              <Slider
                aria-labelledby={control['aria-labelledby']}
                value={speed}
                onValueChange={setSpeed}
                min={0.7}
                max={2.2}
                step={0.1}
                formatValue={(value) => `${value.toFixed(1).replace('.', ',')} meter per sekund`}
                marks={[
                  { value: 1.0, label: 'Rolig' },
                  { value: 1.3, label: 'Normal' },
                  { value: 1.7, label: 'Rask' },
                ]}
              />
            )}
          </Field>

          <div className="flex flex-col divide-y divide-line">
            <Switch
              className="py-2"
              label="Varsle meg før første time"
              description="Du får et varsel når det er på tide å dra."
              checked={notify}
              onCheckedChange={setNotify}
            />
            <Switch
              className="py-2"
              label="Hele dagen"
              checked={wholeDay}
              onCheckedChange={setWholeDay}
            />
            <Switch className="py-2" label="Del posisjon med skolen" disabled />
          </div>

          <Demo label="Switch uten label (krever aria-label)">
            <Switch aria-label="Vis helger" defaultChecked />
            <Switch aria-label="Vis fravær" />
          </Demo>
        </Card>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- tabs + collapse

function TabsAndCollapseSection() {
  const tabsId = useId();
  const [tab, setTab] = useState<'ledige' | 'lagret' | 'sokt'>('ledige');
  const [open, setOpen] = useState(false);

  return (
    <Section title="Faner og utvid">
      <Card className="flex flex-col gap-4">
        <Tabs
          id={tabsId}
          aria-label="Lærlingplasser"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'ledige', label: 'Ledige', count: 20 },
            { value: 'lagret', label: 'Lagret', count: 2 },
            { value: 'sokt', label: 'Søkt' },
          ]}
        />
        <TabPanel tabsId={tabsId} value="ledige" active={tab === 'ledige'}>
          <p className="text-ink-2">20 ledige lærlingplasser i Oslo og omegn.</p>
        </TabPanel>
        <TabPanel tabsId={tabsId} value="lagret" active={tab === 'lagret'}>
          <p className="text-ink-2">Du har lagret 2 annonser. Fristene ligger i timeplanen.</p>
        </TabPanel>
        <TabPanel tabsId={tabsId} value="sokt" active={tab === 'sokt'}>
          <p className="text-ink-2">Du har ikke sendt noen søknader ennå.</p>
        </TabPanel>

        <Demo label="fullWidth (to–tre faner på mobil)" className="block">
          <Tabs
            aria-label="Meldinger"
            fullWidth
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'ledige', label: 'Alle' },
              { value: 'lagret', label: 'Uleste', count: 1 },
              { value: 'sokt', label: 'Fravær' },
            ]}
          />
        </Demo>
      </Card>

      <Card padding="none">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="gallery-collapse"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-4 text-left font-semibold focus-visible:-outline-offset-2"
        >
          Flere avganger
          <ChevronDown
            aria-hidden
            className={cn('size-5 text-ink-2 transition-transform duration-200 ease-out', open && 'rotate-180')}
          />
        </button>
        <Collapse id="gallery-collapse" open={open}>
          <ul className="divide-y divide-line border-t border-line">
            {[
              ['07:42', 'Buss 31 fra Sinsen T', '22 min'],
              ['07:50', 'T-bane 5 fra Sinsen', '19 min'],
              ['07:57', 'Buss 31 fra Sinsen T', '22 min'],
            ].map(([time, line, duration]) => (
              <li key={time} className="flex items-center gap-3 px-4 py-3">
                <time className="font-display text-heading font-semibold">{time}</time>
                <span className="min-w-0 flex-1 truncate text-ink-2">{line}</span>
                <span className="nums text-small text-ink-2">{duration}</span>
              </li>
            ))}
          </ul>
        </Collapse>
      </Card>
    </Section>
  );
}

// ---------------------------------------------------------------- loading

function LoadingSection() {
  return (
    <Section title="Lasting">
      <div className="grid grid-cols-1 gap-3 desktop:grid-cols-2">
        <Card aria-busy="true" aria-label="Laster reiseforslag">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <SkeletonText lines={3} className="mt-4" />
        </Card>
        <Card className="flex flex-col gap-4">
          <Demo label="Spinner size">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" className="text-primary" />
          </Demo>
          <p className="text-small text-ink-2">
            Bruk skjelett formet som innholdet for alt som tar mer enn ca. 300 ms. Spinner hører
            hjemme i knapper og små oppdateringer.
          </p>
        </Card>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- empty + error

function StatesSection() {
  return (
    <Section title="Tomt og feil">
      <div className="grid grid-cols-1 gap-3 desktop:grid-cols-2">
        <Card>
          <EmptyState
            size="compact"
            icon={<Inbox />}
            title="Ingen meldinger ennå"
            description="Når en lærer skriver til deg, dukker samtalen opp her."
            action={<Button icon={<Pencil />}>Skriv til en lærer</Button>}
          />
        </Card>
        <Card>
          <ErrorState
            size="compact"
            title="Fant ingen avganger"
            description="Vi fikk ikke kontakt med Entur. Sjekk nettet og prøv igjen."
            onRetry={() => toast.error('Fikk fortsatt ikke kontakt med Entur')}
          />
        </Card>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- overlays

function OverlaysSection() {
  const [formOpen, setFormOpen] = useState(false);
  const [longOpen, setLongOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wholeDay, setWholeDay] = useState(true);

  function submit() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setFormOpen(false);
      toast.success('Fravær meldt', { description: 'Kari Haugen og Jonas Berg har fått beskjed.' });
    }, 900);
  }

  return (
    <Section title="Overlegg">
      <Demo label="Sheet – bunnark på mobil, dialog på skrivebord">
        <Button onClick={() => setFormOpen(true)}>Meld fravær</Button>
        <Button variant="secondary" onClick={() => setLongOpen(true)}>
          Åpne ark med mye innhold
        </Button>
      </Demo>

      <Demo label="ConfirmDialog">
        <Button variant="danger" icon={<Trash />} onClick={() => setConfirmOpen(true)}>
          Slett oppføring
        </Button>
      </Demo>

      <Demo label="toast()">
        <Button variant="secondary" onClick={() => toast('Lenken er kopiert')}>
          toast()
        </Button>
        <Button variant="secondary" onClick={() => toast.success('Søknaden er sendt')}>
          toast.success()
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.error('Fikk ikke sendt meldingen', { description: 'Sjekk nettet og prøv igjen.' })
          }
        >
          toast.error()
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast('Annonsen er fjernet fra lagrede', {
              action: { label: 'Angre', onClick: () => toast.success('Annonsen er lagret igjen') },
            })
          }
        >
          med handling
        </Button>
      </Demo>

      <Sheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Meld fravær"
        description="Lærerne dine får beskjed med en gang."
        dismissible={!saving}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setFormOpen(false)} disabled={saving}>
              Avbryt
            </Button>
            <Button type="submit" form="gallery-absence" fullWidth loading={saving}>
              Meld fravær
            </Button>
          </div>
        }
      >
        <form
          id="gallery-absence"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Input label="Dato" type="date" defaultValue="2026-11-17" />
          <Switch label="Hele dagen" checked={wholeDay} onCheckedChange={setWholeDay} />
          <Collapse open={!wholeDay}>
            <Select
              label="Time"
              defaultValue="norsk"
              options={[
                { value: 'norsk', label: 'Norsk 08:15–09:45' },
                { value: 'matte', label: 'Matematikk 10:00–11:30' },
                { value: 'prod', label: 'Produksjon 12:15–15:15' },
              ]}
            />
          </Collapse>
          <Select
            label="Årsak"
            defaultValue="sykdom"
            options={[
              { value: 'sykdom', label: 'Sykdom' },
              { value: 'lege_tannlege', label: 'Lege eller tannlege' },
              { value: 'familie', label: 'Familie' },
              { value: 'transport', label: 'Transport' },
              { value: 'annet', label: 'Annet' },
            ]}
          />
          <Textarea label="Melding til læreren" optional rows={3} placeholder="Skriv litt mer hvis du vil" />
        </form>
      </Sheet>

      <Sheet open={longOpen} onOpenChange={setLongOpen} title="Industrimekaniker hos Nordre Mekaniske" size="lg">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 8 }, (_, index) => (
            <p key={index} className="text-ink-2">
              Du blir med på vedlikehold og reparasjon av maskiner i produksjonen, sammen med
              erfarne fagarbeidere. Vi ser etter deg som er nysgjerrig, møter presis og liker å
              bruke hendene. Innholdet ruller inne i arket, og siden bak står stille.
            </p>
          ))}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Slette oppføringen?"
        description="Bildet og kompetansebeskrivelsen blir borte. Du kan ikke angre."
        confirmLabel="Slett"
        onConfirm={() => toast('Oppføringen er slettet')}
      />
    </Section>
  );
}

// ---------------------------------------------------------------- stagger

function StaggerSection() {
  const [run, setRun] = useState(0);
  const rows = [
    ['Norsk', '08:15–09:45', 'B204', 3],
    ['Matematikk', '10:00–11:30', 'B112', 4],
    ['Produksjon', '12:15–15:15', 'Verksted 2', 1],
    ['Kroppsøving', '15:30–16:15', 'Hall A', 7],
  ] as const;

  return (
    <Section
      title="Liste med Stagger"
      action={
        <Button variant="ghost" size="sm" icon={<RotateCw />} onClick={() => setRun((n) => n + 1)}>
          Spill av igjen
        </Button>
      }
    >
      <Stagger key={run} as="ul" className="flex flex-col gap-2">
        {rows.map(([name, time, room, color]) => {
          const palette = subjectColor(color);
          return (
            <StaggerItem key={name} as="li">
              <Card className="flex items-center gap-3">
                <span className={cn('h-10 w-1 shrink-0 rounded-full', palette.solid)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="nums truncate text-small text-ink-2">
                    {time} · {room}
                  </p>
                </div>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Section>
  );
}
