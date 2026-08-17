"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
vitest_1.vi.mock('../../src/modules/ticketnetwork/catalog', () => ({
    getCategories: vitest_1.vi.fn(),
    getCategoryByPath: vitest_1.vi.fn(),
    getEvents: vitest_1.vi.fn(),
    getEventById: vitest_1.vi.fn(),
    searchEvents: vitest_1.vi.fn(),
    getPerformers: vitest_1.vi.fn(),
    getPerformerById: vitest_1.vi.fn(),
    getVenues: vitest_1.vi.fn(),
    getVenueById: vitest_1.vi.fn(),
    getCities: vitest_1.vi.fn(),
    globalSuggest: vitest_1.vi.fn(),
}));
const app_1 = __importDefault(require("../../src/app"));
const catalog = __importStar(require("../../src/modules/ticketnetwork/catalog"));
(0, vitest_1.describe)('Catalog routes', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.describe)('GET /api/categories', () => {
        (0, vitest_1.it)('returns 200 with category list', async () => {
            const data = { page: 1, count: 1, totalCount: 1, results: [{ path: 'sports', text: { name: 'Sports' } }] };
            vitest_1.vi.mocked(catalog.getCategories).mockResolvedValueOnce(data);
            const res = await (0, supertest_1.default)(app_1.default).get('/api/categories');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toEqual(data);
        });
        (0, vitest_1.it)('forwards pageSize and pageNumber as numbers', async () => {
            vitest_1.vi.mocked(catalog.getCategories).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
            await (0, supertest_1.default)(app_1.default).get('/api/categories?pageSize=5&pageNumber=2');
            (0, vitest_1.expect)(catalog.getCategories).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ pageSize: 5, pageNumber: 2 }));
        });
        (0, vitest_1.it)('returns 502 when catalog throws ApiError', async () => {
            const { ApiError } = await Promise.resolve().then(() => __importStar(require('../../src/middleware/errorHandler')));
            vitest_1.vi.mocked(catalog.getCategories).mockRejectedValueOnce(new ApiError(502, 'TN_API_ERROR', 'down'));
            const res = await (0, supertest_1.default)(app_1.default).get('/api/categories');
            (0, vitest_1.expect)(res.status).toBe(502);
            (0, vitest_1.expect)(res.body.error.code).toBe('TN_API_ERROR');
        });
    });
    (0, vitest_1.describe)('GET /api/categories/:path (nested)', () => {
        (0, vitest_1.it)('passes the full nested path to getCategoryByPath', async () => {
            vitest_1.vi.mocked(catalog.getCategoryByPath).mockResolvedValueOnce({ path: 'sports/hockey', text: { name: 'Hockey' } });
            const res = await (0, supertest_1.default)(app_1.default).get('/api/categories/sports/hockey');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(catalog.getCategoryByPath).toHaveBeenCalledWith('sports/hockey', vitest_1.expect.any(Object));
        });
    });
    (0, vitest_1.describe)('GET /api/events/search', () => {
        (0, vitest_1.it)('calls searchEvents (not getEventById)', async () => {
            vitest_1.vi.mocked(catalog.searchEvents).mockResolvedValueOnce({ page: 1, count: 0, totalCount: 0, results: [] });
            const res = await (0, supertest_1.default)(app_1.default).get('/api/events/search?keyword=hockey');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(catalog.searchEvents).toHaveBeenCalled();
            (0, vitest_1.expect)(catalog.getEventById).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('GET /api/events/:id', () => {
        (0, vitest_1.it)('passes numeric id to getEventById', async () => {
            vitest_1.vi.mocked(catalog.getEventById).mockResolvedValueOnce({ id: 42, text: { name: 'Test' }, date: {} });
            const res = await (0, supertest_1.default)(app_1.default).get('/api/events/42');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(catalog.getEventById).toHaveBeenCalledWith(42);
        });
        (0, vitest_1.it)('returns 422 when id is not a number', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/events/notanumber');
            (0, vitest_1.expect)(res.status).toBe(422);
            (0, vitest_1.expect)(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
    (0, vitest_1.describe)('GET /api/search/suggest', () => {
        (0, vitest_1.it)('passes q to globalSuggest', async () => {
            vitest_1.vi.mocked(catalog.globalSuggest).mockResolvedValueOnce({
                events: { totalResultCount: 0, results: [] },
                performers: { totalResultCount: 0, results: [] },
                venues: { totalResultCount: 0, results: [] },
                cities: { totalResultCount: 0, results: [] },
            });
            const res = await (0, supertest_1.default)(app_1.default).get('/api/search/suggest?q=leaf');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(catalog.globalSuggest).toHaveBeenCalledWith('leaf');
        });
        (0, vitest_1.it)('returns 422 when q is missing', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/search/suggest');
            (0, vitest_1.expect)(res.status).toBe(422);
            (0, vitest_1.expect)(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
});
//# sourceMappingURL=routes.test.js.map