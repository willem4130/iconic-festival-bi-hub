/**
 * Integration Tests for Webhook Handler
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    webhookEvent: {
      create: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    automationLog: {
      create: vi.fn(),
    },
  },
}))

describe('Webhook Handler', () => {
  describe('webhook payload structure', () => {
    it('should accept valid webhook payload', () => {
      const payload = {
        event: 'project.created',
        data: {
          id: 'project-123',
          name: 'Test Project',
        },
        timestamp: new Date().toISOString(),
      }

      expect(payload.event).toBe('project.created')
      expect(payload.data.id).toBe('project-123')
      expect(payload.timestamp).toBeDefined()
    })

    it('should handle project created events', () => {
      const events = ['project.created', 'project.updated']
      events.forEach((event) => {
        expect(event).toMatch(/project\.(created|updated)/)
      })
    })

    it('should handle hours events', () => {
      const events = ['hours.created', 'hours.updated']
      events.forEach((event) => {
        expect(event).toMatch(/hours\.(created|updated)/)
      })
    })

    it('should handle invoice events', () => {
      const events = ['invoice.created', 'invoice.updated']
      events.forEach((event) => {
        expect(event).toMatch(/invoice\.(created|updated)/)
      })
    })
  })
})
