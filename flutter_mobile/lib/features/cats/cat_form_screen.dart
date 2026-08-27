import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/models/cat.dart';
import '../../core/theme.dart';

const _sexOptions = {'male': 'Mâle', 'femelle': 'Femelle'};
const _activityOptions = {'faible': 'Faible', 'modere': 'Modéré', 'eleve': 'Élevé'};
const _conditionOptions = {'aucune': 'Aucune', 'gestation': 'Gestation', 'croissance': 'Croissance', 'surpoids': 'Surpoids'};

/// Création (`existing == null`) ou édition du profil d'un chat — mêmes champs que
/// `onboarding/chat` et la modale "Modifier" du web (`chats/+page.svelte`), en formulaire plein
/// écran plutôt qu'une modale desktop. Aucun calcul ici : la validation stricte (bornes, etc.) et
/// le calcul du DER restent côté serveur, ce formulaire ne fait que poster les champs bruts.
class CatFormScreen extends StatefulWidget {
  const CatFormScreen({super.key, this.existing});

  final Cat? existing;

  @override
  State<CatFormScreen> createState() => _CatFormScreenState();
}

class _CatFormScreenState extends State<CatFormScreen> {
  late final _nameCtrl = TextEditingController(text: widget.existing?.name ?? '');
  late final _weightCtrl = TextEditingController(text: widget.existing?.weightKg.toString() ?? '');
  late DateTime? _birthDate = _parseDate(widget.existing?.birthDate);
  late String _sex = widget.existing?.sex ?? 'male';
  late bool _sterilized = widget.existing?.sterilized ?? false;
  late String _activityLevel = widget.existing?.activityLevel ?? 'modere';
  late bool _hasOutdoorAccess = widget.existing?.hasOutdoorAccess ?? false;
  late String _specialCondition = widget.existing?.specialCondition ?? 'aucune';

  bool _loading = false;
  String? _error;

  static DateTime? _parseDate(String? iso) => iso == null ? null : DateTime.tryParse(iso);

  Future<void> _pickBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _birthDate = picked);
  }

  Future<void> _submit() async {
    final weightKg = double.tryParse(_weightCtrl.text.replaceAll(',', '.'));
    if (_nameCtrl.text.trim().isEmpty || weightKg == null || _birthDate == null) {
      setState(() => _error = 'Nom, poids et date de naissance sont obligatoires.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final api = context.read<ApiClient>();
    final birthDateStr =
        '${_birthDate!.year.toString().padLeft(4, '0')}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}';

    final body = {
      'name': _nameCtrl.text.trim(),
      'weightKg': weightKg,
      'birthDate': birthDateStr,
      'sex': _sex,
      'sterilized': _sterilized,
      'activityLevel': _activityLevel,
      'hasOutdoorAccess': _hasOutdoorAccess,
      'specialCondition': _specialCondition,
    };

    try {
      if (widget.existing == null) {
        await api.post('/api/cats', body: body);
      } else {
        await api.patch('/api/cats/${widget.existing!.id}', body: body);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.existing == null ? 'Nouveau chat' : 'Modifier le profil')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Nom')),
            const SizedBox(height: 12),
            TextField(
              controller: _weightCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Poids (kg)'),
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Date de naissance'),
              subtitle: Text(_birthDate == null ? 'Non renseignée' : _birthDate!.toIso8601String().split('T').first),
              trailing: const Icon(Icons.calendar_today, size: 18),
              onTap: _pickBirthDate,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _sex,
              decoration: const InputDecoration(labelText: 'Sexe'),
              items: _sexOptions.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _sex = v!),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Stérilisé(e)'),
              value: _sterilized,
              onChanged: (v) => setState(() => _sterilized = v),
            ),
            const SizedBox(height: 4),
            DropdownButtonFormField<String>(
              initialValue: _activityLevel,
              decoration: const InputDecoration(labelText: "Niveau d'activité"),
              items: _activityOptions.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _activityLevel = v!),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Accès à l\'extérieur'),
              value: _hasOutdoorAccess,
              onChanged: (v) => setState(() => _hasOutdoorAccess = v),
            ),
            const SizedBox(height: 4),
            DropdownButtonFormField<String>(
              initialValue: _specialCondition,
              decoration: const InputDecoration(labelText: 'Condition particulière'),
              items: _conditionOptions.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _specialCondition = v!),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.destructive)),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}
