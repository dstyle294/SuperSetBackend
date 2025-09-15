const { userInfo } = require("os")
const { post } = require("../app")
const Post = require("../models/post")
const logger  = require("../utils/logger")
const User = require("../models/user")

const getFilteredPosts = async (currentUserId, skip, limit) => {

  const posts = await Post.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user', 
        foreignField: '_id',
        as: 'authorData'
      }
    },

    {
      $unwind: '$authorData' // the $ tells mongoDB that this is a field, and not a string
    },


    {
      $match: {
        $or: [
          {'authorData.privacy': 'public'},

          {
            $and: [
              { 'authorData.privacy': 'private' },
              { 'authorData.followers': { $in: [currentUserId] } }
            ]
          },

          {'user': currentUserId}
        ]
      }
    },

    {
      $project: {
        authorData: 0,
      }
    }
  ])
  
  return posts
}

module.exports = { getFilteredPosts }