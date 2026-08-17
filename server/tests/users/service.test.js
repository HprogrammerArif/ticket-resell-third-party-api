"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../../src/libs/db', () => ({
    db: {
        user: {
            findUnique: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            delete: vitest_1.vi.fn(),
        },
    },
}));
vitest_1.vi.mock('bcryptjs', () => ({
    default: {
        hash: vitest_1.vi.fn().mockResolvedValue('$2b$12$hashedpw'),
        compare: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vitest_1.vi.fn().mockReturnValue('mock.jwt.token'),
    },
}));
vitest_1.vi.mock('../../src/config/env', () => ({
    env: { JWT_SECRET: 'test-secret-at-least-32-chars-long!!', JWT_EXPIRES_IN: '7d' },
}));
const db_1 = require("../../src/libs/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const service_1 = require("../../src/modules/users/service");
const errorHandler_1 = require("../../src/middleware/errorHandler");
const mockUser = {
    id: 'user_1',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpw',
    displayName: 'Test User',
    firstName: null,
    lastName: null,
    gender: null,
    dateOfBirth: null,
    marketingConsent: false,
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    giftCardRedemptions: [],
};
(0, vitest_1.describe)('register', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('creates a user and returns a JWT token', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(null);
        vitest_1.vi.mocked(db_1.db.user.create).mockResolvedValue(mockUser);
        const result = await (0, service_1.register)({
            email: 'test@example.com',
            password: 'password123',
            displayName: 'Test User',
            marketingConsent: false,
        });
        (0, vitest_1.expect)(db_1.db.user.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            data: vitest_1.expect.objectContaining({ email: 'test@example.com', passwordHash: '$2b$12$hashedpw' }),
        }));
        (0, vitest_1.expect)(result.token).toBe('mock.jwt.token');
    });
    (0, vitest_1.it)('throws 409 when email already exists', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(mockUser);
        await (0, vitest_1.expect)((0, service_1.register)({ email: 'test@example.com', password: 'password123', marketingConsent: false })).rejects.toThrow(errorHandler_1.ApiError);
    });
    (0, vitest_1.it)('hashes the password before storing', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(null);
        vitest_1.vi.mocked(db_1.db.user.create).mockResolvedValue(mockUser);
        await (0, service_1.register)({ email: 'test@example.com', password: 'plaintext', marketingConsent: false });
        (0, vitest_1.expect)(bcryptjs_1.default.hash).toHaveBeenCalledWith('plaintext', 12);
    });
});
(0, vitest_1.describe)('login', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns a JWT token on valid credentials', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(mockUser);
        vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(true);
        const result = await (0, service_1.login)('test@example.com', 'password123');
        (0, vitest_1.expect)(result.token).toBe('mock.jwt.token');
    });
    (0, vitest_1.it)('throws 401 on wrong password', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(mockUser);
        vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(false);
        await (0, vitest_1.expect)((0, service_1.login)('test@example.com', 'wrongpass')).rejects.toThrow(errorHandler_1.ApiError);
    });
    (0, vitest_1.it)('throws 401 when user not found', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(null);
        await (0, vitest_1.expect)((0, service_1.login)('nobody@example.com', 'password')).rejects.toThrow(errorHandler_1.ApiError);
    });
});
(0, vitest_1.describe)('changePassword', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('updates the password hash when current password is correct', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(mockUser);
        vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(true);
        vitest_1.vi.mocked(db_1.db.user.update).mockResolvedValue({ ...mockUser, passwordHash: '$2b$12$newhashedpw' });
        await (0, service_1.changePassword)('user_1', { currentPassword: 'oldpass', newPassword: 'newpass123' });
        (0, vitest_1.expect)(db_1.db.user.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            where: { id: 'user_1' },
            data: { passwordHash: '$2b$12$hashedpw' },
        }));
    });
    (0, vitest_1.it)('throws 401 when current password is wrong', async () => {
        vitest_1.vi.mocked(db_1.db.user.findUnique).mockResolvedValue(mockUser);
        vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(false);
        await (0, vitest_1.expect)((0, service_1.changePassword)('user_1', { currentPassword: 'wrong', newPassword: 'newpass123' })).rejects.toThrow(errorHandler_1.ApiError);
    });
});
(0, vitest_1.describe)('deleteAccount', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('deletes the user record', async () => {
        vitest_1.vi.mocked(db_1.db.user.delete).mockResolvedValue(mockUser);
        await (0, service_1.deleteAccount)('user_1');
        (0, vitest_1.expect)(db_1.db.user.delete).toHaveBeenCalledWith({ where: { id: 'user_1' } });
    });
});
//# sourceMappingURL=service.test.js.map