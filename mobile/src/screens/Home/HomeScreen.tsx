import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { PawPrint, ChevronLeft, ChevronRight, CalendarClock, Utensils } from 'lucide-react-native';
import { Text } from '../../design-system/atoms/Text';
import { Card } from '../../design-system/atoms/Card';
import { Button } from '../../design-system/atoms/Button';
import { Spinner } from '../../design-system/atoms/Spinner';
import { Tabs } from '../../design-system/molecules/Tabs';
import { Alert } from '../../design-system/molecules/Alert';
import { EmptyState } from '../../design-system/molecules/EmptyState';
import { DailyMealSchedule } from '../../design-system/organisms/DailyMealSchedule';
import { RationDetails } from '../../design-system/organisms/RationDetails';
import { FoodSelection } from '../../design-system/organisms/FoodSelection';
import { DailyLogView } from '../../design-system/organisms/DailyLogView';
import { colors, spacing } from '../../design-system/tokens';
import { useCats } from '../../api/cats';
import { useFoods } from '../../api/foods';
import { useDailyPlans } from '../../api/dailyPlans';
import { useRepartition, useDailyLog } from '../../api/today';

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function shiftDate(isoDate: string, deltaDays: number): string {
	const d = new Date(isoDate);
	d.setDate(d.getDate() + deltaDays);
	return d.toISOString().slice(0, 10);
}

function formatDateLabel(isoDate: string, today: string): string {
	if (isoDate === today) return "Aujourd'hui";
	if (isoDate === shiftDate(today, -1)) return 'Hier';
	return new Date(isoDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

interface HomeScreenProps {
	onNavigateToHref?: (href: string) => void;
	onNavigateToOnboarding: () => void;
}

export function HomeScreen({ onNavigateToHref, onNavigateToOnboarding }: HomeScreenProps) {
	const today = useMemo(() => todayIso(), []);
	const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
	const [date, setDate] = useState(today);

	const catsQuery = useCats();
	const cats = catsQuery.data?.cats ?? [];
	const activeCatId = selectedCatId ?? cats[0]?.id ?? null;
	const activeCat = cats.find((c) => c.id === activeCatId) ?? null;
	const isToday = date === today;

	const foodsQuery = useFoods();
	const dailyPlansQuery = useDailyPlans(activeCatId ?? undefined);
	const dailyPlans = dailyPlansQuery.data ?? [];

	const hasActiveFood = Boolean(activeCat?.activeCroquetteFoodId || activeCat?.activePateeFoodId);
	const hasActiveRoutine = dailyPlans.some((plan) => plan.isActive);

	const repartitionQuery = useRepartition(
		isToday && activeCatId && hasActiveFood && hasActiveRoutine ? activeCatId : undefined,
		date
	);
	const dailyLogQuery = useDailyLog(!isToday && activeCatId ? activeCatId : undefined, date);

	if (catsQuery.isLoading) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
				<Spinner />
			</View>
		);
	}

	return (
		<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
				<View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
					<PawPrint size={22} color={colors.primaryForeground} />
				</View>
				<View>
					<Text variant="title" style={{ fontSize: 22 }}>
						Crystal Miaou
					</Text>
					<Text color="muted" variant="caption">
						Suivi de la nutrition de vos chats.
					</Text>
				</View>
			</View>

			{cats.length === 0 ? (
				<Card style={{ gap: spacing.sm }}>
					<Text variant="heading">Bienvenue 👋</Text>
					<Text color="muted">Ajoutez le profil de votre chat pour préparer le calcul de ses besoins nutritionnels.</Text>
					<View>
						<Button label="Ajouter un chat" onPress={onNavigateToOnboarding} />
					</View>
				</Card>
			) : (
				<>
					{cats.length > 1 ? (
						<Tabs
							value={activeCatId ?? ''}
							options={cats.map((cat) => ({ label: cat.name, value: cat.id }))}
							onChange={setSelectedCatId}
						/>
					) : null}

					{activeCat && activeCatId ? (
						<View style={{ gap: spacing.lg }}>
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'space-between',
									backgroundColor: colors.card,
									borderWidth: 1,
									borderColor: colors.border,
									borderRadius: 12,
									paddingVertical: spacing.sm,
									paddingHorizontal: spacing.md
								}}
							>
								<Pressable
									onPress={() => setDate(shiftDate(date, -1))}
									style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
									hitSlop={8}
								>
									<ChevronLeft size={18} color={colors.foreground} />
									<Text variant="bodyMedium">Veille</Text>
								</Pressable>
								<Text variant="bodyMedium">{formatDateLabel(date, today)}</Text>
								<Pressable
									onPress={() => !isToday && setDate(shiftDate(date, 1))}
									disabled={isToday}
									style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: isToday ? 0.4 : 1 }}
									hitSlop={8}
								>
									<Text variant="bodyMedium">Lendemain</Text>
									<ChevronRight size={18} color={colors.foreground} />
								</Pressable>
							</View>

							{isToday && !hasActiveRoutine ? (
								<>
									<EmptyState
										icon={CalendarClock}
										title="Aucune routine active"
										description="Configurez une routine pour définir les heures et le type de repas (pâtée/croquette)."
									>
										<Button label="Configurer une routine" onPress={() => onNavigateToHref?.('/repas/routines')} />
									</EmptyState>
									{foodsQuery.data ? (
										<FoodSelection cat={activeCat} foods={foodsQuery.data} dailyPlans={dailyPlans} onNavigateToHref={onNavigateToHref} />
									) : null}
								</>
							) : isToday && !hasActiveFood ? (
								<>
									<EmptyState
										icon={Utensils}
										title="Aucun aliment actif"
										description="Choisissez au moins une pâtée ou une croquette ci-dessous pour que l'app calcule les quantités du jour."
									/>
									{foodsQuery.data ? (
										<FoodSelection cat={activeCat} foods={foodsQuery.data} dailyPlans={dailyPlans} onNavigateToHref={onNavigateToHref} />
									) : null}
								</>
							) : (
								<View style={{ gap: spacing.lg }}>
									{isToday ? (
										repartitionQuery.isError ? (
											<Alert variant="error" message={repartitionQuery.error.message} />
										) : repartitionQuery.data ? (
											<DailyMealSchedule
												repartition={repartitionQuery.data}
												catId={activeCatId}
												date={date}
												onNavigateToHref={onNavigateToHref}
											/>
										) : (
											<Spinner />
										)
									) : dailyLogQuery.isError ? (
										<Alert variant="error" message={dailyLogQuery.error.message} />
									) : dailyLogQuery.data ? (
										<DailyLogView log={dailyLogQuery.data} />
									) : (
										<Spinner />
									)}

									{foodsQuery.data ? (
										<FoodSelection cat={activeCat} foods={foodsQuery.data} dailyPlans={dailyPlans} onNavigateToHref={onNavigateToHref} />
									) : null}

									{isToday && repartitionQuery.data ? (
										<RationDetails repartition={repartitionQuery.data} catId={activeCatId} date={date} />
									) : null}
								</View>
							)}
						</View>
					) : null}
				</>
			)}
		</ScrollView>
	);
}
