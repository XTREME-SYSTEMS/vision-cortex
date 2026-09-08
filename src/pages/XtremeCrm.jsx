import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Users, Plus, Search, Phone, Mail, Bell, Loader2, X, Tag,
  Building2, MapPin, Star, Send, CheckSquare, Square, Zap, ChevronDown
} from "lucide-react";
import BulkActionBar from "@/components/crm/BulkActionBar";
import FollowUpConfig from "@/components/crm/FollowUpConfig";

const STAGES = ["lead", "contacted", "qualified", "proposal", "won", "lost"];
const STAGE_COLORS = {
  lead: "bg-muted/20 text-muted-foreground",
  contacted: "bg-blue-500/15 text-blue-500",
  qualified: "bg-purple-500/15 text-purple-500",
  proposal: "bg-amber-500/15 text-amber-500",
  won: "bg-emerald-500/15 text-emerald-500",
  lost: "bg-red-500/15 text-red-500",
};

export default function XtremeCrm() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [followUpContact, setFollowUpContact] = useState(null);
  const [expandedContact, setExpandedContact] = useState(null);
  const [newContact, setNewContact] = useState({ full_name: "", email: "", phone: "", company: "", title: "", industry: "", location: "" });

  const loadContacts = async () => {
    try {
      const list = await base44.entities.XtremeCrmContact.list('-created_date', 200);
      setContacts(list || []);
    } catch (e) {
      toast({ title: "Failed to load contacts", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { loadContacts(); }, []);

  const filtered = contacts.filter(c => {
    const matchesSearch = !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = filterStage === "all" || c.lifecycle_stage === filterStage;
    return matchesSearch && matchesStage;
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const addContact = async () => {
    if (!newContact.full_name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      const created = await base44.entities.XtremeCrmContact.create({
        ...newContact,
        lifecycle_stage: "lead",
        lead_source: "manual",
      });
      setContacts(prev => [created, ...prev]);
      setNewContact({ full_name: "", email: "", phone: "", company: "", title: "", industry: "", location: "" });
      setShowAddForm(false);
      toast({ title: "Contact added" });
    } catch (e) {
      toast({ title: "Failed to add contact", description: e.message, variant: "destructive" });
    }
  };

  const updateStage = async (contactId, stage) => {
    try {
      const updated = await base44.entities.XtremeCrmContact.update(contactId, { lifecycle_stage: stage });
      setContacts(prev => prev.map(c => c.id === contactId ? updated : c));
    } catch (e) {
      toast({ title: "Failed to update stage", description: e.message, variant: "destructive" });
    }
  };

  const bulkStage = async (stage) => {
    const ids = Array.from(selected);
    try {
      await base44.entities.XtremeCrmContact.bulkUpdate(ids.map(id => ({ id, lifecycle_stage: stage })));
      setContacts(prev => prev.map(c => selected.has(c.id) ? { ...c, lifecycle_stage: stage } : c));
      setSelected(new Set());
      toast({ title: `${ids.length} contacts moved to ${stage}` });
    } catch (e) {
      toast({ title: "Bulk update failed", description: e.message, variant: "destructive" });
    }
  };

  const bulkTag = async (tag) => {
    const ids = Array.from(selected);
    try {
      const updates = ids.map(id => {
        const contact = contacts.find(c => c.id === id);
        const tags = [...(contact.tags || []), tag].filter((t, i, arr) => arr.indexOf(t) === i);
        return { id, tags };
      });
      await base44.entities.XtremeCrmContact.bulkUpdate(updates);
      setContacts(prev => prev.map(c => {
        const u = updates.find(u => u.id === c.id);
        return u ? { ...c, tags: u.tags } : c;
      }));
      toast({ title: `Tagged ${ids.length} contacts` });
    } catch (e) {
      toast({ title: "Tag failed", description: e.message, variant: "destructive" });
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} contacts?`)) return;
    const ids = Array.from(selected);
    try {
      await base44.entities.XtremeCrmContact.deleteMany({ id: { $in: ids } });
      setContacts(prev => prev.filter(c => !selected.has(c.id)));
      setSelected(new Set());
      toast({ title: `${ids.length} contacts deleted` });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = contacts.filter(c => c.lifecycle_stage === s).length;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" /> CRM Pipeline
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{contacts.length} contacts · manage leads through your sales pipeline</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {/* Stage pipeline summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {STAGES.map(stage => (
          <button key={stage} onClick={() => setFilterStage(filterStage === stage ? "all" : stage)}
            className={cn("rounded-lg border p-2 text-center transition-colors",
              filterStage === stage ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/30")}>
            <p className={cn("text-[10px] uppercase tracking-wider font-medium", STAGE_COLORS[stage].split(" ")[1])}>{stage}</p>
            <p className="text-lg font-bold">{stageCounts[stage] || 0}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, email…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm" />
        </div>
        {filterStage !== "all" && (
          <button onClick={() => setFilterStage("all")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-3 w-3" /> Clear filter
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">New Contact</h3>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={newContact.full_name} onChange={e => setNewContact({ ...newContact, full_name: e.target.value })} placeholder="Full name *" className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
            <input value={newContact.company} onChange={e => setNewContact({ ...newContact, company: e.target.value })} placeholder="Company" className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
            <input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email" className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
            <input value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} placeholder="Phone" className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
            <input value={newContact.title} onChange={e => setNewContact({ ...newContact, title: e.target.value })} placeholder="Title" className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
            <input value={newContact.industry} onChange={e => setNewContact({ ...newContact, industry: e.target.value })} placeholder="Industry" className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
          </div>
          <button onClick={addContact} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save Contact</button>
        </div>
      )}

      {/* Contact list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          No contacts found. Add one or scrape leads and ingest them.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <button onClick={selectAll} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </button>
          </div>
          <div className="space-y-2">
            {filtered.map(contact => (
              <div key={contact.id} className={cn("rounded-lg border bg-card p-3", selected.has(contact.id) ? "border-primary bg-primary/5" : "border-border")}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleSelect(contact.id)} className="mt-1 shrink-0">
                    {selected.has(contact.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{contact.full_name}</p>
                      {contact.company && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Building2 className="h-3 w-3" /> {contact.company}</span>}
                      {contact.deal_value > 0 && <span className="text-xs text-emerald-500">${contact.deal_value}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {contact.email}</span>}
                      {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {contact.phone}</span>}
                      {contact.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {contact.location}</span>}
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {contact.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground">{t}</span>)}
                      </div>
                    )}
                    {expandedContact === contact.id && contact.enrichment_data && (
                      <pre className="mt-2 p-2 rounded bg-accent/30 text-[10px] max-h-32 overflow-y-auto">{JSON.stringify(contact.enrichment_data, null, 2)}</pre>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <select value={contact.lifecycle_stage} onChange={e => updateStage(contact.id, e.target.value)}
                      className={cn("text-[10px] px-2 py-1 rounded-full font-medium border-0 cursor-pointer", STAGE_COLORS[contact.lifecycle_stage])}>
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => setExpandedContact(expandedContact === contact.id ? null : contact.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-accent">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      <button onClick={() => setFollowUpContact(contact)}
                        className={cn("text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-0.5",
                          contact.follow_up_enabled ? "border-primary text-primary" : "border-border hover:bg-accent")}>
                          <Bell className="h-3 w-3" />
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selected.size}
        onBulkTag={bulkTag}
        onBulkStage={bulkStage}
        onBulkDelete={bulkDelete}
        onClear={() => setSelected(new Set())}
      />

      {/* Follow-up config modal */}
      {followUpContact && (
        <FollowUpConfig
          contact={followUpContact}
          onSave={(updated) => {
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            setFollowUpContact(null);
            toast({ title: "Follow-up saved" });
          }}
          onClose={() => setFollowUpContact(null)}
        />
      )}
    </div>
  );
}