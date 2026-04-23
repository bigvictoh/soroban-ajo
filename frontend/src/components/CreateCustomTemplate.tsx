'use client';

import React, { useState } from 'react';
import { X, Share2, Check } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { GroupTemplate } from '@/data/groupTemplates';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useKeyboardNavigation';

interface CreateCustomTemplateProps {
  onClose: () => void;
  onCreated?: (template: GroupTemplate) => void;
}

const CATEGORIES = ['family', 'friends', 'community', 'emergency', 'business', 'wedding', 'education', 'investment'] as const;
const FREQUENCIES = ['weekly', 'monthly', 'quarterly'] as const;

export default function CreateCustomTemplate({ onClose, onCreated }: CreateCustomTemplateProps) {
  const modalRef = useFocusTrap(true);
  useEscapeKey(onClose, true);
  const { addCustomTemplate } = useTemplates();

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'family' as GroupTemplate['category'],
    icon: '📋',
    contributionAmount: 100,
    frequency: 'monthly' as GroupTemplate['frequency'],
    minMembers: 2,
    maxMembers: 10,
    cycleDuration: 12,
    cycleLength: 30,
    tags: '',
  });
  const [created, setCreated] = useState<GroupTemplate | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['contributionAmount', 'minMembers', 'maxMembers', 'cycleDuration', 'cycleLength'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const newTemplate = addCustomTemplate({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      icon: form.icon || '📋',
      contributionAmount: form.contributionAmount,
      frequency: form.frequency,
      minMembers: form.minMembers,
      maxMembers: form.maxMembers,
      cycleDuration: form.cycleDuration,
      cycleLength: form.cycleLength,
      isPublic: true,
      isPopular: false,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setCreated(newTemplate);
    onCreated?.(newTemplate);
  };

  const handleCopyCode = async () => {
    if (!created?.shareCode) return;
    await navigator.clipboard.writeText(created.shareCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-template-title"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 id="create-template-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Create Custom Template
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success state */}
        {created ? (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-3">{created.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{created.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Template created successfully!</p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">Share Code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold text-blue-900 dark:text-blue-100 tracking-widest">
                  {created.shareCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Share this code so others can import your template.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</label>
                <input
                  name="icon"
                  value={form.icon}
                  onChange={handleChange}
                  maxLength={2}
                  className="w-full text-center text-2xl border border-gray-300 dark:border-gray-600 rounded-lg py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Market Women Ajo"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Describe this template's purpose..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                <select
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contribution (XLM)
                </label>
                <input
                  type="number"
                  name="contributionAmount"
                  value={form.contributionAmount}
                  onChange={handleChange}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cycle Length (days)
                </label>
                <input
                  type="number"
                  name="cycleLength"
                  value={form.cycleLength}
                  onChange={handleChange}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Min Members</label>
                <input
                  type="number"
                  name="minMembers"
                  value={form.minMembers}
                  onChange={handleChange}
                  min={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Members</label>
                <input
                  type="number"
                  name="maxMembers"
                  value={form.maxMembers}
                  onChange={handleChange}
                  min={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cycles</label>
                <input
                  type="number"
                  name="cycleDuration"
                  value={form.cycleDuration}
                  onChange={handleChange}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="e.g., savings, monthly, family"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!form.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Create Template
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
