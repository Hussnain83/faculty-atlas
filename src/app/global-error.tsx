"use client";

/** Last-resort page when even the root layout fails. It has no access to the app's styles, so it styles itself. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(140deg,#e6f6f7,#eef0ff)", font: "16px/1.5 system-ui, sans-serif", color: "#0D1B2A" }}>
        <title>Something went wrong · Faculty Atlas</title>
        <main style={{ maxWidth: 420, padding: 32, borderRadius: 24, background: "rgba(255,255,255,.85)", boxShadow: "0 30px 60px -30px rgba(13,27,42,.4)", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Faculty Atlas could not load</h1>
          <p style={{ margin: "0 0 20px", color: "#4A5A6A" }}>Please try again. If it keeps happening, contact the research office.</p>
          <button type="button" onClick={() => retry()} style={{ border: 0, borderRadius: 12, padding: "12px 20px", background: "#0C9AA6", color: "#fff", font: "600 15px system-ui, sans-serif", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
