import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export const isNativeApp = Capacitor.isNativePlatform();

function routeFromNativeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const isWebLink = url.protocol === "http:" || url.protocol === "https:";
    const path = isWebLink
      ? `${url.pathname}${url.search}${url.hash}`
      : `/${url.host}${url.pathname}${url.search}${url.hash}`;

    if (path && path !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  } catch {
    // Ignore links that are not valid URLs.
  }
}

export async function initializeMobileApp() {
  if (!isNativeApp) return;

  const platform = Capacitor.getPlatform();
  document.documentElement.classList.add("capacitor-native", `capacitor-${platform}`);

  await StatusBar.setStyle({ style: Style.Light });
  if (platform === "android") {
    await StatusBar.setBackgroundColor({ color: "#0E9F85" });
  }

  await NativeApp.addListener("appUrlOpen", ({ url }) => routeFromNativeUrl(url));
  await Keyboard.addListener("keyboardWillShow", () => {
    document.documentElement.classList.add("keyboard-open");
  });
  await Keyboard.addListener("keyboardWillHide", () => {
    document.documentElement.classList.remove("keyboard-open");
  });

  await SplashScreen.hide();
}
