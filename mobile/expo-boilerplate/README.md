# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Running on iOS Simulator

### Prerequisites

1. **Install Xcode** (if not already installed):
   - Download from the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or [Apple Developer](https://developer.apple.com/xcode/)
   - Open Xcode and accept the license agreement
   - Install additional components when prompted (Command Line Tools, iOS Simulator, etc.)

2. **Install CocoaPods** (required for iOS dependencies):
   ```bash
   sudo gem install cocoapods
   ```

3. **Install project dependencies**:
   ```bash
   npm install
   # or if using yarn (as specified in package.json):
   yarn install
   ```

### Running the App

#### Option 1: Direct Native Build (Like React Native CLI) ⭐ Recommended

Run the app directly on iOS Simulator **without Expo Go**, similar to React Native CLI:

```bash
npx expo run:ios
```

This command will:
- Generate the native iOS project (if it doesn't exist)
- Install CocoaPods dependencies
- Build the native iOS app
- Launch it on the iOS Simulator
- Start the Metro bundler automatically

**First time setup:**
- The first run will take longer as it generates the `ios/` folder and builds the native project
- Subsequent runs will be faster

**Select a specific simulator:**
```bash
npx expo run:ios --device "iPhone 15 Pro"
```

**List available simulators:**
```bash
xcrun simctl list devices
```

#### Option 2: Using Expo Go (Quick Testing)

For quick testing with Expo Go (limited features):

1. Start the Expo development server:
   ```bash
   npm run ios
   # or
   yarn ios
   # or
   npx expo start --ios
   ```

2. This will:
   - Start the Metro bundler
   - Automatically open the iOS Simulator
   - Launch Expo Go (if installed) or prompt you to install it

**Note:** Expo Go has limitations and doesn't support all native modules. For full functionality, use Option 1.

#### Option 3: Manual Steps with Expo Go

1. Start the Expo development server:
   ```bash
   npm start
   # or
   yarn start
   # or
   npx expo start
   ```

2. In the terminal, press `i` to open iOS Simulator, or scan the QR code with Expo Go app

3. If the simulator doesn't open automatically:
   - Open Xcode
   - Go to **Xcode → Open Developer Tool → Simulator**
   - Or use Spotlight search (⌘ + Space) and type "Simulator"

### Troubleshooting

- **"xcrun: error: unable to find utility 'simctl'"**: Make sure Xcode Command Line Tools are installed:
  ```bash
  xcode-select --install
  ```

- **"No simulator found"**: List available simulators:
  ```bash
  xcrun simctl list devices
  ```

- **Build errors**: Try cleaning the build:
  ```bash
  npx expo run:ios --clean
  ```

- **Metro bundler issues**: Reset the cache:
  ```bash
  npx expo start --clear
  ```

### Opening in Xcode (for advanced native development)

If you need to open the project in Xcode for native iOS development or debugging:

1. Generate the native iOS project (if not already generated):
   ```bash
   npx expo prebuild --platform ios
   ```
   Or simply run `npx expo run:ios` once, which will generate it automatically.

2. Open the project in Xcode:
   ```bash
   open ios/expo-boilerplate.xcworkspace
   ```
   **Note:** Always open the `.xcworkspace` file, not the `.xcodeproj` file (CocoaPods requirement).

3. Select a simulator from the device dropdown in Xcode
4. Click the Run button (▶️) or press `⌘ + R`

**Tip:** For most development, `npx expo run:ios` is sufficient. Only use Xcode when you need to:
- Debug native iOS code
- Modify native iOS configuration
- Add custom native modules
- Configure signing and certificates manually

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
