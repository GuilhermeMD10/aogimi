# Remaining Audit Items

Items from the April 2026 codebase audit that were flagged but not yet fixed.
Organized by priority. Items 1-18 were already addressed.

---

## HIGH - Backend

### 7. Silent error swallowing in route handlers
- **Files**: `backend/src/routes/words.js`, `kanji.js`, `names.js`
- **Problem**: Bare `catch {}` blocks respond with 500 but never log. Bugs disappear silently.
- **Fix**: Add `console.error(err)` before the 500 response in every catch block.

### 8. Unbounded `limit` query parameter
- **Files**: `backend/src/routes/words.js:70,101`, `names.js:26`
- **Problem**: `parseInt(req.query.limit) || 50` has no max. Client can request 1M rows.
- **Fix**: `Math.min(parseInt(req.query.limit, 10) || 50, 100)`

### 9. N+1 query in getDetails()
- **File**: `backend/src/services/searchService.js:275-277`
- **Problem**: Iterates kanji characters and queries each one individually.
- **Fix**: Add `kanjiRepo.findByLiterals([chars])` batch method.

### 10. Missing input length validation
- **Files**: `backend/src/repositories/wordRepository.js`, `nameRepository.js`
- **Problem**: No validation on query string length before LIKE clauses.
- **Fix**: Validate max length (e.g. 200 chars) in the service layer.

### 11. CORS fallback to localhost
- **File**: `backend/src/app.js:14-20`
- **Problem**: `process.env.CORS_ORIGIN || "http://localhost:3001"` silently defaults to localhost if env var missing in prod.
- **Fix**: Require `CORS_ORIGIN` or use a whitelist.

### 12. Silent async storage errors (mobile)
- **File**: `mobile-frontend/langecko-mobile/lib/storage.ts:13-14,21-23`
- **Problem**: `loadJSON` swallows all errors (parse vs key-not-found vs storage error). `saveJSON` silently ignores quota exceeded.
- **Fix**: Log errors, especially quota exceeded in saveJSON.

---

## MEDIUM - Mobile

### 19. Prop drilling styles/rippleColor to list rows
- **Files**: `components/dictionary/WordsPanel.tsx:27-36`, `SavedWordsList.tsx:42-49`, `WordDetailPanel.tsx:87,148`
- **Problem**: Every row receives identical style props from parent.
- **Fix**: Have each row call `useThemedStyles`/`useColors` internally.

### 20. Redundant query sync in useDictionarySearch
- **File**: `components/dictionary/useDictionarySearch.ts:23,46`
- **Problem**: `query` state only updated after a successful search, desyncing from typed input.
- **Fix**: Keep `query` always in sync with user input.

### 21. Missing memoization in SavedWordsList
- **File**: `components/dictionary/SavedWordsList.tsx:34,55-95`
- **Problem**: `Row` not wrapped in `memo()`, `[...words].sort()` runs on every render without `useMemo`.
- **Fix**: Wrap `Row` in `memo()`, wrap sort in `useMemo([words])`.

### 22. Missing memoization in AnnotationsPanel
- **File**: `components/reader/AnnotationsPanel.tsx:57-60,109`
- **Problem**: Bookmarks and highlights spread+sorted on every render without `useMemo`.
- **Fix**: Wrap in `useMemo` keyed on `[epubBookmarks, pdfBookmarks]` and `[epubHighlights]`.

### 23. Excessive seed plumbing in DictionaryPage
- **File**: `components/dictionary/DictionaryPage.tsx:75-80`
- **Problem**: Two parallel seed systems (external and internal).
- **Fix**: Simplify to a single callback-driven approach.

### 24. Double mutation of highlight state
- **File**: `components/reader/ReaderScreen.tsx:258-267`
- **Problem**: Deletion calls both `epubRef.current?.removeHighlight(id)` and `removeEpubHighlight(id)`.
- **Fix**: Clarify single ownership. Reader handle should be the sole entry point.

