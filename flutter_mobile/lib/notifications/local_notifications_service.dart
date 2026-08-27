import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;
import '../core/api_client.dart';

/// Rappels de repas 100% locaux, planifiés depuis les créneaux de la routine active — aucun
/// broker/FCM, aucun serveur de push : conforme à la demande "système de notification maison".
class LocalNotificationsService {
  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    tz_data.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Europe/Paris'));

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(const InitializationSettings(android: androidInit));

    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();
    await androidPlugin?.requestExactAlarmsPermission();
    _initialized = true;
  }

  /// Reprogramme tous les rappels à partir de la routine active d'un chat. Idempotent : annule
  /// d'abord tout ce qui a été planifié pour ce chat avant de reposer les nouveaux créneaux.
  Future<void> syncFromActivePlan(ApiClient api, String catId, String catName) async {
    await init();
    await _cancelForCat(catId);

    final json = await api.get('/api/daily-plans', query: {'catId': catId});
    final plans = (json as Map<String, dynamic>)['dailyPlans'] as List;
    final active = plans.cast<Map<String, dynamic>>().where((p) => p['isActive'] == true);
    if (active.isEmpty) return;

    final slots = (active.first['slots'] as List).cast<Map<String, dynamic>>();
    for (final slot in slots) {
      final timeOfDay = slot['timeOfDay'] as String; // "HH:MM"
      final parts = timeOfDay.split(':');
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);
      final id = _notificationId(catId, timeOfDay);
      await _scheduleDaily(
        id: id,
        title: 'C\'est l\'heure de nourrir $catName',
        body: 'Créneau de $timeOfDay — ${slot['foodType']}',
        hour: hour,
        minute: minute,
      );
    }
  }

  Future<void> _scheduleDaily({
    required int id,
    required String title,
    required String body,
    required int hour,
    required int minute,
  }) async {
    await _plugin.zonedSchedule(
      id,
      title,
      body,
      _nextInstanceOf(hour, minute),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'meal_reminders',
          'Rappels de repas',
          channelDescription: 'Rappels locaux basés sur la routine active du chat',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  tz.TZDateTime _nextInstanceOf(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }

  Future<void> _cancelForCat(String catId) async {
    final catPart = (catId.hashCode % 100000).abs();
    final pending = await _plugin.pendingNotificationRequests();
    for (final n in pending) {
      if (n.id ~/ 10000 == catPart) {
        await _plugin.cancel(n.id);
      }
    }
  }

  int _notificationId(String catId, String timeOfDay) {
    final catPart = (catId.hashCode % 100000).abs();
    final timePart = int.parse(timeOfDay.replaceAll(':', ''));
    return catPart * 10000 + (timePart % 10000);
  }
}
