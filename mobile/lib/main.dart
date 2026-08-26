import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_client.dart';
import 'core/theme.dart';
import 'core/models/cat.dart';
import 'features/auth/auth_service.dart';
import 'features/auth/login_screen.dart';
import 'features/cats/cats_service.dart';
import 'features/cats/cats_screen.dart';
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
        ChangeNotifierProvider(create: (_) => AuthService(api)..bootstrap()),
        ChangeNotifierProvider(create: (_) => CatsService(api)),
        ChangeNotifierProvider(create: (_) => TodayService(api, homeWidget)),
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

  @override
  Widget build(BuildContext context) {
    final pages = [
      _selectedCat == null
          ? const _PickCatPrompt()
          : TodayScreen(cat: _selectedCat!),
      CatsScreen(onSelectCat: (cat) {
        setState(() {
          _selectedCat = cat;
          _tab = 0;
        });
        context.read<LocalNotificationsService>().syncFromActivePlan(
              context.read<ApiClient>(),
              cat.id,
              cat.name,
            );
      }),
    ];

    return Scaffold(
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today), label: 'Aujourd\'hui'),
          NavigationDestination(icon: Icon(Icons.pets), label: 'Mes chats'),
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
