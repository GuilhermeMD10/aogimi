import type { ReactNode } from 'react';
import { CloudAlert, CloudDownload, Cloudy } from 'lucide-react';
import { Eyebrow, PaperCard } from '@/shared/components';
import { SettingsShell } from '../components/SettingsShell';

/* Mirror the sync badge colours the library actually draws on book tiles —
 * they identify UI, so they don't follow the theme tokens. */
const SYNC_GREEN = '#2E9F58';
const SYNC_BLUE = '#1E3D6B';
const SYNC_GREY = '#6B6661';

/**
 * `/help` — the settings shell showing the guide instead of the controls.
 * Hand-authored and shipped with the app (works offline, no CMS). Prose-heavy
 * on purpose; this is the page someone reads once.
 */
export default function HelpView() {
  return (
    <SettingsShell>
      <div>
        {/* The way back is the TopBar's "back to profile" pill — the eyebrow's
            own "back to settings" link went with the /settings route. */}
        <Eyebrow className="mb-3">Help</Eyebrow>
        <PaperCard className="p-[30px] pb-8">
          <h2 className="text-[27px] leading-[1.15] font-bold text-(--ink)">What is Aogimi?</h2>
          <p className="mt-3 max-w-[60ch] text-[14.5px] leading-[1.7] text-(--soft)">
            Aogimi is a Japanese reading and vocabulary companion. Open an EPUB or PDF, look up
            any word in the built-in dictionary with a single gesture, save what you want to
            remember to a flashcard deck, and pick up where you left off on any of your devices.
          </p>
        </PaperCard>
      </div>

      <div>
        <Eyebrow className="mb-3">The guide</Eyebrow>
        <PaperCard>
          <HelpRow index={1} title="Reading a book">
            <p>
              Click a book on the home screen to open it. The reader supports reflowable EPUBs
              (novels, light novels) and PDFs.
            </p>
            <p>
              To look up a word, select it with your cursor (or finger on touch). A small action
              bar appears with shortcuts for Dictionary and Card.
            </p>
            <p>
              The bottom dock has chapter navigation and typography settings. Click the workspace
              nav at the bottom to leave the reader.
            </p>
          </HelpRow>

          <HelpRow index={2} title="Dictionary">
            <p>
              Word entries come from JMdict, kanji info from KANJIDIC2, names from JMnedict, and
              example sentences and pitch accents from the Kanjium project. Use the Dictionary
              tab to search at any time, or click Dict from a selection inside the reader.
            </p>
          </HelpRow>

          <HelpRow index={3} title="Flashcard decks">
            <p>
              Decks live in the Decks tab. Add a card from any text selection via Card. Each card
              stays linked to its dictionary entry so the reading and meaning stay in sync if the
              entry changes upstream.
            </p>
          </HelpRow>

          <HelpRow index={4} title="How sync works">
            <p>
              Your books are saved to your account. Each device keeps a local copy and pushes
              changes to the backend opportunistically when it&apos;s online. If you import a book
              while offline, it stays on this device — marked as unsynced — until the next sync
              round.
            </p>
            <p>The cloud badge in the corner of each book tile tells you where that book stands:</p>
            <ul className="mt-3 overflow-hidden rounded-(--radius-input) border border-(--paper-bd)">
              <SyncLegendRow
                icon={<Cloudy aria-hidden size={22} color={SYNC_GREEN} />}
                title="Synced"
                body="This book and its reading state are saved to your account. Any progress you make here will appear on your other devices."
              />
              <SyncLegendRow
                icon={<CloudAlert aria-hidden size={22} color={SYNC_BLUE} />}
                title="Not synced"
                body="Local-only. Either you imported the book offline, or a recent reading-state write didn't make it to the backend yet. Use Sync now to push it."
              />
              <SyncLegendRow
                icon={<CloudDownload aria-hidden size={22} color={SYNC_GREY} />}
                title="On your account"
                body="The book is in your library from another device, but the file isn't on this one yet. Click it to import the file from your device storage."
              />
            </ul>
          </HelpRow>
        </PaperCard>
      </div>
    </SettingsShell>
  );
}

function HelpRow({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={
        'flex gap-6 px-6 py-5' + (index > 1 ? ' border-t border-(--paper-bd)' : '')
      }
    >
      <div className="w-[26px] shrink-0 pt-[3px] font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
        {String(index).padStart(2, '0')}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-(--ink)">{title}</div>
        <div className="mt-[5px] max-w-[62ch] space-y-2 text-[13.5px] leading-[1.6] text-(--muted)">
          {children}
        </div>
      </div>
    </div>
  );
}

function SyncLegendRow({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3 px-3.5 py-3 not-first:border-t not-first:border-(--paper-bd)">
      <div className="shrink-0 pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-(--ink)">{title}</div>
        <div className="mt-0.5 text-[12.5px] leading-[1.5] text-(--muted)">{body}</div>
      </div>
    </li>
  );
}
