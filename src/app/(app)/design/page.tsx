import type { Metadata } from "next";
import { Icon, ICON_NAMES } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Design system" };

const COLORS = [
  { name: "Lagoon", token: "--lagoon", hex: "#0C9AA6", use: "Primary actions, links" },
  { name: "Lagoon deep", token: "--lagoon-deep", hex: "#07737C", use: "Pressed and text accents" },
  { name: "Iris", token: "--iris", hex: "#5864EC", use: "Journals, secondary charts" },
  { name: "Coral", token: "--coral", hex: "#F2614C", use: "Highlights, warnings" },
  { name: "Saffron", token: "--saffron", hex: "#EE9B12", use: "Awards, attention" },
  { name: "Mint", token: "--mint", hex: "#1FA872", use: "Success, current role" },
  { name: "Ink", token: "--ink", hex: "#0D1B2A", use: "Headings and body text" },
  { name: "Background", token: "--bg", hex: "#F3F6F9", use: "Page background" },
];

export default function DesignPage() {
  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="eyebrow">Reference</p>
          <h1>Design system</h1>
          <p className="lede">
            The colours, type and building blocks taken from the approved prototype. Every page is built from these.
          </p>
        </div>
      </header>

      <div className="bento">
        <section className="card glass s12">
          <h2 className="c-title">
            <span className="ic">
              <Icon name="palette" />
            </span>
            Colours
          </h2>
          <div className="swatches">
            {COLORS.map((c) => (
              <div key={c.token} className="swatch" style={{ ["--c" as string]: `var(${c.token})` }}>
                <i />
                <span>
                  <b>{c.name}</b>
                  <br />
                  <code>{c.hex}</code>
                  <br />
                  <span className="muted" style={{ padding: 0 }}>
                    {c.use}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card glass s6">
          <h2 className="c-title">
            <span className="ic" style={{ ["--c" as string]: "var(--iris)" }}>
              <Icon name="book" />
            </span>
            Type
          </h2>
          <p className="eyebrow">Display · Bricolage Grotesque</p>
          <p style={{ fontFamily: "var(--f-display)", fontSize: 40, fontWeight: 750, letterSpacing: "-.035em", lineHeight: 1.05 }}>
            Dr. Amina Raza
          </p>
          <p className="eyebrow">Body · Geist</p>
          <p className="text-ink-2">
            Amina leads the language technology track of the AI Lab. Her research makes large language models useful for
            low-resource languages.
          </p>
          <p className="eyebrow">Data · Geist Mono</p>
          <p className="mono">10.1109/nf.2025.04821 · h-index 12 · 1,284 citations</p>
        </section>

        <section className="card glass s6">
          <h2 className="c-title">
            <span className="ic" style={{ ["--c" as string]: "var(--coral)" }}>
              <Icon name="spark" />
            </span>
            Controls
          </h2>
          <div className="actions">
            <button className="btn btn-primary" type="button">
              <Icon name="plus" />
              Primary
            </button>
            <button className="btn" type="button">
              <Icon name="eye" />
              Secondary
            </button>
            <button className="btn btn-ghost" type="button">
              Ghost
            </button>
            <button className="btn btn-sm" type="button">
              Small
            </button>
            <button className="icon-btn" type="button" aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="actions">
            <span className="chip">AI · Artificial Intelligence Lab</span>
            <span className="chip" style={{ ["--c" as string]: "var(--coral)" }}>
              CV · Computer Vision
            </span>
            <span className="chip" style={{ ["--c" as string]: "var(--mint)" }}>
              Current
            </span>
          </div>
          <div className="actions">
            <span className="tag">PyTorch</span>
            <span className="tag">NLP</span>
            <span className="tag">Speech Recognition</span>
          </div>
          <label className="eyebrow" htmlFor="demo-input">
            Input
          </label>
          <input id="demo-input" className="input" placeholder="name@northfield.edu" />
          <div className="actions">
            <span className="av" style={{ ["--s" as string]: "44px" }}>
              AR
            </span>
            <span className="av" style={{ ["--s" as string]: "44px", ["--a1" as string]: "var(--coral)", ["--a2" as string]: "var(--saffron)" }}>
              LB
            </span>
            <span className="av" style={{ ["--s" as string]: "44px", ["--a1" as string]: "var(--mint)", ["--a2" as string]: "var(--lagoon)" }}>
              MC
            </span>
          </div>
        </section>

        <section className="card glass s12">
          <h2 className="c-title">
            <span className="ic" style={{ ["--c" as string]: "var(--saffron)" }}>
              <Icon name="star" />
            </span>
            Icons
          </h2>
          <div className="icon-grid">
            {ICON_NAMES.map((n) => (
              <div key={n}>
                <Icon name={n} />
                {n}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
