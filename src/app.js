const express = require('express')
const cors = require('cors')
const job = require('./lib/cron')

const authRouter = require('./routes/authRouter')
const workoutRouter = require('./routes/workoutRouter')
const exerciseRouter = require('./routes/exerciseRouter')
const postRouter = require('./routes/postRouter')
const userRouter = require('./routes/userRouter')

const middleware = require('./utils/middleware')
const mongoose = require('mongoose')
const logger = require('./utils/logger')
const config = require('./utils/config')
const connectDB = require('./lib/db')

const app = express()

job.start()

mongoose.set('strictQuery', false)
logger.info(`connecting to ${config.MONGODB_URI}`)

connectDB()



app.use(cors())
app.use(express.json())
app.use(middleware.requestLogger)

app.use("/api/auth", authRouter)
app.use("/api/workouts", workoutRouter)
app.use("/api/exercises", exerciseRouter)
app.use("/api/posts", postRouter)
app.use("/api/users", userRouter)


app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app