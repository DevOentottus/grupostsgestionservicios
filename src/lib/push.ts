const API_BASE = import.meta.env.VITE_API_URL || "";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export async function subscribeToPush(dni: string): Promise<boolean> {
  if (!("PushManager" in window) || !VAPID_PUBLIC_KEY) return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  try {
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJSON = subscription.toJSON();
    if (!subJSON.endpoint) return false;

    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dni,
        endpoint: subJSON.endpoint,
        p256dh_key: subJSON.keys?.p256dh || "",
        auth_key: subJSON.keys?.auth || "",
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      // Notificar al backend
      await fetch(`${API_BASE}/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "DELETE",
      });
    }
  } catch {
    // Silencioso
  }
}

// Convierte una clave VAPID base64 estándar a Uint8Array (requerido por pushManager.subscribe)
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}
