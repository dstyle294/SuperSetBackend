const express = require('express')
const cors = require('cors')

const authRouter = require('./routes/authRouter')
const workoutRouter = require('./routes/workoutRouter')
const exerciseRouter = require('./routes/exerciseRouter')


const middleware = require('./utils/middleware')
const mongoose = require('mongoose')
const logger = require('./utils/logger')
const config = require('./utils/config')
const connectDB = require('./lib/db')

const app = express()



mongoose.set('strictQuery', false)
logger.info(`connecting to ${config.MONGODB_URI}`)

connectDB()

app.use(cors())
app.use(express.json())
app.use(middleware.requestLogger)

app.use("/api/auth", authRouter)
app.use("/api/workouts", workoutRouter)
app.use("/api/exercises", exerciseRouter)



app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app