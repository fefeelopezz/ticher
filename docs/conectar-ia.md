# Conectar la IA de Ticher

Ticher ya trae la IA integrada con Claude (Anthropic). Solo falta tu API key.
Sin ella la app funciona, pero el chat, los temas, las tarjetas y los exámenes de práctica muestran
"Configura ANTHROPIC_API_KEY…".

## Paso a paso

1. **Crea una cuenta** en <https://platform.claude.com> (Claude Console) con tu correo.
2. **Carga crédito**: *Settings → Billing*. La API se paga por uso (no es la suscripción de Claude.ai).
   Con 5 USD alcanza para probar bastante.
3. **Crea la API key**: *Settings → API Keys → Create Key*. Ponle un nombre (p. ej. `ticher-dev`)
   y copia la clave (empieza con `sk-ant-`). Solo se muestra una vez.
4. **Crea el archivo `.env.local`** en la raíz del proyecto (junto a `package.json`):

   ```env
   ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
   # Opcional: cambia el modelo (ver tabla). Si no lo pones, usa claude-opus-5-5.
   # TICHER_MODEL=claude-sonnet-5-5
   ```

   `.env.local` ya está en `.gitignore`: la clave nunca se sube a Git. No la pegues en el código.
5. **Reinicia el servidor** (`Ctrl+C` y otra vez `npm run dev`); Next.js solo lee `.env.local` al arrancar.
6. **Prueba**:
   - *Preguntar*: escribe una duda o sube la foto de un ejercicio.
   - *Exámenes → tu preparación → Generar temas con IA*, luego *Crear tarjetas* y *Crear examen de práctica*.
   - Si subiste PDFs en *Mis materias*, el tutor los usa como fuente (botón "Usar material de …" en el chat).
7. **Al publicar** (p. ej. en Vercel): agrega `ANTHROPIC_API_KEY` (y `TICHER_MODEL` si lo usas) en
   *Project → Settings → Environment Variables*. La clave vive solo en el servidor; el navegador nunca la ve.

## Modelos que puedes usar

Cambias de modelo con `TICHER_MODEL` en `.env.local`, sin tocar código. Precios por millón de tokens
(entrada / salida), tarifas de Anthropic a octubre de 2026:

| Modelo | `TICHER_MODEL` | Precio | Cuándo usarlo |
|---|---|---|---|
| Claude Opus 5.5 | `claude-opus-5-5` (por defecto) | $4 / $20 | La mejor calidad para explicar y generar exámenes. |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 / $10 | Mitad de precio, muy buena calidad. Buena opción para un tutor con muchos usuarios. |
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 / $0.50 | El más barato y rápido. Para mucho volumen o preguntas simples. |
| Claude Fable 5.1 | `claude-fable-5-1` | $10 / $50 | El más capaz. Normalmente es más de lo que un tutor necesita. |

Todos leen PDFs e imágenes, tienen contexto de 1M de tokens y respuestas estructuradas.

**Costo aproximado** con Opus 5.5: una pregunta normal ≈ 0,01–0,03 USD. Con un PDF de ~50 páginas,
la primera pregunta ≈ 0,30 USD y las siguientes de la misma conversación mucho menos, porque Ticher
guarda el material en la caché de Anthropic (se cobra ~10 % del precio al reutilizarlo).
Con Sonnet 5.5 es la mitad; con Haiku 5.5, unas 40 veces menos.

## Qué hace la IA en Ticher

| Función | Ruta | Archivo |
|---|---|---|
| Tutor del chat (+ preguntas sugeridas, fotos, PDFs, modo socrático) | `POST /api/chat` | `app/api/chat/route.ts` |
| Temas, tarjetas de memoria y examen de práctica | `POST /api/generate` | `app/api/generate/route.ts` |
| Cliente de Anthropic, modelo, caché y errores | — | `lib/ai.ts` |

Detalles:
- La IA lee **PDF, imágenes (PNG/JPG/GIF/WebP) y texto**. Word y PowerPoint se guardan pero no se envían:
  exporta a PDF para que el tutor los lea.
- Límite por envío: ~28 MB de archivos en total (el resto se avisa y se omite).
- Si el modelo rechaza una solicitud por seguridad, Opus/Sonnet/Fable reintentan solos con otro modelo
  (`fallbacks: "default"`); Haiku no tiene esa opción.

## Problemas comunes

| Mensaje | Causa | Solución |
|---|---|---|
| "Configura ANTHROPIC_API_KEY…" | Falta la clave o no reiniciaste | Paso 4 y 5 |
| "La API key de Anthropic no es válida." | Clave mal copiada o revocada | Crea otra en la Console |
| "Demasiadas solicitudes…" | Límite de uso de tu cuenta | Espera un minuto o sube de nivel en *Limits* |
| "La IA no pudo procesar la solicitud…" | Archivo dañado/muy grande o `TICHER_MODEL` mal escrito | Revisa el nombre del modelo o quita el archivo |
