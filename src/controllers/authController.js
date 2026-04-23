const { supabase, supabaseAnon } = require('../config/supabase');
const { insertAuditLog } = require('../utils/auditLog');

// POST /api/auth/register
// Required: email, password, full_name
// Optional: phone, city, company, emirates_id
async function register(req, res, next) {
  try {
    const { email, password, full_name, phone, city, company, emirates_id, username } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' });
    }

    // Validate username format if provided
    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, and underscores (3–30 characters).' });
    }

    // Check username uniqueness if provided
    if (username) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (existingUser) {
        return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
      }
    }

    // Use anon client — signUp does not require service role key
    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) {
      // Supabase error when email confirmation is disabled
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email already')) {
        return res.status(409).json({ error: 'An account with this email already exists. Please login instead.' });
      }
      return res.status(400).json({ error: error.message });
    }

    // When email confirmation is ENABLED, Supabase returns success but
    // with an empty identities array for duplicate emails (silent duplicate).
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      return res.status(409).json({ error: 'An account with this email already exists. Please login instead.' });
    }

    // Build profile row — include any optional fields that were provided
    const profileRow = {
      id: data.user.id,
      email,
      full_name,
    };
    if (phone)       profileRow.phone       = phone;
    if (city)        profileRow.city        = city;
    if (company)     profileRow.company     = company;
    if (emirates_id) profileRow.emirates_id = emirates_id;
    if (username)    profileRow.username    = username;

    // Upsert profile row (the DB trigger may already have created it)
    await supabase.from('users').upsert(profileRow);

    // Log user registration activity
    await insertAuditLog({
      actorName: full_name, actorEmail: email,
      action: 'user_registered', targetType: 'user',
      targetId: data.user.id, targetLabel: email,
      severity: 'low', details: { full_name, username: username || null },
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    });

    // If email confirmation is DISABLED, Supabase returns a session immediately
    // Return the token so the frontend can log the user in without OTP step
    if (data.session) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return res.status(201).json({
        requires_verification: false,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: { id: data.user.id, email: data.user.email, ...profile },
      });
    }

    // Email confirmation is ENABLED — user must verify via OTP
    return res.status(201).json({
      requires_verification: true,
      message: 'Check your email for the verification code',
      user_id: data.user.id,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Fetch profile from public.users
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Log login activity
    await insertAuditLog({
      actorName: profile?.full_name, actorEmail: email,
      action: 'user_login', targetType: 'user',
      targetId: data.user.id, targetLabel: email,
      severity: 'low',
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    });

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    await supabase.auth.admin.signOut(req.token);
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.json({ message: 'Logged out' });
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/me
async function updateMe(req, res, next) {
  try {
    const allowed = [
      'full_name', 'phone', 'company', 'city', 'emirates_id', 'passport_number', 'plan', 'plan_selected_at',
      'date_of_birth', 'address', 'gender', 'account_type', 'country', 'how_did_you_hear', 'vat_number',
      'username',
    ];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/auth/me
async function deleteMe(req, res, next) {
  try {
    const { error } = await supabase.auth.admin.deleteUser(req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/verify-otp
// Body: { email, token }
// Verifies the 6-digit OTP code from the confirmation email
async function verifyOtp(req, res, next) {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'email and token are required' });
    }

    const { data, error } = await supabaseAnon.auth.verifyOtp({
      email,
      token: String(token).trim(),
      type: 'signup',
    });

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('expired') || msg.includes('invalid')) {
        return res.status(400).json({ error: 'Code is invalid or has expired. Please register again.' });
      }
      return res.status(400).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    // Ensure profile row exists
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/resend-otp
// Body: { email }
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const { error } = await supabaseAnon.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ message: 'Verification code resent' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
// Body: { email }
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://admin.trustdepo.com/reset-password',
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ message: 'Password reset email sent. Check your inbox.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/change-password  (authenticated)
// Body: { current_password, new_password }
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Fetch user email to re-authenticate
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'User not found' });

    // Verify current password by signing in
    const { error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: profile.email,
      password: current_password,
    });

    if (authError) return res.status(401).json({ error: 'Current password is incorrect' });

    // Update to new password
    const { error: updateError } = await supabase.auth.admin.updateUserById(req.user.id, {
      password: new_password,
    });

    if (updateError) return res.status(500).json({ error: updateError.message });

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, getMe, updateMe, deleteMe, verifyOtp, resendOtp, forgotPassword, changePassword };
