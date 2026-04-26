import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { caseId, type, county, date, details, name, phone, email } = req.body;

  const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: {
      user: "info@southvacdewatering.com",
      pass: process.env.EMAIL_PASS,
    },
  });

  const urgencyColor = type?.urgency === "IMMEDIATE" ? "#FF4D4D" : "#FFB347";

  await transporter.sendMail({
    from: '"SouthVac Cases" <info@southvacdewatering.com>',
    to: "info@southvacdewatering.com",
    subject: `🚨 New Case ${caseId} — ${type?.label} | ${county}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0B0E0D; color: #E6E9E8; padding: 32px; border-radius: 12px;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 700;">South<span style="color: #CDFF4E;">Vac</span></span>
          <span style="margin-left: 12px; background: rgba(255,77,77,.15); color: #FF4D4D; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">New Case</span>
        </div>

        <div style="background: #131716; border: 1px solid #262C2B; border-left: 4px solid ${urgencyColor}; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <div style="font-size: 22px; font-weight: 700; margin-bottom: 4px;">${type?.icon || ""} ${type?.label || "Unknown"}</div>
          <div style="color: ${urgencyColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">⚡ ${type?.urgency || ""} — ${type?.fine || ""}/day</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${[
            ["Case ID", caseId],
            ["County", county],
            ["Violation Date", date],
            ["Contact Name", name],
            ["Phone", phone],
            ["Email", email],
          ].map(([label, value]) => `
            <tr>
              <td style="padding: 10px 14px; background: #131716; border: 1px solid #262C2B; color: #8B9492; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; width: 140px;">${label}</td>
              <td style="padding: 10px 14px; background: #131716; border: 1px solid #262C2B; color: #E6E9E8; font-size: 13px;">${value || "—"}</td>
            </tr>
          `).join("")}
        </table>

        <div style="background: #131716; border: 1px solid #262C2B; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
          <div style="font-size: 11px; color: #5A6563; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Site Conditions / Details</div>
          <div style="font-size: 14px; color: #E6E9E8; line-height: 1.7;">${details || "—"}</div>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #262C2B;">
          <a href="tel:+1${phone?.replace(/\D/g, "")}" style="display: inline-block; background: #FF4D4D; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 0 6px;">📞 Call Back</a>
          <a href="sms:+1${phone?.replace(/\D/g, "")}" style="display: inline-block; background: #25D366; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 0 6px;">💬 Text Back</a>
        </div>
      </div>
    `,
  });

  res.status(200).json({ ok: true });
}
