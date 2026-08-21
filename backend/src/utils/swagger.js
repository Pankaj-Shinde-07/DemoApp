const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'DemoApp API',
            version: '1.0.0',
            description: `
DemoApp — Simulated Organization Application for DPDPA Compliance Testing.

This API documentation describes all endpoints of DemoApp.
DemoApp is the **target application** used by the external DPDPA Audit Platform.
It is NOT the auditing solution itself.

**Intentional DPDPA Test Scenarios present in this application:**
- RULE-001: Personal data (name, email, mobile) appears in application logs
- RULE-006: GET /api/users/{id} returns excessive personal data fields
- RULE-005: Marketing processing continues after consent withdrawal
- PURPOSE_MISMATCH: mobileNumber used in login/order events (declared purpose: OTP only)
- RETENTION: Seed data contains records older than declared retention period
            `
        },
        servers: [{ url: 'http://localhost:5001', description: 'Local Development' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
