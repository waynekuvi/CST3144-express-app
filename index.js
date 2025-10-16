import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Basic security headers
app.use((req, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff')
	res.setHeader('X-Frame-Options', 'DENY')
	res.setHeader('Referrer-Policy', 'no-referrer')
	next()
})

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Seed endpoint for initial setup
app.post('/seed', async (req, res) => {
	try {
		const database = await connectDb()
		const lessonsCollection = database.collection('lesson')
		const ordersCollection = database.collection('order')

		// Clear existing data
		await lessonsCollection.deleteMany({})
		await ordersCollection.deleteMany({})

		const lessons = [
			{ topic: 'Math', location: 'Hendon', price: 100, space: 5, image: 'math.png' },
			{ topic: 'English', location: 'Colindale', price: 80, space: 5, image: 'english.png' },
			{ topic: 'Science', location: 'Brent Cross', price: 90, space: 5, image: 'science.png' },
			{ topic: 'History', location: 'Golders Green', price: 95, space: 5, image: 'history.png' },
			{ topic: 'Geography', location: 'Hendon', price: 85, space: 5, image: 'geography.png' },
			{ topic: 'Art', location: 'Colindale', price: 70, space: 5, image: 'art.png' },
			{ topic: 'Music', location: 'Brent Cross', price: 110, space: 5, image: 'music.png' },
			{ topic: 'CS', location: 'Golders Green', price: 120, space: 5, image: 'cs.png' },
			{ topic: 'Physics', location: 'Hendon', price: 105, space: 5, image: 'physics.png' },
			{ topic: 'Chemistry', location: 'Colindale', price: 98, space: 5, image: 'chemistry.png' },
		]

		await lessonsCollection.insertMany(lessons)
		res.json({ message: 'Database seeded successfully', count: lessons.length })
	} catch (err) {
		console.error('Seed error:', err)
		res.status(500).json({ error: 'Failed to seed database' })
	}
})

// Logger middleware
app.use((req, res, next) => {
	const now = new Date().toISOString()
	console.log(`[${now}] ${req.method} ${req.url}`)
	next()
})

// Static images (for lesson images)
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const imagesDir = path.join(__dirname, 'public', 'images')

// JSON-aware image middleware
app.get('/images/:file', (req, res, next) => {
	const filePath = path.join(imagesDir, req.params.file)
	fs.access(filePath, fs.constants.F_OK, (err) => {
		if (err) {
			return res.status(404).json({ error: 'Image not found' })
		}
		res.sendFile(filePath)
	})
})

// Also expose directory for direct linking
app.use('/images', express.static(imagesDir))

// MongoDB setup
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://<db_username>:<db_password>@gpmvp.cfal0.mongodb.net/?retryWrites=true&w=majority&appName=GPMVP'
const client = new MongoClient(mongoUri)
let db

async function connectDb() {
	if (!db) {
		await client.connect()
		db = client.db(process.env.DB_NAME || 'cst3144')
	}
	return db
}

})

// GET /lessons - return all lessons
app.get('/lessons', async (req, res) => {
	try {
		console.log('Attempting to connect to database...')
		const database = await connectDb()
		console.log('Connected to database:', database.databaseName)
		const lessons = await database.collection('lesson').find({}).toArray()
		console.log('Found lessons:', lessons.length)
		res.json(lessons)
	} catch (err) {
		console.error('Lessons endpoint error:', err)
		res.status(500).json({ error: 'Internal Server Error', details: err.message })
	}
})


app.post("/orders", async (req, res) => {
	try {
		const { name, phone, lessonIds, spaces } = req.body
		const phoneRegex = /^\+?[0-9\s-]{7,15}$/
		if (!name || typeof name !== "string" || name.trim().length < 2) {
			return res.status(400).json({ error: "Name is required" })
		}
		if (!phone || !phoneRegex.test(String(phone))) {
			return res.status(400).json({ error: "Invalid phone number" })
		}
		if (!Array.isArray(lessonIds) || lessonIds.length === 0 || !Number.isInteger(spaces) || spaces <= 0) {
			return res.status(400).json({ error: "Invalid order payload" })
		}
		const database = await connectDb()
		// Ensure lessons exist
		const objectIds = lessonIds.map((id) => new ObjectId(id))
		const lessons = await database.collection("lesson").find({ _id: { $in: objectIds } }).toArray()
		if (lessons.length !== lessonIds.length) {
			return res.status(400).json({ error: "One or more lessons not found" })
		}
		const result = await database.collection("order").insertOne({ name: name.trim(), phone: String(phone), lessonIds: objectIds, spaces, createdAt: new Date() })
		return res.status(201).json({ _id: result.insertedId })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: "Internal Server Error" })
	}
})
app.post('/orders', async (req, res) => {
	try {
		
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})

// PUT /lessons/:id - update any attribute(s) on a lesson
app.put('/lessons/:id', async (req, res) => {
	try {
		const { id } = req.params
		const update = req.body
		if (!update || typeof update !== 'object') {
			return res.status(400).json({ error: 'Invalid update payload' })
		}
		const database = await connectDb()
		const result = await database.collection('lesson').updateOne({ _id: new ObjectId(id) }, { $set: update })
		res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})

// GET /search?q=... - full-text like search across fields
app.get('/search', async (req, res) => {
	try {
		const q = (req.query.q || '').toString().trim()
		const database = await connectDb()
		if (!q) {
			const all = await database.collection('lesson').find({}).toArray()
			return res.json(all)
		}
		const regex = new RegExp(q, 'i')
		const numericQ = Number(q)
		const numericFilters = Number.isNaN(numericQ) ? [] : [{ price: numericQ }, { space: numericQ }]
		const results = await database
			.collection('lesson')
			.find({
				$or: [
					{ topic: regex },
					{ location: regex },
					...numericFilters,
				],
			})
			.toArray()
		res.json(results)
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})

app.listen(port, () => {
	console.log(`Server listening on port ${port}`)
})

// Not found handler
app.use((req, res) => {
	res.status(404).json({ error: 'Not Found' })
})

// Error handler
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err)
	res.status(500).json({ error: 'Internal Server Error' })
})
