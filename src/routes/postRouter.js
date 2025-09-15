const express = require('express')
const cloudinary = require('../lib/cloudinary')
const router = express.Router()
const Post = require('../models/post')
const Comment = require('../models/comment')
const logger = require('../utils/logger')
const middleware = require('../utils/middleware')
const mongoose = require('mongoose')
const Workout = require('../models/workout')
const { request } = require('http')
const { getFilteredPosts } = require('../services/postServices')
const User = require('../models/user')
const { isViewable } = require('../services/userService')

// Create post
router.post("/", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id.toString()
    const {
      workout,
      media,
      caption
    } = request.body

    if (!caption) {
      return response.status(400).json({ message: 'Caption required' })
    }

    const created_at = new Date()

    const newPost = new Post({
      caption: caption,
      user: userId,
      created_at: created_at,
    })

    if (workout) {
      const thisWorkout = await Workout.findOne({
        $and: [
          {_id: {$eq: workout}},
          {user: {$eq: userId}}
        ]
      })
      if (thisWorkout) {
        newPost.workout = workout
      } else {
        return response.status(400).json({ message: 'Post must be made in relation to own workout'})
      }
    }

    if (media) {
      for (const element of media) {
        if (element.type === 'image') {
          const uploadResponse = await cloudinary.uploader.upload(element.url)
          const imageUrl = uploadResponse.secure_url
          const mediaObj = {
            type: 'image',
            url: imageUrl,
          }
          newPost.media.push(mediaObj)
          
        } else if (element.type === 'video') {
          const uploadResponse = await cloudinary.uploader.upload_large(element.url, { resource_type: 'video' })
          const videoUrl = uploadResponse.secure_url
          const mediaObj = {
            type: 'video', 
            url: videoUrl,
          }
          if (element.thumbnail_url) {
            const uploadResponse = await cloudinary.uploader.upload(element.thumbnail_url)
            const imageUrl = uploadResponse.secure_url
            mediaObj.thumbnail_url = imageUrl
          }
          newPost.media.push(mediaObj)
          logger.info(newPost.media)
        } 
      }
    }
    

    await newPost.save()

    response.json({
      message: 'New post saved', 
      post: newPost,
    })

  } catch (error) {
    logger.error(`Error creating new post ${error}`)
    response.status(500).json({ message: 'Failed to create new post' })
  }
})

// All posts
router.get("/", middleware.protectRoute, async (request, response) => {
  try {

    const userId = request.user._id
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    logger.info(userId)

    let posts = await getFilteredPosts(userId, skip, limit)

    const totalPosts = await posts.length

    posts = posts
      .sort((p1, p2) => p2.created_at - p1.created_at)
      .slice(skip, skip + limit)


    if (!posts) {
      return response.status(404).json({ message: 'No posts exist under this user' })
    }


    response.status(200).json({
      message: 'Posts found', 
      posts: posts,
      currentPage: page,
      totalPosts,
      totalPages: Math.ceil(totalPosts  /limit)
    })
  } catch (error) {
    logger.error(`Error receiving posts ${error}`)
    response.status(500).json({ message: 'Failed to get posts' })
  }
})

// All posts for a user
router.get("/user", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id.toString()
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const posts = await Post.find(
      {user: {$eq: userId}}
    )
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)

    

    if (!posts) {
      return response.status(404).json({ message: 'No posts exist under this user' })
    }

    const totalPosts = await Post.countDocuments({user: {$eq: userId}})

    response.status(200).json({
      message: 'Posts found', 
      posts: posts,
      currentPage: page,
      totalPosts,
      totalPages: Math.ceil(totalPosts  /limit)
    })
  } catch (error) {
    logger.error(`Error receiving posts ${error}`)
    response.status(500).json({ message: 'Failed to get posts' })
  }
})

