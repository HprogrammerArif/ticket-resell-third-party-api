"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
function makeApp() {
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 60_000,
        limit: 1,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(429).json({
                error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later', status: 429 },
            });
        },
    });
    const app = (0, express_1.default)();
    app.get('/test', limiter, (_req, res) => res.json({ ok: true }));
    return app;
}
(0, vitest_1.describe)('rate limiter', () => {
    let app;
    (0, vitest_1.beforeEach)(() => {
        app = makeApp();
    });
    (0, vitest_1.it)('allows first request through', async () => {
        const res = await (0, supertest_1.default)(app).get('/test');
        (0, vitest_1.expect)(res.status).toBe(200);
    });
    (0, vitest_1.it)('returns 429 with RATE_LIMITED error body after limit exceeded', async () => {
        await (0, supertest_1.default)(app).get('/test'); // consume the single slot
        const res = await (0, supertest_1.default)(app).get('/test');
        (0, vitest_1.expect)(res.status).toBe(429);
        (0, vitest_1.expect)(res.body.error.code).toBe('RATE_LIMITED');
    });
});
//# sourceMappingURL=rateLimiter.test.js.map