import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Upload, CheckCircle, Phone, Mail, MapPin, Square, Palette, Camera, Send } from 'lucide-react';

const FINISH_OPTIONS = [
  { value: 'metallic', label: 'Metallic Epoxy', desc: 'Premium 3D metallic finish' },
  { value: 'flake', label: 'Flake System', desc: 'Decorative vinyl flake' },
  { value: 'solid', label: 'Solid Color', desc: 'Single solid color epoxy' },
  { value: 'quartz', label: 'Quartz System', desc: 'Colored quartz broadcast' },
  { value: 'polished', label: 'Polished Concrete', desc: 'Mechanically polished' },
];

const CONDITION_OPTIONS = [
  { value: 'new_concrete', label: 'New Concrete', desc: 'Freshly poured, never coated' },
  { value: 'good', label: 'Good Condition', desc: 'Minor wear, no major issues' },
  { value: 'cracked', label: 'Cracked', desc: 'Visible cracks needing repair' },
  { value: 'stained', label: 'Stained', desc: 'Oil/chemical stains present' },
  { value: 'old_coating', label: 'Old Coating', desc: 'Existing coating needs removal' },
  { value: 'unknown', label: 'Not Sure', desc: "I don't know the condition" },
];

export default function FloorQuoteFlow() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lead, setLead] = useState({
    name: '', email: '', phone: '', address: '', sqft: '',
    floor_condition: 'unknown', desired_finish: 'flake', color_choice: '', notes: '',
    photo_urls: [],
  });
  const [uploading, setUploading] = useState(false);

  const update = (field, value) => setLead(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = async (files) => {
    setUploading(true);
    const urls = [];
    for (const file of Array.from(files).slice(0, 5)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      } catch (e) { /* skip failed */ }
    }
    setLead(prev => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
    setUploading(false);
  };

  const submit = async () => {
    if (!lead.name || !lead.phone) {
      toast({ title: 'Name and phone are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('polishedConcreteEngine', {
        action: 'create_lead',
        ...lead,
        sqft: lead.sqft ? parseInt(lead.sqft) : undefined,
      });
      setSubmitted(true);
      toast({ title: 'Quote request submitted!', description: 'Jeremy will reach out within 24 hours.' });
    } catch (e) {
      toast({ title: 'Submission failed', description: e.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 mx-auto text-emerald-500" />
          <h1 className="text-2xl font-heading">Quote Request Received!</h1>
          <p className="text-muted-foreground">Thanks {lead.name?.split(' ')[0]}! Jeremy from National Concrete Polishing will reach out to you at {lead.phone} within 24 hours with your free quote.</p>
          <p className="text-sm text-muted-foreground">For immediate assistance, call or text us directly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold">Get Your Free Floor Quote</h1>
          <p className="text-muted-foreground mt-2">National Concrete Polishing — Professional flooring in 24 hours</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn('h-2 rounded-full transition-all', step >= s ? 'bg-primary w-12' : 'bg-muted w-8')} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          {/* Step 1: Contact Info */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-heading">Tell us about you</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5" /> Name *</label>
                  <input value={lead.name} onChange={e => update('name', e.target.value)} placeholder="Your name" className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Mail className="w-3.5 h-3.5" /> Email</label>
                  <input type="email" value={lead.email} onChange={e => update('email', e.target.value)} placeholder="you@email.com" className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5" /> Phone *</label>
                  <input type="tel" value={lead.phone} onChange={e => update('phone', e.target.value)} placeholder="(555) 123-4567" className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><MapPin className="w-3.5 h-3.5" /> Project Address</label>
                  <input value={lead.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St, City, State" className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!lead.name || !lead.phone}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                Continue <Send className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Step 2: Project Details */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-heading">Project details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Square className="w-3.5 h-3.5" /> Square Footage</label>
                  <input type="number" value={lead.sqft} onChange={e => update('sqft', e.target.value)} placeholder="e.g. 2000" className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Floor Condition</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONDITION_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => update('floor_condition', opt.value)}
                        className={cn('text-left p-3 rounded-lg border text-sm transition-colors', lead.floor_condition === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Desired Finish</label>
                  <div className="grid grid-cols-1 gap-2">
                    {FINISH_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => update('desired_finish', opt.value)}
                        className={cn('text-left p-3 rounded-lg border text-sm transition-colors flex items-center gap-2', lead.desired_finish === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>
                        <Palette className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="h-11 px-6 rounded-lg border border-border text-sm font-medium hover:bg-muted">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Continue</button>
              </div>
            </>
          )}

          {/* Step 3: Photos & Notes */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-heading">Photos & details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Palette className="w-3.5 h-3.5" /> Color Preference</label>
                  <input value={lead.color_choice} onChange={e => update('color_choice', e.target.value)} placeholder="e.g. Gray, Blue, Red, or 'not sure'" className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notes</label>
                  <textarea value={lead.notes} onChange={e => update('notes', e.target.value)} placeholder="Tell us about your project — timeline, budget, special requirements..." rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5"><Camera className="w-3.5 h-3.5" /> Photos (optional)</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Upload photos of your floor for a more accurate quote</p>
                        <input type="file" multiple accept="image/*" onChange={e => handlePhotoUpload(e.target.files)} className="hidden" id="photo-upload" />
                        <label htmlFor="photo-upload" className="inline-block mt-2 px-4 py-1.5 rounded-lg border border-border text-sm cursor-pointer hover:bg-muted">Choose Photos</label>
                      </>
                    )}
                  </div>
                  {lead.photo_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {lead.photo_urls.map((url, i) => (
                        <img key={i} src={url} alt={`Photo ${i+1}`} className="w-16 h-16 rounded-lg object-cover border border-border" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="h-11 px-6 rounded-lg border border-border text-sm font-medium hover:bg-muted">Back</button>
                <button onClick={submit} disabled={submitting}
                  className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Get My Free Quote <Send className="w-4 h-4" /></>}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">By submitting, you agree to be contacted by National Concrete Polishing about your project.</p>
      </div>
    </div>
  );
}