// All posts for another user
router.get("/user/:userId", middleware.protectRoute, async (request, response) => {
  try {

    const userId = request.user._id
    const targetUserId = mongoose.Types.ObjectId.createFromHexString(request.params.userId)
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit


    if (targetUserId.toString() !== userId.toString() && ! await isViewable(userId, targetUserId)) {
      return response.status(400).json({ message: 'Unauthorized' })
    }

    const posts = await Post.find(
      {user: {$eq: targetUserId}}
    )
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)

    

    if (!posts) {
      return response.status(404).json({ message: 'No posts exist under this user' })
    }

    const totalPosts = await Post.countDocuments({user: {$eq: targetUserId}})

    response.status(200).json({
      message: 'Posts found', 
      posts: posts,
      currentPage: page,
      totalPosts,
      totalPages: Math.ceil(totalPosts  /limit)
    })
  } catch (error) {
    logger.error(`Error receiving posts ${error}`)
    response.status(500).json({ message: 'Failed to get posts for user' })
  }
})

// Single post
router.get("/:postId", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id.toString()
    const postId = request.params.postId

    const post = await Post.findOne({
      $and: [
        {_id: {$eq: postId}}
      ]
    })



    if (!post) {
      return response.status(404).json({ message: 'Post not found' })
    }

    const author = post.user

    if (author.toString() !== userId.toString() && ! await isViewable(userId, author)) {
      return response.status(400).json({ message: 'Unauthorized' })
    }

    response.status(200).json({
      message: 'Post found',
      post: post
    })
  } catch (error) {
    logger.error(`Error getting post ${error}`)
    response.status(500).json({ message: 'Failed to retrieve post' })
  }
})

// Update post details
router.put("/:postId", middleware.protectRoute, async (request, response) => {
  try {
    const updateData = request.body
    const userId = request.user._id
    const postId = request.params.postId
    
    const post = await Post.findOne({
      $and: [
        {_id: {$eq: postId}},
        {user: {$eq: userId}}
      ]
    })

    if (!post) {
      return response.status(404).json({ message: `Workout not found` })
    }

    const allowedFields = ['caption', 'workout']

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        post[field] = updateData[field]
      }
    })

    post.updated_at = new Date()

    await post.save()

    response.status(200).json({
      message: 'Post updated',
      post: post
    })

  } catch (error) {
    logger.error(`Error updating post ${error}`)
    response.status(500).json({ message: 'Failed to update post' })
  }
})

// Add media
router.post("/:postId/media", middleware.protectRoute, async (request, response) => {
  try {
    const media = request.body.media
    const userId = request.user._id
    const postId = request.params.postId

    const post = await Post.findOne({
      $and: [
        {_id: {$eq: postId}},
        {user: {$eq: userId}}
      ]
    })

    if (!media) {
      return response.status(404).json({ message: 'No media to add'})
    }

    for (const element of media) {
      if (element.type === 'image') {
        const uploadResponse = await cloudinary.uploader.upload(element.url)
        const imageUrl = uploadResponse.secure_url
        const mediaObj = {
          type: 'image',
          url: imageUrl,
        }
        post.media.push(mediaObj)
        
      } else if (element.type === 'video') {
        const uploadResponse = await cloudinary.uploader.upload_large(element.url, { resource_type: 'video' })
        const videoUrl = uploadResponse.secure_url
        const mediaObj = {
          type: 'video', 
          url: videoUrl,
        }
        if (element.thumbnail_url) {
          const uploadResponse = await cloudinary.uploader.upload(element.thumbnail_url)
          const imageUrl = uploadResponse.secure_url
          mediaObj.thumbnail_url = imageUrl
        }
        post.media.push(mediaObj)
      } 
    }

    post.updated_at = new Date()

    await post.save()

    response.status(201).json({
      message: 'Media added successfully',
      post: post
    })
  } catch (error) {
    logger.error(`Error adding media ${error}`)
    response.status(500).json({ message: 'Failed to add media' })
  }
})

