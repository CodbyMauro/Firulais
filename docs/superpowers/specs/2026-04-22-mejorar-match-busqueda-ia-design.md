# Mejorar el match de búsqueda con IA para mascotas

**Fecha:** 2026-04-22
**Autor:** mauro (con Claude)
**Estado:** Aprobado, pendiente de implementación

## Contexto y problema

El sistema actual de búsqueda de mascotas similares no encuentra matches que claramente deberían aparecer. Usuario reportó que cargó varias mascotas y la que se parecía a la suya no apareció ni cerca en los resultados.

El flujo actual es:

1. Al crear una mascota, Claude Haiku genera una descripción de texto desde la imagen
2. OpenAI `text-embedding-3-small` convierte esa descripción a vector (1536 dims)
3. Al buscar, una RPC `find_similar_pets_by_id` devuelve top 20 por similitud coseno, filtrando por status opuesto (perdidas buscan encontradas)
4. El código toma los primeros 5 (`TOP_K = 5`) y los manda a Claude Haiku para scoring visual
5. Claude puntúa 0-100, se filtra por `AI_THRESHOLD = 40` y se ordena

### Diagnóstico

El cuello de botella está en la etapa vectorial, no en Claude. Con <50 mascotas en BD, el Top 5 solo cubre ~10% del universo y mezcla especies (un perro puede competir vectorialmente contra gatos con embeddings casualmente cercanos). La mascota correcta queda fuera del Top 5 antes de que Claude pueda verla.

## Objetivo

Asegurar que los candidatos que llegan a la etapa de scoring visual con Claude sean los **más acertados posibles**, no solo más cantidad. El criterio de éxito es reducir falsos negativos en búsquedas donde el match correcto existe en la BD.

## Diseño

Cinco palancas combinadas que atacan el problema en distintos niveles del pipeline.

### Palanca 1 — Filtrado por especie en SQL

**Problema que resuelve:** la RPC actual ya filtra por status opuesto pero no por especie, así que un perro puede competir vectorialmente contra gatos.

**Cambios:**

- Agregar columna `species text` a la tabla `pets`. Valores: `'dog' | 'cat' | 'other'`.
- Modificar la función `describeAnimal` (en ambas edge functions) para retornar JSON parseable con shape `{ species: string, description: string }`.
- Poblar `species` al momento de guardar `embedding` y `ai_description`.
- Modificar la RPC `find_similar_pets_by_id` para agregar el filtro:

```sql
AND (p.species = src.species OR src.species IS NULL OR p.species IS NULL)
```

El OR con NULL mantiene retrocompatibilidad con mascotas que aún no tienen `species` poblado durante la transición.

**Impacto esperado:** el top 10 vectorial pasa a ser 10 mascotas de la misma especie y status opuesto, eliminando ruido estructural.

### Palanca 2 — Filtrado por distancia geográfica dinámica

**Problema que resuelve:** mascotas reportadas en ubicaciones lejanas son casi siempre falsos positivos. Una mascota perdida hace 1 día probablemente no caminó 50 km. El radio razonable crece con el tiempo de extravío.

**Regla de radio máximo:**

```
radio_km = min(max(dias_perdido * 10, 10), 30)
```

Interpretación:

- Día 0-1: radio 10 km
- Día 2: radio 20 km
- Día 3 o más: radio 30 km (cap)

**¿De cuál mascota contamos los días?** En cada par (source, candidate), exactamente una tiene `status = 'lost'` (por el filtro cruzado) y la otra tiene `status = 'found'`. Los días se cuentan **siempre desde la `lost`**, sea el source o el candidate:

- Si `src.status = 'lost'`: `días = NOW() - src.created_at`
- Si `src.status = 'found'`: `días = NOW() - candidate.created_at`

Esto hace el comportamiento simétrico: una búsqueda iniciada desde una `found` se comporta igual que desde una `lost`.

**Cálculo de distancia:** fórmula haversine inline en SQL usando `lat`/`lng` existentes de la tabla `pets` (en grados decimales). Radio terrestre = 6371 km. No requiere PostGIS.

**Manejo de coordenadas faltantes:** si source o candidate tienen `lat` o `lng` en NULL, el filtro de distancia no aplica para ese par (se incluye el candidato). Con <50 mascotas no podemos permitirnos excluir las que tengan geo incompleta.

**Output adicional:** la RPC devuelve `distance_km` como columna extra. Esto permite mostrar "a X km de tu reporte" en los resultados de UI, y potencialmente usar la distancia para ranking en iteraciones futuras.

**Impacto en tipos TypeScript:** el tipo `SimilarPet` (presente tanto en `find-similar-pets/index.ts` como en `petsService.ts`) incorpora `distance_km: number | null` para que el frontend pueda mostrarlo.

### Palanca 3 — Prompt de descripción estructurado

**Problema que resuelve:** el prompt actual permite "máximo 3 oraciones libres", lo que hace que Claude priorice distintos aspectos según la foto. Descripciones inconsistentes producen embeddings menos comparables entre mascotas parecidas.

**Cambios:** reemplazar el prompt actual por 5 oraciones estructuradas obligatorias, una por aspecto:

