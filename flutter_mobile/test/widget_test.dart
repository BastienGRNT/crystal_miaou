import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:crystal_miaou/main.dart';

void main() {
  testWidgets('App boots and shows the login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const CrystalMiaouApp());
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
