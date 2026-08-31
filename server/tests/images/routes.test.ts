import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/modules/images/service', () => ({
  getPerformerImage: vi.fn(),
  categoryHint: vi.fn(() => 'band'),
}));

import app from '../../src/app';
import * as images from '../../src/modules/images/service';

describe('GET /api/images/performer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 422 when name is missing', async () => {
    const res = await request(app).get('/api/images/performer');
    expect(res.status).toBe(422);
    expect(images.getPerformerImage).not.toHaveBeenCalled();
  });

  it('returns the resolved image', async () => {
    vi.mocked(images.getPerformerImage).mockResolvedValueOnce({
      url: 'https://upload.wikimedia.org/a.jpg',
      width: 800,
      height: 600,
      sourcePage: 'https://en.wikipedia.org/wiki/Abba',
      title: 'Abba',
    });

    const res = await request(app).get('/api/images/performer?name=Abba&category=Concerts');

    expect(res.status).toBe(200);
    expect(res.body.image.url).toBe('https://upload.wikimedia.org/a.jpg');
    expect(images.getPerformerImage).toHaveBeenCalledWith('Abba', 'Concerts');
  });

  it('returns 200 with a null image when nothing is found', async () => {
    vi.mocked(images.getPerformerImage).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/images/performer?name=Nobody');

    expect(res.status).toBe(200);
    expect(res.body.image).toBeNull();
  });
});
