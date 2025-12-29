import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Karbonica Carbon Registry API',
      version: '1.0.0',
      description: 'Carbon Credit Registry Platform (Pure Web2 Backend)',
      contact: {
        name: 'Karbonica Team',
        url: 'https://karbonica.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.karbonica.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            company: { type: 'string', nullable: true },
            role: {
              type: 'string',
              enum: ['developer', 'verifier', 'administrator', 'buyer'],
            },
            emailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sellerId: { type: 'string', format: 'uuid' },
            creditEntryId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            quantityAvailable: { type: 'number' },
            quantityOriginal: { type: 'number' },
            pricePerCredit: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED'] },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Purchase: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            listingId: { type: 'string', format: 'uuid' },
            buyerId: { type: 'string', format: 'uuid' },
            sellerId: { type: 'string', format: 'uuid' },
            quantity: { type: 'number' },
            pricePerCredit: { type: 'number' },
            totalPrice: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
            status: { type: 'string', enum: ['COMPLETED', 'PENDING', 'FAILED'] },
            buyerCreditEntryId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            code: { type: 'string' },
            title: { type: 'string' },
            detail: { type: 'string' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Projects', description: 'Project management endpoints' },
      { name: 'Marketplace', description: 'Carbon Credit Marketplace endpoints' },
      { name: 'Credits', description: 'Carbon Credit management endpoints' },
      { name: 'Admin', description: 'Admin panel endpoints (requires admin role)' },
      { name: 'Health', description: 'Health check endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/admin/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
