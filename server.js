require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;

const client = new MongoClient(process.env.MONGODB_URI);

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
});

app.use(express.static(__dirname));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
});

app.get('/api/test', async (req, res) => {
    try {
        await client.connect();

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

        const db = client.db('dcc_information_hub');

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

app.listen(PORT, () => {
    console.log(`DCC Information Hub backend running at http://localhost:${PORT}`);
});