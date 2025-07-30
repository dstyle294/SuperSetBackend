const mongoose = require('mongoose')

const postSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workout: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workout", 
  },
  media: [
    {
      type: {
        type: String,
        enum: ['image', 'video'],
        required: true,
      },
      url: String,
      thumbnail_url: String,
    }
  ],
  caption: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: null,
  },
  updated_at: {
    type: Date,
    default: this.created_at,
  },
  likes: [
    { user_id: String, created_at: Date }
  ],
  shares: [
    { user_id: String, created_at: Date, shared_to: String}
  ],
  likes_count: { type: Number, default: 0},
  shares_count: { type: Number, default: 0},
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    }
  ],
  comments_count: { type: Number, default: 0 },
})

const Post = new mongoose.model('Post', postSchema)

module.exports = Post