import { StatsScreen } from '@/features/study/stats';

// `/sky` is the study-stats screen. The route carries the new name because the
// star map is what this page becomes; the feature folder stays `study/stats`
// until that lands, since what it holds today is a heatmap and a reviews chart.
export default function SkyPage() {
  return <StatsScreen />;
}
