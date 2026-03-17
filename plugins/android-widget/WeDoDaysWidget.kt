package com.anonymous.wedo

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import java.time.LocalDate
import java.time.temporal.ChronoUnit

class WeDoDaysWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        updateWidgets(context, appWidgetManager, appWidgetIds)
    }

    companion object {
        fun updateWidgets(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetIds: IntArray
        ) {
            val prefs = context.getSharedPreferences(
                WidgetBridgeModule.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val startDateStr = prefs.getString(WidgetBridgeModule.KEY_START_DATE, null)
            val isPremium = prefs.getBoolean(WidgetBridgeModule.KEY_IS_PREMIUM, false)

            for (appWidgetId in appWidgetIds) {
                val views = RemoteViews(context.packageName, R.layout.widget_days_together)

                if (startDateStr != null) {
                    try {
                        val startDate = LocalDate.parse(startDateStr)
                        val today = LocalDate.now()
                        val days = ChronoUnit.DAYS.between(startDate, today).coerceAtLeast(0)

                        views.setTextViewText(R.id.widget_days_count, "$days")
                        views.setTextViewText(R.id.widget_days_label, "Days Together")
                    } catch (e: Exception) {
                        views.setTextViewText(R.id.widget_days_count, "—")
                        views.setTextViewText(R.id.widget_days_label, "Open WeDo to start")
                    }
                } else {
                    views.setTextViewText(R.id.widget_days_count, "❤️")
                    views.setTextViewText(R.id.widget_days_label, "Open WeDo to get started")
                }

                // Apply premium theme colors
                if (isPremium) {
                    views.setInt(R.id.widget_background, "setBackgroundColor", 0xFFFF7F50.toInt())
                    views.setTextColor(R.id.widget_days_count, 0xFFFFFFFF.toInt())
                    views.setTextColor(R.id.widget_days_label, 0xCCFFFFFF.toInt())
                    views.setTextColor(R.id.widget_heart, 0xFFFFFFFF.toInt())
                } else {
                    views.setInt(R.id.widget_background, "setBackgroundColor", 0xFF121212.toInt())
                    views.setTextColor(R.id.widget_days_count, 0xFFFF7F50.toInt())
                    views.setTextColor(R.id.widget_days_label, 0x99FFFFFF.toInt())
                    views.setTextColor(R.id.widget_heart, 0xFFFFFFFF.toInt())
                }

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }
}
