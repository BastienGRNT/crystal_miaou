class DailyPlanSlot {
  final String id;
  final String timeOfDay; // HH:MM
  final String foodType; // croquette | patee | friandise
  final String distributionMode; // gamelle | distributeur_automatique | gamelle_ludique

  DailyPlanSlot({required this.id, required this.timeOfDay, required this.foodType, required this.distributionMode});

  factory DailyPlanSlot.fromJson(Map<String, dynamic> json) => DailyPlanSlot(
        id: json['id'] as String,
        timeOfDay: json['timeOfDay'] as String,
        foodType: json['foodType'] as String,
        distributionMode: json['distributionMode'] as String,
      );

  Map<String, dynamic> toJson() => {
        'timeOfDay': timeOfDay,
        'foodType': foodType,
        'distributionMode': distributionMode,
      };
}

class DailyPlan {
  final String id;
  final String catId;
  final String name;
  final bool isActive;
  final List<DailyPlanSlot> slots;

  DailyPlan({required this.id, required this.catId, required this.name, required this.isActive, required this.slots});

  factory DailyPlan.fromJson(Map<String, dynamic> json) => DailyPlan(
        id: json['id'] as String,
        catId: json['catId'] as String,
        name: json['name'] as String,
        isActive: json['isActive'] as bool,
        slots: (json['slots'] as List).map((e) => DailyPlanSlot.fromJson(e as Map<String, dynamic>)).toList(),
      );
}
