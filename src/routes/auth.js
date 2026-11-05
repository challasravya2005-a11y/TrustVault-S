const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { record } = require('../audit');
const { requireAuth } = require('../middleware');
const { HttpError } = require('../errors');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      await record(null, 'LOGIN', null, false, { reason: 'Missing credentials', attempted_email: email });
      throw new HttpError(400, 'Email and password are required');
    }

    const user = await db.findUserByEmail(email);
    const valid = user && (await bcrypt.compare(password, user.password_hash));

    if (!valid) {
      await record(user, 'LOGIN', null, false, { reason: 'Invalid credentials' });
      throw new HttpError(401, 'Invalid email or password');
    }

    req.session.userId = user.id;
    await record(user, 'LOGIN', null, true, {});
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    req.session.destroy(async () => {
      await record(user, 'LOGOUT', null, true, {});
      res.clearCookie('trustvault.sid');
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
