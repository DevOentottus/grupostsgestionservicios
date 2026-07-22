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
  if (!("PushManager" in window)) throw new Error("PushManager no está disponible en este navegador");
  if (!VAPID_PUBLIC_KEY) throw new Error("Falta la clave VAPID pública. Configurá VITE_VAPID_PUBLIC_KEY en .env");

  const reg = await registerServiceWorker();
  if (!reg) throw new Error("No se pudo registrar el Service Worker. Verificá que /sw.js exista.");

  try {
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }

    const subJSON = subscription.toJSON();
    if (!subJSON.endpoint) throw new Error("La suscripción push no tiene endpoint");

    const url = `${API_BASE}/api/push/subscribe`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dni,
        endpoint: subJSON.endpoint,
        p256dh_key: subJSON.keys?.p256dh || "",
        auth_key: subJSON.keys?.auth || "",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Error del servidor (${res.status}): ${text || res.statusText}`);
    }

    return true;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Error desconocido al activar notificaciones");
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
