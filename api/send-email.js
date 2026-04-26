import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: "Missing fields" });

  const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: {
      user: "info@southvacdewatering.com",
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: '"SouthVac Compliance" <info@southvacdewatering.com>',
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, "<br>"),
  });

  res.status(200).json({ ok: true });
}
