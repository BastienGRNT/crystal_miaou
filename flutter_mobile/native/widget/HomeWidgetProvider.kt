package com.crystalmiaou.crystal_miaou

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetPlugin

/**
 * Widget d'écran d'accueil personnalisé — affiche le prochain repas non "donné".
 * Ne fait AUCUN appel réseau : il lit uniquement les SharedPreferences écrites par
 * HomeWidgetService (Dart) via le package `home_widget` à chaque sync de l'app.
 */
class HomeWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val prefs = HomeWidgetPlugin.getData(context)
        val title = prefs.getString("next_meal_title", "Ouvrir Crystal Miaou")
        val subtitle = prefs.getString("next_meal_subtitle", "")

        for (widgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.home_widget_layout)
            views.setTextViewText(R.id.widget_title, title)
            views.setTextViewText(R.id.widget_subtitle, subtitle)
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
