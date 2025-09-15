const mongoose = require('mongoose')
const bcryptjs = require('bcryptjs')

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: String,
  profileImage: {
    type: String,
    default: ""
  },
}, {timestamps: true}
)

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  }
}) // this is for when the entry is converted to json and displayed to the world. This isn't for MongoDB.



const User = mongoose.model('User', userSchema)

module.exports = User