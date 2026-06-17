import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: inv, error } = await createAdminClient()
    .from('invoices')
    .select('*, bookings(id, start_time, address, contacts(name,email,phone), workers(name))')
    .eq('id', id)
    .single();

  if (error || !inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const L = 40;
  const R = 555;
  const W = R - L;
  let y = 48;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('INVOICE', L, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`#${id.slice(0, 8).toUpperCase()}`, R, y, { align: 'right' });
  y += 18;

  const statusColors: Record<string, [number, number, number]> = {
    draft: [150, 150, 150],
    sent: [37, 99, 235],
    paid: [22, 163, 74],
    void: [220, 38, 38],
  };
  const [sr, sg, sb] = statusColors[inv.status] ?? [150, 150, 150];
  doc.setTextColor(sr, sg, sb);
  doc.setFont('helvetica', 'bold');
  doc.text(inv.status.toUpperCase(), R, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  y += 30;
  doc.setDrawColor(220, 220, 220);
  doc.line(L, y, R, y);
  y += 20;

  // Bill to
  const contact = (inv.bookings as any)?.contacts;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('BILL TO', L, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  if (contact?.name) { doc.text(contact.name, L, y); y += 15; }
  if (contact?.email) { doc.setTextColor(37, 99, 235); doc.text(contact.email, L, y); doc.setTextColor(0, 0, 0); y += 15; }
  if (contact?.phone) { doc.text(contact.phone, L, y); y += 15; }

  // Date info (right column)
  const booking = inv.bookings as any;
  const infoY = y - (contact ? (contact.name ? 15 : 0) + (contact.email ? 15 : 0) + (contact.phone ? 15 : 0) : 0) - 14;
  const col2 = L + W * 0.55;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('ISSUE DATE', col2, infoY);
  doc.text('DUE DATE', col2 + 100, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(new Date(inv.created_at).toLocaleDateString('en-GB'), col2, infoY + 14);
  doc.text(inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : '—', col2 + 100, infoY + 14);

  if (booking?.start_time) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('JOB DATE', col2, infoY + 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(booking.start_time).toLocaleDateString('en-GB'), col2, infoY + 48);
  }

  y += 24;
  doc.setDrawColor(220, 220, 220);
  doc.line(L, y, R, y);
  y += 20;

  // Line items table header
  doc.setFillColor(245, 245, 245);
  doc.rect(L, y - 4, W, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('DESCRIPTION', L + 6, y + 10);
  doc.text('QTY', L + W * 0.6, y + 10, { align: 'right' });
  doc.text('UNIT PRICE', L + W * 0.78, y + 10, { align: 'right' });
  doc.text('TOTAL', R, y + 10, { align: 'right' });
  y += 26;

  // Line items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const lineItems: Array<{ description: string; qty: number; unit_price: number }> = inv.line_items ?? [];

  for (const li of lineItems) {
    doc.text(li.description || '—', L + 6, y);
    doc.text(String(li.qty), L + W * 0.6, y, { align: 'right' });
    doc.text(`$${Number(li.unit_price).toFixed(2)}`, L + W * 0.78, y, { align: 'right' });
    doc.text(`$${(li.qty * li.unit_price).toFixed(2)}`, R, y, { align: 'right' });
    y += 20;
    doc.setDrawColor(235, 235, 235);
    doc.line(L, y - 6, R, y - 6);
  }

  if (lineItems.length === 0) {
    doc.setTextColor(150, 150, 150);
    doc.text('No line items', L + 6, y);
    y += 20;
  }

  y += 10;

  // Total
  doc.setDrawColor(0, 0, 0);
  doc.line(L + W * 0.6, y, R, y);
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL DUE', L + W * 0.6, y);
  doc.setFontSize(14);
  doc.text(`$${Number(inv.total).toFixed(2)}`, R, y, { align: 'right' });
  y += 30;

  // Notes
  if (inv.notes) {
    doc.setDrawColor(220, 220, 220);
    doc.line(L, y, R, y);
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('NOTES', L, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const noteLines = doc.splitTextToSize(inv.notes, W);
    doc.text(noteLines, L, y);
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text('Generated by Jobro', L, 800);
  doc.text(new Date().toLocaleDateString('en-GB'), R, 800, { align: 'right' });

  const pdfBytes = doc.output('arraybuffer');

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id.slice(0, 8)}.pdf"`,
    },
  });
}
