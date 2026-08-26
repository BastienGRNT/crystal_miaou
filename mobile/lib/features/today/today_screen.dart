import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/models/cat.dart';
import '../../core/models/repartition.dart';
import '../../core/theme.dart';
import 'today_service.dart';

class TodayScreen extends StatefulWidget {
  const TodayScreen({super.key, required this.cat});

  final Cat cat;

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TodayService>().load(widget.cat.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Aujourd\'hui — ${widget.cat.name}')),
      body: Consumer<TodayService>(
        builder: (context, service, _) {
          if (service.loading && service.repartition == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (service.error != null) {
            return Center(child: Text(service.error!, style: const TextStyle(color: AppColors.destructive)));
          }
          final jour = service.repartition;
          if (jour == null) return const SizedBox.shrink();

          return RefreshIndicator(
            onRefresh: () => service.load(widget.cat.id),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _ScoreCard(jour: jour),
                if (jour.recapCroquette != null && jour.recapCroquette!.distributeurAutomatiqueG > 0) ...[
                  const SizedBox(height: 12),
                  _RecapCroquetteCard(recap: jour.recapCroquette!),
                ],
                if (jour.avertissements.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ...jour.avertissements.map(
                    (a) => Card(
                      color: AppColors.warning.withValues(alpha: 0.12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(a, style: const TextStyle(color: AppColors.warning)),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Text('Repas du jour', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                ...jour.repas.map((repas) => _MealTile(
                      repas: repas,
                      onToggle: (value) => service.setValidated(widget.cat.id, repas.id, value),
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.jour});

  final RepartitionJour jour;

  @override
  Widget build(BuildContext context) {
    final pctDer = jour.der == 0 ? 0.0 : (jour.totalKcal / jour.der).clamp(0, 2).toDouble();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${jour.totalKcal.toStringAsFixed(0)} kcal / ${jour.der.toStringAsFixed(0)} kcal (DER)',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.full),
              child: LinearProgressIndicator(
                value: pctDer > 1 ? 1 : pctDer,
                minHeight: 8,
                backgroundColor: AppColors.muted,
                valueColor: AlwaysStoppedAnimation(pctDer > 1 ? AppColors.warning : AppColors.primary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecapCroquetteCard extends StatelessWidget {
  const _RecapCroquetteCard({required this.recap});

  final RecapDistributionCroquette recap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Croquette — qui distribue quoi', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.inventory_2_outlined, size: 18, color: AppColors.primary),
                const SizedBox(width: 6),
                Text('${recap.distributeurAutomatiqueG.toStringAsFixed(0)} g déjà dans le distributeur'),
              ],
            ),
            if (recap.aPreparerG > 0) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.back_hand_outlined, size: 18, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text('${recap.aPreparerG.toStringAsFixed(0)} g à préparer vous-même'),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MealTile extends StatelessWidget {
  const _MealTile({required this.repas, required this.onToggle});

  final Repas repas;
  final ValueChanged<bool> onToggle;

  IconData get _icon => switch (repas.foodType) {
        'croquette' => Icons.grain,
        'patee' => Icons.set_meal,
        'friandise' => Icons.cookie,
        _ => Icons.restaurant,
      };

  @override
  Widget build(BuildContext context) {
    final heure = DateFormat.Hm('fr_FR').format(repas.consumedAt);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withValues(alpha: 0.16),
          child: Icon(_icon, color: AppColors.primary),
        ),
        title: Text('$heure — ${repas.food.name}'),
        subtitle: Text(
          '${repas.doses != null ? '${repas.doses} dose${repas.doses! > 1 ? 's' : ''} (${repas.quantiteG.toStringAsFixed(0)} g)' : '${repas.quantiteG.toStringAsFixed(1)} g'}'
          ' · ${repas.kcal.toStringAsFixed(0)} kcal'
          '${repas.food.brand != null ? ' · ${repas.food.brand}' : ''}',
        ),
        trailing: Checkbox(
          value: repas.validated,
          activeColor: AppColors.success,
          onChanged: (value) => onToggle(value ?? false),
        ),
      ),
    );
  }
}
