import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/models/cat.dart';
import '../../core/models/daily_plan.dart';
import '../../core/models/food.dart';
import '../../core/theme.dart';
import 'cat_detail_service.dart';
import 'cat_form_screen.dart';
import 'daily_plan_form_screen.dart';

/// Écran détail d'un chat : ce qu'il mange en ce moment (aliments actifs), ses routines, son suivi
/// de poids, son foyer — tout ce qui, une fois réglé, fait que "Aujourd'hui" peut calculer quelque
/// chose. Mirroring `chats/+page.svelte` + `FoodSelection.svelte` + `repas/routines/+page.svelte`,
/// en une seule page mobile plutôt que plusieurs modales desktop.
class CatDetailScreen extends StatelessWidget {
  const CatDetailScreen({super.key, required this.cat, required this.onCatUpdated});

  final Cat cat;
  final VoidCallback onCatUpdated;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => CatDetailService(ctx.read<ApiClient>())..load(cat.id),
      child: _CatDetailBody(cat: cat, onCatUpdated: onCatUpdated),
    );
  }
}

class _CatDetailBody extends StatefulWidget {
  const _CatDetailBody({required this.cat, required this.onCatUpdated});

  final Cat cat;
  final VoidCallback onCatUpdated;

  @override
  State<_CatDetailBody> createState() => _CatDetailBodyState();
}

class _CatDetailBodyState extends State<_CatDetailBody> {
  late final Cat _cat = widget.cat;

  Future<void> _reload() => context.read<CatDetailService>().load(_cat.id);

