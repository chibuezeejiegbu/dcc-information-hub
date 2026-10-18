require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);

const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts. Please try again in 15 minutes.'
    }
});
const PORT = process.env.PORT || 3000;

const client = new MongoClient(process.env.MONGODB_URI);
if (
    !process.env.MONGODB_URI ||
    !process.env.MONGODB_DB_NAME ||
    !process.env.SESSION_SECRET ||
    !process.env.ADMIN_SETUP_SECRET
) {
    throw new Error('Missing required database or session configuration.');
}

app.use(express.json());
app.use(session({
    name: 'dcc_admin_sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        client,
        dbName: process.env.MONGODB_DB_NAME,
        collectionName: 'admin_sessions',
        ttl: 60 * 60 * 8
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.RENDER === 'true',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8
    }
}));


app.get('/admin-dashboard.html', (req, res) => {
    res.set('Cache-Control', 'no-store');

    if (req.session?.adminId !== 'primary') {
        return res.redirect('/admin.html');
    }

    return res.sendFile(__dirname + '/admin-dashboard.html');
});
  
app.use(express.static(__dirname));

app.get('/api/test', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const collections = await db.listCollections().toArray();

        res.json({
            success: true,
            message: 'Connected to DCC Information Hub database.',
            collections: collections.map(c => c.name)
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Database connection failed.'
        });
    }
});

app.get('/api/events', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const events = await db
            .collection('events')
            .find({})
            .toArray();

        res.json({
            success: true,
            events
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve events.'
        });
    }
});

app.get('/api/worship-centres', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const worshipCentres = await db
            .collection('worship_centres')
            .find({})
            .toArray();

        res.json({
            success: true,
            worshipCentres
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve worship centres.'
        });
    }
});

app.get('/api/forms', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const forms = await db
            .collection('forms')
            .find({})
            .toArray();

        res.json({
            success: true,
            forms
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve forms.'
        });
    }
});

app.get('/api/giving-accounts', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const givingAccounts = await db
            .collection('giving_accounts')
            .find({})
            .toArray();

        res.json({
            success: true,
            givingAccounts
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve giving accounts.'
        });
    }
});

app.get('/api/people', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const people = await db
            .collection('people')
            .find({})
            .toArray();

        res.json({
            success: true,
            people
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve people.'
        });
    }
});

app.get('/api/leadership-assignments', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const assignments = await db
            .collection('leadership_assignments')
            .find({})
            .toArray();

        res.json({
            success: true,
            assignments
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve leadership assignments.'
        });
    }
});

app.get('/api/departments', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const departments = await db
            .collection('departments')
            .find({})
            .toArray();

        res.json({
            success: true,
            departments
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve departments.'
        });
    }
});

app.get('/api/resources', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const resources = await db
            .collection('resources')
            .find({})
            .toArray();

        res.json({
            success: true,
            resources
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve resources.'
        });
    }
});

app.get('/api/schools', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const schools = await db
            .collection('schools')
            .find({})
            .toArray();

        res.json({
            success: true,
            schools
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve schools.'
        });
    }
});

app.get('/api/long-form-content', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const content = await db
            .collection('long_form_content')
            .find({})
            .toArray();

        res.json({
            success: true,
            content
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve long-form content.'
        });
    }
});

app.get('/api/external-links', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const links = await db
            .collection('external_links')
            .find({})
            .toArray();

        res.json({
            success: true,
            links
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve external links.'
        });
    }
});

app.post('/api/contact-events', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const contactEvent = {
            session_id: req.body.session_id || null,
            entry_point: req.body.entry_point || 'unknown',
            context: req.body.context || null,
            contact_option: 'Contact Our Team',
            created_at: new Date()
        };

        const result = await db
            .collection('contact_events')
            .insertOne(contactEvent);

        res.json({
            success: true,
            message: 'Contact event recorded.',
            id: result.insertedId
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not record contact event.'
        });
    }
});

app.post('/api/contact-requests', async (req, res) => {
    try {
        await client.connect();

        const db = client.db(process.env.MONGODB_DB_NAME || 'dcc_information_hub');

        const name = String(req.body.name || '').trim();
        const whatsappNumber = String(req.body.whatsapp_number || '').trim();
        const isDccWorker = req.body.is_dcc_worker;
        const department = String(req.body.department || '').trim();
        const entryPoint = String(req.body.entry_point || 'whatsapp_form').trim();
        const context = req.body.context
            ? String(req.body.context).trim()
            : null;
        const sessionId = req.body.session_id
            ? String(req.body.session_id).trim()
            : null;

        // Name validation
        const nameLetters = (name.match(/[A-Za-z]/g) || []).length;

        if (nameLetters < 3) {
            return res.status(400).json({
                success: false,
                message: 'Name must contain at least 3 letters.'
            });
        }

        // WhatsApp validation
        const whatsappDigits = (whatsappNumber.match(/\d/g) || []).length;
        const validWhatsappCharacters = /^[+\d\s().-]+$/.test(whatsappNumber);

        if (whatsappDigits < 4) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp number must contain at least 4 digits.'
            });
        }

        if (!validWhatsappCharacters) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp number contains invalid characters.'
            });
        }

        // DCC worker selection must be explicitly true or false
        if (isDccWorker !== true && isDccWorker !== false) {
            return res.status(400).json({
                success: false,
                message: 'Please specify whether you are a DCC worker.'
            });
        }

        // Department is required only for DCC workers
        if (isDccWorker === true) {
            const departmentLetters =
                (department.match(/[A-Za-z]/g) || []).length;

            if (departmentLetters < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Department must contain at least 3 letters.'
                });
            }
        }

        const contactRequest = {
            session_id: sessionId,
            name,
            whatsapp_number: whatsappNumber,
            is_dcc_worker: isDccWorker,
            department: isDccWorker ? department : null,
            entry_point: entryPoint,
            context,
            status: 'new',
            created_at: new Date()
        };

        const result = await db
            .collection('contact_requests')
            .insertOne(contactRequest);

        res.json({
            success: true,
            message: 'Contact request recorded.',
            id: result.insertedId
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Could not record contact request.'
        });
    }
});

