import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

/**
 * In-memory template store (mirrors frontend defaultTemplates).
 * In production this would be backed by a database table.
 */
const builtinTemplates = [
  { id: 'family-savings', name: 'Family Savings', category: 'family', icon: '👨‍👩‍👧‍👦', contributionAmount: 100, frequency: 'monthly', minMembers: 4, maxMembers: 6, cycleDuration: 6, cycleLength: 30, isPublic: true, isPopular: true, usageCount: 1250, tags: ['family', 'savings', 'monthly'], shareCode: 'FAM-SAV-001', description: 'Perfect for family members saving together for shared goals.' },
  { id: 'friends-circle', name: 'Friends Circle', category: 'friends', icon: '👥', contributionAmount: 50, frequency: 'weekly', minMembers: 5, maxMembers: 10, cycleDuration: 10, cycleLength: 7, isPublic: true, isPopular: true, usageCount: 980, tags: ['friends', 'weekly', 'social'], shareCode: 'FRD-CIR-002', description: 'Ideal for close friends pooling money weekly.' },
  { id: 'community-fund', name: 'Community Fund', category: 'community', icon: '🏘️', contributionAmount: 75, frequency: 'monthly', minMembers: 10, maxMembers: 20, cycleDuration: 12, cycleLength: 30, isPublic: true, isPopular: true, usageCount: 750, tags: ['community', 'large-group', 'monthly'], shareCode: 'COM-FND-003', description: 'Large group savings for community projects.' },
  { id: 'emergency-fund', name: 'Emergency Fund', category: 'emergency', icon: '🚨', contributionAmount: 150, frequency: 'monthly', minMembers: 3, maxMembers: 5, cycleDuration: 4, cycleLength: 30, isPublic: true, isPopular: false, usageCount: 420, tags: ['emergency', 'flexible', 'small-group'], shareCode: 'EMR-FND-004', description: 'Flexible savings for unexpected expenses.' },
  { id: 'business-partnership', name: 'Business Partnership', category: 'business', icon: '💼', contributionAmount: 500, frequency: 'quarterly', minMembers: 2, maxMembers: 4, cycleDuration: 4, cycleLength: 90, isPublic: true, isPopular: true, usageCount: 650, tags: ['business', 'quarterly', 'investment'], shareCode: 'BIZ-PAR-005', description: 'Quarterly contributions for business partners.' },
  { id: 'wedding-fund', name: 'Wedding Fund', category: 'wedding', icon: '💍', contributionAmount: 200, frequency: 'monthly', minMembers: 5, maxMembers: 15, cycleDuration: 12, cycleLength: 30, isPublic: false, isPopular: true, usageCount: 870, tags: ['wedding', 'celebration', 'family', 'monthly'], shareCode: 'WED-FND-006', description: 'Save together for a dream wedding.' },
  { id: 'education-savings', name: 'Education Savings', category: 'education', icon: '🎓', contributionAmount: 120, frequency: 'monthly', minMembers: 4, maxMembers: 12, cycleDuration: 9, cycleLength: 30, isPublic: true, isPopular: true, usageCount: 1100, tags: ['education', 'tuition', 'school', 'monthly'], shareCode: 'EDU-SAV-007', description: 'Dedicated savings for school fees and tuition.' },
  { id: 'emergency-medical', name: 'Medical Emergency Pool', category: 'emergency', icon: '🏥', contributionAmount: 80, frequency: 'monthly', minMembers: 6, maxMembers: 10, cycleDuration: 6, cycleLength: 30, isPublic: false, isPopular: false, usageCount: 310, tags: ['medical', 'emergency', 'health', 'monthly'], shareCode: 'MED-EMR-008', description: 'Rapid-response pool for medical emergencies.' },
  { id: 'investment-club', name: 'Investment Club', category: 'investment', icon: '📈', contributionAmount: 300, frequency: 'monthly', minMembers: 5, maxMembers: 10, cycleDuration: 12, cycleLength: 30, isPublic: true, isPopular: true, usageCount: 540, tags: ['investment', 'stocks', 'wealth', 'monthly'], shareCode: 'INV-CLB-009', description: 'Pool resources to invest together.' },
  { id: 'holiday-travel', name: 'Holiday Travel Fund', category: 'friends', icon: '✈️', contributionAmount: 60, frequency: 'weekly', minMembers: 4, maxMembers: 8, cycleDuration: 26, cycleLength: 7, isPublic: true, isPopular: true, usageCount: 720, tags: ['travel', 'holiday', 'friends', 'weekly'], shareCode: 'HOL-TRV-010', description: 'Save weekly for a group holiday.' },
  { id: 'startup-seed', name: 'Startup Seed Fund', category: 'business', icon: '🚀', contributionAmount: 1000, frequency: 'quarterly', minMembers: 3, maxMembers: 6, cycleDuration: 4, cycleLength: 90, isPublic: false, isPopular: false, usageCount: 190, tags: ['startup', 'business', 'seed', 'quarterly'], shareCode: 'STR-SED-011', description: 'Pool capital to launch a new business.' },
  { id: 'farmers-cooperative', name: "Farmers' Cooperative", category: 'community', icon: '🌾', contributionAmount: 50, frequency: 'monthly', minMembers: 8, maxMembers: 20, cycleDuration: 12, cycleLength: 30, isPublic: true, isPopular: false, usageCount: 430, tags: ['farming', 'agriculture', 'cooperative', 'monthly'], shareCode: 'FRM-COP-012', description: 'Agricultural savings for farmers.' },
]

// Shared custom templates (in-memory; would be DB-backed in production)
const sharedTemplates: typeof builtinTemplates = []

export class TemplatesController {
  /**
   * GET /api/templates
   * Returns all built-in templates, optionally filtered by category.
   */
  listTemplates = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.query
    const all = [...builtinTemplates, ...sharedTemplates]
    const data = category ? all.filter((t) => t.category === category) : all
    res.json({ success: true, data })
  })

  /**
   * GET /api/templates/:id
   * Returns a single template by id or shareCode.
   */
  getTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const all = [...builtinTemplates, ...sharedTemplates]
    const template =
      all.find((t) => t.id === id) ||
      all.find((t) => t.shareCode?.toUpperCase() === id.toUpperCase())

    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' })
      return
    }
    res.json({ success: true, data: template })
  })

  /**
   * POST /api/templates/share
   * Accepts a custom template payload and registers it for sharing.
   * Returns the assigned shareCode.
   */
  shareTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, category, icon, contributionAmount, frequency,
      minMembers, maxMembers, cycleDuration, cycleLength, tags } = req.body

    if (!name || !category || !contributionAmount || !frequency) {
      res.status(400).json({ success: false, error: 'Missing required template fields' })
      return
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const seg = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const shareCode = `CST-${seg(3)}-${seg(3)}`

    const newTemplate = {
      id: `shared-${Date.now()}`,
      name,
      description: description ?? '',
      category,
      icon: icon ?? '📋',
      contributionAmount: Number(contributionAmount),
      frequency,
      minMembers: Number(minMembers ?? 2),
      maxMembers: Number(maxMembers ?? 20),
      cycleDuration: Number(cycleDuration ?? 12),
      cycleLength: Number(cycleLength ?? 30),
      isPublic: true,
      isPopular: false,
      usageCount: 0,
      tags: Array.isArray(tags) ? tags : [],
      shareCode,
    }

    sharedTemplates.push(newTemplate)
    res.status(201).json({ success: true, data: { shareCode, template: newTemplate } })
  })
}
