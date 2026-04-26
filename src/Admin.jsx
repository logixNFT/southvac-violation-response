import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS;

const C = {
  acc: "#CDFF4E", bg: "#0B0E0D", card: "#131716", el: "#1A1F1D", brd: "#262C2B",
  tx: "#E6E9E8", tx2: "#8B9492", tx3: "#5A6563", danger: "#FF4D4D",
};

const STATUS = {
  new:          { label: "New",         color: "#60A5FA", bg: "rgba(96,165,250,.12)" },
  contacted:    { label: "Contacted",   color: "#FFB347", bg: "rgba(255,179,71,.12)" },
  in_progress:  { label: "In Progress", color: "#CDFF4E", bg: "rgba(205,255,78,.12)" },
  closed_won:   { label: "Closed ✓",   color: "#4ADE80", bg: "rgba(74,222,128,.12)" },
  closed_lost:  { label: "Lost",        color: "#5A6563", bg: "rgba(90,101,99,.12)" },
};

const TEMPLATES = [
  {
    id: "followup",
    label: "Initial Follow-Up",
    subject: l => `Your SouthVac Case — ${l.type_label || "Violation Response"}`,
    body: l => `Hi ${l.name?.split(" ")[0] || "there"},

Thank you for reaching out to SouthVac. We've reviewed your case regarding a ${l.type_label || "violation"} in ${l.county || ""} County.

Our compliance team is ready to mobilize and get you back to work. Given the urgency of your situation, we recommend moving quickly to stop fines from accruing.

Please call or text us at (786) 277-7534 at your earliest convenience so we can confirm site access and schedule your assessment.

Best,
SouthVac Compliance Team
(786) 277-7534 | info@southvacdewatering.com`,
  },
  {
    id: "proposal",
    label: "Send Proposal",
    subject: l => `SouthVac Proposal — ${l.type_label || "Violation Remediation"}`,
    body: l => `Hi ${l.name?.split(" ")[0] || "there"},

Following our conversation, please find our proposed scope of work for ${l.type_label || "violation"} remediation at your ${l.county || ""} County project.

Scope includes:
• Emergency BMP installation and repair
• Corrective Action Plan (CAP) preparation
• Agency coordination and documentation
• Re-inspection support through case closure

We are prepared to mobilize immediately upon your authorization. Please review and let us know if you have any questions.

Best,
SouthVac Compliance Team
(786) 277-7534 | info@southvacdewatering.com`,
  },
  {
    id: "checkin",
    label: "Check-In",
    subject: l => `Following Up — Your SouthVac Case`,
    body: l => `Hi ${l.name?.split(" ")[0] || "there"},

I wanted to follow up on your ${l.type_label || "violation"} case in ${l.county || ""} County. Has the situation been resolved, or is your team still in need of compliance support?

We're available immediately and can mobilize within 4 hours of authorization.

Feel free to call or text (786) 277-7534 anytime.

Best,
SouthVac Compliance Team`,
  },
  {
    id: "closed",
    label: "Case Closed",
    subject: l => `Your SouthVac Case Is Closed`,
    body: l => `Hi ${l.name?.split(" ")[0] || "there"},

Great news — your ${l.type_label || "violation"} case has been officially closed with the agency. All corrective actions have been completed and documented.

Thank you for trusting SouthVac with your compliance needs. If you have future violations, dewatering needs, or SWPPP requirements, we're always here.

A quick Google review would mean a lot to our team if you have a moment.

Best,
SouthVac Compliance Team
(786) 277-7534 | info@southvacdewatering.com`,
  },
];

const BLANK_LEAD = { name: "", phone: "", email: "", type_label: "", county: "", details: "", source: "manual" };

function Badge({ status }) {
  const s = STATUS[status] || STATUS.new;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: ".5px", flexShrink: 0 }}>
      {s.label}
    </span>
  );
}

