import SwiftUI

/// Reusable primary button. Feature screens use this instead of restyling buttons ad hoc.
public struct PrimaryButton: View {
    private let title: String
    private let action: () -> Void

    public init(_ title: String, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(AppColor.primary)
    }
}
