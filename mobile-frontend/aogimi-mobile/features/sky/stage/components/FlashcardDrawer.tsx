import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFlashcardForm } from '../hooks/useFlashcardForm';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { Glass } from '@/shared/components/Glass';
import { InnerPlate } from '@/shared/components/Card';
import { TextField } from '@/shared/components/TextField';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';
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

/** The deck dropdown: a 220pt pane hung under the header, whose list scrolls
 *  past about five decks rather than growing down towards the footer. */
const MENU_W = 220;
const MENU_LIST_MAX = 220;
const MENU_ROW_H = 44;

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
 * ── The deck is a dropdown beside the title ────────────────────────────────
 * The handoff puts the target deck in the header as a chip with a disclosure
 * caret, and that is what it is: `DeckTrigger` next to `Add card`, with
 * `DeckMenu` hung under it. The deck is a property of the card being made, not
 * a step in filling the form, so it belongs in the header rather than as a
 * fourth group competing with the fields for the same vertical run.
 *
 * The pane is **an absolutely-positioned layer inside this sheet**, not a
 * `Modal` — a modal over a modal is the iOS presentation problem this drawer
 * already works around (see `LookupDrawers`). Being out of flow is also the
 * point: opening it puts a pane over the form rather than pushing the form
 * down, so nothing under it moves and the field you were looking at is still
 * where you left it when the pane closes.
 *
 * Naming a new deck happens in that same pane rather than in a field down in
 * the body. One place answers "which deck", whichever deck it turns out to be.
 */
