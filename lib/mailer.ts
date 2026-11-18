import nodemailer from "nodemailer";

/**
 * 確認コードのメール送信（Gmail のアプリパスワードで送る。費用なし・1日500通まで）。
 * MAIL_USER と MAIL_APP_PASSWORD が無い環境では送信しない（登録はメール確認なしで続く）。
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.MAIL_USER?.trim() && process.env.MAIL_APP_PASSWORD?.trim());
}

export async function sendCodeMail(params: { to: string; code: string; appName: string }): Promise<void> {
  const user = process.env.MAIL_USER?.trim() ?? "";
  const pass = (process.env.MAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT ?? 465),
    secure: Number(process.env.MAIL_PORT ?? 465) === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  const fromName = process.env.MAIL_FROM_NAME?.trim() || params.appName;
  await transporter.sendMail({
    from: { name: fromName, address: user },
    to: params.to,
    subject: `【${params.appName}】確認コード ${params.code}`,
    text: [
      `${params.appName} の確認コードです。`,
      "",
      `　${params.code}`,
      "",
      "画面にこの6桁を入れてください。10分で使えなくなります。",
      "心当たりがない場合は、このメールは無視してください。",
    ].join("\n"),
  });
}