export default function Admin() {
  const [authed, setAuthed]           = useState(false);
  const [pw, setPw]                   = useState("");
  const [pwError, setPwError]         = useState(false);
  const [leads, setLeads]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notes, setNotes]             = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [emailModal, setEmailModal]   = useState(false);
  const [emailForm, setEmailForm]     = useState({ to: "", subject: "", body: "" });
  const [sending, setSending]         = useState(false);
  const [emailSent, setEmailSent]     = useState(false);
  const [addModal, setAddModal]       = useState(false);
  const [newLead, setNewLead]         = useState(BLANK_LEAD);
  const [saving, setSaving]           = useState(false);

  async function login() {
    if (pw === ADMIN_PASS) {
      setAuthed(true);
      loadLeads();
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 2000);
    }
  }

  async function loadLeads() {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setLeads(l => l.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
  }

  async function saveNotes() {
    setSavingNotes(true);
    await supabase.from("leads").update({ notes, updated_at: new Date().toISOString() }).eq("id", selected.id);
    setLeads(l => l.map(x => x.id === selected.id ? { ...x, notes } : x));
    setSelected(s => ({ ...s, notes }));
    setSavingNotes(false);
  }

  async function sendEmail() {
    if (!emailForm.to || !emailForm.subject || !emailForm.body) return;
    setSending(true);
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      const entry = `[${new Date().toLocaleDateString()}] Email sent: "${emailForm.subject}"`;
      const updatedNotes = selected.notes ? `${selected.notes}\n${entry}` : entry;
      const newStatus = selected.status === "new" ? "contacted" : selected.status;
      await supabase.from("leads").update({ notes: updatedNotes, status: newStatus, updated_at: new Date().toISOString() }).eq("id", selected.id);
      setLeads(l => l.map(x => x.id === selected.id ? { ...x, notes: updatedNotes, status: newStatus } : x));
      setSelected(s => ({ ...s, notes: updatedNotes, status: newStatus }));
      setNotes(updatedNotes);
      setEmailSent(true);
      setTimeout(() => { setEmailModal(false); setEmailSent(false); }, 1800);
    } catch {}
    setSending(false);
  }

  async function addLead() {
    if (!newLead.name) return;
    setSaving(true);
    const cid = "SV-M-" + Date.now().toString(36).toUpperCase();
    const { data } = await supabase.from("leads").insert([{ ...newLead, case_id: cid, status: "new" }]).select();
    if (data?.[0]) setLeads(l => [data[0], ...l]);
    setAddModal(false);
    setNewLead(BLANK_LEAD);
    setSaving(false);
  }

  function openEmail(templateId) {
    const t = TEMPLATES.find(x => x.id === templateId) || TEMPLATES[0];
    setEmailForm({ to: selected.email || "", subject: t.subject(selected), body: t.body(selected) });
    setEmailModal(true);
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || [l.name, l.phone, l.email, l.county, l.type_label, l.case_id, l.source].some(v => v?.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = Object.fromEntries(Object.keys(STATUS).map(k => [k, leads.filter(l => l.status === k).length]));

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ background: C.card, border: `1px solid ${pwError ? C.danger : C.brd}`, borderRadius: 20, padding: "48px 40px", width: 360, textAlign: "center", transition: "border .2s" }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, marginBottom: 4, color: C.tx }}>South<b style={{ color: C.acc }}>Vac</b></div>
          <div style={{ fontSize: 11, color: C.tx3, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 32 }}>Admin Portal</div>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
            placeholder="Password" autoFocus
            style={{ width: "100%", background: C.el, border: `1px solid ${pwError ? C.danger : C.brd}`, borderRadius: 10, padding: "12px 16px", color: C.tx, fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
          />
          {pwError && <div style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>Incorrect password</div>}
          <button onClick={login} style={{ width: "100%", background: C.acc, color: C.bg, border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Sign In
          </button>
          <div style={{ marginTop: 20 }}>
            <a href="/" style={{ fontSize: 12, color: C.tx3, textDecoration: "none" }}>← Back to site</a>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN ADMIN ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.brd}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(11,14,13,.97)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: C.tx }}>South<b style={{ color: C.acc }}>Vac</b></span>
          <span style={{ fontSize: 11, color: C.tx3, textTransform: "uppercase", letterSpacing: "2px" }}>Lead Management</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadLeads} style={{ background: C.el, border: `1px solid ${C.brd}`, color: C.tx2, padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
          <button onClick={() => setAddModal(true)} style={{ background: C.acc, color: C.bg, border: "none", padding: "7px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Add Lead</button>
          <a href="/" style={{ background: C.el, border: `1px solid ${C.brd}`, color: C.tx2, padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "flex", alignItems: "center" }}>← Site</a>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.brd}`, overflowX: "auto" }}>
        {[{ k: "all", label: "Total", n: leads.length, color: C.tx }, ...Object.entries(STATUS).map(([k, v]) => ({ k, label: v.label, n: counts[k] || 0, color: v.color }))].map((s, i) => (
          <button key={s.k} onClick={() => setStatusFilter(s.k)}
            style={{ borderRight: `1px solid ${C.brd}`, padding: "14px 24px", background: statusFilter === s.k ? C.el : "transparent", border: "none", borderRight: `1px solid ${C.brd}`, cursor: "pointer", fontFamily: "inherit", textAlign: "left", flexShrink: 0, borderBottom: statusFilter === s.k ? `2px solid ${s.color}` : "2px solid transparent" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'Instrument Serif', serif" }}>{s.n}</div>
            <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 112px)" }}>

        {/* LEAD LIST */}
        <div style={{ width: selected ? 380 : "100%", borderRight: selected ? `1px solid ${C.brd}` : "none", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.brd}` }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, county..."
              style={{ width: "100%", background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "9px 14px", color: C.tx, fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: C.tx3, fontSize: 13 }}>Loading leads...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: C.tx3, fontSize: 13 }}>
                {leads.length === 0 ? "No leads yet. They'll appear here when someone submits a case." : "No leads match your search."}
              </div>
            ) : filtered.map(lead => (
              <div key={lead.id} onClick={() => { setSelected(lead); setNotes(lead.notes || ""); }}
                style={{ padding: "14px 16px", borderBottom: `1px solid ${C.brd}`, cursor: "pointer", background: selected?.id === lead.id ? C.el : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{lead.name || "Unknown"}</div>
                  <Badge status={lead.status} />
                </div>
                <div style={{ fontSize: 12, color: C.tx2, marginBottom: 3 }}>{lead.type_label || "—"}{lead.county ? ` · ${lead.county} Co.` : ""}</div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.tx3 }}>
                  <span>{lead.phone || "—"}</span>
                  {lead.source && lead.source !== "chat" && <span style={{ color: C.acc, fontWeight: 600 }}>{lead.source}</span>}
                  <span style={{ marginLeft: "auto" }}>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LEAD DETAIL */}
        {selected && (
          <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: C.tx3, marginTop: 3 }}>{selected.case_id} · Added {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "—"}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "6px 14px", color: C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>✕</button>
            </div>

            {/* STATUS BUTTONS */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <button key={k} onClick={() => updateStatus(selected.id, k)}
                    style={{ background: selected.status === k ? v.bg : C.el, border: `1px solid ${selected.status === k ? v.color : C.brd}`, borderRadius: 8, padding: "6px 14px", color: selected.status === k ? v.color : C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: selected.status === k ? 700 : 400 }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTACT INFO */}
            <div style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Contact</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["Phone", selected.phone, selected.phone ? `tel:+1${selected.phone.replace(/\D/g, "")}` : null],
                  ["Email", selected.email, selected.email ? `mailto:${selected.email}` : null],
                  ["County", `${selected.county || "—"} County`, null],
                  ["Violation Date", selected.violation_date || "—", null],
                  ["Source", selected.source || "chat", null],
                ].map(([label, val, href]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: C.tx3, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>
                    {href
                      ? <a href={href} style={{ fontSize: 13, color: C.acc, textDecoration: "none", fontWeight: 600 }}>{val || "—"}</a>
                      : <div style={{ fontSize: 13, color: C.tx }}>{val || "—"}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* VIOLATION DETAILS */}
            <div style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Violation</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{selected.type_icon} {selected.type_label || "—"}</div>
              {selected.type_urgency && <div style={{ fontSize: 11, color: C.danger, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".5px" }}>⚡ {selected.type_urgency}</div>}
              <div style={{ fontSize: 13, color: C.tx2, lineHeight: 1.75 }}>{selected.details || "No details provided."}</div>
            </div>

            {/* EMAIL OUTREACH */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Email Outreach</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => openEmail(t.id)}
                    style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "8px 14px", color: C.tx, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500 }}>
                    ✉️ {t.label}
                  </button>
                ))}
                <button onClick={() => { setEmailForm({ to: selected.email || "", subject: "", body: "" }); setEmailModal(true); }}
                  style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "8px 14px", color: C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
                  ✏️ Custom
                </button>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {selected.phone && (
                <>
                  <a href={`tel:+1${selected.phone.replace(/\D/g, "")}`} style={{ flex: 1, background: C.danger, color: "#fff", textDecoration: "none", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, textAlign: "center", fontFamily: "inherit" }}>📞 Call</a>
                  <a href={`sms:+1${selected.phone.replace(/\D/g, "")}`} style={{ flex: 1, background: "#25D366", color: "#fff", textDecoration: "none", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, textAlign: "center", fontFamily: "inherit" }}>💬 Text</a>
                </>
              )}
            </div>

            {/* NOTES */}
            <div style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Notes & Activity Log</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={7}
                placeholder="Add call notes, site observations, follow-up reminders..."
                style={{ width: "100%", background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "10px 14px", color: C.tx, fontFamily: "inherit", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
              <button onClick={saveNotes} disabled={savingNotes}
                style={{ marginTop: 10, background: C.acc, color: C.bg, border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", opacity: savingNotes ? .6 : 1 }}>
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── EMAIL MODAL ─────────────────────────────────────────────────────── */}
      {emailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
          <div style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 20, padding: 32, width: 600, maxWidth: "95vw", maxHeight: "92vh", overflow: "auto" }}>
            {emailSent ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4ADE80" }}>Email Sent!</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Compose Email</div>
                  <button onClick={() => setEmailModal(false)} style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "5px 12px", color: C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>✕</button>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Template</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setEmailForm(f => ({ ...f, subject: t.subject(selected), body: t.body(selected) }))}
                        style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 6, padding: "5px 12px", color: C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {[["TO", "to"], ["SUBJECT", "subject"]].map(([label, key]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{label}</div>
                    <input value={emailForm[key]} onChange={e => setEmailForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: "100%", background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "10px 14px", color: C.tx, fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>BODY</div>
                  <textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={12}
                    style={{ width: "100%", background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "10px 14px", color: C.tx, fontFamily: "inherit", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }} />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: C.tx3 }}>From: info@southvacdewatering.com</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEmailModal(false)} style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "10px 20px", color: C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
                    <button onClick={sendEmail} disabled={sending || !emailForm.to}
                      style={{ background: C.danger, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: sending || !emailForm.to ? .5 : 1 }}>
                      {sending ? "Sending..." : "Send →"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ADD LEAD MODAL ──────────────────────────────────────────────────── */}
      {addModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
          <div style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 20, padding: 32, width: 520, maxWidth: "95vw", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Add Lead Manually</div>
              <button onClick={() => setAddModal(false)} style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "5px 12px", color: C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[
                ["Name *", "name", "text"],
                ["Phone", "phone", "tel"],
                ["Email", "email", "email"],
                ["County", "county", "text"],
                ["Violation Type", "type_label", "text"],
                ["Source (SEO, referral, call…)", "source", "text"],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>{label}</div>
                  <input type={type} value={newLead[key] || ""} onChange={e => setNewLead(l => ({ ...l, [key]: e.target.value }))}
                    style={{ width: "100%", background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "9px 14px", color: C.tx, fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.tx3, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Details / Notes</div>
              <textarea value={newLead.details || ""} onChange={e => setNewLead(l => ({ ...l, details: e.target.value }))} rows={4}
                style={{ width: "100%", background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "9px 14px", color: C.tx, fontFamily: "inherit", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAddModal(false)} style={{ background: C.el, border: `1px solid ${C.brd}`, borderRadius: 8, padding: "10px 20px", color: C.tx2, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
              <button onClick={addLead} disabled={saving || !newLead.name}
                style={{ background: C.acc, color: C.bg, border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: saving || !newLead.name ? .5 : 1 }}>
                {saving ? "Saving..." : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
