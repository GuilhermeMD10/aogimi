import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFlashcardForm } from '../hooks/useFlashcardForm';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { Chip } from '@/shared/components/Chip';
import { InnerPlate } from '@/shared/components/Card';
import { TextField } from '@/shared/components/TextField';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import { createCardLocal } from '../lib/cardPush';
import { createDeckLocal } from '../lib/deckPush';
import { getAllDecks } from '../lib/deckLocalState';
import { MAX_CARD_FRONT, MAX_CARD_MEANING, MAX_CARD_READING, MAX_DECK_NAME } from '../lib/limits';
import type { CardDraft, LocalDeck } from '../types';
import { useAuth } from '@/features/auth/providers/AuthContext';

/** `Reader.dc.html`'s Add-card drawer: 88% of the screen — it is a form, and
 *  the page behind it has nothing left to say. */
const HEIGHT_RATIO = 0.88;
/** The numbered circle on a meaning row. */
const NUM = 20;

/**
 * What the drawer opens with.
 *
 * **This is now `CardDraft` itself**, not a separate `{front, reading, back}`
 * shape. The old prefill type was the reason the two producers drifted: each
 * built its own version inline, flattening glosses into a `back` blob with a
 * different cap, and neither could carry `jlpt_level` because the type had
 * nowhere to put it. Producers now call `wordCardDraft` / `kanjiCardDraft` /
 * `plainCardDraft` and hand the result straight here.
 */
export type FlashcardPrefill = CardDraft;

type Props = {
  visible: boolean;
  prefill: FlashcardPrefill | null;
  onDismiss: () => void;
  onSaved?: () => void;
  /** If provided, skip the deck picker and save straight to this deck. */
  lockedDeckId?: string;
};

/**
 * **Add card** — the sheet that turns a word into a star.
 *
 * ── The form is grouped the way the card is ────────────────────────────────
 * `Front` and `Back` are ruled section headers with the fields that belong to
 * each face under them, which is the handoff's structure and also the card's:
 * the headword is what you will be shown, the reading and the glosses are what
 * you are trying to recall. Before, five equal-weight labelled inputs ran down
 * the sheet with nothing saying which side of the card any of them was.
 *
 * ── Context is shown, not edited ───────────────────────────────────────────
 * The sentence the word came from rides along inside the draft and has no
 * input — it is a fact about where the card was made, not a field. So it is
 * rendered as a plate with the headword highlighted inside it, which is both
 * the handoff's treatment and the only thing that makes it legible as *the
 * sentence this came from* rather than as another empty box.
 *
 * The handoff also draws a `Context · EN` block. There is no English
 * translation anywhere in the data — nothing produces one and no endpoint
 * returns one — so the block is dropped rather than shown empty.
 *
 * ── The deck stays a chip row ──────────────────────────────────────────────
 * The handoff puts the target deck in the header as a chip with a disclosure
 * caret, implying a picker over the sheet. A sheet over a sheet is the iOS
 * modal problem this drawer already works around (see `LookupDrawers`), and the
 * chip row is one tap to any deck rather than two. So the material is new and
 * the control is the one that was there.
 */
