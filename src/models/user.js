const mongoose = require('mongoose')
const bcryptjs = require('bcryptjs')
const { setFlagsFromString } = require('v8')

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
  privacy: {
    type: String,
    enum: ['private', 'public'], 
    default: "public"
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }], 
  following: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
  }],
  pendingFollowRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  followRequestsReceived: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  followerCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  pendingRequestCount: {
    type: Number,
    default: 0
  },
  receivedRequestCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: this.createdAt
  }
}
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