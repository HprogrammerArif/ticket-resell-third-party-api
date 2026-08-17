"use strict";
// Set all required env vars before any module that reads process.env is imported.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/ticket_love_test';
process.env.JWT_SECRET = 'test-secret-that-is-exactly-32-chars-long!!';
process.env.JWT_EXPIRES_IN = '7d';
process.env.TN_CONSUMER_KEY = 'test-consumer-key';
process.env.TN_CONSUMER_SECRET = 'test-consumer-secret';
process.env.TN_WCID = '12498';
//# sourceMappingURL=setup.js.map