import SwiftUI

/// Design tokens for the app. Features consume these instead of hardcoding colors/spacing.
/// Cross-platform colors (no UIKit) so the package builds on the host too.
public enum AppColor {
    public static let primary = Color(red: 0.40, green: 0.31, blue: 0.64)
    public static let background = Color(white: 0.98)
}

public enum AppSpacing {
    public static let screen: CGFloat = 16
}

public extension View {
    /// Paints the screen background from the theme. Wrap a screen's root in this.
    func screenBackground() -> some View {
        frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppColor.background.ignoresSafeArea())
    }
}
