class FoodRef {
  final String id;
  final String name;
  final String? brand;
  final double? packageSizeG;
  final double? doseDistributeurG;

  FoodRef({required this.id, required this.name, this.brand, this.packageSizeG, this.doseDistributeurG});

  factory FoodRef.fromJson(Map<String, dynamic> json) => FoodRef(
        id: json['id'] as String,
        name: json['name'] as String,
        brand: json['brand'] as String?,
        packageSizeG: (json['packageSizeG'] as num?)?.toDouble(),
        doseDistributeurG: (json['doseDistributeurG'] as num?)?.toDouble(),
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
  // Nombre de doses du distributeur automatique que représente `quantiteG` — déjà calculé côté API
  // (repartition.service.ts) pour que web et mobile affichent toujours la même valeur : ne jamais
  // recalculer cette division ici, seulement l'afficher.
  final int? doses;

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
    required this.doses,
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
        doses: (json['doses'] as num?)?.toInt(),
      );
}

/// Récapitulatif des grammes de croquette du jour par "qui s'en charge", déjà agrégé côté API — le
/// distributeur automatique est chargé pour tout le mois (rien à préparer), une gamelle demande de
/// peser la portion du jour à la main. Ne jamais ré-agréger `repas` ici : cette somme doit rester
/// identique à celle affichée côté web (specs/nutrition-spec.md "API-first, une seule source de vérité").
class RecapDistributionCroquette {
  final double distributeurAutomatiqueG;
  final double aPreparerG;

  RecapDistributionCroquette({required this.distributeurAutomatiqueG, required this.aPreparerG});

  factory RecapDistributionCroquette.fromJson(Map<String, dynamic> json) => RecapDistributionCroquette(
        distributeurAutomatiqueG: (json['distributeurAutomatiqueG'] as num).toDouble(),
        aPreparerG: (json['aPreparerG'] as num).toDouble(),
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
  final RecapDistributionCroquette? recapCroquette;
  final double totalKcal;
  final List<RationStatut> statuts;
  final List<String> avertissements;

  RepartitionJour({
    required this.der,
    required this.repas,
    required this.recapCroquette,
    required this.totalKcal,
    required this.statuts,
    required this.avertissements,
  });

  factory RepartitionJour.fromJson(Map<String, dynamic> json) {
    final ration = json['ration'] as Map<String, dynamic>;
    return RepartitionJour(
      der: (json['der'] as num).toDouble(),
      repas: (json['repas'] as List).map((e) => Repas.fromJson(e as Map<String, dynamic>)).toList(),
      recapCroquette: json['recapCroquette'] == null
          ? null
          : RecapDistributionCroquette.fromJson(json['recapCroquette'] as Map<String, dynamic>),
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
