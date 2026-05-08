import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

/** Marca `html[data-keyboard=open]`: footer sigue fixed, se mueve fuera de vista con transform (rápido con Will*, respaldo Did*). */
export default function NativeKeyboardBindings() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const open = () => document.documentElement.setAttribute("data-keyboard", "open");
    const close = () => document.documentElement.removeAttribute("data-keyboard");

    let cancelled = false;
    let handles: PluginListenerHandle[] = [];

    void (async () => {
      const subs = await Promise.all([
        Keyboard.addListener("keyboardWillShow", open),
        Keyboard.addListener("keyboardDidShow", open),
        Keyboard.addListener("keyboardWillHide", close),
        Keyboard.addListener("keyboardDidHide", close),
      ]);
      if (cancelled) subs.forEach((h) => void h.remove());
      else handles = subs;
    })();

    return () => {
      cancelled = true;
      document.documentElement.removeAttribute("data-keyboard");
      handles.forEach((h) => void h.remove());
    };
  }, []);

  return null;
}
