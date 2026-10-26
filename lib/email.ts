import 'server-only';
import { Resend } from 'resend';

export type RegistrationNotice = {
  supplierId: string;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  telephone: string;
  businessNature: string;
  categories: string[];
  items: { his_item_code?: string; description: string; unit: string; unit_price: number }[];
  documentCount: number;
};

const esc = (v: unknown) =>
  String(v ?? '—').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export async function sendAdminNotification(n: RegistrationNotice) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = (process.env.ADMIN_NOTIFICATION_EMAIL ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!apiKey || !from || to.length === 0) throw new Error('Resend environment variables are missing');

  const resend = new Resend(apiKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const itemRows = n.items
    .map(
      (it, i) => `<tr>
        <td style="padding:6px;border:1px solid #ddd">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ddd">${esc(it.his_item_code)}</td>
        <td style="padding:6px;border:1px solid #ddd">${esc(it.description)}</td>
        <td style="padding:6px;border:1px solid #ddd">${esc(it.unit)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${esc(
          Number(it.unit_price).toLocaleString('en-LK', { minimumFractionDigits: 2 }),
        )}</td>
      </tr>`,
    )
    .join('');

  const html = `
  <div style="font-family:Arial,sans-serif;color:#1B2A4A;max-width:720px">
    <h2 style="background:#1B2A4A;color:#fff;padding:14px 18px;margin:0">New Supplier Pre-Qualification</h2>
    <table style="border-collapse:collapse;width:100%;margin-top:12px;font-size:14px">
      <tr><td style="padding:6px;font-weight:bold;width:200px">Reference</td><td style="padding:6px;font-family:monospace;font-size:16px">${esc(n.supplierCode)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Company</td><td style="padding:6px">${esc(n.companyName)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Contact person</td><td style="padding:6px">${esc(n.contactPerson)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Email</td><td style="padding:6px">${esc(n.email)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Telephone</td><td style="padding:6px">${esc(n.telephone)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Nature of business</td><td style="padding:6px;text-transform:capitalize">${esc(n.businessNature)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Categories</td><td style="padding:6px">${esc(n.categories.join('; '))}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Documents uploaded</td><td style="padding:6px">${n.documentCount}</td></tr>
    </table>
    <h3 style="margin-top:20px">Items &amp; Prices (${n.items.length})</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:6px;border:1px solid #ddd">#</th>
        <th style="padding:6px;border:1px solid #ddd">HIS Item Code</th>
        <th style="padding:6px;border:1px solid #ddd;text-align:left">Description</th>
        <th style="padding:6px;border:1px solid #ddd">Unit</th>
        <th style="padding:6px;border:1px solid #ddd;text-align:right">Unit Price (LKR)</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <p style="margin-top:20px"><a href="${esc(siteUrl)}/admin/suppliers/${esc(n.supplierId)}"
      style="background:#C9A227;color:#1B2A4A;padding:10px 16px;text-decoration:none;font-weight:bold">Review in Admin Dashboard</a></p>
    <p style="font-size:12px;color:#666">Reply to this email to contact the supplier directly.</p>
  </div>`;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: n.email,
    subject: `[Supplier Pre-Qualification] ${n.companyName} — HIS ${n.supplierCode}`,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
