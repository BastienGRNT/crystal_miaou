import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/models/cat.dart';
import '../../core/theme.dart';
import '../auth/auth_service.dart';
import 'cat_detail_screen.dart';
import 'cat_form_screen.dart';
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

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Se déconnecter ?'),
        content: const Text('Vous devrez ressaisir vos identifiants pour vous reconnecter.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Se déconnecter')),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<AuthService>().signOut();
    }
  }

  Future<void> _createCat(BuildContext context) async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const CatFormScreen()),
    );
    if (created == true && context.mounted) {
      await context.read<CatsService>().load();
    }
  }

  Future<void> _openDetail(BuildContext context, Cat cat) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CatDetailScreen(
          cat: cat,
          onCatUpdated: () => context.read<CatsService>().load(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes chats'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Se déconnecter',
            onPressed: () => _confirmLogout(context),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createCat(context),
        child: const Icon(Icons.add),
      ),
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
                onOpenDetail: () => _openDetail(context, service.cats[i]),
                onSelectToday: () => widget.onSelectCat(service.cats[i]),
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
    required this.onOpenDetail,
    required this.onSelectToday,
    required this.onAdjustDer,
  });

  final Cat cat;
  final List<int> derAjustementPctValeurs;
  final VoidCallback onOpenDetail;
  final VoidCallback onSelectToday;
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
              onTap: onOpenDetail,
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
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(onPressed: onOpenDetail, child: const Text('Aliments & routines')),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(onPressed: onSelectToday, child: const Text('Voir aujourd\'hui')),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
