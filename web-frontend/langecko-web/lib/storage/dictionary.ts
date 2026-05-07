import { getJSON, setJSON } from './_helpers';

const DEFAULT_KEY = 'dictionary_state';

export type DictionaryStoredState<TResult = unknown> = {
  query?: string;
  result?: TResult;
  selectedWordId?: number | null;
};

export function getDictionaryState<TResult = unknown>(
  key: string = DEFAULT_KEY,
): DictionaryStoredState<TResult> | null {
  return getJSON<DictionaryStoredState<TResult>>(key);
}

export function setDictionaryState<TResult>(
  state: DictionaryStoredState<TResult>,
  key: string = DEFAULT_KEY,
): void {
  setJSON(key, state);
}
