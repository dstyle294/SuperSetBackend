const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const logger = require('../utils/logger')
const config = require('../utils/config')
const cloudinary = require('cloudinary')


const User = require('../models/user')
const router = express.Router() // router object holds all routes


// async and await remove need to use then, it waits until request is done to move on

const generateToken = (userId) => {
  return jwt.sign({userId}, config.JWT_SECRET)
}

router.post("/register", async (request, response) => {

  try {
    const { email, username, name, password } = request.body

    if (!username) {
      return response.status(400).json({ message: "Username is required" })
    }
    if (!password) {
      return response.status(400).json({ message: "Password is required" })
    }
    if (!email) {
      return response.status(400).json({ message: "Email is required" })
    }
    if (!name) {
      return response.status(400).json({ message: "Name is required" })
    }

    if (password.length < 6) {
      return response.status(400).json({ message: "Password should be at least 6 characters long"})
    }

    if (username.length < 3) {
      return response.status(400).json({ message: "Username must be at least 3 characters long"})
    }

    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return response.status(400).json({ message: "Email already exists" })
    }

    const existingUsername = await User.findOne({ username })
    if (existingUsername) {
      return response.status(400).json({ message: "Username already exists" })
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // get a random avatar
    const profileImage = `https:api.dicebear.com/7.x/avataars/svg?seed=${username}`

    const user = new User({
      username,
      email,
      name,
      passwordHash,
      profileImage,
      createdAt: Date.now(),
    })

    const savedUser = await user.save()

    const token = generateToken(user.id)

    response.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      }
    })

  } catch (error) {
    logger.error(`Error in register route ${error.message}`)
    response.status(500).json({ message: "Internal server error" })
  }
})

router.post("/login", async (request, response) => {
  try {
    const {email, password} = request.body

    if (!email) {
      return response.status(400).json({ message: "Email missing"} )
    } 

    if (!password) {
      return response.status(400).json({ message: "Password missing"} )
    }

    // check if user exists
    

    const user = await User.findOne({ email })
    const passwordCorrect = user === null 
      ? false
      : await bcrypt.compare(password, user.passwordHash)
    if (!(user && passwordCorrect)) return response.status(400).json({ message: "Invalid email or password" })

    // generate token

    const token = generateToken(user.id)

    response.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      }
    })

  } catch (error) {
    logger.error(`Error in login route ${error}`)
    response.status(500).json({ message: "Internal server error" })
  }
})

module.exports = router