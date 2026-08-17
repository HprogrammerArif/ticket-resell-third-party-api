"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../src/config/env', () => ({
    env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!' },
}));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate_1 = require("../src/middleware/authenticate");
const errorHandler_1 = require("../src/middleware/errorHandler");
function mockReq(authHeader) {
    return {
        headers: authHeader ? { authorization: authHeader } : {},
    };
}
function mockNext() {
    return vitest_1.vi.fn();
}
(0, vitest_1.describe)('authenticate', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('sets req.user and calls next when token is valid', () => {
        const payload = { id: 'u1', email: 'a@b.com', role: 'USER', displayName: 'Alice' };
        vitest_1.vi.mocked(jsonwebtoken_1.default.verify).mockReturnValue(payload);
        const req = mockReq('Bearer valid.token.here');
        const res = {};
        const next = mockNext();
        (0, authenticate_1.authenticate)(req, res, next);
        (0, vitest_1.expect)(req.user).toEqual(payload);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith();
    });
    (0, vitest_1.it)('calls next with 401 ApiError when no token provided', () => {
        const req = mockReq();
        const res = {};
        const next = mockNext();
        (0, authenticate_1.authenticate)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errorHandler_1.ApiError));
        const err = vitest_1.vi.mocked(next).mock.calls[0]?.[0];
        (0, vitest_1.expect)(err.status).toBe(401);
    });
    (0, vitest_1.it)('calls next with 401 ApiError when token is invalid', () => {
        vitest_1.vi.mocked(jsonwebtoken_1.default.verify).mockImplementation(() => { throw new Error('invalid'); });
        const req = mockReq('Bearer bad.token');
        const res = {};
        const next = mockNext();
        (0, authenticate_1.authenticate)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(vitest_1.expect.any(errorHandler_1.ApiError));
        const err = vitest_1.vi.mocked(next).mock.calls[0]?.[0];
        (0, vitest_1.expect)(err.status).toBe(401);
    });
});
//# sourceMappingURL=authenticate.test.js.map