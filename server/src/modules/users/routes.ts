import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { register, login, me, updateProfile, changePassword, deleteAccount, requestPasswordReset, resetPasswordWithToken } from './service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
  gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY']).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  marketingConsent: z.boolean().default(false),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input', status: 400 } });
      return;
    }
    const result = await register(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', status: 400 } });
      return;
    }
    const result = await login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await me(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input', status: 400 } });
      return;
    }
    const user = await updateProfile(req.user!.id, parsed.data);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input', status: 400 } });
      return;
    }
    await changePassword(req.user!.id, parsed.data);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid email', status: 400 } });
      return;
    }
    const result = await requestPasswordReset(parsed.data.email);
    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been created.',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input', status: 400 } });
      return;
    }
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    res.json({ success: true, message: 'Password has been successfully updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/account', authenticate, async (req, res, next) => {
  try {
    await deleteAccount(req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
