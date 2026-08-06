'use client';

// Everything inside the bubble shell: which of the five phases is showing, and
// the hand-off between them.
//
// The dictionary phases are `/dictionary`'s own components at `scale="full"` —
// the bubble is 880px wide, comfortably more than the docked column's 320–480,
// and about what the page's own entry pane gets. What used to be here was a
// hand-written entry (no example sentences, no JLPT, its own kanji panel) plus
// four copies of a header.

import { useEffect, useRef, useState } from 'react';
import {
  EntryDetail,
  KanjiEntryDetail,
  RailList,
  SearchField,
  contextForEntry,
  railContents,
  useDictionaryState,
  useSelectionKeys,
  useWordDetails,
  wordCardDraft,
  kanjiCardDraft,
} from '@/features/dictionary';
import type { SurfaceEntry } from '@/features/dictionary';
import type { CardDraft } from '@/features/sky/stage';
import { DictPanelHeader } from '../components/DictPanelHeader';
import { useDictSelection } from '../hooks/useDictSelection';
import { useCardPrefill } from './useCardPrefill';
import { SelectDeckPhase } from './SelectDeckPhase';
import { CreateCardPhase } from './CreateCardPhase';

/** Local (bubble-only) flow. The dictionary state itself lives in
 *  `DictionaryStateProvider` so the other surfaces stay in sync.
 *
 *  `word` rides alongside `draft` all the way through, and the create-card phase
 *  fronts the card with *it* rather than with `draft.front` — see
 *  `useCardPrefill` for why a reader-started card must keep the string the user
 *  highlighted.
 *
 *  `select-deck`'s draft is nullable (a reader-started card has none yet);
 *  `create-card`'s is not, because the select-deck → create-card transition is
 *  where the prefill is folded in. */
type Phase =
  | { type: 'dict' }
  | { type: 'select-deck'; word: string; draft: CardDraft | null }
  | {
      type: 'create-card';
      word: string;
      /** Still nullable at this point, and it has to be: a reader-started card
       *  whose lookup found nothing has no draft to show, and the form's empty
       *  state is the honest answer. Substituting a blank draft here would put a
       *  well-typed lie one hop from `useCardPrefill`'s "never a blank draft"
       *  rule, which is not a place to keep one. */
      draft: CardDraft | null;
      deckId: string;
      deckName: string;
    };

export type BubbleContentProps =
  | { mode: 'dict'; onClose: () => void }
  | {
      mode: 'addCard';
      word: string;
      /** `null` when the card was started from a raw reader selection, in which
       *  case `useCardPrefill` supplies the fields. Never a blank draft — see
       *  `ReaderBubbleState`. */
      draft: CardDraft | null;
      /** The book sentence for a selection-started card. Seeds the initial
       *  `runSearch`'s `readerContext`, so `contextForEntry` can attach it to the
       *  right row of the bubble's own dictionary. An entry-started card carries
       *  its context inside `draft.contextSentence` instead. */
      contextSentence?: string;
      /** A dictionary surface is already on screen behind this bubble — see
       *  `ReaderBubbleState`. Suppresses the lookup below and the in-bubble
       *  dictionary it exists to feed. */
      dictVisibleBehind?: boolean;
      onClose: () => void;
    };