// Delete media
router.delete("/:postId/media/:mediaId", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const postId = request.params.postId
    const mediaId = request.params.mediaId.toString()

    const post = await Post.findOne({
      $and: [
        {_id: {$eq: postId}},
        {user: {$eq: userId}}
      ]
    })

    if (!post) {
      return response.status(404).json({ message: 'Post not found' })
    }

    const elementIndex = post.media.findIndex(element => {
      return element._id.toString() === mediaId
    })

    if (elementIndex === -1) {
      return response.status(404).json({ message: 'Media not found' })
    }

    post.media.splice(elementIndex, 1)

    post.updated_at = new Date()

    await post.save()

    response.status(200).json({
      message: 'Media deleted',
      post: post
    })

  } catch (error) {
    logger.error(`Error deleting media ${error}`)
    response.status(500).json({ message: 'Failed to delete media' })
  }
})

// Delete Post
router.delete("/:postId", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id.toString()

    const post = await Post.findById(request.params.postId)

    // check if user is creator of post
    if (post.user.toString() !== userId) {
      return response.status(401).json({ message: 'Unauthorized' })
    }

    if (post.media) {
      for (const element of post.media) {
        if (element.url.includes("cloudinary")) {
          try {
            const publicId = element.url.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(publicId)
          } catch (deleteError) {
            logger.error(`Error deleting image from cloudinary ${deleteError}`)
          }
        }
        if (element.thumbnail_url) {
          if (element.thumbnail_url.includes("cloudinary")) {
            try {
              const publicId = element.thumbnail_url.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(publicId)
            } catch (deleteError) {
              logger.error(`Error deleting image from cloudinary ${deleteError}`)
            }
          }
        }
      } 
    }

    // delete all comments for this post
    await Comment.deleteMany({ post: request.params.postId })

    await post.deleteOne()

    response.status(202).json({ message: 'Post deleted successfully' })
  } catch (error) {
    logger.error(`Error deleting post ${error}`)
    response.status(500).json({ message: 'Failed to delete post' })
  }
})

// Create comment on a post
router.post("/:postId/comment", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const postId = request.params.postId

    const {
      content,
      parent_comment_id
    } = request.body

    const post = await Post.findById(postId)

    if (!post) return response.status(404).json({ message: 'Cannot find post' })
    

    const author = post.user

    if (author.toString() !== userId.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }
    
    if (!content) {
      return response.status(404).json({ message: 'Content missing for comment' })
    } 

    const created_at = new Date()
    const comment = new Comment({
      user: userId,
      post: postId,
      content: content,
      created_at: created_at
    })

    if (parent_comment_id) {
      const parentComment = Comment.findById(parent_comment_id)
      if (!parentComment || parentComment.post != postId) {
        return response.status(404).json({ message: 'No such parent comment' })
      }
      comment.parent_comment_id = parent_comment_id
    }

    await comment.save()

    const updatedPost = await Post.findByIdAndUpdate(postId, {
      $push: { comments: comment._id },
      $inc: { comments_count: 1 }
    }, {new: true})

    response.status(201).json({
      message: 'Comment successfully added',
      comment: comment,
      post: updatedPost
    })

  } catch (error) {
    logger.error(`Error creating comment ${error}`)
    response.status(500).json({ message: 'Failed to create comment' })
  }
})

// Get all comments for a post
router.get("/:postId/comment", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const postId = request.params.postId
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const post = await Post.findById(postId)

    if (!post) {
      return response.status(404).json({ message: 'No such post' })
    }

    const author = post.user

    if (author.toString() !== userId.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }


    const comments = await Comment.find({
      $and: [
        {post: { $eq: postId }},
        {is_deleted: {$eq: false}}
      ]
    })
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)

    
    if (!comments) {
      return response.status(404).json({ message: 'No comments exist under this post' })
    }

    const totalComments = await Comment.countDocuments({post: {$eq: postId}})

    response.status(200).json({
      message: 'Comments found', 
      comments: comments,
      currentPage: page,
      totalComments,
      totalPages: Math.ceil(totalComments / limit)
    })
  } catch (error) {
    logger.error(`Error getting comments ${error}`)
    response.status(500).json({ message: 'Failed to retrieve comments' })
  }
})

