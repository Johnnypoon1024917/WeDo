import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct SimpleEntry: TimelineEntry {
    let date: Date
    let daysTogether: Int
    let hasData: Bool
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), daysTogether: 0, hasData: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        let entry = buildEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let currentDate = Date()
        let entry = buildEntry(date: currentDate)

        // Schedule next refresh at midnight
        let calendar = Calendar.current
        let nextMidnight = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)

        let timeline = Timeline(entries: [entry], policy: .after(nextMidnight))
        completion(timeline)
    }

    private func buildEntry(date: Date) -> SimpleEntry {
        let defaults = UserDefaults(suiteName: "group.com.wedo.app")
        guard let startDateString = defaults?.string(forKey: "startDate"),
              let startDate = ISO8601DateFormatter().date(from: startDateString) ?? parseSimpleDate(startDateString) else {
            return SimpleEntry(date: date, daysTogether: 0, hasData: false)
        }

        let days = Calendar.current.dateComponents([.day], from: startDate, to: date).day ?? 0
        return SimpleEntry(date: date, daysTogether: max(0, days), hasData: true)
    }

    /// Parses a simple "yyyy-MM-dd" date string as a fallback.
    private func parseSimpleDate(_ string: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: string)
    }
}


// MARK: - Widget View

struct WeDoDaysWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        if entry.hasData {
            VStack(spacing: 4) {
                Text("❤️")
                    .font(.title2)
                Text("\(entry.daysTogether)")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                Text("Days Together")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        } else {
            VStack(spacing: 8) {
                Text("❤️")
                    .font(.title2)
                Text("Open WeDo")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }
}

// MARK: - Widget Configuration

@main
struct WeDoDaysWidget: Widget {
    let kind: String = "WeDoDaysWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WeDoDaysWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Days Together")
        .description("See how many days you've been together.")
        .supportedFamilies([.systemSmall])
    }
}
