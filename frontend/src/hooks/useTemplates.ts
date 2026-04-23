import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GroupTemplate, defaultTemplates } from '@/data/groupTemplates';

interface TemplateState {
  templates: GroupTemplate[];
  customTemplates: GroupTemplate[];
  addCustomTemplate: (template: Omit<GroupTemplate, 'id' | 'usageCount'>) => GroupTemplate;
  deleteCustomTemplate: (id: string) => void;
  getTemplateById: (id: string) => GroupTemplate | undefined;
  getTemplateByShareCode: (shareCode: string) => GroupTemplate | undefined;
  getPopularTemplates: () => GroupTemplate[];
  getTemplatesByCategory: (category: string) => GroupTemplate[];
  incrementUsage: (id: string) => void;
  exportTemplate: (id: string) => string | null;
  importTemplate: (shareCode: string) => GroupTemplate | null;
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CST-${segment(3)}-${segment(3)}`;
}

/**
 * Zustand store hook for managing group creation templates.
 * Supports predefined templates, custom templates, and share-code-based sharing.
 */
export const useTemplates = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      customTemplates: [],

      addCustomTemplate: (template) => {
        const newTemplate: GroupTemplate = {
          ...template,
          id: `custom-${Date.now()}`,
          usageCount: 0,
          shareCode: generateShareCode(),
        };
        set((state) => ({
          customTemplates: [...state.customTemplates, newTemplate],
        }));
        return newTemplate;
      },

      deleteCustomTemplate: (id) => {
        set((state) => ({
          customTemplates: state.customTemplates.filter((t) => t.id !== id),
        }));
      },

      getTemplateById: (id) => {
        const state = get();
        return [...state.templates, ...state.customTemplates].find((t) => t.id === id);
      },

      getTemplateByShareCode: (shareCode) => {
        const state = get();
        return [...state.templates, ...state.customTemplates].find(
          (t) => t.shareCode?.toUpperCase() === shareCode.toUpperCase()
        );
      },

      getPopularTemplates: () => {
        const state = get();
        return [...state.templates, ...state.customTemplates]
          .filter((t) => t.isPopular)
          .sort((a, b) => b.usageCount - a.usageCount);
      },

      getTemplatesByCategory: (category) => {
        const state = get();
        return [...state.templates, ...state.customTemplates].filter(
          (t) => t.category === category
        );
      },

      incrementUsage: (id) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
          ),
          customTemplates: state.customTemplates.map((t) =>
            t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
          ),
        }));
      },

      /**
       * Returns the share code for a template, or null if not found.
       */
      exportTemplate: (id) => {
        const template = get().getTemplateById(id);
        return template?.shareCode ?? null;
      },

      /**
       * Imports a template by share code. If it's a built-in template, returns it.
       * If it's a custom template already imported, returns it. Otherwise returns null.
       */
      importTemplate: (shareCode) => {
        const existing = get().getTemplateByShareCode(shareCode);
        if (existing) return existing;
        return null;
      },
    }),
    {
      name: 'ajo-templates',
    }
  )
);
