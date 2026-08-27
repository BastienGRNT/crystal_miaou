class WeightLogEntry {
  final String id;
  final double weightKg;
  final String recordedAt; // ISO date (YYYY-MM-DD)

  WeightLogEntry({required this.id, required this.weightKg, required this.recordedAt});

  factory WeightLogEntry.fromJson(Map<String, dynamic> json) => WeightLogEntry(
        id: json['id'] as String,
        weightKg: (json['weightKg'] as num).toDouble(),
        recordedAt: json['recordedAt'] as String,
      );
}

/// Tendance déjà calculée côté serveur (`evaluerTendancePoids`, `catWeight.calc.ts`) — jamais
/// recalculée ici, seulement affichée.
class WeightTrendEvaluation {
  final String? tendance; // HAUSSE | BAISSE | STABLE | null
  final double? pctVariation;
  final int? joursCouverts;
  final String? suggestion;

  WeightTrendEvaluation({
    required this.tendance,
    required this.pctVariation,
    required this.joursCouverts,
    required this.suggestion,
  });

  factory WeightTrendEvaluation.fromJson(Map<String, dynamic> json) => WeightTrendEvaluation(
        tendance: json['tendance'] as String?,
        pctVariation: (json['pctVariation'] as num?)?.toDouble(),
        joursCouverts: (json['joursCouverts'] as num?)?.toInt(),
        suggestion: json['suggestion'] as String?,
      );
}
