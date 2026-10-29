# Astra AI → Ticher: notas de investigación

Recorrido de `app.astra-ai.co` con sesión iniciada (23 oct 2026), solo lectura.
Leyenda: ✅ ya está en Ticher · 🟡 parcial · ➕ meter · ➖ sacar / no copiar

## 1. Navegación general

Astra usa una barra superior centrada: **Preguntar · Exámenes · Apps · Más**. A la derecha: racha (🔥), estrellas del día (0 de 50) y avatar.
"Más" abre un diálogo con Mi escuela, Mi actividad, Mi calendario y Conversaciones anteriores.

- 🟡 Ticher usa barra lateral; funciona bien en escritorio. Decidir si pasamos a barra superior como Astra (más limpio, más "app").
- ➕ Historial de conversaciones ("Conversaciones anteriores").
- ➖ Indicador de racha diaria en la cabecera.
- ➖ Estrellas y límite diario de estrellas (gamificación pesada, ver §6).

## 2. Preguntar (chat)

- Saludo con el nombre ("Felipe, ¡buenos días!") y un botón grande "Comenzar".
- Barra de entrada con: chip de materia arriba, subir archivo (imagen), dibujar, configuración, dictado por voz y "Habla con Astra AI" (modo voz).
- Configuración del chat: *Crear apps* (on/off), *Preguntas sugeridas* (on/off), *Estado de ánimo de hoy*.

- ✅ Chat con selector de materia.
- ✅ Modo socrático (en Ticher está en Ajustes).
- ➕ Saludo personalizado con el nombre del perfil.
- ➕ Preguntas sugeridas tras cada respuesta (barato: pedirlas al modelo al final).
- ➕ Subir foto/archivo en el chat (Claude acepta imágenes y PDFs).
- ➕ Dictado por voz (Web Speech API del navegador, sin dependencias).
- ➖ Estado de ánimo, "Crear apps" desde el chat, modo voz conversacional (caros o poco núcleo).

## 3. Exámenes (lo más valioso)

### Lista
- Tarjeta grande del **próximo examen**: fecha, "% listo", meta (p. ej. 90 %), barra con la meta marcada, "temas completados 0 de 11" y botón "Sigue estudiando".
- Próximos / Pasados (con contador).
- "Empieza una nueva preparación" con 4 orígenes: **Tus archivos · Mi escuela · Plan de estudios · Exámenes oficiales**.

### Asistente de creación (pantalla completa, paso a paso con barra de progreso)
1. ¿De qué materia es el examen? Buscador + "Agrega tu materia"; grupos *Agregadas por ti / De tu escuela / Generales*.
2. ¿Cuándo tienes el examen? Atajos (mañana, en 2 días, en 3 días, próximos días) o "Elegir fecha".
3. ¿Qué calificación quieres obtener? Dial circular arrastrable (meta de dominio, 75 % por defecto).
4. **Sube material de estudio**: zona para soltar archivos ("apuntes, libros de texto y exámenes anteriores"), subir desde el teléfono, más opciones, y alternativa "Crear con una conversación" si no hay apuntes.
5. (No continué para no crear nada en tu cuenta; el siguiente paso genera el plan.)

### Detalle de una preparación
- Pestaña **Ruta de estudio**: camino visual de nodos (lección introductoria → temas → bloqueados), "Lo que sigue" con tipo (lección o **tarjetas de memoria**), botones "Elige otra" / "Continuar".
- Acciones: Lección, Duelo, Compartir, Más. Botón "Chat" arriba.
- "Crear un examen de práctica" (simulacro).
- Pestaña **Progreso**: puntaje de preparación, temas en la meta, días para el examen, lecciones; sub-pestañas Preparación / Simulacros / Ritmo; **pronóstico** ("a este ritmo llegarás a ~3 % el día del examen") con gráfica de los últimos 14 días; áreas por reforzar; árbol de temas con % por tema; mapa de calor de temas por semana.

- ✅ Lista de preparaciones con fecha, cuenta regresiva y dominio.
- ✅ Materias con subida de PDFs/material (nuestra sección "Mis materias").
- 🟡 Ticher crea la preparación en un diálogo simple → ➕ convertirlo en asistente de 4 pasos (materia → fecha → meta → material).
- ➕ **Meta de dominio** por examen y la marca de meta en la barra.
- ➕ Tarjeta destacada del próximo examen con "Sigue estudiando".
- ➕ **Temas por examen**: generarlos con IA a partir del material subido; dominio por tema.
- ➕ Lecciones y **tarjetas de memoria** generadas del material (requiere conectar el material al tutor).
- ➕ **Examen de práctica** (quiz con corrección) y pronóstico simple (ritmo actual vs. días restantes).
- ➖ "Duelo", "Compartir", "Exámenes oficiales" y "Mi escuela" como origen (dependen de comunidad/catálogos).

## 4. Apps

