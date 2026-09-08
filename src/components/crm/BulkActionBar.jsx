import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tag, X } from "lucide-react";

export default function BulkActionBar({ selectedCount, onBulkTag, onBulkStage, onBulkDelete, onClear, onExport }) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState("");

  if (selectedCount === 0) return null;

  const handleAddTag = () => {
    if (tagValue.trim()) {
      onBulkTag(tagValue.trim());
      setTagValue("");
      setShowTagInput(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card shadow-lg">
      <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>
      <div className="h-5 w-px bg-border" />
      {showTagInput ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={tagValue}
            onChange={e => setTagValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddTag()}
            placeholder="tag name"
            className="h-8 px-2 rounded border border-border bg-background text-xs w-24"
          />
          <button onClick={handleAddTag} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Add</button>
          <button onClick={() => setShowTagInput(false)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <button onClick={() => setShowTagInput(true)} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg hover:bg-accent">
          <Tag className="h-3.5 w-3.5" /> Tag
        </button>
      )}
      <select onChange={e => e.target.value && onBulkStage(e.target.value)} value="" className="h-8 px-2 rounded border border-border bg-background text-xs">
        <option value="">Move to stage…</option>
        <option value="lead">Lead</option>
        <option value="contacted">Contacted</option>
        <option value="qualified">Qualified</option>
        <option value="proposal">Proposal</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      {onExport && (
        <button onClick={onExport} className="text-xs px-2 py-1.5 rounded-lg hover:bg-accent">Export</button>
      )}
      <button onClick={onBulkDelete} className="text-xs px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10">Delete</button>
      <div className="h-5 w-px bg-border" />
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}