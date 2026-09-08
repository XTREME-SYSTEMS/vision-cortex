import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Bell, X, Loader2 } from "lucide-react";

export default function FollowUpConfig({ contact, onSave, onClose }) {
  const [enabled, setEnabled] = useState(contact.follow_up_enabled || false);
  const [frequency, setFrequency] = useState(contact.follow_up_frequency_days || 3);
  const [method, setMethod] = useState(contact.follow_up_method || "sms");
  const [automated, setAutomated] = useState(contact.follow_up_automated || false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(contact.follow_up_template_id || "");

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const list = await base44.entities.CommunicationTemplate.filter({ situation: "follow_up", active: true }, "-created_date", 20);
        setTemplates(list || []);
      } catch (_) {}
    };
    loadTemplates();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextDate = enabled ? new Date(Date.now() + frequency * 86400000).toISOString() : null;
      const updated = await base44.entities.XtremeCrmContact.update(contact.id, {
        follow_up_enabled: enabled,
        follow_up_frequency_days: frequency,
        follow_up_method: method,
        follow_up_automated: automated,
        follow_up_template_id: templateId || null,
        next_follow_up_at: nextDate,
      });
      onSave(updated);
    } catch (e) {
      console.error("Failed to save follow-up config:", e);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Follow-Up Config</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{contact.full_name} · {contact.company || ""}</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Enable follow-ups</span>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          </label>
          {enabled && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Frequency (days)</label>
                <input type="number" min="1" max="90" value={frequency} onChange={e => setFrequency(parseInt(e.target.value) || 3)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm">
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="voice">Voice</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="mms">MMS</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Template (optional)</label>
                <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm">
                  <option value="">No template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.channel} · {t.tone}</option>)}
                </select>
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Automated (send without manual review)</span>
                <input type="checkbox" checked={automated} onChange={e => setAutomated(e.target.checked)} />
              </label>
            </>
          )}
        </div>
        <button onClick={handleSave} disabled={saving}
          className="mt-4 w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Configuration
        </button>
      </div>
    </div>
  );
}