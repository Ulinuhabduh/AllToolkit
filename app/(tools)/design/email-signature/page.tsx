'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Code2, Check } from 'lucide-react';

type Template = 'modern' | 'classic' | 'minimal';

interface SigData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  photoUrl: string;
  linkedin: string;
  twitter: string;
  primary: string;
  template: Template;
}

const DEFAULT: SigData = {
  name: 'Alex Morgan',
  title: 'Product Designer',
  company: 'Acme Studio',
  email: 'alex@acme.studio',
  phone: '+1 555 0123',
  website: 'https://acme.studio',
  address: 'San Francisco, CA',
  photoUrl: '',
  linkedin: 'https://linkedin.com/in/alexmorgan',
  twitter: '',
  primary: '#6366F1',
  template: 'modern',
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}

function buildHtml(d: SigData): string {
  const esc = escapeHtml;
  const link = (url: string, label: string) =>
    `<a href="${esc(url)}" style="color:${esc(d.primary)};text-decoration:none">${esc(label)}</a>`;
  const photoCell = d.photoUrl
    ? `<td style="vertical-align:top;padding:0 16px 0 0"><img src="${esc(d.photoUrl)}" width="80" height="80" style="border-radius:50%;display:block" alt=""></td>`
    : '';

  if (d.template === 'modern') {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333;line-height:1.5">
  <tr>
    ${photoCell}
    <td style="vertical-align:top;border-left:3px solid ${esc(d.primary)};padding:0 0 0 16px">
      <div style="font-size:16px;font-weight:bold;color:#111">${esc(d.name)}</div>
      <div style="color:#666">${esc(d.title)}${d.company ? ` · <strong style="color:#111">${esc(d.company)}</strong>` : ''}</div>
      <div style="margin-top:8px;font-size:12px">
        ${d.phone ? `📞 ${esc(d.phone)} &nbsp;|&nbsp; ` : ''}
        ${d.email ? `✉ ${link(`mailto:${d.email}`, d.email)}` : ''}
      </div>
      ${d.website || d.address ? `<div style="font-size:12px;color:#666">${d.website ? link(d.website, d.website.replace(/^https?:\/\//, '')) : ''}${d.website && d.address ? ' &nbsp;·&nbsp; ' : ''}${esc(d.address)}</div>` : ''}
      ${d.linkedin || d.twitter ? `<div style="margin-top:6px;font-size:12px">${d.linkedin ? link(d.linkedin, 'LinkedIn') : ''}${d.linkedin && d.twitter ? ' &nbsp;|&nbsp; ' : ''}${d.twitter ? link(d.twitter, 'Twitter') : ''}</div>` : ''}
    </td>
  </tr>
</table>`;
  }

  if (d.template === 'classic') {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#333">
  <tr><td>
    <div style="font-size:17px;font-weight:bold;color:#111">${esc(d.name)}</div>
    <div style="font-style:italic;color:#666">${esc(d.title)}</div>
    ${d.company ? `<div style="margin-top:4px;color:#111;font-weight:bold">${esc(d.company)}</div>` : ''}
    <hr style="border:none;border-top:1px solid ${esc(d.primary)};margin:8px 0;width:120px">
    <div style="font-size:12px;line-height:1.7">
      ${d.email ? `E: ${link(`mailto:${d.email}`, d.email)}<br>` : ''}
      ${d.phone ? `T: ${esc(d.phone)}<br>` : ''}
      ${d.website ? `W: ${link(d.website, d.website.replace(/^https?:\/\//, ''))}` : ''}
    </div>
  </td></tr>
</table>`;
  }

  // minimal
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#444;line-height:1.6">
  <tr><td>
    <strong style="color:#111;font-size:13px">${esc(d.name)}</strong> · ${esc(d.title)}${d.company ? ` · ${esc(d.company)}` : ''}<br>
    ${d.email ? link(`mailto:${d.email}`, d.email) : ''}${d.phone ? ` · ${esc(d.phone)}` : ''}${d.website ? ` · ${link(d.website, d.website.replace(/^https?:\/\//, ''))}` : ''}
  </td></tr>
</table>`;
}

export default function EmailSignaturePage() {
  const [d, setD] = useState<SigData>(DEFAULT);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedRich, setCopiedRich] = useState(false);

  const html = useMemo(() => buildHtml(d), [d]);

  function update<K extends keyof SigData>(key: K, value: SigData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }

  async function copyRich() {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([html], { type: 'text/plain' }) })];
      await navigator.clipboard.write(data);
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2000);
    } catch {
      alert('Rich copy not supported. Use "Copy HTML" instead and paste in your email client.');
    }
  }

  function copyHtml() {
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  }

  return (
    <ToolLayout slug="design/email-signature">
      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Template</div>
              <div className="grid grid-cols-3 gap-2">
                {(['modern', 'classic', 'minimal'] as Template[]).map((t) => (
                  <Button key={t} size="sm" variant={d.template === t ? 'default' : 'outline'} onClick={() => update('template', t)}>{t}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1"><Label>Full name</Label><Input value={d.name} onChange={(e) => update('name', e.target.value)} /></div>
              <div className="space-y-1"><Label>Title</Label><Input value={d.title} onChange={(e) => update('title', e.target.value)} /></div>
              <div className="space-y-1"><Label>Company</Label><Input value={d.company} onChange={(e) => update('company', e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={d.email} onChange={(e) => update('email', e.target.value)} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={d.phone} onChange={(e) => update('phone', e.target.value)} /></div>
              <div className="space-y-1"><Label>Website</Label><Input value={d.website} onChange={(e) => update('website', e.target.value)} placeholder="https://" /></div>
              <div className="space-y-1"><Label>Address</Label><Input value={d.address} onChange={(e) => update('address', e.target.value)} /></div>
              <div className="space-y-1"><Label>Photo URL (must be public URL)</Label><Input value={d.photoUrl} onChange={(e) => update('photoUrl', e.target.value)} placeholder="https://example.com/photo.jpg" /></div>
              <div className="space-y-1"><Label>LinkedIn URL</Label><Input value={d.linkedin} onChange={(e) => update('linkedin', e.target.value)} /></div>
              <div className="space-y-1"><Label>Twitter URL</Label><Input value={d.twitter} onChange={(e) => update('twitter', e.target.value)} /></div>
              <div className="space-y-1"><Label>Accent color</Label><Input type="color" value={d.primary} onChange={(e) => update('primary', e.target.value.toUpperCase())} className="h-10 w-20 p-1" /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 bg-white text-black">
              <div className="text-xs uppercase font-medium text-gray-500 mb-3">Preview</div>
              <div className="border-l-4 pl-4 border-gray-200" dangerouslySetInnerHTML={{ __html: html }} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Install signature</div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={copyRich}>
                  {copiedRich ? <><Check /> Copied!</> : <><Copy /> Copy formatted</>}
                </Button>
                <Button variant="outline" onClick={copyHtml}>
                  {copiedHtml ? <><Check /> Copied HTML!</> : <><Code2 /> Copy HTML source</>}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Gmail:</strong> Settings → See all settings → "Signature" → paste with Ctrl+V (formatted).</p>
                <p><strong>Outlook:</strong> File → Options → Mail → Signatures → paste with Ctrl+V.</p>
                <p><strong>Apple Mail:</strong> Mail → Settings → Signatures → paste with Cmd+V.</p>
                <p className="pt-2"><strong>Photo:</strong> Use a public URL (Imgur, Google Drive direct link, S3) — email clients can't read local files.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-2">HTML source</div>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto"><code>{html}</code></pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </ToolLayout>
  );
}
