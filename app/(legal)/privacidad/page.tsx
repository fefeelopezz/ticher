import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad" } }

export default function PrivacyPage() {
  return (
    <article>
      <h1>Política de privacidad</h1>
      <p>Última actualización: 3 de noviembre de 2026.</p>
      <p>
        En esta política explicamos qué datos guarda Ticher (ticher.pro), para qué los usamos y qué derechos tienes. Complementa los{" "}
        <Link href="/terminos">Términos de uso</Link>.
      </p>

      <h2>1. Qué datos guardamos</h2>
      <ul>
        <li>Tu correo electrónico, para que puedas entrar a tu cuenta.</li>
        <li>Tu perfil: nombre, nivel educativo, foto (si la subes) y preferencias.</li>
        <li>Tu estudio: materias, exámenes, temas, lecciones, conversaciones con el tutor, progreso, racha y minutos de estudio.</li>
        <li>Los archivos que subes: apuntes, PDFs, fotos y dibujos del pizarrón.</li>
        <li>Los mensajes que nos envías desde el formulario &quot;Ticher está en desarrollo&quot;.</li>
        <li>Tu actividad: cuándo entras a tu cuenta y cuántas consultas haces a la IA.</li>
      </ul>
      <p>No pedimos datos de pago, documento ni ubicación, y no vendemos tus datos a nadie.</p>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Para darte el servicio: que la IA te responda con tu material, guardar tu avance y sincronizarlo entre tus dispositivos.</li>
        <li>Para enviarte el código de acceso y, si los tienes activados, recordatorios antes de tus exámenes.</li>
        <li>Para responder tus mensajes y mejorar Ticher.</li>
        <li>Para proteger el servicio contra abusos (por ejemplo, limitar intentos de acceso).</li>
      </ul>
      <p>
        El administrador de Ticher puede ver tu perfil, tus exámenes, tus lecciones, los títulos de tus conversaciones y tu actividad, para dar
        soporte y cuidar el servicio. Desde ese panel no ve el contenido de tus conversaciones ni tus archivos.
      </p>

      <h2>3. Con quién los compartimos</h2>
      <p>Usamos proveedores que procesan datos por cuenta nuestra, solo para hacer funcionar Ticher:</p>
      <ul>
        <li>Vercel: aloja la aplicación.</li>
        <li>Supabase: guarda tus datos de estudio y tus archivos en la nube.</li>
        <li>Resend: envía los correos (código de acceso y recordatorios).</li>
        <li>
          Google (API de Gemini): genera las respuestas de la IA. Cuando preguntas algo, el mensaje y el material que elegiste usar se envían a
          Google para que la IA responda.
        </li>
      </ul>
      <p>Algunos de estos proveedores procesan datos fuera de Argentina. No compartimos tus datos con terceros con fines publicitarios.</p>

      <h2>4. Dónde y cuánto tiempo se guardan</h2>
      <p>
        Tus datos se guardan en tu navegador y en la nube mientras tengas tu cuenta. Si eliminas un archivo, una conversación o un examen, también se
        borra de la nube. Puedes pedirnos que eliminemos tu cuenta y todos tus datos cuando quieras.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Usamos solo cookies necesarias para que funcione el inicio de sesión y para evitar abusos. No usamos cookies de publicidad ni de seguimiento
        de terceros.
      </p>

      <h2>6. Menores de edad</h2>
      <p>
        Ticher está pensado para estudiantes. Si eres menor de 13 años, necesitas la autorización de tu madre, padre o tutor para usarlo. Si un adulto
        responsable cree que un menor nos dio datos sin autorización, puede escribirnos para que los eliminemos.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        De acuerdo con la Ley 25.326 de Protección de los Datos Personales, puedes pedir acceso a tus datos, corregirlos o eliminarlos, en forma
        gratuita. La Agencia de Acceso a la Información Pública, órgano de control de esa ley, atiende las denuncias y reclamos de quienes vean
        afectados sus derechos sobre sus datos personales.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Protegemos tus datos con conexiones cifradas, acceso sin contraseñas y bases de datos a las que solo puede acceder nuestro servidor. Ningún
        sistema es 100% seguro, pero te avisaremos si ocurre un incidente que afecte tus datos.
      </p>

      <h2>9. Cambios y contacto</h2>
      <p>
        Si cambiamos esta política de forma importante, te avisaremos en la app o por correo. Para ejercer tus derechos o hacer cualquier consulta,
        escríbenos desde el aviso &quot;Ticher está en desarrollo&quot; dentro de la app o en la página de inicio.
      </p>
    </article>
  )
}