app.post('/api/admin/setup', adminLoginLimiter, async (req, res) => {
    try {
        const setupSecret = process.env.ADMIN_SETUP_SECRET;
        const suppliedSecret = req.body?.setupSecret;

        if (!setupSecret) {
            return res.status(503).json({
                success: false,
                message: 'Admin setup is not configured.'
            });
        }

        if (typeof suppliedSecret !== 'string') {
            return res.status(401).json({
                success: false,
                message: 'Invalid setup authorization.'
            });
        }

        const expected = Buffer.from(setupSecret, 'utf8');
        const supplied = Buffer.from(suppliedSecret, 'utf8');

        if (
            expected.length !== supplied.length ||
            !crypto.timingSafeEqual(expected, supplied)
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid setup authorization.'
            });
        }

        const { username, password } = req.body;

        if (
            typeof username !== 'string' ||
            !/^[a-zA-Z0-9._-]{3,40}$/.test(username) ||
            typeof password !== 'string' ||
            password.length < 14 ||
            Buffer.byteLength(password, 'utf8') > 1024
        ) {
            return res.status(400).json({
                success: false,
                message: 'Use a username of 3–40 letters, numbers, dots, underscores or hyphens, and a password of at least 14 characters.'
            });
        }

        await client.connect();

        const db = client.db(
            process.env.MONGODB_DB_NAME || 'dcc_information_hub'
        );

        const admins = db.collection('admin_users');

        const salt = crypto.randomBytes(16).toString('hex');

        const passwordHash = await new Promise((resolve, reject) => {
            crypto.scrypt(password, salt, 64, (error, key) => {
                if (error) reject(error);
                else resolve(key.toString('hex'));
            });
        });

        await admins.insertOne({
            _id: 'primary',
            username: username.toLowerCase(),
            passwordHash,
            passwordSalt: salt,
            createdAt: new Date()
        });

        return res.status(201).json({
            success: true,
            message: 'Initial administrator created. You can now log in.'
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An administrator already exists. Setup is closed.'
            });
        }

        console.error('Admin setup failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Admin setup failed.'
        });
    }
});

app.post('/api/admin/login', adminLoginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            username.length > 40 ||
            password.length > 1024
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        await client.connect();

        const db = client.db(
            process.env.MONGODB_DB_NAME || 'dcc_information_hub'
        );

        const admin = await db.collection('admin_users').findOne({
            _id: 'primary',
            username: username.toLowerCase()
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const passwordHash = await new Promise((resolve, reject) => {
            crypto.scrypt(password, admin.passwordSalt, 64, (error, key) => {
                if (error) reject(error);
                else resolve(key);
            });
        });

        const storedHash = Buffer.from(admin.passwordHash, 'hex');

        if (
            storedHash.length !== passwordHash.length ||
            !crypto.timingSafeEqual(storedHash, passwordHash)
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                console.error('Session regeneration failed:', error.message);
                return res.status(500).json({
                    success: false,
                    message: 'Login could not be completed.'
                });
            }

            req.session.adminId = 'primary';

            req.session.save((saveError) => {
                if (saveError) {
                    console.error('Session save failed:', saveError.message);
                    return res.status(500).json({
                        success: false,
                        message: 'Login could not be completed.'
                    });
                }

                return res.json({
                    success: true,
                    message: 'Login successful.'
                });
            });
        });

    } catch (error) {
        console.error('Admin login failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Login could not be completed.'
        });
    }
});

app.get('/api/admin/me', (req, res) => {
    if (req.session?.adminId !== 'primary') {
        return res.status(401).json({
            success: false,
            authenticated: false,
            message: 'Not logged in.'
        });
    }

    return res.json({
        success: true,
        authenticated: true
    });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Admin logout failed:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Logout could not be completed.'
            });
        }

        res.clearCookie('dcc_admin_sid', {
            httpOnly: true,
            secure: process.env.RENDER === 'true',
            sameSite: 'lax',
            path: '/'
        });

        return res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});

app.listen(PORT, () => {
    console.log(`DCC Information Hub backend running at http://localhost:${PORT}`);
});
