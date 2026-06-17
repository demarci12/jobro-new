'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Material {
  description: string;
  qty: number;
  unit_cost: number;
}

interface DocData {
  work_notes: string;
  materials: Material[];
  checklist: Record<string, boolean>;
  worker_signature: string | null;
  customer_signature: string | null;
  before_photo_urls: string[];
  after_photo_urls: string[];
}

interface ChecklistItem {
  id: string;
  label: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'work_complete', label: 'All work completed as described' },
  { id: 'area_clean', label: 'Work area left clean and tidy' },
  { id: 'photos_taken', label: 'Before & after photos taken' },
  { id: 'materials_logged', label: 'All materials and parts logged' },
  { id: 'customer_informed', label: 'Customer informed of work done' },
];

export default function JobDocumentation({ bookingId, workerName, customerName }: {
  bookingId: string;
  workerName: string;
  customerName: string;
}) {
  const [data, setData] = useState<DocData>({
    work_notes: '',
    materials: [],
    checklist: {},
    worker_signature: null,
    customer_signature: null,
    before_photo_urls: [],
    after_photo_urls: [],
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  // Signature canvas refs
  const workerSigRef = useRef<HTMLCanvasElement>(null);
  const customerSigRef = useRef<HTMLCanvasElement>(null);

  // Load existing documentation
  useEffect(() => {
    fetch(`/api/bookings/${bookingId}/documentation`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setData({
            work_notes: d.work_notes ?? '',
            materials: d.materials ?? [],
            checklist: d.checklist ?? {},
            worker_signature: d.worker_signature ?? null,
            customer_signature: d.customer_signature ?? null,
            before_photo_urls: d.before_photo_urls ?? [],
            after_photo_urls: d.after_photo_urls ?? [],
          });
          // Restore signatures to canvases after load
          if (d.worker_signature) restoreSig(workerSigRef, d.worker_signature);
          if (d.customer_signature) restoreSig(customerSigRef, d.customer_signature);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  function restoreSig(ref: React.RefObject<HTMLCanvasElement | null>, dataUrl: string) {
    const canvas = ref.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => canvas.getContext('2d')!.drawImage(img, 0, 0);
    img.src = dataUrl;
  }

  function mark(update: Partial<DocData>) {
    setData(prev => ({ ...prev, ...update }));
    setDirty(true);
  }

  // ── Materials ──────────────────────────────────────────
  function addMaterial() {
    mark({ materials: [...data.materials, { description: '', qty: 1, unit_cost: 0 }] });
  }
  function updateMaterial(i: number, field: keyof Material, value: string | number) {
    const updated = data.materials.map((m, idx) => idx === i ? { ...m, [field]: value } : m);
    mark({ materials: updated });
  }
  function removeMaterial(i: number) {
    mark({ materials: data.materials.filter((_, idx) => idx !== i) });
  }
  const materialsTotal = data.materials.reduce((s, m) => s + (m.qty || 0) * (m.unit_cost || 0), 0);

  // ── Checklist ──────────────────────────────────────────
  function toggleCheck(id: string) {
    mark({ checklist: { ...data.checklist, [id]: !data.checklist[id] } });
  }
  const doneCount = DEFAULT_CHECKLIST.filter(item => data.checklist[item.id]).length;

  // ── Photos ─────────────────────────────────────────────
  async function handlePhotos(files: FileList | null, side: 'before' | 'after') {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map(f => new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target!.result as string);
      reader.readAsDataURL(f);
    })));
    if (side === 'before') mark({ before_photo_urls: [...data.before_photo_urls, ...urls] });
    else mark({ after_photo_urls: [...data.after_photo_urls, ...urls] });
  }
  function removePhoto(side: 'before' | 'after', i: number) {
    if (side === 'before') mark({ before_photo_urls: data.before_photo_urls.filter((_, idx) => idx !== i) });
    else mark({ after_photo_urls: data.after_photo_urls.filter((_, idx) => idx !== i) });
  }

  // ── Signatures ─────────────────────────────────────────
  function initSigPad(canvasRef: React.RefObject<HTMLCanvasElement | null>, field: 'worker_signature' | 'customer_signature') {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let drawing = false, lx = 0, ly = 0;

    function getPos(e: PointerEvent) {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)] as const;
    }
    canvas.addEventListener('pointerdown', e => { drawing = true; [lx, ly] = getPos(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drawing) return;
      const [x, y] = getPos(e);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
      [lx, ly] = [x, y];
    });
    canvas.addEventListener('pointerup', () => {
      drawing = false;
      mark({ [field]: canvas.toDataURL('image/png') });
    });
  }

  const workerSigInit = useRef(false);
  const customerSigInit = useRef(false);
  useEffect(() => { if (!loading && !workerSigInit.current) { initSigPad(workerSigRef, 'worker_signature'); workerSigInit.current = true; } }, [loading]);
  useEffect(() => { if (!loading && !customerSigInit.current) { initSigPad(customerSigRef, 'customer_signature'); customerSigInit.current = true; } }, [loading]);

  function clearSig(ref: React.RefObject<HTMLCanvasElement | null>, field: 'worker_signature' | 'customer_signature') {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    mark({ [field]: null });
  }

  // ── Save ───────────────────────────────────────────────
  const save = useCallback(async () => {
    setSaving(true);
    await fetch(`/api/bookings/${bookingId}/documentation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSavedAt(new Date());
    setDirty(false);
  }, [bookingId, data]);

  // Auto-save on dirty after 2s idle
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [dirty, save]);

  const sigCount = (data.worker_signature ? 1 : 0) + (data.customer_signature ? 1 : 0);
  const photoCount = data.before_photo_urls.length + data.after_photo_urls.length;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Loading…</div>;

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* ── Status summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatPill label="Photos" value={String(photoCount)} state={photoCount > 0 ? 'ok' : 'warn'} />
        <StatPill label="Checklist" value={`${doneCount}/${DEFAULT_CHECKLIST.length}`} state={doneCount === DEFAULT_CHECKLIST.length ? 'ok' : doneCount > 0 ? 'warn' : 'na'} />
        <StatPill label="Signatures" value={`${sigCount}/2`} state={sigCount === 2 ? 'ok' : sigCount === 1 ? 'warn' : 'na'} />
      </div>

      {/* ── Photos ── */}
      <Section title="Before & after photos" icon={<CameraIcon />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <PhotoGroup label="Before" photos={data.before_photo_urls} side="before" onAdd={handlePhotos} onRemove={removePhoto} />
          <PhotoGroup label="After" photos={data.after_photo_urls} side="after" onAdd={handlePhotos} onRemove={removePhoto} />
        </div>
      </Section>

      {/* ── Work notes ── */}
      <Section title="Work description" icon={<NotesIcon />}>
        <textarea
          className="input"
          style={{ minHeight: 110, resize: 'vertical', fontSize: 14, lineHeight: 1.6 }}
          placeholder="Describe what was done — faults found, parts replaced, work completed…"
          value={data.work_notes}
          onChange={e => mark({ work_notes: e.target.value })}
        />
      </Section>

      {/* ── Materials ── */}
      <Section title="Materials & parts used" icon={<BoxIcon />} aside={<span style={{ fontWeight: 700 }}>${materialsTotal.toFixed(2)}</span>}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--canvas)' }}>
                {['Item', 'Qty', 'Unit cost', 'Total', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.materials.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '3px 6px' }}>
                    <MatInput value={m.description} placeholder="Item description" onChange={v => updateMaterial(i, 'description', v)} />
                  </td>
                  <td style={{ padding: '3px 6px', width: 70 }}>
                    <MatInput value={String(m.qty)} type="number" align="right" onChange={v => updateMaterial(i, 'qty', parseFloat(v) || 0)} />
                  </td>
                  <td style={{ padding: '3px 6px', width: 90 }}>
                    <MatInput value={String(m.unit_cost)} type="number" align="right" step="0.01" onChange={v => updateMaterial(i, 'unit_cost', parseFloat(v) || 0)} />
                  </td>
                  <td style={{ padding: '4px 10px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    ${((m.qty || 0) * (m.unit_cost || 0)).toFixed(2)}
                  </td>
                  <td style={{ padding: '3px 6px' }}>
                    <button onClick={() => removeMaterial(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}
                      onMouseOver={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>×</button>
                  </td>
                </tr>
              ))}
              {data.materials.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '16px 12px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No materials added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          onClick={addMaterial}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 13, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-light)', border: '1px solid transparent', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add item
        </button>
      </Section>

      {/* ── Checklist ── */}
      <Section title="Completion checklist" icon={<CheckIcon />} aside={<span style={{ color: doneCount === DEFAULT_CHECKLIST.length ? '#16a34a' : 'var(--muted)', fontWeight: 600 }}>{doneCount}/{DEFAULT_CHECKLIST.length}</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {DEFAULT_CHECKLIST.map(item => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 8, cursor: 'pointer', userSelect: 'none', opacity: data.checklist[item.id] ? 0.65 : 1, transition: 'background 0.1s' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--canvas)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
              <CheckBox checked={!!data.checklist[item.id]} />
              <span style={{ fontSize: 14, fontWeight: 500, textDecoration: data.checklist[item.id] ? 'line-through' : 'none', color: data.checklist[item.id] ? 'var(--muted)' : 'var(--ink)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Signatures ── */}
      <Section title="Signatures" icon={<SigIcon />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SigPad label={`Worker — ${workerName}`} canvasRef={workerSigRef} onClear={() => clearSig(workerSigRef, 'worker_signature')} />
          <SigPad label={`Customer — ${customerName}`} canvasRef={customerSigRef} onClear={() => clearSig(customerSigRef, 'customer_signature')} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          By signing, the customer confirms the work described above has been completed to their satisfaction.
        </p>
      </Section>

      {/* ── Save bar ── */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: 'var(--paper)', borderTop: '1px solid var(--line)',
        padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 24,
      }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dirty ? '#f97316' : '#16a34a', display: 'inline-block' }} />
          {saving ? 'Saving…' : dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'No changes'}
        </span>
        <button className="btn ghost small" onClick={save} disabled={saving || !dirty}>
          Save now
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function Section({ title, icon, aside, children }: { title: string; icon: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ opacity: 0.6 }}>{icon}</span>
        {title}
        {aside && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{aside}</span>}
      </div>
      {children}
    </div>
  );
}

function StatPill({ label, value, state }: { label: string; value: string; state: 'ok' | 'warn' | 'na' }) {
  const color = state === 'ok' ? '#16a34a' : state === 'warn' ? '#f97316' : 'var(--muted)';
  return (
    <div style={{ background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function PhotoGroup({ label, photos, side, onAdd, onRemove }: {
  label: string; photos: string[]; side: 'before' | 'after';
  onAdd: (files: FileList | null, side: 'before' | 'after') => void;
  onRemove: (side: 'before' | 'after', i: number) => void;
}) {
  const inputId = `photo-input-${side}`;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {photos.map((url, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--canvas)', border: '1px solid var(--line)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <button
              onClick={() => onRemove(side, i)}
              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: '50%', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              ×
            </button>
          </div>
        ))}
        <label
          htmlFor={inputId}
          style={{ aspectRatio: '1', borderRadius: 8, border: '2px dashed var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLElement).style.color = 'var(--blue)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4v12M4 10h12" /></svg>
          Add photo
          <input id={inputId} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => onAdd(e.target.files, side)} />
        </label>
      </div>
    </div>
  );
}

function MatInput({ value, onChange, type = 'text', align, step, placeholder }: { value: string; onChange: (v: string) => void; type?: string; align?: string; step?: string; placeholder?: string }) {
  return (
    <input
      className="input"
      style={{ border: '1px solid transparent', fontSize: 13, padding: '5px 7px', textAlign: (align as any) ?? 'left' }}
      type={type} value={value} step={step} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,.08)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
      borderWidth: checked ? 0 : 2,
      borderStyle: 'solid',
      borderColor: checked ? 'transparent' : 'var(--line)',
      background: checked ? '#16a34a' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.12s, border-color 0.12s',
    }}>
      {checked && (
        <svg width="11" height="8" viewBox="0 0 11 8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4l3 3 6-6" />
        </svg>
      )}
    </div>
  );
}

function SigPad({ label, canvasRef, onClear }: { label: string; canvasRef: React.RefObject<HTMLCanvasElement | null>; onClear: () => void }) {
  return (
    <div style={{ background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        <button onClick={onClear} style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={110}
        style={{ display: 'block', width: '100%', height: 110, touchAction: 'none', cursor: 'crosshair', background: 'var(--paper)' }}
      />
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────
function CameraIcon() { return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5A1.5 1.5 0 013.5 6h.879l.707-1.5H14.914l.707 1.5H16.5A1.5 1.5 0 0118 7.5v8A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5v-8z" /><circle cx="10" cy="11" r="2.5" /></svg>; }
function NotesIcon() { return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h12M4 10h8M4 14h10" /></svg>; }
function BoxIcon() { return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h14l-1.5 9H4.5L3 7z" /><path d="M7 7V5a3 3 0 016 0v2" /></svg>; }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10l4 4 8-8" /></svg>; }
function SigIcon() { return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17c2-5 5-7 9-3M3 17h14M12 14c2-4 3-7 2-9" /></svg>; }
