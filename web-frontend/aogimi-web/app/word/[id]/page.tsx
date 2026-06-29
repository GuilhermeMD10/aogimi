import { WordDetailView } from '@/features/dictionary';

export default async function WordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WordDetailView id={id} />;
}
