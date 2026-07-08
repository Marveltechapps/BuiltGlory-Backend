import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

await mongoose.connect(process.env.MONGODB_URI)
const doc = await mongoose.connection.db.collection('properties').findOne({
  title: /Gilli/i,
  isDeleted: { $ne: true },
})
console.log(JSON.stringify(doc ? { title: doc.title, type: doc.type, specs: doc.specs } : null, null, 2))
await mongoose.disconnect()