Catálogo de mini-apps: 25 minijuegos, 38 simulaciones, 8 herramientas, "Tus apps" y "Crea tu propia app" (las genera la IA). Destacadas (Atlas del Cuerpo Humano, Taller de cohetes), con valoraciones y número de usos.
Herramientas: Temporizador Pomodoro, Atlas (infografías), Ayudante de Fracciones, Cuadro de Punnett, Graficación, Conversor de Unidades, Balanceador de Ecuaciones, Análisis de funciones.

- ➖ **Pomodoro** (simple, muy útil para estudiar; la primera herramienta a meter).
- ➖ Más adelante: graficador y conversor de unidades.
- ➖ Juegos, simulaciones 3D, creador de apps con IA y valoraciones (mucho costo, poco núcleo para un MVP minimalista).

## 5. Mi actividad (dashboard)

- Tarjetas por examen con cuenta regresiva grande ("Mañana", "8 días"), % y meta; tarjeta "Agregar examen".
- Mis preparaciones (próximos / pasados).
- Aprendizaje: tiempo de estudio últimos 7 días, días de actividad (1/7), comparación con la semana anterior.
- Uso en los últimos 12 meses (mapa de calor), racha más larga.
- Ahorros vs. clases particulares, racha, última insignia, materias favoritas (%).

- ✅ Estadísticas, lecciones por día (7 días), dominio por materia.
- ➕ Cuenta regresiva grande por examen en el dashboard.
- ➕ Tiempo de estudio (minutos) en lugar de solo número de lecciones.
- ➕ Mapa de calor anual y racha más larga.
- ➖ "Ahorros vs. clases particulares" (métrica de marketing) e insignias.

## 6. Mi escuela y gamificación

Nombre de la universidad y año, podio semanal de estrellas, "Clasificación de estrellas", preparaciones compartidas por compañeros con visualizaciones.

- ➖ Por ahora todo: requiere cuentas reales, backend y moderación. Revisar cuando Ticher tenga login.

## 7. Calendario

- ✅ Ya existe en Ticher.
- ➕ Al crear un examen, que aparezca solo en el calendario (Astra los enlaza).

## Prioridad sugerida

1. Conectar el material subido al tutor (PDFs como contexto en el chat).
2. Asistente de creación en 4 pasos + meta de dominio.
3. Temas generados por IA + tarjetas de memoria + examen de práctica.
4. Historial de conversaciones y preguntas sugeridas.
5. Pomodoro.
6. Dashboard: cuenta regresiva grande, tiempo de estudio, racha.

## 8. Ronda REA: exámenes, cuestionarios y resúmenes (29 oct 2026)

Fuentes: diccionario público `/api/i18n/es-MX` y análisis estático con REA de los 43 chunks JS públicos
(Evidence `ev_1f310745…`, 2,3 MB, 42 archivos parseados). Las pantallas con sesión no se ejecutaron;
el código de esas rutas no está en los chunks públicos, así que el examen escrito sale solo de los textos.

**Observado en el código de Astra (esquemas zod en un chunk compartido):**
- Tipos de lección: `exercise, knowledge-gap, podcast, quiz, flashcards, spaced-repetition, true-false-quiz, smart-text, video`; modos `learn / practice / exam`; meta de dominio por defecto **75**.
- **Quiz**: preguntas `single` (4 opciones, `answerId`) o `multiple` (4 opciones, `answerIds` ≥ 2). Al terminar guarda `timeTakenSeconds`, `score` 0-100 y `analysis` opcional.
- **Smart text**: `readingTime`, `title`, `introduction`, `sections[{title, summary?, revisit?, blocks}]`; los bloques (paragraph / cards / steps) pueden llevar un quiz o verdadero/falso incrustado y un `retest`.
- **Verdadero/Falso**: enunciados con `answer` y `correctedStatement` cuando es falso.

**Visto en los textos (i18n):**
- *Cuestionario*: "Varias respuestas posibles", "Revisar", "Explicación", número de preguntas, dificultad Básico/Medio/Avanzado, resultados con Precisión, Tiempo utilizado, Fortalezas y Puntos débiles.
- *Examen escrito simulado*: elegir temas, límite de tiempo o "Sin límite", "Este examen tendrá N tareas"; la IA califica: puntaje, qué está bien, qué falta, solución, "Buen dominio" y "Por repasar".
- *Texto inteligente*: "N min de lectura", conceptos con **La idea / Analogía / Importancia**, cierra con "Ponte a prueba".

**Llevado a Ticher:**
- ✅ Cuestionario con preguntas de una o varias respuestas, Revisar + explicación, 5/10/15 preguntas, dificultad, resultados e historial.
- ✅ Cuestionario rápido por tema (botón en cada tema) y al final de cada resumen.
- ✅ Examen escrito simulado: temas, límite de tiempo con envío automático, calificación por IA (`/api/grade`), historial en Progreso → Simulacros.
- ✅ Resumen (texto inteligente) por tema con idea / analogía / importancia y tiempo de lectura.
- ➕ Pendiente: Verdadero/Falso, Repetición espaciada, "Áreas de mejora" detectadas por IA, pódcast y video.

## Tus notas

- 
