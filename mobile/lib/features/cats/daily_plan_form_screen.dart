import 'package:flutter/material.dart';
import '../../core/models/daily_plan.dart';
import '../../core/theme.dart';

const _foodTypeLabels = {'croquette': 'Croquette', 'patee': 'Pâtée', 'friandise': 'Friandise'};
const _distributionLabels = {
  'gamelle': 'Gamelle',
  'distributeur_automatique': 'Distributeur automatique',
  'gamelle_ludique': 'Gamelle ludique',
};

class DailyPlanFormResult {
  final String name;
  final List<DailyPlanSlot> slots;
  DailyPlanFormResult(this.name, this.slots);
}

/// Création/édition d'une routine (nom + créneaux horaires) — mirroring `repas/routines/+page.svelte`,
/// en formulaire plein écran. Pas de calcul ici : les quantités du jour sont calculées côté serveur
/// (`repartition.calc.ts`) à partir des créneaux définis ici, jamais estimées dans ce formulaire.
class DailyPlanFormScreen extends StatefulWidget {
  const DailyPlanFormScreen({super.key, this.existing});

  final DailyPlan? existing;

  @override
  State<DailyPlanFormScreen> createState() => _DailyPlanFormScreenState();
}

class _SlotDraft {
  TimeOfDay time;
  String foodType;
  String distributionMode;
  _SlotDraft({required this.time, required this.foodType, required this.distributionMode});
}

class _DailyPlanFormScreenState extends State<DailyPlanFormScreen> {
  late final _nameCtrl = TextEditingController(text: widget.existing?.name ?? '');
  late final List<_SlotDraft> _slots = widget.existing?.slots.map((s) {
        final parts = s.timeOfDay.split(':');
        return _SlotDraft(
          time: TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1])),
          foodType: s.foodType,
          distributionMode: s.distributionMode,
        );
      }).toList() ??
      [
        _SlotDraft(time: const TimeOfDay(hour: 8, minute: 0), foodType: 'croquette', distributionMode: 'gamelle'),
        _SlotDraft(time: const TimeOfDay(hour: 20, minute: 0), foodType: 'croquette', distributionMode: 'gamelle'),
      ];

  String? _error;

  void _addSlot() {
    setState(() => _slots.add(
          _SlotDraft(time: const TimeOfDay(hour: 12, minute: 0), foodType: 'croquette', distributionMode: 'gamelle'),
        ));
  }

  void _removeSlot(int i) => setState(() => _slots.removeAt(i));

  Future<void> _pickTime(int i) async {
    final picked = await showTimePicker(context: context, initialTime: _slots[i].time);
    if (picked != null) setState(() => _slots[i].time = picked);
  }

  void _submit() {
    if (_nameCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Le nom de la routine est obligatoire.');
      return;
    }
    if (_slots.isEmpty) {
      setState(() => _error = 'Ajoutez au moins un créneau de repas.');
      return;
    }
    final slots = _slots
        .map((s) => DailyPlanSlot(
              id: '',
              timeOfDay: '${s.time.hour.toString().padLeft(2, '0')}:${s.time.minute.toString().padLeft(2, '0')}',
              foodType: s.foodType,
              distributionMode: s.distributionMode,
            ))
        .toList();
    Navigator.of(context).pop(DailyPlanFormResult(_nameCtrl.text.trim(), slots));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.existing == null ? 'Nouvelle routine' : 'Modifier la routine')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Nom', hintText: 'Semaine, Week-end...'),
            ),
            const SizedBox(height: 16),
            for (var i = 0; i < _slots.length; i++)
              Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text('Repas ${i + 1}', style: Theme.of(context).textTheme.labelLarge)),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
                            onPressed: () => _removeSlot(i),
                          ),
                        ],
                      ),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Heure'),
                        trailing: Text(_slots[i].time.format(context)),
                        onTap: () => _pickTime(i),
                      ),
                      DropdownButtonFormField<String>(
                        initialValue: _slots[i].foodType,
                        decoration: const InputDecoration(labelText: 'Aliment'),
                        items: _foodTypeLabels.entries
                            .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                            .toList(),
                        onChanged: (v) => setState(() => _slots[i].foodType = v!),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _slots[i].distributionMode,
                        decoration: const InputDecoration(labelText: 'Mode de distribution'),
                        items: _distributionLabels.entries
                            .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                            .toList(),
                        onChanged: (v) => setState(() => _slots[i].distributionMode = v!),
                      ),
                    ],
                  ),
                ),
              ),
            OutlinedButton.icon(onPressed: _addSlot, icon: const Icon(Icons.add), label: const Text('Ajouter un repas')),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.destructive)),
            ],
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _submit, child: const Text('Enregistrer')),
          ],
        ),
      ),
    );
  }
}
