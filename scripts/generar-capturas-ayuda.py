#!/usr/bin/env python3
"""
Generador automatico de capturas de pantalla para el manual de ayuda
de ServicioLocalSTS.

Requisitos:
  pip install playwright
  playwright install chromium

Uso:
  python scripts/generar-capturas-ayuda.py [--url URL] [--output DIR]

Ejemplos:
  python scripts/generar-capturas-ayuda.py --url https://serviciolocalsts.vercel.app
  python scripts/generar-capturas-ayuda.py --url http://localhost:5173
  python scripts/generar-capturas-ayuda.py --output public/help
"""

import argparse
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

# --- Config ----------------------------------------------------------------

DEFAULT_URL = "https://serviciolocalsts.vercel.app"
DEFAULT_OUTPUT = "public/help"
VIEWPORT = {"width": 1920, "height": 1080}
NAV_TIMEOUT = 30000

# Credenciales conocidas
USERS = {
    "admin":      {"username": "admin",        "password": "admin123",   "rol": "admin"},
    "sistema":    {"username": "sistema",      "password": "sistema2026","rol": "sistema"},
    "encargado":  {"username": "carlos.garcia","password": "admin123",   "rol": "encargado"},
    "colaborador":{"username": "ana.martinez", "password": "admin123",   "rol": "colaborador"},
}

# --- Rutas por rol ---------------------------------------------------------

ROUTES = {
    "admin": [
        "/dashboard", "/servicios", "/servicios/nuevo",
        "/areas", "/plantillas", "/reportes",
        "/comunicaciones", "/admin/rendimiento", "/auditoria",
        "/manager/clientes", "/manager/desempeno",
    ],
    "sistema": [
        "/dashboard", "/servicios", "/servicios/nuevo",
        "/usuarios", "/areas", "/plantillas",
        "/comunicaciones", "/admin/rendimiento",
        "/manager/clientes", "/manager/desempeno",
    ],
    "encargado": [
        "/miarea", "/servicios", "/servicios/nuevo",
        "/plantillas", "/reportes",
        "/comunicaciones", "/manager/desempeno",
    ],
    "colaborador": [
        "/miarea", "/servicios", "/servicios/nuevo",
        "/plantillas", "/comunicaciones",
    ],
}

# --- Helpers ---------------------------------------------------------------

def slug(path: str) -> str:
    """Convierte /ruta/a/algo en ruta-a-algo"""
    return path.strip("/").replace("/", "-") or "inicio"


def screenshot(page: Page, output_dir: Path, name: str):
    filepath = output_dir / f"{name}.png"
    page.screenshot(path=str(filepath), full_page=True)
    print(f"  [IMG] {name}.png")


def login_via_api(page: Page, base_url: str, username: str, password: str):
    """Autentica via API directa y setea sessionStorage (como hace React).
    Devuelve el rol real asignado en la DB."""
    print(f"\n[AUTH] Login como '{username}'...")

    result = page.evaluate("""async ({ url, username, password }) => {
        try {
            const resp = await fetch(url + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!resp.ok) return { error: 'HTTP ' + resp.status };

            const json = await resp.json();
            const token = json.data.token;
            const user = json.data.user;

            sessionStorage.setItem('auth_token', token);
            sessionStorage.setItem('auth_user', JSON.stringify(user));
            return { ok: true, rol: user.rol, nombres: user.nombres };
        } catch (e) {
            return { error: String(e) };
        }
    }""", {"url": base_url.rstrip("/"), "username": username, "password": password})

    if result.get("error"):
        print(f"  [ERR] Login fallo: {result['error']}")
        return None
    print(f"  [OK] Autenticado como {result['nombres']} (rol real: {result['rol']})")
    return result["rol"]


def navigate_and_capture(page: Page, base_url: str, output_dir: Path, paths: list[str],
                          prefix: str = ""):
    """Navega cada ruta y captura screenshot."""
    for path in paths:
        full_url = base_url.rstrip("/") + path
        name = f"{prefix}-{slug(path)}" if prefix else slug(path)
        print(f"\n  [NAV] {path}")

        try:
            page.goto(full_url, timeout=NAV_TIMEOUT)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            screenshot(page, output_dir, name)
        except Exception as e:
            print(f"  [ERR] {path}: {e}")


# --- Main ------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generar capturas de ayuda para ServicioLocalSTS")
    parser.add_argument("--url", default=DEFAULT_URL, help="URL base de la app")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Directorio de salida")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("  [CAM] Generador de capturas - ServicioLocalSTS")
    print(f"  URL:    {base_url}")
    print(f"  Output: {output_dir.resolve()}")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport=VIEWPORT, locale="es-ES")
        page = context.new_page()

        # --- Login page (publica) ---
        print("\n[URL] Pagina de login")
        page.goto(f"{base_url}/login", timeout=NAV_TIMEOUT)
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        screenshot(page, output_dir, "login")

        # --- Admin ---
        print("\n" + "-" * 50)
        print("[ROL] Admin")
        login_via_api(page, base_url, "admin", "admin123")
        navigate_and_capture(page, base_url, output_dir, ROUTES["admin"], prefix="admin")

        # ServicioDetail (intentar navegar desde /servicios)
        print("\n  [NAV] /servicios/[id] (detalle)")
        try:
            page.goto(f"{base_url}/servicios", timeout=NAV_TIMEOUT)
            page.wait_for_load_state("networkidle")
            time.sleep(1.5)
            link = page.locator("a[href*='/servicios/']").first
            if link.is_visible():
                href = link.get_attribute("href")
                page.goto(f"{base_url}{href}", timeout=NAV_TIMEOUT)
                page.wait_for_load_state("networkidle")
                time.sleep(1.5)
                screenshot(page, output_dir, "admin-servicios-detalle")
            else:
                print("  [WARN] No se encontro enlace a detalle de servicio")
        except Exception as e:
            print(f"  [WARN] {e}")

        # --- Sistema ---
        print("\n" + "-" * 50)
        print("[ROL] Sistema")
        login_via_api(page, base_url, "sistema", "sistema2026")
        navigate_and_capture(page, base_url, output_dir, ROUTES["sistema"], prefix="sistema")

        # --- Encargado (usa rol real de la API) ---
        print("\n" + "-" * 50)
        print("[ROL] carlos.garcia")
        real_rol1 = login_via_api(page, base_url, "carlos.garcia", "admin123")
        pref1 = real_rol1 or "carlos-garcia"
        rutas1 = ROUTES.get(real_rol1 or "", ROUTES["encargado"])
        navigate_and_capture(page, base_url, output_dir, rutas1, prefix=pref1)

        # --- Colaborador (usa rol real de la API) ---
        print("\n" + "-" * 50)
        print("[ROL] ana.martinez")
        real_rol2 = login_via_api(page, base_url, "ana.martinez", "admin123")
        pref2 = real_rol2 or "ana-martinez"
        rutas2 = ROUTES.get(real_rol2 or "", ROUTES["colaborador"])
        navigate_and_capture(page, base_url, output_dir, rutas2, prefix=pref2)

        browser.close()

    total = len(list(output_dir.glob("*.png")))
    print("\n" + "=" * 60)
    print(f"  [HECHO] Capturas generadas en: {output_dir.resolve()}")
    print(f"  [HECHO] {total} archivos PNG")
    print("=" * 60)


if __name__ == "__main__":
    main()
