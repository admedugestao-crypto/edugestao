import { Capacitor, registerPlugin } from "@capacitor/core";

interface NativePrintPlugin {
  print(): Promise<void>;
}

const nativePrint = registerPlugin<NativePrintPlugin>("NativePrint");

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function printDocument(): Promise<void> {
  if (!isNativeApp()) {
    window.print();
    return;
  }

  if (!Capacitor.isPluginAvailable("NativePrint")) {
    throw new Error("Atualize o aplicativo para usar a impressão de recibos.");
  }

  await document.fonts.ready;
  await nativePrint.print();
}
