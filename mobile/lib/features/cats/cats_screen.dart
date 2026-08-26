import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/models/cat.dart';
import '../../core/theme.dart';
import 'cats_service.dart';

class CatsScreen extends StatefulWidget {
  const CatsScreen({super.key, required this.onSelectCat});

  final ValueChanged<Cat> onSelectCat;

  @override
  State<CatsScreen> createState() => _CatsScreenState();
}

class _CatsScreenState extends State<CatsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<CatsService>().load());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes chats')),
      body: Consumer<CatsService>(
        builder: (context, service, _) {
          if (service.loading && service.cats.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (service.error != null) {
            return Center(child: Text(service.error!, style: const TextStyle(color: AppColors.destructive)));
          }
          return RefreshIndicator(
            onRefresh: service.load,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: service.cats.length,
              itemBuilder: (context, i) => _CatCard(
                cat: service.cats[i],
                derAjustementPctValeurs: service.derAjustementPctValeurs,
                onOpen: () => widget.onSelectCat(service.cats[i]),
                onAdjustDer: (pct) => service.setDerAjustementPct(service.cats[i].id, pct),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CatCard extends StatelessWidget {
  const _CatCard({
    required this.cat,
    required this.derAjustementPctValeurs,
    required this.onOpen,
    required this.onAdjustDer,
  });

  final Cat cat;
  final List<int> derAjustementPctValeurs;
  final VoidCallback onOpen;
  final ValueChanged<int> onAdjustDer;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: onOpen,
              child: Row(
                children: [
                  Expanded(
                    child: Text(cat.name, style: Theme.of(context).textTheme.titleLarge),
                  ),
                  const Icon(Icons.chevron_right, color: AppColors.mutedForeground),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text('${cat.weightKg} kg · ${cat.sex} · ${cat.activityLevel}',
                style: const TextStyle(color: AppColors.mutedForeground)),
            const SizedBox(height: 12),
            Text('Besoin ajusté', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: derAjustementPctValeurs.map((pct) {
                final selected = cat.derAjustementPct == pct;
                return ChoiceChip(
                  label: Text(pct == 0 ? 'Normal' : '${pct > 0 ? '+' : ''}$pct%'),
                  selected: selected,
                  selectedColor: AppColors.primary.withValues(alpha: 0.2),
                  onSelected: (_) => onAdjustDer(pct),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
