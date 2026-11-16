import type { WalkPreset } from '@shared/types';
import { useId } from 'react';
import { Chip, ChipGroup, Slider } from '@/components/ui';
import { useSettingsStore, WALK_PRESETS, WALK_SPEED_MAX, WALK_SPEED_MIN } from '@/stores/settings';

type Preset = Exclude<WalkPreset, 'custom'>;

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: 'rolig', label: 'Rolig' },
  { value: 'normal', label: 'Normal' },
  { value: 'rask', label: 'Rask' },
];

/** m/s → "4,7 km/t". */
export function formatWalkSpeed(metresPerSecond: number): string {
  return `${(metresPerSecond * 3.6).toFixed(1).replace('.', ',')} km/t`;
}

export interface WalkSpeedControlProps {
  className?: string;
}

/**
 * Walking speed: three presets plus a slider (shown in km/h, stored in m/s).
 * Writes straight to the settings store; `useDailyPlan` re-plans after a short pause.
 */
export function WalkSpeedControl({ className }: WalkSpeedControlProps) {
  const walkSpeed = useSettingsStore((s) => s.walkSpeed);
  const walkPreset = useSettingsStore((s) => s.walkPreset);
  const setWalkPreset = useSettingsStore((s) => s.setWalkPreset);
  const setWalkSpeed = useSettingsStore((s) => s.setWalkSpeed);
  const labelId = useId();

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span id={labelId} className="text-small font-semibold text-ink">
          Gangfart
        </span>
        <span className="text-body font-semibold text-ink tabular-nums">{formatWalkSpeed(walkSpeed)}</span>
      </div>
      <ChipGroup label="Velg gangfart" className="mt-3">
        {PRESETS.map((preset) => (
          <Chip
            key={preset.value}
            selected={walkPreset === preset.value}
            onClick={() => setWalkPreset(preset.value)}
          >
            {preset.label}
          </Chip>
        ))}
      </ChipGroup>
      <Slider
        className="mt-2"
        aria-labelledby={labelId}
        value={walkSpeed}
        onValueChange={setWalkSpeed}
        min={WALK_SPEED_MIN}
        max={WALK_SPEED_MAX}
        step={0.1}
        formatValue={(value) => formatWalkSpeed(value).replace('km/t', 'kilometer i timen')}
        marks={PRESETS.map((preset) => ({ value: WALK_PRESETS[preset.value], label: preset.label }))}
      />
      <p className="mt-1 text-small text-ink-2">
        Brukes når vi regner ut hvor lang tid du bruker på å gå til og fra holdeplassen.
      </p>
    </div>
  );
}
