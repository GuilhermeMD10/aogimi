'use client';

import { SectionCard } from '@/shared/ui/SectionCard';
import { Field } from '@/shared/ui/Field';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

export function AccountSection({
  displayName,
  username,
  email,
  language,
}: {
  displayName: string;
  username: string;
  email: string | null;
  language: string | null;
}) {
  return (
    <SectionCard title="Account">
      <Field label="Display name" value={displayName} />
      <Field label="Username" value={username} />
      {email && <Field label="Email" value={email} />}
      <Field label="Language level">
        <div className="flex gap-1">
          {JLPT_LEVELS.map((l) => (
            <span
              key={l}
              className="lgc-chip cursor-pointer"
              style={{
                background: language === l ? 'var(--lgc-accent)' : 'var(--lgc-bg-sunken)',
                color: language === l ? 'white' : 'var(--lgc-fg-muted)',
                fontWeight: language === l ? 600 : 400,
                padding: '4px 10px',
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </Field>
    </SectionCard>
  );
}
