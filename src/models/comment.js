const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post", 
    required: true,
  },
  content: {
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
  parent_comment_id: {
    type: String,
    default: null,
  }, 
  likes: [
    { user_id: String, created_at: Date }
  ],
  likes_count: {
    type: Number,
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
})

const Comment = new mongoose.model('Comment', commentSchema)

module.exports = Comment