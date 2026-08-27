import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_client.dart';
import 'core/selected_cat_store.dart';
import 'core/theme.dart';
import 'core/models/cat.dart';
import 'features/analyse/analyse_screen.dart';
import 'features/analyse/analyse_service.dart';
import 'features/auth/auth_service.dart';
import 'features/auth/login_screen.dart';
import 'features/cats/cats_service.dart';
import 'features/cats/cats_screen.dart';
import 'features/foods/foods_screen.dart';
import 'features/foods/foods_service.dart';
import 'features/today/today_service.dart';
import 'features/today/today_screen.dart';
import 'notifications/local_notifications_service.dart';
import 'widget/home_widget_service.dart';

void main() {
  runApp(const CrystalMiaouApp());
}

class CrystalMiaouApp extends StatelessWidget {
  const CrystalMiaouApp({super.key});

  @override
  Widget build(BuildContext context) {
    final api = ApiClient();
    final homeWidget = HomeWidgetService();
    final notifications = LocalNotificationsService();

    return MultiProvider(
      providers: [
        Provider.value(value: api),
        Provider.value(value: notifications),
        Provider(create: (_) => SelectedCatStore()),
        ChangeNotifierProvider(create: (_) => AuthService(api)..bootstrap()),
        ChangeNotifierProvider(create: (_) => CatsService(api)),
        ChangeNotifierProvider(create: (_) => TodayService(api, homeWidget)),
        ChangeNotifierProvider(create: (_) => FoodsService(api)),
        ChangeNotifierProvider(create: (_) => AnalyseService(api)),
      ],
      child: MaterialApp(
        title: 'Crystal Miaou',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        home: const _RootGate(),
      ),
    );
  }
}

class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    if (!auth.checkedStoredToken) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return auth.isAuthenticated ? const HomeShell() : const LoginScreen();
  }
}

/// Coquille avec navigation basse (Aujourd'hui / Mes chats) — pas de copie des layouts .svelte,
/// composants Flutter propres comme demandé dans CLAUDE.md.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  Cat? _selectedCat;
  bool _restoring = true;

  @override
  void initState() {
    super.initState();
    context.read<LocalNotificationsService>().init();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrapCats());
  }

  Future<void> _bootstrapCats() async {
    final catsService = context.read<CatsService>();
    await catsService.load();
    if (!mounted) return;

    final store = context.read<SelectedCatStore>();
    final storedId = await store.read();
    final cats = catsService.cats;

    Cat? restored;
    if (storedId != null) {
      for (final cat in cats) {
        if (cat.id == storedId) restored = cat;
      }
    }
    restored ??= cats.length == 1 ? cats.first : null;

    if (!mounted) return;
    setState(() {
      _selectedCat = restored;
      _restoring = false;
    });

    if (restored != null) {
      unawaited(_syncNotificationsFor(restored));
    }
  }

  Future<void> _syncNotificationsFor(Cat cat) async {
    await context.read<LocalNotificationsService>().syncFromActivePlan(
          context.read<ApiClient>(),
          cat.id,
          cat.name,
        );
  }

  void _selectCat(Cat cat) {
    setState(() {
      _selectedCat = cat;
      _tab = 0;
    });
    unawaited(context.read<SelectedCatStore>().write(cat.id));
    unawaited(_syncNotificationsFor(cat));
  }

  @override
  Widget build(BuildContext context) {
    final cats = context.watch<CatsService>().cats;

    final pages = [
      _restoring
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : _selectedCat == null
              ? const _PickCatPrompt()
              : TodayScreen(cat: _selectedCat!, allCats: cats, onSwitchCat: _selectCat),
      CatsScreen(onSelectCat: _selectCat),
      const FoodsScreen(),
      _selectedCat == null ? const _PickCatPrompt() : AnalyseScreen(cat: _selectedCat!),
    ];

    return Scaffold(
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today), label: 'Aujourd\'hui'),
          NavigationDestination(icon: Icon(Icons.pets), label: 'Mes chats'),
          NavigationDestination(icon: Icon(Icons.set_meal), label: 'Aliments'),
          NavigationDestination(icon: Icon(Icons.insights), label: 'Analyse'),
        ],
      ),
    );
  }
}

class _PickCatPrompt extends StatelessWidget {
  const _PickCatPrompt();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Choisis un chat dans l\'onglet "Mes chats"')),
    );
  }
}