  Future<void> _editProfile() async {
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CatFormScreen(existing: _cat)),
    );
    if (updated == true) widget.onCatUpdated();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_cat.name),
        actions: [IconButton(icon: const Icon(Icons.edit_outlined), onPressed: _editProfile)],
      ),
      body: Consumer<CatDetailService>(
        builder: (context, service, _) {
          if (service.loading && service.foods.isEmpty && service.dailyPlans.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (service.error != null) {
            return Center(child: Text(service.error!, style: const TextStyle(color: AppColors.destructive)));
          }
          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _FoodSelectionCard(cat: _cat, service: service, onSaved: _reload),
                const SizedBox(height: 16),
                _RoutinesCard(catId: _cat.id, service: service, onChanged: _reload),
                const SizedBox(height: 16),
                _WeightCard(catId: _cat.id, service: service, onChanged: _reload),
                const SizedBox(height: 16),
                _HouseholdCard(catId: _cat.id, service: service, onChanged: _reload),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text, style: Theme.of(context).textTheme.titleLarge);
}

class _FoodSelectionCard extends StatefulWidget {
  const _FoodSelectionCard({required this.cat, required this.service, required this.onSaved});
  final Cat cat;
  final CatDetailService service;
  final Future<void> Function() onSaved;

  @override
  State<_FoodSelectionCard> createState() => _FoodSelectionCardState();
}

class _FoodSelectionCardState extends State<_FoodSelectionCard> {
  String? _croquetteId;
  String? _pateeId;
  String? _friandiseId;
  late final _friandiseQtyCtrl =
      TextEditingController(text: widget.cat.friandiseQuantiteTotaleG?.toString() ?? '');
  bool _saving = false;
  String? _error;
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    _croquetteId = widget.cat.activeCroquetteFoodId;
    _pateeId = widget.cat.activePateeFoodId;
    _friandiseId = widget.cat.activeFriandiseFoodId;
  }

  Future<void> _save() async {
    if (_croquetteId == null && _pateeId == null) {
      setState(() => _error = 'Choisissez au moins une pâtée ou une croquette.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
      _saved = false;
    });
    try {
      await widget.service.updateFoodSelection(
        widget.cat.id,
        croquetteFoodId: _croquetteId,
        pateeFoodId: _pateeId,
        friandiseFoodId: _friandiseId,
        friandiseQuantiteTotaleG: _friandiseId == null ? null : double.tryParse(_friandiseQtyCtrl.text.replaceAll(',', '.')),
      );
      await widget.onSaved();
      if (mounted) setState(() => _saved = true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<DropdownMenuItem<String?>> _options(List<Food> foods, String type) => [
        const DropdownMenuItem(value: null, child: Text('Aucune')),
        ...foods.where((f) => f.type == type).map((f) => DropdownMenuItem(value: f.id, child: Text(f.label))),
      ];

  @override
  Widget build(BuildContext context) {
    final foods = widget.service.foods;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionTitle('Ce que mange ce chat en ce moment'),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              initialValue: _croquetteId,
              decoration: const InputDecoration(labelText: 'Croquette'),
              items: _options(foods, 'croquette'),
              onChanged: (v) => setState(() => _croquetteId = v),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String?>(
              initialValue: _pateeId,
              decoration: const InputDecoration(labelText: 'Pâtée'),
              items: _options(foods, 'patee'),
              onChanged: (v) => setState(() => _pateeId = v),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String?>(
              initialValue: _friandiseId,
              decoration: const InputDecoration(labelText: 'Friandise (optionnel)'),
              items: _options(foods, 'friandise'),
              onChanged: (v) => setState(() => _friandiseId = v),
            ),
            if (_friandiseId != null) ...[
              const SizedBox(height: 8),
              TextField(
                controller: _friandiseQtyCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Quantité de friandise par jour (g)'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: AppColors.destructive)),
            ],
            if (_saved) ...[
              const SizedBox(height: 8),
              const Text('Enregistré.', style: TextStyle(color: AppColors.success)),
            ],
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoutinesCard extends StatelessWidget {
  const _RoutinesCard({required this.catId, required this.service, required this.onChanged});
  final String catId;
  final CatDetailService service;
  final Future<void> Function() onChanged;

  Future<void> _openForm(BuildContext context, {DailyPlan? existing}) async {
    final result = await Navigator.of(context).push<DailyPlanFormResult>(
      MaterialPageRoute(builder: (_) => DailyPlanFormScreen(existing: existing)),
    );
    if (result == null) return;
    if (existing == null) {
      await service.createDailyPlan(catId, result.name, result.slots);
    } else {
      await service.updateDailyPlan(catId, existing.id, result.name, result.slots);
    }
    await onChanged();
  }

  Future<void> _delete(BuildContext context, DailyPlan plan) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer la routine ?'),
        content: Text('Supprimer "${plan.name}" ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (confirmed == true) {
      await service.deleteDailyPlan(plan.id);
      await onChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(child: _SectionTitle('Routines')),
                IconButton(icon: const Icon(Icons.add), onPressed: () => _openForm(context)),
              ],
            ),
            if (service.dailyPlans.isEmpty) const Text('Aucune routine pour ce chat.'),
            for (final plan in service.dailyPlans)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(plan.name, style: Theme.of(context).textTheme.titleSmall)),
                        if (plan.isActive)
                          const Padding(
                            padding: EdgeInsets.only(right: 4),
                            child: Icon(Icons.check_circle, color: AppColors.success, size: 18),
                          ),
                      ],
                    ),
                    for (final slot in plan.slots)
                      Text(
                        '${slot.timeOfDay} — ${_foodTypeLabel(slot.foodType)}',
                        style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                      ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        if (!plan.isActive)
                          TextButton(onPressed: () async {
                            await service.activateDailyPlan(plan.id);
                            await onChanged();
                          }, child: const Text('Activer')),
                        TextButton(onPressed: () => _openForm(context, existing: plan), child: const Text('Modifier')),
                        TextButton(onPressed: () => _delete(context, plan), child: const Text('Supprimer')),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _foodTypeLabel(String type) => switch (type) {
        'croquette' => 'Croquette',
        'patee' => 'Pâtée',
        'friandise' => 'Friandise',
        _ => type,
      };
}

class _WeightCard extends StatefulWidget {
  const _WeightCard({required this.catId, required this.service, required this.onChanged});
  final String catId;
  final CatDetailService service;
  final Future<void> Function() onChanged;

  @override
  State<_WeightCard> createState() => _WeightCardState();
}

class _WeightCardState extends State<_WeightCard> {
  final _weightCtrl = TextEditingController();
  DateTime _date = DateTime.now();

  Future<void> _add() async {
    final weightKg = double.tryParse(_weightCtrl.text.replaceAll(',', '.'));
    if (weightKg == null) return;
    final dateStr = '${_date.year.toString().padLeft(4, '0')}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
    await widget.service.addWeightLog(widget.catId, weightKg, dateStr);
    _weightCtrl.clear();
    await widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final evaluation = widget.service.weightEvaluation;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionTitle('Suivi de poids'),
            if (evaluation?.suggestion != null) ...[
              const SizedBox(height: 8),
              Text(evaluation!.suggestion!, style: const TextStyle(color: AppColors.mutedForeground)),
            ],
            const SizedBox(height: 8),
            for (final entry in widget.service.weightHistory.reversed.take(5))
              Text('${entry.recordedAt} — ${entry.weightKg.toStringAsFixed(2)} kg'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _weightCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Nouveau poids (kg)'),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.calendar_today, size: 18),
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _date,
                      firstDate: DateTime(2000),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) setState(() => _date = picked);
                  },
                ),
                IconButton(icon: const Icon(Icons.add_circle, color: AppColors.primary), onPressed: _add),
              ],
            ),
            Text(DateFormat.yMd('fr_FR').format(_date), style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _HouseholdCard extends StatefulWidget {
  const _HouseholdCard({required this.catId, required this.service, required this.onChanged});
  final String catId;
  final CatDetailService service;
  final Future<void> Function() onChanged;

  @override
  State<_HouseholdCard> createState() => _HouseholdCardState();
}

class _HouseholdCardState extends State<_HouseholdCard> {
  final _emailCtrl = TextEditingController();
  String? _error;

  Future<void> _invite() async {
    setState(() => _error = null);
    try {
      await widget.service.addMember(widget.catId, _emailCtrl.text.trim());
      _emailCtrl.clear();
      await widget.onChanged();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _remove(String membershipId) async {
    await widget.service.removeMember(widget.catId, membershipId);
    await widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionTitle('Foyer'),
            const SizedBox(height: 8),
            for (final member in widget.service.members)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(member.name),
                subtitle: Text(member.email),
                trailing: widget.service.members.length > 1
                    ? IconButton(
                        icon: const Icon(Icons.person_remove_outlined, color: AppColors.destructive),
                        onPressed: () => _remove(member.membershipId),
                      )
                    : null,
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email à inviter'),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(icon: const Icon(Icons.person_add_alt, color: AppColors.primary), onPressed: _invite),
              ],
            ),
            if (_error != null) Text(_error!, style: const TextStyle(color: AppColors.destructive)),
          ],
        ),
      ),
    );
  }
}
