// backend/config/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Helmet for secure HTTP headers
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ['*'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  referrerPolicy: { policy: 'no-referrer' }
});

// Rate limiting to mitigate brute-force and DoS attacks while permitting legitimate interactive and telemetry traffic
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // standard interactive limit per IP
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const telemetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // generous limit for SDK and runtime events
  message: { success: false, message: 'Telemetry rate limit exceeded, please retry later.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = function (app) {
  // Apply helmet globally
  app.use(helmetMiddleware);
  // Dedicated telemetry rate limiter for SDK / runtime telemetry ingestion
  app.use('/api/telemetry/event', telemetryLimiter);
  app.use('/api/sdk', telemetryLimiter);
  app.use('/api/runtime', telemetryLimiter);
  // Standard rate limiter for all other /api routes
  app.use('/api', apiLimiter);
};
