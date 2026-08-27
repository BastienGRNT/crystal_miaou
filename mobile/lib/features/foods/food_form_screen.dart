import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/models/food.dart';
import '../../core/theme.dart';
import 'foods_service.dart';

const _typeLabels = {'croquette': 'Croquette', 'patee': 'Pâtée', 'friandise': 'Friandise'};
const _legalStatusLabels = {'complet': 'Complet', 'complementaire': 'Complémentaire'};

/// Création/édition d'un aliment (mirroring `aliments/+page.svelte`). Si `parsedFromScan` est fourni
/// (retour de `POST /api/foods/scan`), les champs sont pré-remplis mais restent éditables — jamais
/// sauvegardé automatiquement, la correction manuelle avant `POST /api/foods` est obligatoire
/// (CLAUDE.md règle 8).
class FoodFormScreen extends StatefulWidget {
  const FoodFormScreen({super.key, this.existing, this.parsedFromScan});

  final Food? existing;
  final ParsedFoodLabel? parsedFromScan;

  @override
  State<FoodFormScreen> createState() => _FoodFormScreenState();
}

class _FoodFormScreenState extends State<FoodFormScreen> {
  late final _name = TextEditingController(text: widget.existing?.name ?? widget.parsedFromScan?.name.value ?? '');
  late final _brand = TextEditingController(text: widget.existing?.brand ?? widget.parsedFromScan?.brand.value ?? '');
  late String _type = widget.existing?.type ?? widget.parsedFromScan?.type.value ?? 'croquette';
  late String _statutLegal = widget.existing?.statutLegal ?? widget.parsedFromScan?.statutLegal.value ?? 'complet';

  late final _emKcal100g = _numCtrl(widget.existing?.emKcal100g, widget.parsedFromScan?.emKcal100g.value);
  late final _packageSizeG = _numCtrl(widget.existing?.packageSizeG, null);
  late final _doseDistributeurG = _numCtrl(widget.existing?.doseDistributeurG, null);
  late final _proteinesG100g = _numCtrl(widget.existing?.proteinesG100g, widget.parsedFromScan?.proteinesG100g.value);
  late final _lipidesG100g = _numCtrl(widget.existing?.lipidesG100g, widget.parsedFromScan?.lipidesG100g.value);
  late final _humiditeG100g = _numCtrl(widget.existing?.humiditeG100g, widget.parsedFromScan?.humiditeG100g.value);
  late final _fibresG100g = _numCtrl(widget.existing?.fibresG100g, widget.parsedFromScan?.fibresG100g.value);
  late final _cendresG100g = _numCtrl(widget.existing?.cendresG100g, widget.parsedFromScan?.cendresG100g.value);
  late final _glucidesG100g = _numCtrl(widget.existing?.glucidesG100g, widget.parsedFromScan?.glucidesG100g.value);
  late final _calciumG100g = _numCtrl(widget.existing?.calciumG100g, null);
  late final _phosphoreG100g = _numCtrl(widget.existing?.phosphoreG100g, null);
  late final _taurineG100g = _numCtrl(widget.existing?.taurineG100g, null);

  bool _saving = false;
  String? _error;

  TextEditingController _numCtrl(double? existing, double? fromScan) =>
      TextEditingController(text: (existing ?? fromScan)?.toString() ?? '');

  double? _parse(TextEditingController ctrl) {
    final text = ctrl.text.trim().replaceAll(',', '.');
    return text.isEmpty ? null : double.tryParse(text);
  }

  Future<void> _submit() async {
    setState(() {
      _saving = true;
      _error = null;
    });

    final body = {
      'name': _name.text.trim(),
      'brand': _brand.text.trim(),
      'type': _type,
      'emKcal100g': _parse(_emKcal100g),
      'packageSizeG': _parse(_packageSizeG),
      'doseDistributeurG': _parse(_doseDistributeurG),
      'proteinesG100g': _parse(_proteinesG100g) ?? 0,
      'lipidesG100g': _parse(_lipidesG100g) ?? 0,
      'humiditeG100g': _parse(_humiditeG100g),
      'fibresG100g': _parse(_fibresG100g) ?? 0,
      'cendresG100g': _parse(_cendresG100g) ?? 0,
      'glucidesG100g': _parse(_glucidesG100g),
      'calciumG100g': _parse(_calciumG100g),
      'phosphoreG100g': _parse(_phosphoreG100g),
      'taurineG100g': _parse(_taurineG100g),
      'statutLegal': _statutLegal,
    };

    try {
      final service = context.read<FoodsService>();
      if (widget.existing == null) {
        await service.createFood(body);
      } else {
        await service.updateFood(widget.existing!.id, body);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _numField(String label, TextEditingController ctrl, {bool required = false}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: ctrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(labelText: required ? '$label *' : '$label (optionnel)'),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final warnings = widget.parsedFromScan?.warnings ?? const [];
    return Scaffold(
      appBar: AppBar(title: Text(widget.existing == null ? 'Nouvel aliment' : 'Modifier l\'aliment')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (warnings.isNotEmpty)
              Card(
                color: AppColors.warning.withValues(alpha: 0.12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Scan OCR — à vérifier avant d\'enregistrer :', style: TextStyle(fontWeight: FontWeight.bold)),
                      for (final w in warnings) Text('• $w'),
                    ],
                  ),
                ),
              ),
            if (warnings.isNotEmpty) const SizedBox(height: 12),
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nom')),
            const SizedBox(height: 12),
            TextField(controller: _brand, decoration: const InputDecoration(labelText: 'Marque')),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Type'),
              items: _typeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 12),
            _numField('Énergie métabolisable (kcal/100g)', _emKcal100g),
            _numField('Poids du paquet (g)', _packageSizeG),
            _numField('Dose distributeur automatique (g)', _doseDistributeurG),
            _numField('Protéines (g/100g)', _proteinesG100g, required: true),
            _numField('Lipides (g/100g)', _lipidesG100g, required: true),
            _numField('Humidité (g/100g)', _humiditeG100g),
            _numField('Fibres brutes (g/100g)', _fibresG100g, required: true),
            _numField('Cendres brutes (g/100g)', _cendresG100g, required: true),
            _numField('Glucides (g/100g)', _glucidesG100g),
            _numField('Calcium (g/100g)', _calciumG100g),
            _numField('Phosphore (g/100g)', _phosphoreG100g),
            _numField('Taurine (g/100g)', _taurineG100g),
            DropdownButtonFormField<String>(
              initialValue: _statutLegal,
              decoration: const InputDecoration(labelText: 'Statut légal'),
              items: _legalStatusLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _statutLegal = v!),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.destructive)),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}
