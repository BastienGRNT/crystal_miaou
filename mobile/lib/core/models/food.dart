/// Aliment du catalogue (`GET/POST/PATCH /api/foods`) — tous les champs numériques sont déjà des
/// `number` côté API (cf. `food.service.ts` `withNumericFields`), jamais recalculés ici.
class Food {
  final String id;
  final String name;
  final String brand;
  final String type; // croquette | patee | friandise
  final double? emKcal100g;
  final bool emEstimee;
  final bool emSuspecte;
  final double? packageSizeG;
  final double? doseDistributeurG;
  final double proteinesG100g;
  final double lipidesG100g;
  final double? humiditeG100g;
  final bool humiditeEstimee;
  final double fibresG100g;
  final double cendresG100g;
  final double? glucidesG100g;
  final bool glucidesEstimes;
  final double? calciumG100g;
  final double? phosphoreG100g;
  final double? taurineG100g;
  final String statutLegal; // complet | complementaire

  Food({
    required this.id,
    required this.name,
    required this.brand,
    required this.type,
    required this.emKcal100g,
    required this.emEstimee,
    required this.emSuspecte,
    required this.packageSizeG,
    required this.doseDistributeurG,
    required this.proteinesG100g,
    required this.lipidesG100g,
    required this.humiditeG100g,
    required this.humiditeEstimee,
    required this.fibresG100g,
    required this.cendresG100g,
    required this.glucidesG100g,
    required this.glucidesEstimes,
    required this.calciumG100g,
    required this.phosphoreG100g,
    required this.taurineG100g,
    required this.statutLegal,
  });

  factory Food.fromJson(Map<String, dynamic> json) => Food(
        id: json['id'] as String,
        name: json['name'] as String,
        brand: json['brand'] as String,
        type: json['type'] as String,
        emKcal100g: (json['emKcal100g'] as num?)?.toDouble(),
        emEstimee: json['emEstimee'] as bool? ?? false,
        emSuspecte: json['emSuspecte'] as bool? ?? false,
        packageSizeG: (json['packageSizeG'] as num?)?.toDouble(),
        doseDistributeurG: (json['doseDistributeurG'] as num?)?.toDouble(),
        proteinesG100g: (json['proteinesG100g'] as num).toDouble(),
        lipidesG100g: (json['lipidesG100g'] as num).toDouble(),
        humiditeG100g: (json['humiditeG100g'] as num?)?.toDouble(),
        humiditeEstimee: json['humiditeEstimee'] as bool? ?? false,
        fibresG100g: (json['fibresG100g'] as num).toDouble(),
        cendresG100g: (json['cendresG100g'] as num).toDouble(),
        glucidesG100g: (json['glucidesG100g'] as num?)?.toDouble(),
        glucidesEstimes: json['glucidesEstimes'] as bool? ?? false,
        calciumG100g: (json['calciumG100g'] as num?)?.toDouble(),
        phosphoreG100g: (json['phosphoreG100g'] as num?)?.toDouble(),
        taurineG100g: (json['taurineG100g'] as num?)?.toDouble(),
        statutLegal: json['statutLegal'] as String,
      );

  String get label => '$name ($brand)';
}

/// Champ OCR (`ParsedField<T>` côté serveur, `ocr.calc.ts`) : une valeur pré-remplie n'est jamais
/// considérée définitive tant que l'utilisateur ne l'a pas revue dans le formulaire de correction.
class ParsedField<T> {
  final T? value;
  final bool found;

  ParsedField({required this.value, required this.found});

  factory ParsedField.fromJson(Map<String, dynamic> json, T Function(dynamic) cast) => ParsedField(
        value: json['value'] == null ? null : cast(json['value']),
        found: json['found'] as bool? ?? false,
      );
}

class ParsedFoodLabel {
  final ParsedField<String> name;
  final ParsedField<String> brand;
  final ParsedField<String> type;
  final ParsedField<String> statutLegal;
  final ParsedField<double> emKcal100g;
  final ParsedField<double> proteinesG100g;
  final ParsedField<double> lipidesG100g;
  final ParsedField<double> humiditeG100g;
  final ParsedField<double> fibresG100g;
  final ParsedField<double> cendresG100g;
  final ParsedField<double> glucidesG100g;
  final List<String> warnings;

  ParsedFoodLabel({
    required this.name,
    required this.brand,
    required this.type,
    required this.statutLegal,
    required this.emKcal100g,
    required this.proteinesG100g,
    required this.lipidesG100g,
    required this.humiditeG100g,
    required this.fibresG100g,
    required this.cendresG100g,
    required this.glucidesG100g,
    required this.warnings,
  });

  factory ParsedFoodLabel.fromJson(Map<String, dynamic> json) {
    ParsedField<double> num_(String key) =>
        ParsedField.fromJson(json[key] as Map<String, dynamic>, (v) => (v as num).toDouble());
    ParsedField<String> str(String key) =>
        ParsedField.fromJson(json[key] as Map<String, dynamic>, (v) => v as String);

    return ParsedFoodLabel(
      name: str('name'),
      brand: str('brand'),
      type: str('type'),
      statutLegal: str('statutLegal'),
      emKcal100g: num_('emKcal100g'),
      proteinesG100g: num_('proteinesG100g'),
      lipidesG100g: num_('lipidesG100g'),
      humiditeG100g: num_('humiditeG100g'),
      fibresG100g: num_('fibresG100g'),
      cendresG100g: num_('cendresG100g'),
      glucidesG100g: num_('glucidesG100g'),
      warnings: (json['warnings'] as List? ?? []).map((e) => e.toString()).toList(),
    );
  }
}
