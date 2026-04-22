import { ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';
import { tokenize, type Token } from '@/lib/tokenize';

export type SelectionAnchor = {
  paragraphIdx: number;
  tokenIdx: number;
  text: string;
  pageX: number;
  pageY: number;
};

type Props = {
  paragraphs: string[];
  fontPx: number;
  lineHeightMul: number;
  selection: SelectionAnchor | null;
  onSelectToken: (anchor: SelectionAnchor) => void;
  onDismissSelection: () => void;
};

export function ReaderBody({
  paragraphs,
  fontPx,
  lineHeightMul,
  selection,
  onSelectToken,
  onDismissSelection,
}: Props) {
  const c = useColors();

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={onDismissSelection}
    >
      {paragraphs.map((p, i) => (
        <ParagraphView
          key={i}
          paragraphIdx={i}
          text={p}
          fontPx={fontPx}
          lineHeightMul={lineHeightMul}
          color={c.fg}
          highlightColor={c.accentSoft}
          selection={selection}
          onSelectToken={onSelectToken}
        />
      ))}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function ParagraphView({
  paragraphIdx,
  text,
  fontPx,
  lineHeightMul,
  color,
  highlightColor,
  selection,
  onSelectToken,
}: {
  paragraphIdx: number;
  text: string;
  fontPx: number;
  lineHeightMul: number;
  color: string;
  highlightColor: string;
  selection: SelectionAnchor | null;
  onSelectToken: (anchor: SelectionAnchor) => void;
}) {
  const tokens = tokenize(text);
  return (
    <Text
      selectable={false}
      style={[
        styles.para,
        {
          color,
          fontFamily: fontFamily.jp,
          fontSize: fontPx,
          lineHeight: fontPx * lineHeightMul,
        },
      ]}
    >
      {tokens.map((tok, ti) => (
        <TokenSpan
          key={ti}
          token={tok}
          selected={
            selection?.paragraphIdx === paragraphIdx && selection.tokenIdx === ti
          }
          highlightColor={highlightColor}
          onSelect={(pageX, pageY) =>
            onSelectToken({ paragraphIdx, tokenIdx: ti, text: tok.text, pageX, pageY })
          }
        />
      ))}
    </Text>
  );
}

function TokenSpan({
  token,
  selected,
  highlightColor,
  onSelect,
}: {
  token: Token;
  selected: boolean;
  highlightColor: string;
  onSelect: (pageX: number, pageY: number) => void;
}) {
  if (!token.selectable) {
    return <Text>{token.text}</Text>;
  }

  const handlePress = (e: GestureResponderEvent) => {
    onSelect(e.nativeEvent.pageX, e.nativeEvent.pageY);
  };

  return (
    <Text
      onPress={handlePress}
      style={selected ? { backgroundColor: highlightColor } : undefined}
    >
      {token.text}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  para: {
    marginBottom: 18,
  },
});