1. Especie + raza/mix + tamaño (pequeño/mediano/grande)
2. Color principal + colores secundarios
3. Patrones de pelaje (manchas, atigrado, bicolor, parches específicos)
4. Rasgos faciales (orejas caídas/paradas, hocico, ojos)
5. Pelaje (corto/largo/rizado) + cola + marcas únicas

El nuevo prompt también debe solicitar el campo `species` en formato JSON. Output esperado:

```json
{
  "species": "dog",
  "description": "Perro mestizo tamaño mediano. Color principal marrón con áreas blancas en pecho y patas. Manchas oscuras difuminadas en el lomo. Orejas caídas, hocico corto, ojos oscuros. Pelaje corto, cola mediana enroscada hacia arriba."
}
```

**Importante:** el prompt está duplicado en `find-similar-pets/index.ts` y `generate-pet-embedding/index.ts`. Ambos deben actualizarse sincrónicamente para que mascotas nuevas y regeneradas queden consistentes.

### Palanca 4 — Constantes ajustadas

En `find-similar-pets/index.ts`:

- `TOP_K`: 5 → 10
- `AI_THRESHOLD`: 40 → 25

En la RPC `find_similar_pets_by_id`:

- `LIMIT`: 20 → 30 (margen para el slice en JS)

### Palanca 5 — Batching de llamadas a Claude

**Problema que resuelve:** pasar 10 imágenes en una sola request Claude genera prompts largos (~15k tokens) y JSON de respuesta más confuso de parsear.

**Cambios:** modificar `runClaudeSearch` para partir los candidatos en lotes de 5 y ejecutar los lotes en paralelo con `Promise.all`, combinando resultados al final. El mapeo de índices debe ajustarse por lote para que el `find` de scores funcione correctamente.

**Costo:** ~2× por búsqueda (de ~$0.008 a ~$0.015 por búsqueda). Con límite free de 2 búsquedas/usuario, costo máximo ~$0.03 por usuario free. Despreciable a esta escala.

## Migración de datos

Las ~50 mascotas existentes tienen `embedding` y `ai_description` generados con el prompt viejo, y no tienen `species` poblada. Necesitan regeneración completa.

**Estrategia:** script Node/TS local (`scripts/regenerate-embeddings.ts`) ejecutable una sola vez que itera sobre todas las mascotas con `image_url` no nulo y llama a la edge function `generate-pet-embedding` para cada una. Regenera embedding, descripción y species con la lógica actualizada. Usa `SUPABASE_SERVICE_ROLE_KEY` desde `.env`, con throttle secuencial o concurrency baja (≤3) para evitar rate limits.

**Por qué script local (no on-demand):** evita que el primer usuario de cada mascota pague latencia de re-generación durante su búsqueda (~2-4 segundos extra).

## Archivos afectados

- `supabase/migrations/20260422_species_and_distance.sql` — nueva migración: `ADD COLUMN species`, y reemplazo de la RPC con filtros de especie + distancia dinámica + `LIMIT 30` + columna `distance_km` en el output
- `supabase/functions/find-similar-pets/index.ts` — nuevo prompt, parseo JSON, constantes TOP_K/AI_THRESHOLD, batching, guardar `species`, tipo `SimilarPet` con `distance_km`
- `supabase/functions/generate-pet-embedding/index.ts` — mismo prompt, parseo JSON, guardar `species`
- `src/lib/petsService.ts` — tipo `SimilarPet` con campo `distance_km: number | null` para que el frontend pueda mostrar distancia
- `scripts/regenerate-embeddings.ts` — script Node/TS local que itera sobre las mascotas existentes llamando a la edge function `generate-pet-embedding` (ejecutable una sola vez post-deploy)

## Testing manual

No hay tests automatizados. Criterio de validación:

1. **Baseline:** antes de desplegar cambios, buscar desde una mascota de prueba y anotar los resultados + scores actuales.
2. **Migración en staging (si existe) o producción cuidadosa:** aplicar migración SQL, desplegar edge functions, correr script de regeneración.
3. **Post-cambio:** repetir la misma búsqueda. Verificar que mascotas que antes no aparecían ahora sí aparecen, y con qué score.
4. **Rollback:** si los resultados empeoran, los cambios son reversibles:
   - Constantes vuelven a sus valores originales (cambio trivial)
   - Prompt vuelve al original
   - Columna `species` puede quedar sin uso (el filtro con OR NULL la vuelve no-bloqueante)
   - Filtro de distancia: si resulta demasiado restrictivo, se puede relajar el cap (30 → 50 km) o removerlo con un simple redeploy de la migración

## Consideraciones no cubiertas (YAGNI)

Las siguientes ideas se descartaron conscientemente para mantener el scope:

- **Re-ranking híbrido** (bonus por `breed` exacto o `color` keyword): agrega complejidad sin evidencia clara de que haga falta una vez aplicadas las 5 palancas.
- **Embeddings visuales reales** (CLIP, Cohere vision): rework grande, más útil a escala >500 mascotas.
- **Filtrado por ventana temporal de reporte**: con <50 mascotas todas son recientes, no aplica.
- **Usar distancia como factor de ranking** (no solo filtro binario): se devuelve `distance_km` para habilitar esto en una iteración futura, pero por ahora el orden sigue siendo por similitud visual de Claude.

Estas quedan como candidatas para una iteración futura si las 5 palancas actuales no son suficientes.
