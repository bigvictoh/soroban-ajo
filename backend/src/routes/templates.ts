import { Router } from 'express'
import { TemplatesController } from '../controllers/templatesController'

const router = Router()
const controller = new TemplatesController()

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: List all group templates
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of templates
 */
router.get('/', controller.listTemplates)

/**
 * @swagger
 * /api/templates/{id}:
 *   get:
 *     summary: Get template by id or shareCode
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 */
router.get('/:id', controller.getTemplate)

/**
 * @swagger
 * /api/templates/share:
 *   post:
 *     summary: Share a custom template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, contributionAmount, frequency]
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               contributionAmount:
 *                 type: number
 *               frequency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template shared, returns shareCode
 */
router.post('/share', controller.shareTemplate)

export { router as templatesRouter }
