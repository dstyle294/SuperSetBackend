const { v2: cloudinary } = require('cloudinary')
const config = require('../utils/config')

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key:config.CLOUDINARY_API_KEY,
  api_secret:config.CLOUDINARY_API_SECRET,
})

module.exports = cloudinary