import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.brownglobal.learn",
  appName: "Learn",
  webDir: "dist",
  ios: { contentInset: "automatic" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 800, launchAutoHide: false, backgroundColor: "#0E9F85", showSpinner: false },
    StatusBar: { style: "LIGHT", backgroundColor: "#0E9F85" },
    Keyboard: { resize: "body", resizeOnFullScreen: true },
  },
};

export default config;