export function FlashcardDrawer({ visible, prefill, onDismiss, onSaved, lockedDeckId }: Props) {
  const p = usePalette();
  const s = useStyles(p);
  const t = useT();
  const { user } = useAuth();

  const userId = user?.id;
  const [decks, setDecks] = useState<LocalDeck[]>([]);

  // Pull decks from the local store. Local-first means the picker
  // reflects pending-create decks too — the user just made one offline
  // and wants to drop cards into it. Refresh whenever the drawer
  // opens so a deck created elsewhere in the app shows up.
  useEffect(() => {
    if (!visible || userId == null || lockedDeckId) return;
    let cancelled = false;
    void (async () => {
      const list = await getAllDecks();
      if (cancelled) return;
      setDecks(list.filter((d) => d.pendingOp !== 'delete'));
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, lockedDeckId]);

  const [deckId, setDeckId] = useState<string | null>(null);
  const form = useFlashcardForm();
  const {
    front, setFront,
    reading, setReading,
    meanings, setMeaningAt,
    newDeckName, setNewDeckName,
    loadDraft, toDraft,
    reset: resetForm,
  } = form;
  const [creatingNewDeck, setCreatingNewDeck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAndClose = useCallback(() => {
    resetForm();
    setCreatingNewDeck(false);
    setError(null);
    onDismiss();
  }, [onDismiss, resetForm]);

  // React to a fresh deck list: pre-select the first deck (if none
  // chosen) and toggle into "create new deck" mode if the list is empty.
  useEffect(() => {
    if (decks.length > 0 && !deckId) setDeckId(decks[0]!.id);
    if (visible) setCreatingNewDeck(decks.length === 0);
  }, [decks, deckId, visible]);

  useEffect(() => {
    if (!visible || !prefill) return;
    loadDraft(prefill);
    setError(null);
  }, [visible, prefill, loadDraft]);

  // A card needs a front and at least one meaning. `back` isn't checked because
  // it no longer exists as an input — it's derived from these at save time, so
  // requiring it separately would be requiring the same fact twice.
  const canSave =
    front.trim().length > 0 &&
    meanings.some((m) => m.trim().length > 0) &&
    (lockedDeckId
      ? true
      : creatingNewDeck
        ? newDeckName.trim().length > 0
        : Boolean(deckId)) &&
    !saving;

  async function handleSave() {
    if (!canSave || !user) return;
    setError(null);
    setSaving(true);
    try {
      let targetDeckId = lockedDeckId ?? deckId;
      if (!lockedDeckId && creatingNewDeck) {
        // Local-first: deck appears in the local store immediately,
        // and pushes to backend in the background.
        const created = await createDeckLocal(user.id, newDeckName.trim(), '');
        targetDeckId = created.id;
      }
      if (!targetDeckId) throw new Error('No deck selected');
      // The draft is built from the *edited* fields, not from `prefill` — the
      // user may have changed any of them, and `back` has to be rendered from
      // what they actually typed. `contextSentence` and `jlptLevel` ride along
      // inside the draft; neither has an input, so they pass through unchanged.
      await createCardLocal(targetDeckId, toDraft());
      onSaved?.();
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onDismiss={resetAndClose} heightRatio={HEIGHT_RATIO}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}
      >
        <View style={s.header}>
          <Text style={s.eyebrow}>{`空 · ${t('card.eyebrow')}`}</Text>
          <Text style={s.title}>{t('card.title')}</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionRule label={t('card.front')} />
          <TextField
            label={t('card.word')}
            value={front}
            onChangeText={setFront}
            maxLength={MAX_CARD_FRONT}
            placeholder={t('card.wordPlaceholder')}
            japanese
          />

          <SectionRule label={t('card.back')} />
          <TextField
            label={t('card.reading')}
            value={reading}
            onChangeText={setReading}
            maxLength={MAX_CARD_READING}
            placeholder={t('card.readingPlaceholder')}
            japanese
            accentInk
          />

          {/* One input per gloss instead of a single blob. The card's `back`
              column is rendered from these at save time, so what the user sees
              here is what the card stores — there is no second copy to drift.
              Slots left blank are dropped. */}
          <View style={s.group}>
            <Text style={s.groupLabel}>{t('card.meanings')}</Text>
            {meanings.map((m, i) => (
              <TextField
                key={i}
                value={m}
                onChangeText={(v) => setMeaningAt(i, v)}
                maxLength={MAX_CARD_MEANING}
                placeholder={t('card.meaningPlaceholder', { n: i + 1 })}
                leading={
                  <View style={s.num}>
                    <Text allowFontScaling={false} style={s.numLabel}>
                      {i + 1}
                    </Text>
                  </View>
                }
              />
            ))}
          </View>

          {prefill?.contextSentence && (
            <ContextBlock sentence={prefill.contextSentence} target={front} />
          )}

          {!lockedDeckId && (
            <View style={s.group}>
              <Text style={s.groupLabel}>{t('card.deck')}</Text>

              {decks.length > 0 && !creatingNewDeck && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.deckRow}
                >
                  {decks.map((d) => (
                    <Chip
                      key={d.id}
                      label={d.name}
                      active={d.id === deckId}
                      size="sm"
                      onPress={() => setDeckId(d.id)}
                    />
                  ))}
                  <Chip
                    label={t('card.newDeck')}
                    size="sm"
                    onPress={() => setCreatingNewDeck(true)}
                  />
                </ScrollView>
              )}

              {creatingNewDeck && (
                <View style={s.newDeck}>
                  <TextField
                    value={newDeckName}
                    onChangeText={setNewDeckName}
                    maxLength={MAX_DECK_NAME}
                    placeholder={t('card.deckName')}
                  />
                  {decks.length > 0 && (
                    <Touchable
                      minTarget={false}
                      hitSlop={8}
                      onPress={() => setCreatingNewDeck(false)}
                      accessibilityRole="button"
                      accessibilityLabel={t('card.pickExisting')}
                    >
                      <Text style={s.link}>{t('card.pickExisting')}</Text>
                    </Touchable>
                  )}
                </View>
              )}
            </View>
          )}

          {error && <Text style={s.error}>{error}</Text>}
        </ScrollView>

        {/* The footer's two buttons are 1 : 1.4, so the one that commits is
            visibly the larger of the two — the handoff's ratio. */}
        <View style={s.footer}>
          <Button
            label={t('common.cancel')}
            variant="secondary"
            onPress={resetAndClose}
            style={s.cancel}
          />
          <Button
            label={t('card.submit')}
            icon="star"
            onPress={handleSave}
            loading={saving}
            disabled={!canSave}
            style={s.submit}
          />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

/** `Front` / `Back` — a label with a hairline running to the right edge. */
function SectionRule({ label }: { label: string }) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <View style={s.rule}>
      <Text style={s.ruleLabel}>{label}</Text>
      <View style={s.ruleLine} />
    </View>
  );
}

/**
 * The sentence the word was found in, with the word picked out of it.
 *
 * The highlight is the reader's own selection band made permanent: the same
 * accent wash at the same radius, so a card's context reads like the page it
 * came from. Matching on the *edited* front rather than the prefill's means the
 * highlight follows the user if they trim the selection down to the dictionary
 * form; if it no longer occurs, the sentence renders plain rather than
 * guessing.
 */
function ContextBlock({ sentence, target }: { sentence: string; target: string }) {
  const p = usePalette();
  const s = useStyles(p);
  const t = useT();

  const at = target.trim().length > 0 ? sentence.indexOf(target.trim()) : -1;
  const word = target.trim();

  return (
    <View style={s.group}>
      <Text style={s.groupLabel}>{t('card.context')}</Text>
      <InnerPlate style={s.context}>
        <Text style={s.contextText}>
          {at < 0 ? (
            sentence
          ) : (
            <>
              {sentence.slice(0, at)}
              <Text style={s.contextTarget}>{word}</Text>
              {sentence.slice(at + word.length)}
            </>
          )}
        </Text>
      </InnerPlate>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },

        header: { paddingHorizontal: spacing.screenX, gap: spacing.xs },
        eyebrow: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },
        title: { ...type.headlineMd, color: p.ink },

        scroll: {
          paddingHorizontal: spacing.screenX,
          paddingTop: spacing.stackGap,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        },

        rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
        ruleLabel: { ...type.bodySm, fontFamily: type.headlineMd.fontFamily, color: p.ink },
        ruleLine: { flex: 1, height: 1, backgroundColor: p.bdB },

        group: { gap: 6 },
        groupLabel: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },

        num: {
          width: NUM,
          height: NUM,
          // A circle, by definition — half its own box.
          borderRadius: NUM / 2,
          backgroundColor: p.tintA,
          alignItems: 'center',
          justifyContent: 'center',
        },
        numLabel: {
          ...type.monoMeta,
          fontFamily: type.headlineMd.fontFamily,
          fontSize: 10,
          letterSpacing: 0,
          color: p.muted,
        },

        context: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm },
        contextText: {
          fontFamily: type.titleReading.fontFamily,
          fontSize: 15,
          lineHeight: 24,
          color: p.ink,
        },
        contextTarget: {
          // Radius and vertical padding are not honoured on a nested `Text` in
          // RN, so the band is the fill alone — which is all that carries the
          // meaning anyway.
          backgroundColor: p.glassAccent,
          color: p.accent,
        },

        deckRow: { gap: spacing.sm, paddingVertical: 2 },
        newDeck: { gap: spacing.sm },
        link: { ...type.bodySm, color: p.accent },

        error: { ...type.bodySm, color: p.danger },

        footer: {
          flexDirection: 'row',
          gap: spacing.sm + 2,
          paddingHorizontal: spacing.screenX,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: p.bdB,
        },
        cancel: { flex: 1 },
        submit: { flex: 1.4 },
      }),
    [p],
  );
}
