# Sección de donaciones vía Mercado Pago

**Fecha:** 2026-04-30
**Tipo:** Feature
**Estado:** Diseñado

## Objetivo

Permitir que los usuarios de Firulais donen dinero a través de un link de Mercado Pago, accesible desde el menú hamburguesa de la app.

## Alcance

Agregar un item "Donar" al menú hamburguesa que, al tocarse, abre un link de cobro de Mercado Pago en el navegador externo del dispositivo.

**Fuera de alcance:**
- UI propia de selección de monto
- Tracking de donaciones en base de datos
- Integración con la edge function `create-payment` (eso queda para Premium)
- Suscripciones recurrentes
- Página de agradecimiento propia

## Diseño

### Cambios

Un único archivo afectado: [src/components/HamburgerMenu.tsx](../../../src/components/HamburgerMenu.tsx).

1. **Constante** `MP_DONATION_URL` al inicio del módulo, con placeholder y comentario `TODO` para que el dueño del proyecto la reemplace por el link real de MP.

2. **Tipo del item** del menú: agregar campo opcional `external?: string`. Si está presente, el handler abre el URL externo en vez de navegar dentro de la app.

3. **Nuevo item** en el array `menuItems`:
   - `icon: "volunteer_activism"` (símbolo Material que representa donaciones)
   - `label: "Donar"`
   - `external: MP_DONATION_URL`
   - **Posición:** último item del array, después de "Finales Felices"

4. **Handler de tap**: si el item tiene `external`, llamar a `window.open(item.external, "_blank", "noopener,noreferrer")` y luego `closeMenu()`. Si no, comportamiento actual (navegar con React Router).

### Comportamiento por plataforma

- **Web:** `window.open` abre nueva pestaña con MP.
- **Capacitor nativo (Android/iOS):** `window.open` con target `_blank` redirige al navegador externo del sistema automáticamente — no hace falta el plugin `@capacitor/browser`.

### Errores

No aplica. `window.open` no devuelve errores síncronos significativos. Si el link es inválido, MP muestra su propia página de error en el navegador externo.

## Testing manual

- **Web:** abrir el menú → tocar "Donar" → verificar que se abre nueva pestaña con MP.
- **Android nativo:** abrir el menú → tocar "Donar" → verificar que se abre Chrome (o navegador por defecto) con MP, y que el drawer queda cerrado al volver a la app.
- **Drawer cerrado:** confirmar que `closeMenu()` se ejecuta antes/después de abrir el link.

## Pendientes para el dueño del proyecto

- Reemplazar el placeholder en `MP_DONATION_URL` con el link real de cobro de Mercado Pago una vez generado desde la app de MP (formato típico: `https://mpago.la/...` o `https://link.mercadopago.com.ar/...`).