// Get a specific comment
router.get("/:postId/comment/:commentId", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user_id
    const postId = request.params.postId
    const commentId = request.params.commentId.toString()

    const post = await Post.findById(postId)

    if (!post) {
      return response.status(404).json({ message: 'No such post' })
    }

    const author = post.user

    if (author.toString() !== userId.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    const comment = await Comment.find({
      $and: [
        {post: {$eq: postId}},
        {_id: {$eq: commentId}},
        {is_deleted: {$eq: false}}
      ]
    })

    if (!comment) {
      return response.status(404).json({ message: 'No such comments exists under this post' })
    }

    response.status(200).json({
      message: 'Comment found', 
      comment: comment
    })

  } catch (error) {
    logger.error(`Error getting comment ${error}`)
    response.status(500).json({ message: 'Failed to retrieve comment' })
  }
})

// Get all comments for a user 
router.get("/:userId/comments", middleware.protectRoute, async (request, response) => {
  try {
    const currentUserId = request.user._id
    const userId = mongoose.Types.ObjectId.createFromHexString(request.params.userId)
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const comments = await Comment.find({
      $and: [{user: {$eq: userId}},
      {is_deleted: {$eq: false}}]
    })
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)


    if (userId.toString() !== currentUserId.toString() && ! await isViewable(currentUserId, userId)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    if (!comments) {
      return response.status(404).json({ message: 'No comments exist under this user' })
    }

    const totalComments = await Comment.countDocuments({$and: [
      {user: {$eq: userId}},
      {is_deleted: {$eq: false}}
    ]})

    response.status(200).json({
      message: 'Comments found', 
      comments: comments,
      currentPage: page,
      totalComments,
      totalPages: Math.ceil(totalComments / limit)
    })
  } catch (error) {
    logger.error(`Error retrieving comments ${error}`)
    response.status(500).json({ message: 'Failed to retrieve comments' })
  }
})


