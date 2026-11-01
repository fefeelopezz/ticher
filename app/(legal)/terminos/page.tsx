import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Términos de uso", alternates: { canonical: "/terminos" } }

export default function TermsPage() {
  return (
    <article>
      <h1>Términos de uso</h1>
      <p>Última actualización: 1 de noviembre de 2026.</p>
      <p>
        Estos términos regulan el uso de Ticher (ticher.pro), un tutor con inteligencia artificial para estudiar y preparar exámenes. Al crear una cuenta o
        usar Ticher aceptas estos términos y la <Link href="/privacidad">Política de privacidad</Link>. Si no estás de acuerdo, no uses el servicio.
      </p>

      <h2>1. Qué es Ticher</h2>
      <p>
        Ticher te ayuda a estudiar: responde preguntas, explica temas paso a paso, convierte tus apuntes en textos, tarjetas y cuestionarios, y arma
        planes y simulacros para tus exámenes. Ticher está en desarrollo, así que sus funciones pueden cambiar, agregarse o quitarse.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Entras con tu correo electrónico y un código que te enviamos; no usamos contraseñas.</li>
        <li>Eres responsable de lo que se haga desde tu cuenta y de mantener seguro el acceso a tu correo.</li>
        <li>Si eres menor de 13 años, solo puedes usar Ticher con la autorización y supervisión de tu madre, padre o tutor.</li>
      </ul>

      <h2>3. Uso aceptable</h2>
      <p>Te comprometes a no:</p>
      <ul>
        <li>Subir contenido ilegal, ofensivo, que acose a otras personas o que infrinja derechos de autor de terceros.</li>
        <li>Intentar acceder a cuentas o datos ajenos, vulnerar la seguridad del servicio o sobrecargarlo con pedidos automatizados.</li>
        <li>Usar Ticher para hacer trampa en evaluaciones donde su uso no esté permitido por tu institución.</li>
      </ul>
      <p>Podemos limitar, suspender o cerrar cuentas que incumplan estos términos.</p>

      <h2>4. Tu contenido</h2>
      <p>
        Los apuntes, archivos, fotos y mensajes que subes siguen siendo tuyos. Nos das permiso para guardarlos y procesarlos solo para prestarte el
        servicio, por ejemplo para que la IA los lea al responderte. Debes tener derecho a usar lo que subes.
      </p>

      <h2>5. Sobre las respuestas de la IA</h2>
      <p>
        Las respuestas, resúmenes, correcciones y notas las genera una inteligencia artificial y pueden contener errores. Úsalas como apoyo para
        estudiar, no como única fuente: revisa la información importante con tu material, tus docentes o fuentes confiables. Ticher no garantiza
        resultados en ningún examen.
      </p>

      <h2>6. Disponibilidad y límites</h2>
      <p>
        Ticher se ofrece &quot;tal como está&quot;. Puede haber interrupciones, errores o pérdida de datos, y podemos fijar límites de uso (por ejemplo,
        de mensajes por día). Te recomendamos conservar una copia de tus archivos importantes.
      </p>

      <h2>7. Precio</h2>
      <p>Hoy Ticher es gratuito. Si en el futuro agregamos planes pagos, lo avisaremos antes y nunca te cobraremos sin tu aceptación expresa.</p>

      <h2>8. Responsabilidad</h2>
      <p>
        En la medida que lo permita la ley, Ticher no es responsable por daños indirectos derivados del uso del servicio o de decisiones tomadas en
        base a sus respuestas. Nada de esto limita los derechos que te otorga la Ley de Defensa del Consumidor (Ley 24.240).
      </p>

      <h2>9. Cambios</h2>
      <p>Podemos actualizar estos términos. Si el cambio es importante, te avisaremos en la app o por correo antes de que entre en vigencia.</p>

      <h2>10. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Para cualquier consulta, escríbenos desde el aviso &quot;Ticher está en
        desarrollo&quot; dentro de la app o en la página de inicio.
      </p>
    </article>
  )
}
