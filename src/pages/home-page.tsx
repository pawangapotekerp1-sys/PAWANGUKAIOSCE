import {
  ArrowRight,
  CheckCircle,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router";
import MarketingShell from "../components/layout/marketing-shell";
import { getButtonStyleProps } from "../components/ui/button";
import SectionHeading from "../components/ui/section-heading";
import {
  heroMetrics,
  homepageCopy,
  marketingFeatures,
  pricingPreview,
  simulationSteps,
} from "../mocks/marketing-content";

function HomePage() {
  return (
    <MarketingShell
      footer={
        <footer className="rounded-3xl border bg-card px-5 py-5 shadow-sm mt-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                {homepageCopy.brand}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {homepageCopy.footerNote}
              </p>
            </div>
            <Link
              {...getButtonStyleProps({
                size: "lg",
                variant: "outline",
              })}
              to="/auth/login"
            >
              {homepageCopy.heroPrimaryCta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </footer>
      }
    >
      <section className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)] lg:items-stretch lg:pt-8">
        <section className="overflow-hidden rounded-3xl bg-muted p-6 lg:p-8 border shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Stethoscope className="h-4 w-4" />
            Persiapan ujian profesi apoteker
          </div>

          <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,5vw,5.2rem)] font-bold leading-[0.98] tracking-tight text-foreground">
            {homepageCopy.heroTitle}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-foreground/80">
            {homepageCopy.heroDescription}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            {homepageCopy.heroLead}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              {...getButtonStyleProps({
                size: "lg",
                variant: "primary",
              })}
              to="/auth/login"
            >
              {homepageCopy.heroPrimaryCta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a
              {...getButtonStyleProps({
                size: "lg",
                variant: "outline",
              })}
              href="#simulasi"
            >
              {homepageCopy.heroSecondaryCta}
            </a>
          </div>

          <dl className="mt-8 grid gap-3 border-t pt-6 md:grid-cols-3">
            {heroMetrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl bg-background/50 px-4 py-4 backdrop-blur-sm shadow-sm border">
                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-lg font-bold text-foreground">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <aside className="overflow-hidden rounded-3xl bg-primary text-primary-foreground p-6 lg:p-7 shadow-sm">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
            Jalur belajar
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight">
            Sesi besar lebih dulu, review tajam setelahnya.
          </h2>
          <p className="mt-4 text-sm leading-7 text-primary-foreground/80">
            Halaman ini menegaskan satu hal: hasil try out adalah pusat keputusan
            belajar, sedangkan fitur lain hadir untuk memperjelas langkah berikutnya.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                Simulasi prioritas
              </p>
              <p className="mt-3 text-2xl font-bold">50 soal dengan timer aktif</p>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
                Untuk membaca stamina, fokus, dan pola salah saat tekanan waktu ikut bermain.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl bg-primary-foreground/10 px-4 py-4">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                  Review sesudah sesi
                </p>
                <p className="mt-3 text-lg font-bold">Blok lemah terlihat lebih cepat</p>
                <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
                  Analitik menandai area yang perlu diulang sebelum energi belajar tersebar.
                </p>
              </div>

              <div className="rounded-2xl bg-background text-foreground px-4 py-4 shadow-sm border">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI opsional
                </p>
                <p className="mt-3 text-lg font-bold">Dipakai saat butuh pembacaan pola</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Bukan pusat produk, hanya pendamping ketika kamu ingin ringkasan lebih cepat.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section id="fitur" className="pt-12 lg:pt-16">
        <SectionHeading
          description={homepageCopy.featureDescription}
          eyebrow="Ringkasan fitur"
          title={homepageCopy.featureHeading}
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <article className="grid gap-4 rounded-3xl bg-card border shadow-sm p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:p-6">
            {marketingFeatures.slice(0, 2).map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="rounded-2xl border bg-muted/50 px-5 py-5"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold leading-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-foreground/80">
                    {feature.summary}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {feature.detail}
                  </p>
                </div>
              );
            })}
          </article>

          <article className="rounded-3xl bg-muted border shadow-sm p-5 lg:p-6">
            {marketingFeatures.slice(2).map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="flex h-full flex-col rounded-2xl border bg-background px-5 py-5 shadow-sm"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold leading-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-foreground/80">
                    {feature.summary}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {feature.detail}
                  </p>
                  <div className="mt-6 rounded-2xl bg-muted px-4 py-4 border shadow-sm">
                    <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                      Lapisan opsional
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Insight AI selalu dibingkai sebagai pembaca pola, bukan pengganti proses latihan.
                    </p>
                  </div>
                </div>
              );
            })}
          </article>
        </div>
      </section>

      <section id="simulasi" className="pt-12 lg:pt-16">
        <SectionHeading
          description={homepageCopy.simulationDescription}
          eyebrow="Alur berbasis simulasi"
          title={homepageCopy.simulationHeading}
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <article className="rounded-3xl bg-primary text-primary-foreground p-5 lg:p-6 shadow-sm">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
              Alur keputusan
            </p>
            <div className="mt-5 space-y-4">
              {simulationSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                          Langkah {step.accent}
                        </p>
                        <h3 className="mt-2 text-xl font-bold leading-tight">
                          {step.title}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-primary-foreground/80">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl bg-card border shadow-sm p-5 lg:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] h-full">
              <div className="rounded-2xl border bg-muted/50 px-5 py-5 flex flex-col justify-center shadow-sm">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  Kenapa dimulai dari simulasi
                </p>
                <p className="mt-4 text-2xl font-bold leading-tight text-foreground">
                  Karena rasa panik, stamina, dan pola salah baru terlihat saat sesi dijalankan penuh.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-muted px-4 py-4 flex flex-col justify-center border shadow-sm">
                  <p className="font-bold text-foreground">
                    Setelah try out, review tidak lagi acak.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Sistem menurunkan hasil simulasi menjadi urutan blok yang paling masuk akal untuk dipelajari ulang.
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/5 px-4 py-4 flex flex-col justify-center border border-primary/10 shadow-sm">
                  <p className="font-bold text-foreground">
                    Kamu tetap memegang keputusan belajar.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Insight AI hanya muncul sebagai pelengkap ketika kamu ingin membaca pola salah lebih cepat.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="harga" className="pt-12 lg:pt-16 pb-12">
        <SectionHeading
          description={homepageCopy.pricingDescription}
          eyebrow="Pratinjau langganan"
          title={homepageCopy.pricingHeading}
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <article className="rounded-3xl bg-muted p-5 lg:p-6 border shadow-sm">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              Pratinjau paket
            </p>
            <h3 className="mt-4 text-3xl font-bold leading-tight text-foreground">
              Mulai dari akses mingguan untuk pemanasan, lalu naik saat fase latihanmu sudah rapat.
            </h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Harga final dan detail manfaat bisa berubah saat halaman langganan selesai penuh, tetapi gambaran ini cukup untuk membantu calon pengguna memilih ritme awal.
            </p>
          </article>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            {pricingPreview.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-3xl p-5 lg:p-6 shadow-sm border ${
                  plan.emphasis === "accent"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground"
                }`}
              >
                <p
                  className={`font-mono text-xs font-semibold uppercase tracking-wider ${
                    plan.emphasis === "accent"
                      ? "text-primary-foreground/70"
                      : "text-primary"
                  }`}
                >
                  {plan.name}
                </p>
                <p
                  className={`mt-4 text-sm leading-6 ${
                    plan.emphasis === "accent"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {plan.tagline}
                </p>
                <div className="mt-5 flex items-end gap-2">
                  <p className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </p>
                  <p
                    className={`pb-1 text-sm font-medium ${
                      plan.emphasis === "accent"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {plan.cadence}
                  </p>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          plan.emphasis === "accent"
                            ? "text-background"
                            : "text-primary"
                        }`}
                      />
                      <span
                        className={`text-sm leading-6 ${
                          plan.emphasis === "accent"
                            ? "text-primary-foreground/90"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export default HomePage;
