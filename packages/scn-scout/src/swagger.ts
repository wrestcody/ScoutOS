import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SCN Scout: FedRAMP 20x Engine API',
      version: '2.1.0',
      description: 'API for automating FedRAMP Significant Change Notifications (SCN) with deterministic evidence and OSCAL integration.',
      contact: {
        name: 'FedRAMP 20x Automation Team',
        url: 'https://fedramp.gov',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./server.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
