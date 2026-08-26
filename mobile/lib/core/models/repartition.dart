class FoodRef {
  final String id;
  final String name;
  final String? brand;
  final double? packageSizeG;

  FoodRef({required this.id, required this.name, this.brand, this.packageSizeG});

  factory FoodRef.fromJson(Map<String, dynamic> json) => FoodRef(
        id: json['id'] as String,
        name: json['name'] as String,
        brand: json['brand'] as String?,
        packageSizeG: (json['packageSizeG'] as num?)?.toDouble(),
      );
}

class Repas {
  final String id;
  final DateTime consumedAt;
  final String foodType;
  final FoodRef food;
  final double quantiteG;
  final double kcal;
  final bool locked;
  final bool validated;
  final String? validatedByName;
  final String? distributionMode;

  Repas({
    required this.id,
    required this.consumedAt,
    required this.foodType,
    required this.food,
    required this.quantiteG,
    required this.kcal,
    required this.locked,
    required this.validated,
    required this.validatedByName,
    required this.distributionMode,
  });

  factory Repas.fromJson(Map<String, dynamic> json) => Repas(
        id: json['id'] as String,
        consumedAt: DateTime.parse(json['consumedAt'] as String),
        foodType: json['foodType'] as String,
        food: FoodRef.fromJson(json['food'] as Map<String, dynamic>),
        quantiteG: (json['quantiteG'] as num).toDouble(),
        kcal: (json['kcal'] as num).toDouble(),
        locked: json['locked'] as bool,
        validated: json['validated'] as bool,
        validatedByName: (json['validatedBy'] as Map<String, dynamic>?)?['name'] as String?,
        distributionMode: json['distributionMode'] as String?,
      );
}

class RationStatut {
  final String nutriment;
  final double valeur;
  final String statut; // DEFICIT | EXCES | ATTENTION | OK
  final double positionPct;

  RationStatut({required this.nutriment, required this.valeur, required this.statut, required this.positionPct});

  factory RationStatut.fromJson(Map<String, dynamic> json) => RationStatut(
        nutriment: json['nutriment'] as String,
        valeur: (json['valeur'] as num).toDouble(),
        statut: json['statut'] as String,
        positionPct: (json['positionPct'] as num).toDouble(),
      );
}

class RepartitionJour {
  final double der;
  final List<Repas> repas;
  final double totalKcal;
  final List<RationStatut> statuts;
  final List<String> avertissements;

  RepartitionJour({
    required this.der,
    required this.repas,
    required this.totalKcal,
    required this.statuts,
    required this.avertissements,
  });

  factory RepartitionJour.fromJson(Map<String, dynamic> json) {
    final ration = json['ration'] as Map<String, dynamic>;
    return RepartitionJour(
      der: (json['der'] as num).toDouble(),
      repas: (json['repas'] as List).map((e) => Repas.fromJson(e as Map<String, dynamic>)).toList(),
      totalKcal: (ration['totalKcal'] as num).toDouble(),
      statuts: (ration['statuts'] as List).map((e) => RationStatut.fromJson(e as Map<String, dynamic>)).toList(),
      avertissements: (json['avertissements'] as List? ?? []).map((e) => e.toString()).toList(),
    );
  }

  /// Prochain repas non "donné", pour le widget d'écran d'accueil et les rappels.
  Repas? get prochainRepas {
    final aVenir = repas.where((r) => !r.validated).toList()..sort((a, b) => a.consumedAt.compareTo(b.consumedAt));
    return aVenir.isEmpty ? null : aVenir.first;
  }
}
