const mongoose = require('mongoose')
const config = require('../utils/config')
const logger = require('../utils/logger')

const connectDB = async () => {

  try {
    const conn = await mongoose.connect(config.MONGODB_URI)
    logger.info(`Database connnected ${conn.connection.host}`)
  } catch (error) {
    logger.error(`Error connecting to database ${error.message}`)
    process.exit(1) // for failure
  }
}

module.exports = connectDB