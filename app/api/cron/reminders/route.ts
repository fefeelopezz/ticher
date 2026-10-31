import { Resend } from "resend"
import { emailButton, emailLayout, escapeHtml } from "@/lib/email"
import { examsToRemind, readiness } from "@/lib/progress"
import type { ExamPrep, Profile } from "@/lib/store"
import { cloudEnabled, rest } from "@/lib/supabase"

type Row = { email: string; key: string; value: unknown }

const when = (days: number) => (days === 1 ? "mañana" : `en ${days} días`)

const reminder = (prep: ExamPrep, days: number, name: string) => {
  const score = readiness(prep)
  return emailLayout({
    title: `Tu examen de ${escapeHtml(prep.subject)} es ${when(days)}`,
    preheader: `${escapeHtml(prep.name)}: vas al ${score}% de preparación.`,
    body: `
        <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#fafafa">${name ? `${escapeHtml(name)}, tu` : "Tu"} examen es ${when(days)}</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#a3a3a3">${escapeHtml(prep.name)} · ${escapeHtml(prep.subject)}</p>
        <div style="background:#2a1a0a;border:1px solid #5c3a14;border-radius:12px;padding:16px 20px;margin:0 0 24px">
          <p style="margin:0;font-size:28px;font-weight:700;color:#ffa247">${score}%</p>
          <p style="margin:2px 0 0;font-size:13px;color:#8a8a8a">de preparación · tu meta es ${prep.goal ?? 75}%</p>
        </div>
        ${emailButton(`https://www.ticher.pro/exams/${encodeURIComponent(prep.id)}`, "Seguir estudiando")}
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#8a8a8a">Puedes desactivar estos avisos en Ajustes.</p>`,
  })
}

// Daily Vercel Cron job: emails each student 7, 3 and 1 days before their exams, from the cloud copy
// of their data. Vercel sends "Authorization: Bearer $CRON_SECRET"; without the secret nothing runs.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("No autorizado", { status: 401 })
  const key = process.env.RESEND_API_KEY
  if (!cloudEnabled() || !key) return Response.json({ sent: 0, skipped: "Falta Supabase o Resend" })

  const res = await rest("user_data?select=email,key,value&key=in.(preps,profile)")
  if (!res.ok) return Response.json({ error: "No se pudo leer Supabase" }, { status: 502 })
  const rows = (await res.json()) as Row[]

  const users = new Map<string, { preps: ExamPrep[]; profile?: Profile }>()
  for (const r of rows) {
    const u = users.get(r.email) ?? { preps: [] }
    if (r.key === "preps" && Array.isArray(r.value)) u.preps = r.value as ExamPrep[]
    if (r.key === "profile") u.profile = r.value as Profile
    users.set(r.email, u)
  }

  const resend = new Resend(key)
  const from = process.env.RESEND_FROM || "Ticher <no-reply@ticher.pro>"
  let sent = 0
  for (const [email, { preps, profile }] of users) {
    if (profile?.reminders === false) continue
    for (const { prep, days } of examsToRemind(preps)) {
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: `Tu examen "${prep.name}" es ${when(days)}`,
        html: reminder(prep, days, profile?.name ?? ""),
        text: `Tu examen "${prep.name}" (${prep.subject}) es ${when(days)}. Vas al ${readiness(prep)}% de preparación. Sigue en https://www.ticher.pro`,
      })
      if (error) console.error("[reminders] resend", error.message)
      else sent++
    }
  }
  return Response.json({ sent })
}
