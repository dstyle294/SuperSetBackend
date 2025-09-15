const logger = require('./logger')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const { request } = require('express')
const config = require('../utils/config')

const requestLogger = (request, response, next) => {
  console.log('Method: ', request.method)
  console.log('Path: ', request.path)
  console.log('Body: ', request.body)
  console.log('---')
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  next(error)
}

const protectRoute = async (request, response, next) => {
  try {
    // get token
    // header will be { Authorization: `Bearer ${token}`}
    const token = request.header("Authorization").replace("Bearer ", "")
    
    if (!token) return response.status(401).json({ message: "No authentication token, access denied" })

    // verify token
    const decoded = jwt.verify(token, config.JWT_SECRET)

    // find user
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) return response.status(401).json({ message: "Token is not valid" })

    request.user = user
    next()
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`)
    response.status(401).json({ message: "Token is not valid" })
  }
} 

module.exports = {
  requestLogger, 
  unknownEndpoint,
  errorHandler,
  protectRoute,
}