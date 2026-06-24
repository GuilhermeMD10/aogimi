import { useCallback, useState } from 'react';

/** Owns the four input fields of the flashcard creation form. */
export function useFlashcardForm() {
  const [front, setFront] = useState('');
  const [reading, setReading] = useState('');
  const [back, setBack] = useState('');
  const [newDeckName, setNewDeckName] = useState('');

  const reset = useCallback(() => {
    setFront('');
    setReading('');
    setBack('');
    setNewDeckName('');
  }, []);

  return {
    front,
    setFront,
    reading,
    setReading,
    back,
    setBack,
    newDeckName,
    setNewDeckName,
    reset,
  };
}
