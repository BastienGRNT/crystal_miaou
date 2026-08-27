class Cat {
  final String id;
  final String name;
  final double weightKg;
  final String? birthDate;
  final String sex;
  final bool sterilized;
  final String activityLevel;
  final bool hasOutdoorAccess;
  final String? specialCondition;
  final int derAjustementPct;
  final String? activeCroquetteFoodId;
  final String? activePateeFoodId;
  final String? activeFriandiseFoodId;
  final double? friandiseQuantiteTotaleG;

  Cat({
    required this.id,
    required this.name,
    required this.weightKg,
    required this.birthDate,
    required this.sex,
    required this.sterilized,
    required this.activityLevel,
    required this.hasOutdoorAccess,
    required this.specialCondition,
    required this.derAjustementPct,
    required this.activeCroquetteFoodId,
    required this.activePateeFoodId,
    required this.activeFriandiseFoodId,
    required this.friandiseQuantiteTotaleG,
  });

  factory Cat.fromJson(Map<String, dynamic> json) => Cat(
        id: json['id'] as String,
        name: json['name'] as String,
        weightKg: (json['weightKg'] as num).toDouble(),
        birthDate: json['birthDate'] as String?,
        sex: json['sex'] as String,
        sterilized: json['sterilized'] as bool,
        activityLevel: json['activityLevel'] as String,
        hasOutdoorAccess: json['hasOutdoorAccess'] as bool,
        specialCondition: json['specialCondition'] as String?,
        derAjustementPct: (json['derAjustementPct'] as num?)?.toInt() ?? 0,
        activeCroquetteFoodId: json['activeCroquetteFoodId'] as String?,
        activePateeFoodId: json['activePateeFoodId'] as String?,
        activeFriandiseFoodId: json['activeFriandiseFoodId'] as String?,
        friandiseQuantiteTotaleG: (json['friandiseQuantiteTotaleG'] as num?)?.toDouble(),
      );
}