### 25. Overly complex phase handoff in PendingCardFlow
- **File**: `components/cards/PendingCardFlow.tsx:32-75`
- **Problem**: Two-phase modal with scattered transitions.
- **Fix**: Extract into a `usePendingCardFlow()` hook.

---

## MEDIUM - Web

### 26. Scattered localStorage patterns
- **Files**: `reader/useBookStorage.ts`, `views/DictionaryView.tsx`, `views/CardDeckView.tsx`, `MainWorkspace.tsx`, `providers/ReaderStateProvider.tsx`, `providers/ThemeProvider.tsx`
- **Problem**: Raw `localStorage.getItem/setItem` in 6 files.
- **Fix**: Create `lib/localStorage.ts` with typed `storage.get<T>/set<T>` helper.

### 27. Missing ARIA labels on icon buttons
- **Files**: `reader/PdfReader.tsx:278-318`, `reader/EpubReader.tsx:388-425`, `views/cards/StudyView.tsx:162-177`
- **Problem**: Buttons with symbols ("arrow left", "arrow right", "minus", "plus") have no `aria-label`.
- **Fix**: Add descriptive `aria-label` to all icon buttons.

### 28. Duplicated button style constants
- **Files**: `reader/PdfReader.tsx:29`, `reader/EpubReader.tsx:45`, `views/EpubPdfReaderView.tsx:29`
- **Problem**: `btn`/`btnOn` defined separately in 3 files.
- **Fix**: Extract to shared module.

### 29. Direct DOM queries without refs
- **Files**: `reader/PdfReader.tsx:183`, `reader/EpubReader.tsx:128-129,201`
- **Problem**: Repeated `querySelector('iframe')` and `.contentDocument`.
- **Fix**: Store in refs.

### 30. cn() utility not used everywhere
- **Files**: `MainWorkspace.tsx:142`, `reader/PdfReader.tsx:55-61`
- **Problem**: Template string ternaries for classNames instead of `cn()`.
- **Fix**: Use `cn()` from `lib/utils.ts` consistently.

### 31. Ref mutations in render body
- **Files**: `reader/EpubReader.tsx:72-73,119-120,123-124`, `reader/PdfReader.tsx:195-198`
- **Problem**: Allowed but unclear.
- **Fix**: Use `useLayoutEffect` for clarity.

---

## LOW - Backend

### 32. Repetitive service boilerplate
- **Files**: `backend/src/services/wordService.js`, `kanjiService.js`, `nameService.js`
- **Problem**: Every function is `try { return await repo.X(); } catch { throw new Error(); }`.
- **Fix**: Extract generic wrapper or let errors bubble.

### 33. O(n^2) duplicate detection in assembler
- **File**: `backend/src/services/assembler.js:1-29`
- **Problem**: `.some()` inside a loop.
- **Fix**: Use a `Set` keyed on `${meaning}::${lang}`.

### 34. Opaque BFS in deinflector
- **File**: `backend/src/search/deinflector.js:239-262`
- **Problem**: Path-length comparison logic is hard to follow.
- **Fix**: Add clarifying comments.

---

## LOW - Mobile / Web

### 35. Unnecessary useCallback wrapper in WordsPanel
- **File**: `components/dictionary/WordsPanel.tsx:56-57`
- **Fix**: Call `onPress(word.id)` directly.

### 36. Missing validation feedback in DeckForm
- **File**: `components/cards/DeckForm.tsx:32-37`
- **Fix**: Show error message when name is empty.

### 37. Duplicate fetch error handling (mobile)
- **File**: `mobile-frontend/langecko-mobile/lib/api.ts:21-34,36-49`
- **Fix**: Extract `fetchApi<T>()` helper.

### 38. Inline styles mixed with Tailwind (web)
- **Problem**: 8+ spots use `style={{...}}` alongside Tailwind.
- **Fix**: Use CSS custom properties or Tailwind arbitrary values.

### 39. File rename inconsistency
- **File**: `web-frontend/langecko-web/hooks/use-mobile.ts`
- **Problem**: Exports `useIsMobile` but file is named `use-mobile.ts`.
- **Fix**: Rename to `use-is-mobile.ts`.
