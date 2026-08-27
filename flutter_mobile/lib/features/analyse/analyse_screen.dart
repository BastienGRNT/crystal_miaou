import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/models/analyse.dart';
import '../../core/models/cat.dart';
import '../../core/theme.dart';
import 'analyse_service.dart';

const _periodes = [7, 14, 30, 90];

class AnalyseScreen extends StatefulWidget {
  const AnalyseScreen({super.key, required this.cat});

  final Cat cat;

  @override
  State<AnalyseScreen> createState() => _AnalyseScreenState();
}

class _AnalyseScreenState extends State<AnalyseScreen> {
  int _days = 14;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void didUpdateWidget(covariant AnalyseScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.cat.id != widget.cat.id) _load();
  }

  void _load() => context.read<AnalyseService>().load(widget.cat.id, days: _days);

  Color _statutColor(String statut) => switch (statut) {
        'DEFICIT' => AppColors.warning,
        'EXCES' => AppColors.destructive,
        'OK' => AppColors.success,
        _ => AppColors.mutedForeground,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Analyse — ${widget.cat.name}')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 8,
              children: _periodes
                  .map((p) => ChoiceChip(
                        label: Text('$p jours'),
                        selected: _days == p,
                        onSelected: (_) {
                          setState(() => _days = p);
                          _load();
                        },
                      ))
                  .toList(),
            ),
          ),
          Expanded(
            child: Consumer<AnalyseService>(
              builder: (context, service, _) {
                if (service.loading && service.analyse == null) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (service.error != null) {
                  return Center(child: Text(service.error!, style: const TextStyle(color: AppColors.destructive)));
                }
                final analyse = service.analyse;
                if (analyse == null) return const SizedBox.shrink();

                return ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('DER : ${analyse.der.toStringAsFixed(0)} kcal', style: Theme.of(context).textTheme.titleMedium),
                            if (analyse.moyennePctDER != null)
                              Text('Moyenne : ${analyse.moyennePctDER!.toStringAsFixed(0)}% du DER'),
                            if (analyse.tauxConformitePct != null)
                              Text('Conformité : ${analyse.tauxConformitePct!.toStringAsFixed(0)}% des jours'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (final JourAnalyse jour in analyse.jours.reversed)
                      Card(
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListTile(
                          title: Text(jour.date),
                          subtitle: Text('${jour.totalKcal.toStringAsFixed(0)} kcal (${jour.pctDER.toStringAsFixed(0)}% DER)'),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _statutColor(jour.statut).withValues(alpha: 0.16),
                              borderRadius: BorderRadius.circular(AppRadius.full),
                            ),
                            child: Text(jour.statut, style: TextStyle(color: _statutColor(jour.statut), fontSize: 12)),
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
