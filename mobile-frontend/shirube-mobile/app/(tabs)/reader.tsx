import { BooksScreen as DefaultBooksScreen } from '@/components/books/ui/BooksScreen';
import { useThemedComponent } from '@/themes/useThemedComponent';

export default function ReaderTab() {
  const BooksScreen = useThemedComponent('BooksScreen', DefaultBooksScreen);
  return <BooksScreen />;
}
