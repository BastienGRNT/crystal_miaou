import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ChartLine } from 'lucide-react-native';
import { PageHeader } from '../../design-system/molecules/PageHeader';
import { Alert } from '../../design-system/molecules/Alert';
import { EmptyState } from '../../design-system/molecules/EmptyState';
import { Tabs } from '../../design-system/molecules/Tabs';
import { Spinner } from '../../design-system/atoms/Spinner';
import { AnalyseEvolution } from '../../design-system/organisms/AnalyseEvolution';
import { colors, spacing } from '../../design-system/tokens';
import { useCats } from '../../api/cats';
import { useAnalyse } from '../../api/analyse';

const PERIODES = [
	{ jours: 7, label: '7 jours' },
	{ jours: 14, label: '14 jours' },
	{ jours: 30, label: '30 jours' },
	{ jours: 90, label: '90 jours' }
];

export function AnalyseScreen() {
	const catsQuery = useCats();
	const cats = catsQuery.data?.cats ?? [];
	const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
	const [days, setDays] = useState(14);

	const activeCatId = selectedCatId ?? cats[0]?.id ?? null;
	const analyseQuery = useAnalyse(activeCatId ?? undefined, days);

	return (
		<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
			<PageHeader title="Analyse" subtitle="Évolution des apports alimentaires dans le temps." />

			<Alert
				variant="info"
				message="Ces chiffres sont une estimation basée sur les valeurs saisies pour vos aliments, pas une mesure en laboratoire — vérifiez-les avec le dosage conseillé sur le paquet."
			/>

			{catsQuery.isLoading ? (
				<Spinner />
			) : cats.length === 0 ? (
				<EmptyState icon={ChartLine} title="Aucun chat" description="Ajoutez d'abord un chat pour voir son évolution." />
			) : (
				<View style={{ gap: spacing.md }}>
					{cats.length > 1 ? (
						<Tabs value={activeCatId ?? ''} options={cats.map((cat) => ({ label: cat.name, value: cat.id }))} onChange={setSelectedCatId} />
					) : null}
					<Tabs
						value={String(days)}
						options={PERIODES.map((p) => ({ label: p.label, value: String(p.jours) }))}
						onChange={(v) => setDays(Number(v))}
					/>

					{analyseQuery.isLoading ? (
						<Spinner />
					) : analyseQuery.isError ? (
						<Alert variant="error" message={analyseQuery.error.message} />
					) : analyseQuery.data ? (
						<AnalyseEvolution analyse={analyseQuery.data} />
					) : null}
				</View>
			)}
		</ScrollView>
	);
}
