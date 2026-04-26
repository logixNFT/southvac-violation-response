import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";

const VIOLATION_TYPES = [
  { id: "stopwork", label: "Stop Work Order", icon: "🛑", color: "#FF4D4D", agency: "Building Dept / DERM / FDEP", urgency: "IMMEDIATE", fine: "$500–$10,000/day", desc: "Work halted by regulatory authority. Every day counts — fines accrue daily until corrective action is documented and accepted." },
  { id: "turbidity", label: "Turbidity / Sediment Discharge", icon: "🌊", color: "#FFB347", agency: "FDEP / DERM / MS4 Operator", urgency: "SAME DAY", fine: "$10,000–$50,000+", desc: "Sediment-laden or turbid water discharged to surface waters or MS4 without proper treatment. One of the most common and costly violations." },
  { id: "dewater", label: "Unpermitted Dewatering", icon: "💧", color: "#60A5FA", agency: "SFWMD / FDEP / DERM", urgency: "24–48 HOURS", fine: "$500–$10,000/day", desc: "Dewatering operations conducted without SFWMD ERP, FDEP CGP coverage, or without 72-hour advance notification." },
  { id: "swppp", label: "SWPPP / BMP Deficiency", icon: "📋", color: "#CDFF4E", agency: "FDEP / County Inspector", urgency: "48–72 HOURS", fine: "$1,000–$10,000/day", desc: "Missing, incomplete, or non-compliant Stormwater Pollution Prevention Plan. Failed or missing BMPs. No inspection logs." },
  { id: "erosion", label: "Erosion / Sedimentation", icon: "⛰️", color: "#FFD93D", agency: "FDEP / DERM / SFWMD", urgency: "24–48 HOURS", fine: "$5,000–$25,000+", desc: "Uncontrolled erosion from disturbed areas. Sediment leaving site boundaries. Failed perimeter controls." },
  { id: "wetland", label: "Wetland / Waterway Impact", icon: "🌿", color: "#4ADE80", agency: "DERM / USACE / FDEP", urgency: "IMMEDIATE", fine: "$10,000–$100,000+", desc: "Unauthorized fill, grading, or discharge into wetlands, mangroves, or waterways. Federal and state penalties apply." },
  { id: "nov", label: "Notice of Violation (NOV)", icon: "⚠️", color: "#FF8C42", agency: "Any Agency", urgency: "PER NOTICE", fine: "Varies", desc: "Formal notice requiring corrective action within specified timeframe. Failure to respond escalates to enforcement action and increased penalties." },
  { id: "contamination", label: "Contamination / Spill", icon: "☢️", color: "#E879F9", agency: "FDEP / DERM / EPA", urgency: "IMMEDIATE", fine: "$25,000–$250,000+", desc: "Petroleum, chemical, or hazardous material release to soil or water. Triggers cleanup requirements and potentially federal enforcement." },
];

const PROCESS_STEPS = [
  { n: "01", title: "Emergency Response", time: "0–4 hours", desc: "We mobilize to your site immediately. Stop the discharge, contain the problem, and prevent further violation. Deploy emergency BMPs — silt fence, turbidity barriers, inlet protection, sediment tanks.", items: ["Emergency BMP deployment", "Discharge containment / cessation", "Photo documentation of conditions", "Initial site assessment"] },
  { n: "02", title: "Violation Assessment", time: "4–24 hours", desc: "Review the NOV or stop work order. Identify every cited deficiency. Assess the full scope of corrective work needed — not just what's cited, but what an inspector will look for on the follow-up visit.", items: ["NOV / stop work order review", "Full site compliance audit", "Gap analysis vs. SWPPP requirements", "Agency contact & timeline confirmation"] },
  { n: "03", title: "Corrective Action Plan", time: "24–48 hours", desc: "Engineer a corrective action plan that addresses every deficiency and demonstrates good faith compliance. This document is what lifts the stop work order and satisfies the inspector.", items: ["Written corrective action plan (CAP)", "PE-stamped drawings if required", "BMP installation specifications", "Schedule for completion of all items"] },
  { n: "04", title: "Field Remediation", time: "48–96 hours", desc: "Execute the corrective action plan. Install BMPs, clean catch basins, deploy sediment tanks, repair failed erosion controls, vacuum contaminated discharge, and restore site to compliant condition.", items: ["BMP installation & repair", "Catch basin / inlet cleaning", "Sediment tank deployment", "Vacuum truck extraction of contaminated water"] },
  { n: "05", title: "Documentation & Closeout", time: "96+ hours", desc: "Compile the compliance documentation package — before/after photos, installation certifications, monitoring logs, and updated SWPPP. Submit to the agency and request inspection for case closure.", items: ["Before/after photo documentation", "Updated SWPPP with CAP appendix", "Monitoring logs & test results", "Agency submission & re-inspection coordination"] },
];

