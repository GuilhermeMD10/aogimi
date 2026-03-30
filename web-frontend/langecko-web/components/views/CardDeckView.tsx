'use client';

import { useEffect, useRef, useState } from 'react';

type Card = {
  id: string;
  front: string;
  back: string;
};

type Deck = {
  id: string;
  name: string;
  cards: Card[];
};

type Screen = { type: 'decks' } | { type: 'deck'; deckId: string };

const btnBase = 'rounded border border-lumina-border-divider px-3 py-1 text-sm bg-white text-lumina-primary-text disabled:opacity-40';
const btnPrimary = 'rounded border border-lumina-primary-teal bg-lumina-primary-teal text-black px-4 py-2 text-sm disabled:opacity-50';

export default function CardDeckView({ storageKey = 'card_decks_state' }: { storageKey?: string }) {
  const storageSaveReadyRef = useRef(false);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [screen, setScreen] = useState<Screen>({ type: 'decks' });

  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);

  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [showNewCardForm, setShowNewCardForm] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { decks?: Deck[] };
      if (Array.isArray(saved.decks)) setDecks(saved.decks);
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (!storageSaveReadyRef.current) { storageSaveReadyRef.current = true; return; }
    try {
      localStorage.setItem(storageKey, JSON.stringify({ decks }));
    } catch { /* ignore */ }
  }, [storageKey, decks]);

  const openDeck = (deckId: string) => {
    setScreen({ type: 'deck', deckId });
    setShowNewCardForm(false);
    setNewCardFront('');
    setNewCardBack('');
  };

  const backToDecks = () => {
    setScreen({ type: 'decks' });
    setShowNewDeckForm(false);
    setNewDeckName('');
  };

  const submitNewDeck = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newDeckName.trim();
    if (!name) return;
    setDecks((prev) => [...prev, { id: crypto.randomUUID(), name, cards: [] }]);
    setNewDeckName('');
    setShowNewDeckForm(false);
  };

  const deleteDeck = (deckId: string) => {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  };

  const submitNewCard = (deckId: string, event: React.FormEvent) => {
    event.preventDefault();
    const front = newCardFront.trim();
    const back = newCardBack.trim();
    if (!front || !back) return;
    const card: Card = { id: crypto.randomUUID(), front, back };
    setDecks((prev) => prev.map((d) => d.id === deckId ? { ...d, cards: [...d.cards, card] } : d));
    setNewCardFront('');
    setNewCardBack('');
    setShowNewCardForm(false);
  };

  const deleteCard = (deckId: string, cardId: string) => {
    setDecks((prev) =>
      prev.map((d) => d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d),
    );
  };

  // ── Deck list screen ────────────────────────────────────────────────────────

  if (screen.type === 'decks') {
    return (
      <div className="@container p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-lumina-primary-text">Card Decks</h1>
          <button
            type="button"
            onClick={() => setShowNewDeckForm((v) => !v)}
            className={btnBase}
          >
            {showNewDeckForm ? 'Cancel' : '+ New Deck'}
          </button>
        </div>

        {showNewDeckForm ? (
          <form onSubmit={submitNewDeck} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Deck name"
              className="w-full max-w-xs rounded border border-lumina-border-divider bg-white px-3 py-2 text-sm"
              autoFocus
            />
            <button type="submit" disabled={!newDeckName.trim()} className={btnPrimary}>
              Create
            </button>
          </form>
        ) : null}

        {decks.length === 0 ? (
          <p className="mt-6 text-sm text-lumina-secondary-text">
            No decks yet. Create one to get started.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 @xl:grid-cols-3 @3xl:grid-cols-4">
            {decks.map((deck) => (
              <li key={deck.id} className="relative">
                <button
                  type="button"
                  onClick={() => openDeck(deck.id)}
                  className="w-full rounded border border-lumina-border-divider bg-white p-4 text-left hover:bg-black/5"
                >
                  <p className="font-medium text-lumina-primary-text truncate">{deck.name}</p>
                  <p className="mt-1 text-sm text-lumina-secondary-text">
                    {deck.cards.length} card{deck.cards.length !== 1 ? 's' : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteDeck(deck.id)}
                  className="absolute right-2 top-2 rounded px-1 text-xs text-lumina-error hover:bg-black/5"
                  aria-label={`Delete ${deck.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Deck detail screen (card list) ──────────────────────────────────────────

  const deck = decks.find((d) => d.id === screen.deckId);

  if (!deck) {
    return (
      <div className="p-6 bg-lumina-app-background min-h-full">
        <button type="button" onClick={backToDecks} className={btnBase}>← Back</button>
      </div>
    );
  }

  return (
    <div className="@container p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
      <div className="flex items-center gap-3">
        <button type="button" onClick={backToDecks} className={btnBase}>← Back</button>
        <h1 className="text-xl font-semibold text-lumina-primary-text">{deck.name}</h1>
        <button
          type="button"
          onClick={() => setShowNewCardForm((v) => !v)}
          className={`${btnBase} ml-auto`}
        >
          {showNewCardForm ? 'Cancel' : '+ Add Card'}
        </button>
      </div>

      {showNewCardForm ? (
        <form
          onSubmit={(e) => submitNewCard(deck.id, e)}
          className="mt-4 rounded border border-lumina-border-divider bg-white p-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-lumina-secondary-text">Front</label>
              <textarea
                value={newCardFront}
                onChange={(e) => setNewCardFront(e.target.value)}
                placeholder="Write the front side..."
                className="mt-1 w-full resize-none rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm"
                rows={3}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-lumina-secondary-text">Back</label>
              <textarea
                value={newCardBack}
                onChange={(e) => setNewCardBack(e.target.value)}
                placeholder="Write the back side..."
                className="mt-1 w-full resize-none rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!newCardFront.trim() || !newCardBack.trim()}
              className={btnPrimary}
            >
              Add Card
            </button>
          </div>
        </form>
      ) : null}

      {deck.cards.length === 0 ? (
        <p className="mt-6 text-sm text-lumina-secondary-text">No cards yet. Add one above.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 @sm:grid-cols-3 @xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6">
          {deck.cards.map((card) => (
            <li
              key={card.id}
              className="relative flex flex-col rounded border border-lumina-border-divider bg-white"
            >
              <div className="flex-1 p-3">
                <p className="text-sm text-lumina-primary-text whitespace-pre-wrap">{card.front}</p>
              </div>
              <hr className="border-lumina-border-divider" />
              <div className="flex-1 p-3">
                <p className="text-sm text-lumina-secondary-text whitespace-pre-wrap">{card.back}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteCard(deck.id, card.id)}
                className="absolute right-1 top-1 rounded px-1 text-xs text-lumina-error hover:bg-black/5"
                aria-label="Delete card"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
