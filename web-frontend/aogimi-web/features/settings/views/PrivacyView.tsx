import type { ReactNode } from 'react';
import { Eyebrow, PaperCard } from '@/shared/components';
import { SettingsShell } from '../components/SettingsShell';

// TODO(owner): support@aogimi.com is not live yet — set up forwarding on the
// domain and send a test mail before the store submission. It is also the
// App Store Connect support contact.
const PRIVACY_CONTACT_EMAIL = 'support@aogimi.com';

const EFFECTIVE_DATE = '28 October 2026';

/**
 * `/privacy` — the privacy policy, in the settings shell like /help and
 * /credits. It is the one public page (`app-shell/lib/publicRoutes.ts`): the
 * store listings link here, so it must open signed out and on a phone.
 *
 * Every claim is a statement about the code — the backend schema
 * (`backend/SCHEMA.md`), the request logger, the token transports and the
 * mobile wipe. When any of those change, this page changes with them.
 */
export default function PrivacyView() {
  return (
    <SettingsShell>
      <div>
        <Eyebrow className="mb-3">Privacy policy</Eyebrow>
        <PaperCard className="p-5 sm:p-[30px] sm:pb-8">
          <h2 className="text-[27px] leading-[1.15] font-bold text-(--ink)">
            Aogimi privacy policy
          </h2>
          <p className="mt-2 font-[family-name:var(--face-mono)] text-[11px] tracking-[0.1em] text-(--ink-3)">
            Effective {EFFECTIVE_DATE}
          </p>
          <p className="mt-3 max-w-[60ch] text-[14.5px] leading-[1.7] text-(--ink-2)">
            Aogimi is a Japanese reading and vocabulary app for the web, iPhone and Android. This
            page explains what it stores about you, where, and why. In short: we keep only what
            the app needs to sync your study between devices, we don&apos;t track you, and we
            never sell or share your data.
          </p>
        </PaperCard>
      </div>

      <PaperCard>
        <PolicySection title="Your account" first>
          <p>
            An account holds a username, an email address and a password. The password is
            stored only as a one-way bcrypt hash, never as the password itself. We don&apos;t
            send email of any kind, so your address is never used for marketing.
          </p>
          <p>
            Your profile also keeps a display name, an avatar choice, your interface language,
            whether you finished onboarding, and a random number that lays out your star map.
          </p>
          <p>New sign-ups are currently closed.</p>
        </PolicySection>

        <PolicySection title="What we store on our server">
          <p>When you&apos;re signed in, the app syncs the following so it&apos;s the same on all your devices:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Your decks and cards — the word, its reading and meanings, your notes, and the
              sentence you saved it from, if any.
            </li>
            <li>
              Your study history — each grade you give a card and when, the scheduling values
              computed from it, the days you studied, and your study display preferences.
            </li>
            <li>
              Information about your books, not the books — title, author, filename, language,
              publisher, identifiers such as an ISBN, and fingerprints (hashes of the file and
              its text) that let another device recognise the same book. Plus your reading
              position and progress.
            </li>
          </ul>
          <p>
            We use this only to run the app: syncing, scheduling your reviews and reopening your
            books where you left off.
          </p>
        </PolicySection>

        <PolicySection title="What stays on your device">
          <p>
            Book files never leave your device. On the web they sit in your browser&apos;s
            storage; in the app, in the app&apos;s own storage.
          </p>
          <p>
            In the iPhone and Android app, the dictionary is built in and works offline, so your
            lookups never leave your phone. The &ldquo;recently looked up&rdquo; list is kept on
            the phone only. If you use the app without signing in, your decks and cards stay on
            the phone too.
          </p>
          <p>
            Your theme, reader settings and the latest reading position are also kept on the
            device, and the web app keeps a copy of your profile in your browser so it starts
            quickly.
          </p>
        </PolicySection>

        <PolicySection title="Dictionary searches and server logs">
          <p>
            The web dictionary runs on our server, so each search is sent there. Searches
            aren&apos;t linked to your account or saved to it.
          </p>
          <p>
            For troubleshooting, our server writes one line per request: the time, the address
            requested (without any search text), the result and how long it took, and for
            signed-in requests your account number. It never records search terms, passwords,
            sign-in tokens, or the contents of what you send. Your IP address is used
            in memory to limit abuse, such as repeated sign-in attempts, and isn&apos;t written
            to our logs or database.
          </p>
        </PolicySection>

        <PolicySection title="Cookies and sign-in tokens">
          <p>
            Aogimi uses no advertising or analytics cookies. Signing in on the web sets one
            strictly necessary cookie: a sign-in token that keeps you signed in for up to 30
            days. It is marked httpOnly, so scripts on the page can&apos;t read it, and it is
            sent only to our sign-in endpoints. The short-lived token used for everything else
            is held in memory and gone when you close the tab.
          </p>
          <p>
            In the app, the sign-in token is kept in your phone&apos;s secure storage (the iOS
            Keychain or the Android Keystore). On our side we keep only a hash of each sign-in
            token, and every token is replaced each time it&apos;s used.
          </p>
        </PolicySection>

        <PolicySection title="No tracking, no selling">
          <p>
            Aogimi has no analytics, no advertising, no crash reporting, and no third-party code
            that collects data. We don&apos;t track you across apps or websites. We never sell,
            rent or share your data. Fonts and the dictionary ship with the app, so using it
            doesn&apos;t contact anyone but our own server.
          </p>
          <p>
            Our server, database and website run on hosting providers that store this data on
            our behalf and may keep their own standard network logs. They don&apos;t use it for
            anything else.
          </p>
        </PolicySection>

        <PolicySection title="Keeping and deleting your data">
          <p>
            We keep your data for as long as you have an account. You can delete it yourself at
            any time, in the app or on the web, under Profile → Settings → Delete account. That
            erases your account and everything attached to it from our database immediately, in
            one step, and signs out every device. Deleting from the app also removes the books
            and data stored on that phone. Our database provider keeps short-lived backups, and
            deleted data drops out of them as they expire.
          </p>
          <p>
            Data kept in a browser stays there until you clear the site&apos;s data. If you
            can&apos;t sign in and want your account deleted, or want a copy of your data, write
            to us at the address below.
          </p>
        </PolicySection>

        <PolicySection title="Security">
          <p>
            Every connection to Aogimi is encrypted with HTTPS. Passwords and sign-in tokens are
            stored only as hashes, and every request is checked so an account can only ever
            reach its own data.
          </p>
        </PolicySection>

        <PolicySection title="Children">
          <p>
            Aogimi isn&apos;t directed at children under 13, and we don&apos;t knowingly collect
            data from them. If you believe a child under 13 has an account, contact us and
            we&apos;ll delete it.
          </p>
        </PolicySection>

        <PolicySection title="Changes to this policy">
          <p>
            If this policy changes, we&apos;ll update this page and the effective date at the
            top. Significant changes will be announced in the app before they take effect.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            Questions about this policy or your data:{' '}
            <a
              href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
              className="break-all text-(--accent) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
            >
              {PRIVACY_CONTACT_EMAIL}
            </a>
          </p>
        </PolicySection>
      </PaperCard>
    </SettingsShell>
  );
}

/** One heading + prose block, ruled from the one above (as /help's rows). */
function PolicySection({
  title,
  first = false,
  children,
}: {
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={'px-5 py-5 sm:px-6' + (first ? '' : ' border-t border-(--pane-bd)')}>
      <h3 className="text-[15px] font-bold text-(--ink)">{title}</h3>
      <div className="mt-[5px] max-w-[62ch] space-y-2 text-[13.5px] leading-[1.6] text-(--ink-3)">
        {children}
      </div>
    </section>
  );
}
