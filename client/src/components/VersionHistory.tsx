"use client";

import { useState } from "react";
import {
  History,
  RotateCcw,
  Save,
  X,
  Clock,
  User as UserIcon,
  Tag,
} from "lucide-react";
import type { Version } from "@/lib/types";

interface VersionHistoryProps {
  versions: Version[];
  loading: boolean;
  onSaveVersion: (label?: string) => Promise<unknown>;
  onRevertToVersion: (versionId: number) => Promise<boolean>;
  isOpen: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}

export default function VersionHistory({
  versions,
  loading,
  onSaveVersion,
  onRevertToVersion,
  isOpen,
  onToggle,
  onRefresh,
}: VersionHistoryProps) {
  const [saveLabel, setSaveLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [revertingId, setRevertingId] = useState<number | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<number | null>(
    null
  );

  const handleSave = async () => {
    setSaving(true);
    await onSaveVersion(saveLabel || undefined);
    setSaveLabel("");
    setSaving(false);
  };

  const handleRevert = async (versionId: number) => {
    if (confirmRevertId !== versionId) {
      setConfirmRevertId(versionId);
      return;
    }
    setRevertingId(versionId);
    await onRevertToVersion(versionId);
    setRevertingId(null);
    setConfirmRevertId(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "Z");
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[80vh] glass-strong rounded-xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              Version History
            </h2>
            <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">
              {versions.length}
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
            id="version-close-btn"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Save new version */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="Version label (optional)"
              className="input flex-1 text-sm py-2"
              maxLength={100}
              id="version-label-input"
            />
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              disabled={saving}
              id="version-save-btn"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg loading-shimmer"
                />
              ))}
            </div>
          )}

          {!loading && versions.length === 0 && (
            <div className="text-center py-12">
              <History className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3 opacity-40" />
              <p className="text-sm text-[var(--color-text-muted)]">
                No versions saved yet
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Save a version to create a restore point
              </p>
            </div>
          )}

          {!loading &&
            versions.map((version, i) => (
              <div
                key={version.id}
                className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-all animate-fade-in group"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {version.label ? (
                        <div className="flex items-center gap-1 text-sm font-medium text-[var(--color-text-primary)]">
                          <Tag className="w-3 h-3 text-[var(--color-accent)]" />
                          <span className="truncate">{version.label}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          Version #{version.id}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {version.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevert(version.id)}
                    className={`btn btn-sm transition-all ${
                      confirmRevertId === version.id
                        ? "btn-danger"
                        : "btn-ghost opacity-0 group-hover:opacity-100"
                    }`}
                    disabled={revertingId === version.id}
                    id={`revert-btn-${version.id}`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {revertingId === version.id
                      ? "..."
                      : confirmRevertId === version.id
                      ? "Confirm"
                      : "Revert"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