// Update specific comment
router.put("/:postId/comment/:commentId", middleware.protectRoute, async (request, response) => {
  try {
    const updateData = request.body
    const userId = request.user._id

    const postId = request.params.postId
    const commentId = request.params.commentId.toString()

    const post = await Post.findById(postId)

    if (!post) {
      return response.status(404).json({ message: 'No such post' })
    }

    const author = post.user

    if (userId.toString() !== author.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    const comment = await Comment.findOne({
      $and: [
        {post: {$eq: postId}},
        {_id: {$eq: commentId}}
      ]
    })

    if (!comment || comment.is_deleted) {
      return response.status(404).json({ message: 'No such comments exists under this post' })
    }
    
    if (updateData.content) {
      comment.content = updateData.content
    }

    comment.updated_at = new Date()

    await comment.save()
    
    response.status(200).json({
      message: 'Comment updated',
      comment: comment
    })

  } catch (error) {
    logger.error(`Error updating comment ${error}`)
    response.status(500).json({ message: 'Failed to update comment' })
  }
})

// Delete specific comment [Mark as deleted]
router.delete("/:postId/comment/:commentId", middleware.protectRoute, async (request, response) => {
  try {
    const postId = request.params.postId
    const commentId = request.params.commentId.toString()

    const userId = request.user._id

    const post = await Post.findById(postId)

    if (!post) {
      return response.status(404).json({ message: 'No such post' })
    }

    const author = post.user

    if (userId.toString() !== author.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    const comment = await Comment.findOne({
      $and: [
        {user: {$eq: userId}},
        {_id: {$eq: commentId}},
        {post: {$eq: postId}}
      ]
    })

    

    if (!comment || comment.is_deleted) {
      return response.status(404).json({ message: 'No such comment to be deleted' })
    }

    comment.is_deleted = true;
    comment.content = "[This comment has been deleted]"
    comment.updated_at = new Date()

    await comment.save()

    response.status(200).json({
      message: 'Comment deleted',
      comment: comment
    })

  } catch (error) {
    logger.error(`Error deleting comment ${error}`)
    response.status(500).json({ message: 'Failed to delete comment' })
  }
})

// Like post
router.post("/:postId/like", middleware.protectRoute, async (request, response) => {
  try {
    const postId = request.params.postId
    const userId = request.user._id

    const post = await Post.findById(postId)
    if (!post) {
      return response.status(404).json({ message: 'Post not found' })
    }

    const author = post.user

    if (userId.toString() !== author.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    const alreadyLiked = post.likes.find(like => like.user_id.toString() === userId.toString())
    if (alreadyLiked) {
      return response.status(400).json({ message: 'Post already liked' })
    }

    post.likes.push({ user_id: userId, created_at: new Date() })
    post.likes_count += 1

    await post.save()

    response.status(200).json({
      message: 'Post liked successfully',
      post: post
    })

  } catch (error) {
    logger.error(`Error liking post ${error}`)
    response.status(500).json({ message: 'Failed to like post' })
  }
})

// Unlike post
router.delete("/:postId/like", middleware.protectRoute, async (request, response) => {
  try {
    const postId = request.params.postId
    const userId = request.user._id

    const post = await Post.findById(postId)

    if (!post) {
      return response.status(404).json({ message: 'Post not found' })
    }

    const author = post.user

    if (userId.toString() !== author.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    const likeIndex = post.likes.findIndex(like => like.user_id.toString() === userId.toString())
    if (likeIndex === -1) {
      return response.status(400).json({ message: 'Post not liked' })
    }

    post.likes.splice(likeIndex, 1)
    post.likes_count -= 1

    post.updated_at = new Date()

    await post.save()

    response.status(200).json({
      message: 'Post unliked successfully',
      post: post
    })
  } catch (error) {
    logger.error(`Error unliking post ${error}`)
    response.status(500).json({ message: 'Failed to unlike post' })
  }
})

// Who liked this post
router.get("/:postId/like", middleware.protectRoute, async (request, response) => {
  try {
    const postId = request.params.postId
    const post = await Post.findById(postId)
    const userId = request.user._id

    if (!post) {
      return response.status(404).json({ message: 'Post not found' })
    }

    const author = post.user

    if (userId.toString() !== author.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    response.status(200).json({
      message: 'Likes',
      likes: post.likes,
      likes_count: post.likes_count
    })
  } catch (error) {
    logger.error(`Error retrieving likes ${error}`)
    response.status(500).json({ message: 'Failed to retrieve likes'})
  }
})

// Share post
router.post("/:postId/share", middleware.protectRoute, async (request, response) => {
  try {
    const postId = request.params.postId
    const userId = request.user._id
    const shared_to = request.body

    const post = Post.findById(postId)
    if (!post) {
      return response.status(404).json({ message: 'Post not found' })
    }

    const author = post.user

    if (userId.toString() !== author.toString() && ! await isViewable(userId, author)) {
      return response.status(500).json({ message: 'Unauthorized' })
    }

    const shareObj = {
      user_id: request.user._id,
      created_at: new Date()
    }

    if (shared_to) {
      shareObj.shared_to = shared_to
    }

    post.shares.push(shareObj)
    post.shares.share_count += 1
    await post.save()

    response.status(200).json({
      message: 'Post shared',
      post: post
    })

    // TODO: frontend, actually share link when you share post
  } catch (error) {
    logger.error(`Error sharing post ${error}`)
    response.status(500).json({ message: 'Failed to share post' })
  }
})


module.exports = router