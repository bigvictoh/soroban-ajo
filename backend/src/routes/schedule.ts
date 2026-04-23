import { Router } from 'express'
import { ScheduleController } from '../controllers/scheduleController'
import { authMiddleware } from '../middleware/auth'
import { validateRequest } from '../middleware/validateRequest'
import { groupIdParamSchema } from '../validators/groups'
import { createScheduleSchema, updateScheduleSchema } from '../validators/schedule'

const router = Router({ mergeParams: true }) // inherits :id from parent
const controller = new ScheduleController()

/**
 * @swagger
 * /api/groups/{id}/schedule:
 *   get:
 *     summary: Get contribution schedule for a group
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Schedule with recent payment windows
 *       404:
 *         description: Schedule not found
 */
router.get(
  '/',
  validateRequest({ params: groupIdParamSchema }),
  controller.getSchedule.bind(controller)
)

/**
 * @swagger
 * /api/groups/{id}/schedule:
 *   post:
 *     summary: Create a contribution schedule
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authMiddleware,
  validateRequest({ params: groupIdParamSchema, body: createScheduleSchema }),
  controller.createSchedule.bind(controller)
)

/**
 * @swagger
 * /api/groups/{id}/schedule:
 *   patch:
 *     summary: Update an existing contribution schedule
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/',
  authMiddleware,
  validateRequest({ params: groupIdParamSchema, body: updateScheduleSchema }),
  controller.updateSchedule.bind(controller)
)

/**
 * @swagger
 * /api/groups/{id}/schedule/advance:
 *   post:
 *     summary: Manually advance schedule to next cycle (admin)
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/advance',
  authMiddleware,
  validateRequest({ params: groupIdParamSchema }),
  controller.advanceCycle.bind(controller)
)

export const scheduleRouter = router