export function BubbleContent(props: BubbleContentProps) {
  const { onClose } = props;
  const dict = useDictionaryState();

  const [phase, setPhase] = useState<Phase>(
    props.mode === 'addCard'
      ? { type: 'select-deck', word: props.word, draft: props.draft }
      : { type: 'dict' },
  );

  // Whether this bubble owns the dictionary state or is a guest on top of a
  // surface that's already using it.
  const ownsDictState = !(props.mode === 'addCard' && props.dictVisibleBehind);

  // In addCard mode, sync the provider with the word being carded so the back
  // button on select-deck returns to a sensible dictionary view.
  //
  // Skipped when a dictionary surface is already visible behind the bubble: the
  // provider is shared, so this search would replace what that surface is
  // rendering — on /dictionary the rail emptied and the open entry vanished the
  // instant you pressed add. There's also nothing to build, because backing out
  // of deck selection just closes and reveals the dictionary that was there all
  // along.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (props.mode === 'addCard' && ownsDictState) {
      void dict.runSearch(props.word, props.contextSentence);
    }
  }, [props, dict, ownsDictState]);

  const contents = railContents(dict.result);
  const { selection, selectedWord, selectedKanji, select, clear } = useDictSelection(contents);
  const {
    details,
    loading: detailsLoading,
    error: detailsError,
  } = useWordDetails(selectedWord?.id ?? null);

  // ↑/↓ walk the results. Only when this bubble owns the dictionary state:
  // `dictVisibleBehind` means /dictionary's rail or the reader's docked column
  // is behind us and already listening, and the hook's window listener answers
  // every mounted list at once.
  useSelectionKeys({
    contents,
    selection,
    onSelect: select,
    enabled: ownsDictState && phase.type === 'dict',
  });

  // The scroll container outlives what's in it, so an entry opened from a
  // scrolled list would otherwise start halfway down.
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewKey = selection
    ? `${selection.kind}:${'id' in selection ? selection.id : selection.literal}`
    : 'list';
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [viewKey]);

  // A card started from the reader carries no draft — see `useCardPrefill` for
  // why it can't, and why this is where it gets one.
  //
  // The guard is a null check on the draft, not a falsy check on one of its
  // fields: `!props.draft` is true exactly when the request came from a
  // selection. It used to be `!props.back`, which conflated "no entry data" with
  // "an entry whose back happened to render empty".
  const prefilledDraft = useCardPrefill(
    props.mode === 'addCard' ? props.word : '',
    props.mode === 'addCard' && !props.draft,
  );

  const toSelectDeck = (draft: CardDraft) =>
    setPhase({ type: 'select-deck', word: draft.front, draft });

  // The book sentence is context for the word that was tapped, not for every row
  // the results happen to contain — a lookup of 道 reaches 道路 and 鉄道, and neither
  // is in that sentence. Falls back to the entry's own example.
  const contextFor = (entry: SurfaceEntry, fallback?: string) =>
    contextForEntry(entry, dict.readerContext, contents, fallback);

  // Enter on an empty field shouldn't ask the backend for nothing.
  const submit = () => {
    if (dict.query.trim()) void dict.runSearch(dict.query);
  };

  if (phase.type === 'dict') {
    return (
      <>
        <DictPanelHeader
          title="Dictionary"
          subtitle="辞書"
          onClose={onClose}
          field={
            <SearchField
              variant="sidebar"
              value={dict.query}
              onChange={dict.setQuery}
              onSubmit={submit}
              onClear={() => dict.setQuery('')}
              placeholder="Kanji, kana, or English…"
              // A modal with a scrim owns the keyboard while it's up.
              autoFocus
              // No `globalHotkeys`: `/` and ⌘K belong to whichever field owns
              // the screen, and on /dictionary that field is still mounted
              // behind this one.
            />
          }
        />

        {/* No horizontal padding: the entry panes carry their own, and their
            hero's lower edge spans the bubble. The list wraps itself. */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {selectedWord ? (
            <EntryDetail
              word={selectedWord}
              query={dict.query}
              details={details}
              detailsLoading={detailsLoading}
              detailsError={detailsError}
              onKanjiSelect={(literal) => void dict.runSearch(literal)}
              onAddCard={(draft) =>
                toSelectDeck({
                  ...draft,
                  contextSentence: contextFor(
                    { kind: 'word', word: selectedWord },
                    draft.contextSentence,
                  ),
                })
              }
              scale="full"
              onBack={clear}
            />
          ) : selectedKanji ? (
            <KanjiEntryDetail
              kanji={selectedKanji}
              onAddCard={(draft) =>
                toSelectDeck({
                  ...draft,
                  contextSentence: contextFor(
                    { kind: 'kanji', kanji: selectedKanji },
                    draft.contextSentence,
                  ),
                })
              }
              scale="full"
              onBack={clear}
            />
          ) : (
            <div className="mx-auto w-full max-w-[560px] px-6 pb-8">
              <RailList
                query={dict.query}
                contents={contents}
                selection={selection}
                onSelect={select}
                onAddWord={(w) => {
                  const draft = wordCardDraft(w, dict.query);
                  toSelectDeck({
                    ...draft,
                    contextSentence: contextFor({ kind: 'word', word: w }, draft.contextSentence),
                  });
                }}
                onAddKanji={(k) => {
                  const draft = kanjiCardDraft(k);
                  toSelectDeck({
                    ...draft,
                    contextSentence: contextFor({ kind: 'kanji', kanji: k }, draft.contextSentence),
                  });
                }}
                loading={dict.loading}
                error={dict.error}
                onRetry={submit}
              />
            </div>
          )}
        </div>
      </>
    );
  }

  if (phase.type === 'select-deck') {
    return (
      <SelectDeckPhase
        word={phase.word}
        // With a dictionary already behind the bubble, "back" means get out of
        // the way — there's no in-bubble dictionary to return to, because we
        // never ran the search that would populate one.
        backLabel={ownsDictState ? 'Dictionary' : 'Cancel'}
        onBack={ownsDictState ? () => setPhase({ type: 'dict' }) : onClose}
        onSelectDeck={(deckId, deckName) =>
          setPhase({
            type: 'create-card',
            word: phase.word,
            // The reader's own add-card arrives with nothing here. By now the
            // lookup has landed, so the form opens filled instead of blank.
            //
            // **All-or-nothing (`??`), never per-field.** A per-field merge
            // (`phase.draft.reading || prefilled.reading`) can assemble a card
            // whose reading came from one entry and whose meanings came from
            // another — the 背 / 背広 failure mode `useCardPrefill` documents,
            // reintroduced one field at a time. Either the request brought a
            // draft or the prefill did; the two are never blended.
            //
            // And read **exactly once**, here at the transition. That's the whole
            // reason a late-resolving async value can seed a form safely: by the
            // time `CreateCardPhase` mounts the value is final, so nothing can
            // overwrite a half-typed field. Passing the hook's result down as a
            // live prop would give that up.
            //
            // `phase.word` stays the front. `prefilledDraft.front` is the
            // dictionary headword (`食べる`) where `phase.word` is what the user
            // highlighted (`食べました`) — see `useCardPrefill`.
            draft: phase.draft ?? prefilledDraft,
            deckId,
            deckName,
          })
        }
        onClose={onClose}
      />
    );
  }

  return (
    <CreateCardPhase
      word={phase.word}
      // The draft carries the context that was already resolved for the entry
      // being added — the reader's sentence when it genuinely belongs to that
      // word, the entry's own first example otherwise. There is deliberately no
      // fallback to the raw reader sentence here: that was a second, unguarded
      // read of it, and it put 道's sentence on a 鉄道 card.
      draft={phase.draft}
      deckId={phase.deckId}
      deckName={phase.deckName}
      onBack={() => setPhase({ type: 'select-deck', word: phase.word, draft: phase.draft })}
      onCreated={onClose}
      onClose={onClose}
    />
  );
}
