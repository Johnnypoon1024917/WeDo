package com.anonymous.wedo

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetBridge"

    companion object {
        const val PREFS_NAME = "com.anonymous.wedo.widget"
        const val KEY_START_DATE = "startDate"
        const val KEY_IS_PREMIUM = "isPremium"
    }

    @ReactMethod
    fun setWidgetData(startDate: String, isPremium: Boolean, promise: Promise) {
        try {
            val prefs = reactApplicationContext
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString(KEY_START_DATE, startDate)
                .putBoolean(KEY_IS_PREMIUM, isPremium)
                .apply()

            // Trigger widget refresh
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            val widgetComponent = ComponentName(reactApplicationContext, WeDoDaysWidget::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            if (widgetIds.isNotEmpty()) {
                WeDoDaysWidget.updateWidgets(reactApplicationContext, appWidgetManager, widgetIds)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_WIDGET", "Failed to update widget data", e)
        }
    }
}
