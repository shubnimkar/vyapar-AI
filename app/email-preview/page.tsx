import { buildPasswordResetHtml, buildReportReadyEmailHtml, buildWelcomeEmailHtml } from '@/lib/ses-email';

export const metadata = {
  title: 'Email Preview - Vyapar AI',
  description: 'Preview branded welcome, password reset, and report emails.',
};

const sampleResetUrl = 'https://app.vyapar-ai.example/reset-password?token=demo-reset-token';
const sampleLoginUrl = 'https://app.vyapar-ai.example/login';
const sampleReportUrl = 'https://app.vyapar-ai.example/reports/weekly-summary-demo';

const previewCards = [
  {
    id: 'welcome',
    label: 'Welcome Email',
    description: 'Onboarding message with blue-and-gold brand treatment and primary CTA.',
    html: buildWelcomeEmailHtml({
      username: 'Rajesh',
      shopName: 'Sharma Kirana Store',
      loginUrl: sampleLoginUrl,
    }),
  },
  {
    id: 'reset',
    label: 'Password Reset',
    description: 'Security-focused email using the same visual shell and branding.',
    html: buildPasswordResetHtml({
      resetUrl: sampleResetUrl,
    }),
  },
  {
    id: 'report-ready',
    label: 'Report Ready',
    description: 'Future report-delivery email for weekly or monthly business summaries.',
    html: buildReportReadyEmailHtml({
      username: 'Rajesh',
      reportPeriodLabel: 'weekly',
      reportUrl: sampleReportUrl,
      keyInsight: 'Profit margin improved by 3.8% this week, but overdue udhaar has grown faster than sales.',
      scoreLabel: 'Stress Index',
      scoreValue: '62 / 100',
    }),
  },
];

export default function EmailPreviewPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8edff_0%,_#f8fafc_46%,_#eef2ff_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 rounded-[28px] border border-[#d7def8] bg-white/85 p-8 shadow-[0_18px_60px_rgba(11,26,125,0.10)] backdrop-blur">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#735c00]">
            Brand Review
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-[#0b1a7d]">Vyapar AI Email Preview</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            These previews are generated from the same shared email builders used in production, so any design
            or copy changes here will match the real welcome and forgot-password emails.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          {previewCards.map((card) => (
            <section
              key={card.id}
              className="overflow-hidden rounded-[28px] border border-[#d7def8] bg-white shadow-[0_18px_60px_rgba(11,26,125,0.10)]"
            >
              <div className="border-b border-[#e6ebff] bg-[linear-gradient(135deg,_#0b1a7d_0%,_#2446d8_100%)] px-6 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4d77b]">{card.label}</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{card.description}</p>
              </div>
              <div className="bg-[#edf2ff] p-4">
                <iframe
                  title={card.label}
                  srcDoc={card.html}
                  className="h-[900px] w-full rounded-[20px] border border-[#d7def8] bg-white"
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
