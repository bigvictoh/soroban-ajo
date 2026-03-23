import { Express } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { openApiSpec } from '../docs/openapi'

export const setupSwagger = (app: Express): void => {
  const specs = swaggerJsdoc({
    definition: openApiSpec,
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
  })

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
    })
  )
}
