# CST3144 Express.js Backend

This is the Express.js backend for the CST3144 coursework - an after-school activities marketplace.

## API Endpoints

- `GET /lessons` - Returns all lessons
- `GET /search?q=query` - Search lessons by topic, location, price, or space
- `POST /orders` - Create a new order
- `PUT /lessons/:id` - Update lesson (used for updating spaces after checkout)
- `GET /images/:filename` - Serve lesson images

## Deployment

Deployed on Render.com at: https://cst3144-express-app.onrender.com/

## Environment Variables

- `MONGODB_URI` - MongoDB Atlas connection string
- `DB_NAME` - Database name (GPMVP)

## Local Development

```bash
npm install
npm run seed  # Seed the database with sample lessons
npm run dev   # Start development server
```

