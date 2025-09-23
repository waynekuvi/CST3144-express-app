import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

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

// Health
app.get('/health', (req, res) => {
	res.json({ status: 'ok' })
})

// GET /lessons - return all lessons
app.get('/lessons', async (req, res) => {
	try {
		const database = await connectDb()
		const lessons = await database.collection('lesson').find({}).toArray()
		res.json(lessons)
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})

// POST /orders - create new order
app.post('/orders', async (req, res) => {
	try {
		const { name, phone, lessonIds, spaces } = req.body
		if (!name || !phone || !Array.isArray(lessonIds) || typeof spaces !== 'number') {
			return res.status(400).json({ error: 'Invalid payload' })
		}
		const database = await connectDb()
		const result = await database.collection('order').insertOne({ name, phone, lessonIds, spaces, createdAt: new Date() })
		res.status(201).json({ _id: result.insertedId })
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