export default function StopWorkDERM() {
  const [activeViolation, setActiveViolation] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatPhase, setChatPhase] = useState("init");
  const [caseData, setCaseData] = useState({});
  const chatEnd = useRef(null);

  useEffect(() => {
    if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      setMessages([{ r: "bot", t: "🚨 <b>SouthVac Violation Response</b> — I'm here to help you get back to work.<br><br>What's your situation?" }]);
      setChatPhase("type");
    }
  }, [chatOpen]);

  function botReply(text, delay = 600) {
    setTimeout(() => setMessages(p => [...p, { r: "bot", t: text }]), delay);
  }

  function handleChat(msg) {
    if (!msg.trim()) return;
    setMessages(p => [...p, { r: "user", t: msg }]);
    setInput("");
    const lc = msg.toLowerCase();

    if (chatPhase === "type") {
      const matched = VIOLATION_TYPES.find(v =>
        lc.includes(v.id) || lc.includes(v.label.toLowerCase().split(" ")[0].toLowerCase()) ||
        (lc.includes("stop") && v.id === "stopwork") ||
        (lc.includes("turbid") && v.id === "turbidity") ||
        (lc.includes("sediment") && v.id === "turbidity") ||
        (lc.includes("dewater") && v.id === "dewater") ||
        (lc.includes("swppp") && v.id === "swppp") ||
        (lc.includes("bmp") && v.id === "swppp") ||
        (lc.includes("erosion") && v.id === "erosion") ||
        (lc.includes("wetland") && v.id === "wetland") ||
        (lc.includes("nov") && v.id === "nov") ||
        (lc.includes("notice") && v.id === "nov") ||
        (lc.includes("spill") && v.id === "contamination") ||
        (lc.includes("contam") && v.id === "contamination")
      );
      if (matched) {
        setCaseData(d => ({ ...d, type: matched }));
        botReply(`<span style="color:${matched.color}"><b>${matched.icon} ${matched.label}</b></span><br><br>Agency: ${matched.agency}<br>Typical fine: <b>${matched.fine}</b><br>Response window: <b>${matched.urgency}</b><br><br>${matched.desc}<br><br>Which <b>county</b> is the project in?`);
        setChatPhase("county");
      } else {
        botReply("What type of violation? Options include: <b>Stop Work Order</b>, <b>Turbidity/Sediment</b>, <b>Dewatering</b>, <b>SWPPP/BMP</b>, <b>Erosion</b>, <b>Wetland</b>, <b>NOV</b>, or <b>Contamination/Spill</b>.");
      }
    } else if (chatPhase === "county") {
      setCaseData(d => ({ ...d, county: msg }));
      botReply(`Got it — <b>${msg}</b>.<br><br>When was the violation issued? (today, yesterday, date, or approximate)`);
      setChatPhase("date");
    } else if (chatPhase === "date") {
      setCaseData(d => ({ ...d, date: msg }));
      const v = caseData.type;
      const isUrgent = v && (v.id === "stopwork" || v.id === "wetland" || v.id === "contamination");
      botReply(`${isUrgent ? "⏰ <b>This is time-critical.</b> Fines are accruing daily.<br><br>" : ""}Give me a quick description of the site conditions: what happened, what the inspector cited, and whether work has been halted.`);
      setChatPhase("details");
    } else if (chatPhase === "details") {
      setCaseData(d => ({ ...d, details: msg }));
      botReply("Last step — your <b>name, phone, and email</b> so our compliance team can call you back within <b>30 minutes</b>.");
      setChatPhase("contact");
    } else if (chatPhase === "contact") {
      const em = msg.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      const ph = msg.match(/[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]?\d{4}/);
      const nm = msg.replace(em?.[0] || "", "").replace(ph?.[0] || "", "").replace(/[,\-\/|]/g, " ").trim();
      const cid = "SV-VR-" + Date.now().toString(36).toUpperCase();
      const fullCase = { ...caseData, name: nm, phone: ph?.[0], email: em?.[0], caseId: cid };
      setCaseData(() => fullCase);
      botReply(`<b style="color:#4ADE80">✅ Case Opened: ${cid}</b><br><br>Violation type: ${caseData.type?.label}<br>County: ${caseData.county}<br>Contact: ${nm}<br><br>${caseData.type?.urgency === "IMMEDIATE" ? "🚨 <b>PRIORITY DISPATCH</b> — Our compliance team is mobilizing now. Expect a call within <b>15 minutes</b>." : "Our compliance specialist will call you within <b>30 minutes</b> to review the violation and schedule a site visit."}<br><br>In the meantime: <b>do not resume work</b> until we've assessed the corrective requirements. Continuing work under a stop work order escalates penalties significantly.`, 800);
      setChatPhase("done");
      // Save lead to Supabase
      supabase.from("leads").insert([{
        case_id: cid,
        type_id: caseData.type?.id,
        type_label: caseData.type?.label,
        type_icon: caseData.type?.icon,
        type_urgency: caseData.type?.urgency,
        county: caseData.county,
        violation_date: caseData.date,
        details: caseData.details,
        name: nm,
        phone: ph?.[0],
        email: em?.[0],
        source: "chat",
        status: "new",
      }]).then(() => {}).catch(() => {});

      // Email notification to SouthVac
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: cid,
          type: caseData.type,
          county: caseData.county,
          date: caseData.date,
          details: caseData.details,
          name: nm,
          phone: ph?.[0],
          email: em?.[0],
        }),
      }).catch(() => {});
    } else if (chatPhase === "done") {
      botReply("Your case is active. Our team is on it. For immediate questions, call or text <b>(786) 277-7534</b>.");
    }
  }

  const C = {
    acc: "#CDFF4E", bg: "#0B0E0D", card: "#131716", el: "#1A1F1D", brd: "#262C2B",
    tx: "#E6E9E8", tx2: "#8B9492", tx3: "#5A6563", danger: "#FF4D4D",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "'DM Sans', sans-serif" }}>
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.brd}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(11,14,13,.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22 }}>South<b style={{ color: C.acc }}>Vac</b></span>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "2px", color: C.danger, fontWeight: 700, background: "rgba(255,77,77,.12)", padding: "4px 12px", borderRadius: 6 }}>Violation Response</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="mailto:info@southvacdewatering.com" style={{ display: "flex", alignItems: "center", gap: 7, color: C.tx2, textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "8px 14px", border: `1px solid ${C.brd}`, borderRadius: 8, background: C.el }}>
            <span style={{ fontSize: 15 }}>✉️</span> info@southvacdewatering.com
          </a>
          <a href="tel:+17862777534" style={{ display: "flex", alignItems: "center", gap: 7, color: C.tx2, textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "8px 14px", border: `1px solid ${C.brd}`, borderRadius: 8, background: C.el }}>
            <span style={{ fontSize: 15 }}>📞</span> (786) 277-7534
          </a>
          <button onClick={() => setChatOpen(!chatOpen)} style={{ background: C.danger, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {chatOpen ? "✕ Close" : "🚨 Open Emergency Case"}
          </button>
        </div>
      </div>

      {/* FLOATING CONTACT WIDGET */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
        <a href="sms:+17862777534" style={{ display: "flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", textDecoration: "none", padding: "11px 18px", borderRadius: 50, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(37,211,102,.4)", fontFamily: "'DM Sans', sans-serif" }}>
          💬 Text Us Now
        </a>
        <a href="tel:+17862777534" style={{ display: "flex", alignItems: "center", gap: 8, background: C.danger, color: "#fff", textDecoration: "none", padding: "11px 18px", borderRadius: 50, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(255,77,77,.4)", fontFamily: "'DM Sans', sans-serif" }}>
          📞 Call (786) 277-7534
        </a>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        {/* MAIN */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px 40px", maxWidth: chatOpen ? "calc(100% - 400px)" : "100%" }}>
          {/* HERO */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "2.5px", color: C.danger, fontWeight: 700, marginBottom: 14 }}>Stop Work & Environmental Compliance</div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.08, letterSpacing: "-1.5px", maxWidth: 820, marginBottom: 20 }}>
              Got a <span style={{ color: C.danger, fontStyle: "italic" }}>Stop Work Order</span> or DERM Violation? We Get You Back on Schedule.
            </h1>
            <p style={{ fontSize: 17, color: C.tx2, maxWidth: 600, lineHeight: 1.75, marginBottom: 28 }}>
              Every day under a stop work order costs you schedule, money, and credibility with the Owner. We deploy within hours — not days — to remediate violations, install compliant BMPs, and build the documentation package that closes your case.
            </p>
            <div style={{ display: "flex", gap: 40, paddingTop: 28, borderTop: `1px solid ${C.brd}`, flexWrap: "wrap" }}>
              {[
                { n: "< 4 hr", l: "Emergency Mobilization" },
                { n: "$10K+", l: "Daily Fines Stopped" },
                { n: "100%", l: "Case Closure Rate" },
                { n: "3", l: "Counties Covered" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, color: i === 1 ? C.danger : C.acc, letterSpacing: -1 }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: C.tx3, textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* VIOLATION TYPES */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "2.5px", color: C.acc, fontWeight: 700, marginBottom: 14 }}>Violation Types We Handle</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, letterSpacing: "-.5px", marginBottom: 24 }}>
              Every Citation Has a <span style={{ color: C.acc, fontStyle: "italic" }}>Playbook</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {VIOLATION_TYPES.map(v => (
                <div key={v.id} onClick={() => setActiveViolation(activeViolation?.id === v.id ? null : v)}
                  style={{ background: activeViolation?.id === v.id ? C.el : C.card, border: `1px solid ${activeViolation?.id === v.id ? v.color : C.brd}`, borderRadius: 16, padding: "22px 20px", cursor: "pointer", transition: "all .2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 28 }}>{v.icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: v.color, background: v.color + "1A", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>{v.urgency}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: C.tx3, marginBottom: 8 }}>{v.agency}</div>
                  <div style={{ fontSize: 12, color: C.tx2, lineHeight: 1.6 }}>{v.desc}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.brd}` }}>
                    <span style={{ fontSize: 12, color: C.danger, fontWeight: 700 }}>Fine: {v.fine}</span>
                    {activeViolation?.id === v.id && (
                      <button onClick={(e) => { e.stopPropagation(); setChatOpen(true); handleChat(v.label); }}
                        style={{ background: C.danger, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        Open Case →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5-STEP PROCESS */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "2.5px", color: C.acc, fontWeight: 700, marginBottom: 14 }}>Our Process</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, letterSpacing: "-.5px", marginBottom: 8 }}>
              From Violation to <span style={{ color: C.acc, fontStyle: "italic" }}>Case Closed</span>
            </h2>
            <p style={{ fontSize: 15, color: C.tx2, maxWidth: 580, lineHeight: 1.7, marginBottom: 28 }}>Five-phase response protocol designed to stop fines from accruing, remediate the violation, and close the case with the agency as fast as possible.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {PROCESS_STEPS.map((s, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 16, padding: "28px 28px 28px 32px", position: "relative", overflow: "hidden", borderLeft: `4px solid ${C.acc}` }}>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 52, color: "rgba(205,255,78,.06)", position: "absolute", top: 12, right: 24, lineHeight: 1 }}>{s.n}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{s.title}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.acc, background: "rgba(205,255,78,.1)", padding: "3px 10px", borderRadius: 6 }}>{s.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.tx2, lineHeight: 1.7, marginBottom: 12, maxWidth: "80%" }}>{s.desc}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {s.items.map((item, j) => (
                      <span key={j} style={{ fontSize: 11, color: C.tx2, background: C.el, border: `1px solid ${C.brd}`, padding: "4px 10px", borderRadius: 6 }}>✓ {item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AGENCY REFERENCE */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "2.5px", color: C.acc, fontWeight: 700, marginBottom: 14 }}>Regulatory Landscape</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, letterSpacing: "-.5px", marginBottom: 24 }}>
              Who Enforces <span style={{ color: C.acc, fontStyle: "italic" }}>What</span> in South Florida
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { agency: "DERM (Miami-Dade)", scope: "Environmental permits, dewatering, wetlands, tree protection, wellfield protection, canal rights-of-way. Chapter 24 Code enforcement.", color: "#60A5FA", note: "Note: As of Oct 2025, DERM permitting authority partially transferred to RER Director. Enforcement structure in transition." },
                { agency: "FDEP", scope: "NPDES Construction Generic Permit (CGP), SWPPP enforcement, dewatering permits, water quality standards, contamination response.", color: "#CDFF4E", note: "Penalties up to $10,000/day per violation under ELRA. Criminal penalties for willful violations." },
                { agency: "SFWMD", scope: "Environmental Resource Permits (ERP), dewatering permits, stormwater management systems, 72-hr notification, storm event cessation.", color: "#4ADE80", note: "Governs all dewatering operations. Must cease during major storm events. Daily monitoring logs required." },
                { agency: "Broward County EPGMD", scope: "Environmental permits, wellfield protection, excavation permits, environmental assessments. Broward County Chapter 27.", color: "#FFB347", note: "Separate environmental review from Building Dept. Erosion control and tree protection enforcement." },
                { agency: "Municipal Building Depts", scope: "Building code enforcement, stop work orders, inspection holds, failed inspection correction, permit compliance.", color: "#FF8C42", note: "Stop work orders halt ALL construction activity on site. Daily fines accrue until correction accepted." },
                { agency: "USACE (Federal)", scope: "Section 404 Clean Water Act — dredge and fill in waters of the US, wetlands, navigable waterways.", color: "#E879F9", note: "Federal enforcement with penalties up to $25,000/day. Criminal penalties for knowing violations." },
              ].map((a, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.brd}`, borderRadius: 16, padding: 24, borderTop: `3px solid ${a.color}` }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: a.color }}>{a.agency}</div>
                  <div style={{ fontSize: 13, color: C.tx2, lineHeight: 1.7, marginBottom: 10 }}>{a.scope}</div>
                  <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.6, padding: "10px 12px", background: C.bg, borderRadius: 8, fontStyle: "italic" }}>{a.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: "rgba(255,77,77,.06)", border: "1px solid rgba(255,77,77,.2)", borderRadius: 20, padding: "48px 40px", textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚨</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, marginBottom: 12 }}>Don't Let Fines Stack Up</h2>
            <p style={{ fontSize: 15, color: C.tx2, maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.7 }}>Every hour under a stop work order is schedule delay, daily fines, and Owner confidence erosion. We mobilize within 4 hours.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setChatOpen(true)} style={{ background: C.danger, color: "#fff", border: "none", padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Open Emergency Case →</button>
              <a href="tel:+17862777534" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: C.tx, border: `1px solid ${C.brd}`, padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", fontFamily: "inherit" }}>📞 (786) 277-7534</a>
              <a href="sms:+17862777534" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D36622", color: "#25D366", border: "1px solid #25D36644", padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", fontFamily: "inherit" }}>💬 Text Us</a>
            </div>
          </div>
        </div>

        {/* CHAT */}
        {chatOpen && (
          <div style={{ width: 400, borderLeft: `1px solid ${C.brd}`, display: "flex", flexDirection: "column", background: C.card, flexShrink: 0 }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.brd}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: C.danger, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>!</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Violation Response Agent</div>
                  <div style={{ fontSize: 10, color: "#4ADE80" }}>● Priority line — immediate response</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a href="tel:+17862777534" title="Call" style={{ width: 32, height: 32, borderRadius: 8, background: C.el, border: `1px solid ${C.brd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, textDecoration: "none" }}>📞</a>
                <a href="sms:+17862777534" title="Text" style={{ width: 32, height: 32, borderRadius: 8, background: C.el, border: `1px solid ${C.brd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, textDecoration: "none" }}>💬</a>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  maxWidth: "88%", padding: "11px 15px", borderRadius: 14, fontSize: 13, lineHeight: 1.6,
                  ...(m.r === "user"
                    ? { background: C.danger, color: "#fff", alignSelf: "flex-end", borderBottomRightRadius: 3, fontWeight: 500 }
                    : { background: C.el, border: `1px solid ${C.brd}`, alignSelf: "flex-start", borderBottomLeftRadius: 3 })
                }} dangerouslySetInnerHTML={{ __html: m.t }} />
              ))}
              <div ref={chatEnd} />
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.brd}`, display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChat(input)}
                placeholder="Describe your violation..."
                style={{ flex: 1, background: C.el, border: `1px solid ${C.brd}`, borderRadius: 10, padding: "10px 14px", color: C.tx, fontFamily: "inherit", fontSize: 13, outline: "none" }} />
              <button onClick={() => handleChat(input)}
                style={{ background: C.danger, border: "none", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: "#fff" }}>➤</button>
            </div>
            <div style={{ padding: "8px 16px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Stop Work Order", "Turbidity Violation", "SWPPP Deficiency", "Unpermitted Dewatering"].map((q, i) => (
                <button key={i} onClick={() => handleChat(q)} style={{ background: C.bg, border: `1px solid ${C.brd}`, color: C.tx2, padding: "5px 10px", borderRadius: 100, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{q}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
