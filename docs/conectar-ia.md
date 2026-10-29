# Conectar la IA de Ticher (Gemini)

Ticher usa la API de Gemini de Google. Sin clave la app funciona, pero el chat, los temas, las tarjetas
y los exámenes de práctica muestran "Configura GEMINI_API_KEY…".

## Paso a paso

1. Entra a **Google AI Studio**: <https://aistudio.google.com/apikey> con tu cuenta de Google.
2. **Crea la clave**: *Create API key* → elige (o crea) un proyecto → copia la clave.
   Las claves de la API de Gemini empiezan con `AIza…`.
3. **Pégala en `.env.local`** (ya está creado en la raíz del proyecto, junto a `package.json`):

   ```env
   GEMINI_API_KEY=AIza-tu-clave-aqui
   # Opcional: otro modelo (ver tabla). Si no lo pones, usa gemini-3.8-flash.
   # GEMINI_MODEL=gemini-3.5-flash-lite
   ```

   `.env.local` está en `.gitignore`: la clave nunca se sube a Git. No la pegues en el código ni en chats;
   si se filtra, bórrala en AI Studio y crea otra.
4. **Reinicia el servidor** (`Ctrl+C` y otra vez `npm run dev`): Next.js solo lee `.env.local` al arrancar.
5. **Prueba**:
   - *Preguntar*: escribe una duda o sube la foto de un ejercicio.
   - *Exámenes → tu preparación → Generar temas con IA*, luego *Crear tarjetas* y *Crear examen de práctica*.
   - Si subiste PDFs en *Mis materias*, el tutor los usa como fuente (botón "Usar material de …" en el chat).
6. **Al publicar** (p. ej. en Vercel): agrega `GEMINI_API_KEY` (y `GEMINI_MODEL` si lo usas) en
   *Project → Settings → Environment Variables*. La clave vive solo en el servidor; el navegador nunca la ve.

## Modelos que puedes usar

Cambias de modelo con `GEMINI_MODEL` en `.env.local`, sin tocar código. Precios por millón de tokens
(entrada / salida) según la página de precios de Google, octubre de 2026:

| Modelo | `GEMINI_MODEL` | Nivel gratis | Precio de pago | Cuándo usarlo |
|---|---|---|---|---|
| Gemini 3.8 Flash | `gemini-3.8-flash` (por defecto) | Sí | $0.75 / $3.75 (sube a $1.50 / $7.50 en 2027) | Recomendado por Google para proyectos nuevos; buen equilibrio. |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` | Sí | $0.30 / $2.50 | Más barato y rápido; para mucho volumen. |
| Gemini 3.6 Flash | `gemini-3.6-flash` | Sí | $0.75 / $3.75 | Alternativa a 3.8 Flash. |
| Gemini 4 Argon | `gemini-4-argon` | No | $2 / $10 (sube a $4 / $20 en dic. 2026) | El de razonamiento más fuerte; necesita facturación activa. |

El **nivel gratuito** tiene límites de solicitudes por minuto y por día, y Google puede usar los datos
del nivel gratis para mejorar sus productos. Para una app con estudiantes reales, activa la facturación
en AI Studio (*Billing*).

## Qué hace la IA en Ticher

| Función | Ruta | Archivo |
|---|---|---|
| Tutor del chat (+ preguntas sugeridas, fotos, PDFs, modo socrático) | `POST /api/chat` | `app/api/chat/route.ts` |
| Temas, tarjetas de memoria y examen de práctica | `POST /api/generate` | `app/api/generate/route.ts` |
| Cliente de Gemini, modelo, archivos y errores | — | `lib/ai.ts` |

Detalles:
- La IA lee **PDF, imágenes (PNG/JPG/GIF/WebP) y texto**. Word y PowerPoint se guardan pero no se envían:
  expórtalos a PDF para que el tutor los lea.
- Límite por envío: ~13 MB de archivos en total (Gemini acepta ~20 MB por solicitud contando la
  conversión a base64). Lo que no entra se avisa y se omite.
- Las respuestas llegan como JSON con esquema (respuesta + sugerencias, temas, tarjetas, preguntas) y
  el servidor las valida antes de usarlas.

## Problemas comunes

| Mensaje | Causa | Solución |
|---|---|---|
| "Configura GEMINI_API_KEY…" | Falta la clave o no reiniciaste | Pasos 3 y 4 |
| "La API key de Gemini no es válida." | Clave mal copiada, borrada o de otro tipo | Crea una nueva en AI Studio (empieza con `AIza`) |
| "Llegaste al límite de uso de Gemini…" | Límite del nivel gratis | Espera un minuto o activa la facturación |
| "La IA no pudo procesar la solicitud…" | Archivo dañado/muy grande o `GEMINI_MODEL` mal escrito | Revisa el nombre del modelo o quita el archivo |
