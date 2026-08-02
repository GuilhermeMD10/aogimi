import { Eyebrow, PaperCard } from '@/shared/components';
import { BackToSettings } from '../components/BackToSettings';
import { SettingsShell } from '../components/SettingsShell';
import { CREDITS, type CreditEntry } from '../lib/credits';

/**
 * `/credits` — the settings shell showing attribution. The list comes from
 * `lib/credits.ts`, the audited inventory of what the web bundle actually
 * ships; several of the data licenses *require* this page, so keep that file
 * in sync with reality rather than editing copy here. Every section renders
 * expanded — the obligations don't hide behind a disclosure.
 */
export default function CreditsView() {
  return (
    <SettingsShell>
      <div>
        <div className="mb-3 flex items-baseline gap-3">
          <Eyebrow>Credits</Eyebrow>
          <BackToSettings />
        </div>
        <PaperCard className="flex items-start gap-7 p-[30px]">
          <span
            aria-hidden
            className="flex size-[66px] shrink-0 items-center justify-center rounded-(--radius-card) bg-(--accent) font-[family-name:var(--face-jp)] text-[34px] text-(--accent-ink)"
          >
            仰
          </span>
          <span className="min-w-0">
            <h2 className="text-[27px] leading-[1.15] font-bold text-(--ink)">Aogimi</h2>
            <p className="mt-2 text-[13.5px] leading-[1.6] text-(--muted)">
              <span className="font-[family-name:var(--face-jp)]">仰ぎ見る</span> — to look up.
            </p>
          </span>
        </PaperCard>
      </div>

      {CREDITS.map((section) => (
        <div key={section.heading}>
          <Eyebrow className="mb-3">{section.heading}</Eyebrow>
          {section.blurb && (
            <p className="mb-3 max-w-[62ch] text-[13px] leading-[1.5] text-(--muted)">
              {section.blurb}
            </p>
          )}
          <PaperCard>
            {section.entries.map((entry, i) => (
              <CreditRow key={entry.name} entry={entry} ruled={i > 0} />
            ))}
          </PaperCard>
        </div>
      ))}
    </SettingsShell>
  );
}

function CreditRow({ entry, ruled }: { entry: CreditEntry; ruled: boolean }) {
  const detail = [entry.owner, entry.note].filter(Boolean).join(' · ');

  return (
    <div
      className={
        'flex items-center gap-6 px-6 py-[18px]' + (ruled ? ' border-t border-(--paper-bd)' : '')
      }
    >
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-(--ink)">
          {entry.url ? (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-120 ease-[ease] hover:text-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
            >
              {entry.name}
            </a>
          ) : (
            entry.name
          )}
        </div>
        {detail && <div className="mt-[3px] text-[13px] leading-[1.45] text-(--muted)">{detail}</div>}
      </div>
      <div className="shrink-0 text-right font-[family-name:var(--face-mono)] text-[10px] tracking-[0.1em] text-(--faint)">
        {entry.license}
      </div>
    </div>
  );
}
