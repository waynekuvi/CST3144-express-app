import { MongoClient } from 'mongodb'

const mongoUri = process.env.MONGODB_URI
const dbName = process.env.DB_NAME || 'cst3144'

if (!mongoUri) {
	console.error('Please set MONGODB_URI environment variable')
	process.exit(1)
}

const client = new MongoClient(mongoUri)

async function run() {
	await client.connect()
	const db = client.db(dbName)
	const lessons = [
		{ topic: 'Math', location: 'Hendon', price: 100, space: 5, image: 'math.png' },
		{ topic: 'English', location: 'Colindale', price: 90, space: 5, image: 'english.png' },
		{ topic: 'Science', location: 'Brent Cross', price: 95, space: 5, image: 'science.png' },
		{ topic: 'History', location: 'Golders Green', price: 85, space: 5, image: 'history.png' },
		{ topic: 'Geography', location: 'Hendon', price: 80, space: 5, image: 'geography.png' },
		{ topic: 'Art', location: 'Colindale', price: 70, space: 5, image: 'art.png' },
		{ topic: 'Music', location: 'Brent Cross', price: 75, space: 5, image: 'music.png' },
		{ topic: 'Computer Science', location: 'Golders Green', price: 110, space: 5, image: 'cs.png' },
		{ topic: 'Physics', location: 'Hendon', price: 105, space: 5, image: 'physics.png' },
		{ topic: 'Chemistry', location: 'Colindale', price: 102, space: 5, image: 'chemistry.png' },
	]
	await db.collection('lesson').deleteMany({})
	const result = await db.collection('lesson').insertMany(lessons)
	console.log(`Inserted ${result.insertedCount || Object.keys(result.insertedIds).length} lessons`)
	await client.close()
}

run().catch((e) => {
	console.error(e)
	process.exit(1)
})
