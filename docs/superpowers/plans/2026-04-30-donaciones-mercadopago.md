# Donaciones vía Mercado Pago — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un item "Donar" al menú hamburguesa que abra un link de Mercado Pago en el navegador externo del dispositivo.

**Architecture:** Cambio aislado a un solo componente. El item del menú obtiene un campo opcional `external` que, cuando está presente, dispara `window.open` en vez de navegar con React Router. Capacitor maneja `window.open(_, "_blank")` redirigiendo al navegador externo del SO automáticamente.

**Tech Stack:** React + TypeScript + React Router + Capacitor 8.

**Spec relacionada:** [`docs/superpowers/specs/2026-04-30-donaciones-mercadopago-design.md`](../specs/2026-04-30-donaciones-mercadopago-design.md)

**Nota sobre testing:** El proyecto no tiene tests unitarios para componentes UI. Verificación es manual, conforme al patrón establecido en el repo.

---

### Task 1: Agregar item "Donar" al menú hamburguesa

**Files:**
- Modify: `src/components/HamburgerMenu.tsx`

- [ ] **Step 1: Agregar la constante `MP_DONATION_URL`**

Editar `src/components/HamburgerMenu.tsx`. Agregar la constante justo arriba del array `menuItems` (línea 7), con un placeholder y un comentario `TODO`:

```tsx
// TODO: reemplazar por el link real de cobro de Mercado Pago
// Formato esperado: https://mpago.la/... o https://link.mercadopago.com.ar/...
const MP_DONATION_URL = "https://mpago.la/REPLACE_ME";
```

- [ ] **Step 2: Tipar los items del menú con campo `external` opcional**

Antes de la declaración de `menuItems`, agregar el tipo del item. Cambiar:

```tsx
const menuItems = [
  { icon: "settings",       label: "Configuración",    path: "/settings" },
  { icon: "local_hospital", label: "Centros de Ayuda", path: "/centros" },
  { icon: "help",           label: "Ayuda y Soporte",  path: "/help" },
  { icon: "celebration",    label: "Finales Felices",  path: "/finales" },
];
```

A:

```tsx
type MenuItem = {
  icon: string;
  label: string;
  path?: string;
  external?: string;
};

const menuItems: MenuItem[] = [
  { icon: "settings",            label: "Configuración",    path: "/settings" },
  { icon: "local_hospital",      label: "Centros de Ayuda", path: "/centros" },
  { icon: "help",                label: "Ayuda y Soporte",  path: "/help" },
  { icon: "celebration",         label: "Finales Felices",  path: "/finales" },
  { icon: "volunteer_activism",  label: "Donar",            external: MP_DONATION_URL },
];
```

- [ ] **Step 3: Actualizar el handler `onClick` del item**

En la línea 103 actual existe:

```tsx
onClick={() => item.path ? handleNav(item.path) : closeMenu()}
```

Reemplazar por una lógica que prioriza `external`. Justo arriba del `return`, agregar el handler:

```tsx
const handleItemClick = (item: MenuItem) => {
  if (item.external) {
    window.open(item.external, "_blank", "noopener,noreferrer");
    closeMenu();
    return;
  }
  if (item.path) {
    handleNav(item.path);
    return;
  }
  closeMenu();
};
```

Y cambiar el `onClick` del `<button>` dentro del map a:

```tsx
onClick={() => handleItemClick(item)}
```

- [ ] **Step 4: Verificación manual en navegador (web)**

Levantar el dev server:

```bash
npm run dev
```

Pasos esperados:
1. Loguearse en la app (si no estás logueado)
2. Abrir el menú hamburguesa desde la pantalla principal
3. Verificar que aparece "Donar" como último item de la lista, con ícono de manos sosteniendo corazón (`volunteer_activism`)
4. Tocar "Donar" → debe abrir nueva pestaña con `https://mpago.la/REPLACE_ME` (mostrará "Link no encontrado" en MP — eso es esperado con el placeholder)
5. Verificar que el menú se cerró al volver

- [ ] **Step 5: Verificación manual en Android nativo**

```bash
npx cap sync android
```

Abrir el proyecto en IntelliJ/Android Studio y correr en un dispositivo o emulador.

Pasos esperados:
1. Abrir el menú hamburguesa
2. Tocar "Donar" → debe abrir Chrome (o el navegador externo del sistema), no quedarse dentro de la WebView
3. Volver a la app → el drawer debe estar cerrado

- [ ] **Step 6: Commit**

```bash
git add src/components/HamburgerMenu.tsx docs/superpowers/specs/2026-04-30-donaciones-mercadopago-design.md docs/superpowers/plans/2026-04-30-donaciones-mercadopago.md
git commit -m "feat: agregar item de donaciones al menú hamburguesa

Abre un link de Mercado Pago en el navegador externo del dispositivo.
El URL es un placeholder y debe reemplazarse por el link real de cobro
generado desde la app de MP."
```