export function FlashcardDrawer({ visible, prefill, onDismiss, onSaved, lockedDeckId }: Props) {
  const p = usePalette();
  const s = useStyles(p);
  const t = useT();
  const { user } = useAuth();

  const userId = user?.id;
  const [decks, setDecks] = useState<LocalDeck[]>([]);
  const [deckId, setDeckId] = useState<string | null>(null);

  // Pull decks from the local store. Local-first means the picker
  // reflects pending-create decks too — the user just made one offline
  // and wants to drop cards into it. Refresh whenever the drawer
  // opens so a deck created elsewhere in the app shows up.
  //
  // The selection is settled here, in the same pass that produces the list,
  // rather than in an effect watching it. The trigger now *displays* the chosen
  // deck, so a selection that survived from a deck since deleted would label the
  // header with a deck the save would then fail on.
  useEffect(() => {
    if (!visible || userId == null || lockedDeckId) return;
    let cancelled = false;
    void (async () => {
      const all = await getAllDecks();
      if (cancelled) return;
      const list = all.filter((d) => d.pendingOp !== 'delete');
      setDecks(list);
      setDeckId((cur) => (cur && list.some((d) => d.id === cur) ? cur : (list[0]?.id ?? null)));
      // Nothing to pick from: naming a new deck is the only way forward, and
      // that field lives in the pane — so open it rather than leaving the
      // trigger as the one unexplained thing between them and saving.
      setCreatingNewDeck(list.length === 0);
      setDeckMenuOpen(list.length === 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, lockedDeckId]);

  const form = useFlashcardForm();
  const {
    front,
    setFront,
    reading,
    setReading,
    meanings,
    setMeaningAt,
    newDeckName,
    setNewDeckName,
    loadDraft,
    toDraft,
    reset: resetForm,
  } = form;
  const [creatingNewDeck, setCreatingNewDeck] = useState(false);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The pane hangs off the bottom of the header, and the header is as tall as
  // the title and the trigger make it — so it is measured rather than assumed.
  const [headerH, setHeaderH] = useState(0);

  const resetAndClose = useCallback(() => {
    resetForm();
    setCreatingNewDeck(false);
    setDeckMenuOpen(false);
    setError(null);
    onDismiss();
  }, [onDismiss, resetForm]);

  const pickDeck = useCallback(
    (id: string) => {
      setDeckId(id);
      // Choosing an existing deck abandons the half-typed new one rather than
      // keeping it around to reappear the next time `New deck` is tapped.
      setCreatingNewDeck(false);
      setNewDeckName('');
      setDeckMenuOpen(false);
    },
    [setNewDeckName],
  );

  const selectedDeck = decks.find((d) => d.id === deckId) ?? null;
  const deckLabel = creatingNewDeck ? newDeckName.trim() || t('card.newDeck') : (selectedDeck?.name ?? t('card.deck'));

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
    (lockedDeckId ? true : creatingNewDeck ? newDeckName.trim().length > 0 : Boolean(deckId)) &&
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <View style={s.header} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
          <Text style={s.title} numberOfLines={1}>
            {t('card.title')}
          </Text>
          {!lockedDeckId && (
            <DeckTrigger label={deckLabel} open={deckMenuOpen} onPress={() => setDeckMenuOpen((o) => !o)} />
          )}
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

          {prefill?.contextSentence && <ContextBlock sentence={prefill.contextSentence} target={front} />}

          {error && <Text style={s.error}>{error}</Text>}
        </ScrollView>

        {/* The footer's two buttons are 1 : 1.4, so the one that commits is
            visibly the larger of the two — the handoff's ratio. */}
        <View style={s.footer}>
          <Button label={t('common.cancel')} variant="secondary" onPress={resetAndClose} style={s.cancel} />
          <Button
            label={t('card.submit')}
            icon="star"
            onPress={handleSave}
            loading={saving}
            disabled={!canSave}
            style={s.submit}
          />
        </View>

        {/* Last child, and absolutely positioned: it paints over the form and
            the footer without either of them knowing it is there. */}
        {deckMenuOpen && !lockedDeckId && (
          <DeckMenu
            top={headerH + spacing.sm}
            decks={decks}
            deckId={creatingNewDeck ? null : deckId}
            onPick={pickDeck}
            creatingNewDeck={creatingNewDeck}
            onNewDeck={() => setCreatingNewDeck(true)}
            newDeckName={newDeckName}
            onNewDeckNameChange={setNewDeckName}
            onDismiss={() => setDeckMenuOpen(false)}
          />
        )}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

/** The header's deck control: the current deck and a caret, at chip height so
 *  it sits on the title's line rather than under it. */
function DeckTrigger({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  const p = usePalette();
  const s = useStyles(p);
  const t = useT();
  return (
    <Touchable
      onPress={onPress}
      surface="glass"
      radius={radius.control}
      minTarget={false}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${t('card.deck')}: ${label}`}
      accessibilityState={{ expanded: open }}
      style={s.trigger}
    >
      <Text style={s.triggerLabel} numberOfLines={1}>
        {label}
      </Text>
      <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={p.muted} />
    </Touchable>
  );
}

/**
 * **The deck pane** — the dropdown under `DeckTrigger`.
 *
 * It fills the sheet with a backdrop and draws a Tier 4 pane over it, which is
 * `PopoverMenu`'s material without `PopoverMenu`'s `Modal`: the drawer is
 * already a modal, and iOS presents one at a time. The backdrop is what makes
 * the pane modal anyway — while it is up, the form and the footer under it are
 * not targets, so there is no half-state where a deck is being picked and a
 * card is being saved at once.
 *
 * Naming a new deck swaps the name field in **above** the list rather than
 * replacing it: the list stays as the way back, which is the job the old
 * `Pick an existing deck` link did.
 */
function DeckMenu({
  top,
  decks,
  deckId,
  onPick,
  creatingNewDeck,
  onNewDeck,
  newDeckName,
  onNewDeckNameChange,
  onDismiss,
}: {
  top: number;
  decks: LocalDeck[];
  /** `null` while a new deck is being named — nothing in the list is chosen. */
  deckId: string | null;
  onPick: (id: string) => void;
  creatingNewDeck: boolean;
  onNewDeck: () => void;
  newDeckName: string;
  onNewDeckNameChange: (v: string) => void;
  onDismiss: () => void;
}) {
  const p = usePalette();
  const s = useStyles(p);
  const t = useT();

  const list =
    decks.length > 0 ? (
      <ScrollView
        style={s.menuList}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {decks.map((d) => {
          const active = d.id === deckId;
          return (
            <Touchable
              key={d.id}
              onPress={() => onPick(d.id)}
              minTarget={false}
              radius={radius.control}
              accessibilityRole="menuitem"
              accessibilityLabel={d.name}
              accessibilityState={{ selected: active }}
              style={[s.menuRow, active && s.menuRowActive]}
            >
              <Text style={[s.menuLabel, active && s.menuLabelActive]} numberOfLines={1}>
                {d.name}
              </Text>
              {active && <Feather name="check" size={16} color={p.accent} />}
            </Touchable>
          );
        })}
      </ScrollView>
    ) : null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <PressableBackdrop style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <Glass tier={4} radius={radius.card} style={[s.menu, { top }]}>
        {creatingNewDeck ? (
          <>
            <TextField
              value={newDeckName}
              onChangeText={onNewDeckNameChange}
              maxLength={MAX_DECK_NAME}
              placeholder={t('card.deckName')}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onDismiss}
              style={s.menuField}
            />
            {decks.length > 0 && <View style={s.menuDivider} />}
            {list}
          </>
        ) : (
          <>
            {list}
            {decks.length > 0 && <View style={s.menuDivider} />}
            <Touchable
              onPress={onNewDeck}
              minTarget={false}
              radius={radius.control}
              accessibilityRole="menuitem"
              accessibilityLabel={t('card.newDeck')}
              style={s.menuRow}
            >
              <Feather name="plus" size={16} color={p.accent} />
              <Text style={[s.menuLabel, s.menuLabelActive]} numberOfLines={1}>
                {t('card.newDeck')}
              </Text>
            </Touchable>
          </>
        )}
      </Glass>
    </View>
  );
}

/** `Front` / `Back` — the label alone. It used to trail a hairline to the right
 *  edge; two full-width rules inside an already-ruled sheet were more lines
 *  than the two words needed to be read as headings. */
function SectionRule({ label }: { label: string }) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <View style={s.rule}>
      <Text style={s.ruleLabel}>{label}</Text>
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

        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingHorizontal: spacing.screenX,
        },
        eyebrow: { ...type.eyebrow, color: p.faint, textTransform: 'uppercase' },
        title: { ...type.headlineMd, color: p.ink, flexShrink: 1 },

        trigger: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 32,
          maxWidth: MENU_W - spacing.xl,
          paddingHorizontal: spacing.md - 2,
          borderRadius: radius.control,
        },
        triggerLabel: { ...type.caption, color: p.ink, flexShrink: 1 },

        menu: {
          position: 'absolute',
          right: spacing.screenX,
          width: MENU_W,
          padding: 6,
        },
        menuList: { maxHeight: MENU_LIST_MAX },
        menuField: { padding: 2 },
        menuRow: {
          height: MENU_ROW_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md - 2,
          borderRadius: radius.control,
        },
        menuRowActive: { backgroundColor: p.glassAccent },
        menuLabel: { ...type.bodySm, fontSize: 14, color: p.ink, flex: 1 },
        menuLabelActive: { color: p.accent },
        menuDivider: { height: 1, backgroundColor: p.bdB, marginHorizontal: spacing.sm, marginVertical: 2 },

        scroll: {
          paddingHorizontal: spacing.screenX,
          paddingTop: spacing.stackGap,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        },

        rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
        ruleLabel: { ...type.bodySm, fontFamily: type.headlineMd.fontFamily, color: p.ink },

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
          // No `lineHeight`: `monoMeta`'s 14 over a 10px digit is leading the
          // circle then centres, which puts the digit itself below centre.
          fontFamily: type.headlineMd.fontFamily,
          fontSize: 10,
          fontWeight: type.monoMeta.fontWeight,
          color: p.muted,
          includeFontPadding: false,
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

        error: { ...type.bodySm, color: p.danger },

        footer: {
          flexDirection: 'row',
          gap: spacing.sm + 2,
          paddingHorizontal: spacing.screenX,
          // The sheet's `SafeAreaView` adds the home-indicator inset under this,
          // so the bottom is breathing room inside the footer rather than
          // clearance for the hardware — and it sits a step above the top's.
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
          borderTopWidth: 1,
          borderTopColor: p.bdB,
        },
        cancel: { flex: 1 },
        submit: { flex: 1.4 },
      }),
    [p],
  );
}
