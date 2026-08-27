class JourAnalyse {
  final String date;
  final double totalKcal;
  final double der;
  final double pctDER;
  final String statut; // OK | DEFICIT | EXCES | SANS_DONNEE

  JourAnalyse({required this.date, required this.totalKcal, required this.der, required this.pctDER, required this.statut});

  factory JourAnalyse.fromJson(Map<String, dynamic> json) => JourAnalyse(
        date: json['date'] as String,
        totalKcal: (json['totalKcal'] as num).toDouble(),
        der: (json['der'] as num).toDouble(),
        pctDER: (json['pctDER'] as num).toDouble(),
        statut: json['statut'] as String,
      );
}

/// Tout est déjà calculé côté serveur (`analyse.calc.ts`/`analyse.service.ts`) — jours, moyennes,
/// taux de conformité : jamais ré-agrégés côté mobile.
class Analyse {
  final double rer;
  final double der;
  final List<JourAnalyse> jours;
  final double? moyennePctDER;
  final double? tauxConformitePct;

  Analyse({required this.rer, required this.der, required this.jours, required this.moyennePctDER, required this.tauxConformitePct});

  factory Analyse.fromJson(Map<String, dynamic> json) => Analyse(
        rer: (json['rer'] as num).toDouble(),
        der: (json['der'] as num).toDouble(),
        jours: (json['jours'] as List).map((e) => JourAnalyse.fromJson(e as Map<String, dynamic>)).toList(),
        moyennePctDER: (json['moyennePctDER'] as num?)?.toDouble(),
        tauxConformitePct: (json['tauxConformitePct'] as num?)?.toDouble(),
      );
}
