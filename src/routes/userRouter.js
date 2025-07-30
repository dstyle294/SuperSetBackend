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
const User = require('../models/user')
const { autoAcceptPendingRequests, isViewable } = require('../services/userService')

// Get own profile
router.get("/", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id

    const user = await User.findById(userId)

    response.status(200).json({
      message: 'User',
      user
    })
  } catch (error) {
    logger.error(`Failed to fetch user ${error}`)
    response.status(500).json({ message: 'Failed to fetch user' })
  }
})

// User profile
router.get("/:userId", middleware.protectRoute, async (request, response) => {
  try {
    const currentUserId = request.user._id

    const userId = mongoose.Types.ObjectId.createFromHexString(request.params.userId)

    const user = await User.findById(userId)

    if (!user) {
      return response.status(404).json({ message: 'No user found' })
    }

    const viewable = await isViewable(currentUserId, userId)

    if (!viewable) {
      return response.status(400).json({ message: 'Unauthorized' })
    }

    response.status(200).json({
      message: 'User',
      user
    })
  } catch (error) {
    logger.error(`Error retrieving user profile ${error}`)
    response.status(500).json({ message: 'Failed to retrieve user profile' })
  }
})

// Update profile
router.put("/", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id

    const updateData = request.body

    const user = await User.findById(userId)

    if (!user) {
      return response.status(404).json({ message: 'No user found' })
    }

    if (updateData['username'] && updateData['username'].length < 3) {
      return response.status(400).json({ message: "Username must be at least 3 characters long"})
    }

    if (updateData['name']) {
      user['name'] = updateData['name']
    }

    if (updateData['username']) {
      user['username'] = updateData['username']
    }



    if (updateData['profileImage']) {
      const uploadResponse = await cloudinary.uploader.upload(updateData['profileImage'])
      const imageUrl = uploadResponse.secure_url
      user['profileImage'] = imageUrl
    }
    
    user.updatedAt = new Date()

    await user.save()

    response.status(200).json({
      message: 'Updated user profile',
      user: user
    })
  } catch (error) {
    logger.error(`Error updating user ${error}`)
    response.status(500).json({ message: 'Failed to update user profile' })
  }
})

// Change user privacy
router.patch("/privacy", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id

    const user = await User.findById(userId)

    const newPrivacy = user.privacy === 'public' ?  'private' : 'public'

    if (newPrivacy === 'public') {
      await autoAcceptPendingRequests(userId, user)
    }

    logger.info(newPrivacy)

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          privacy: newPrivacy,
          updatedAt: new Date()
        }
      },
    )

    const updatedUser = await User.findById(userId)
    
    response.status(200).json({
      message: 'User privacy updated',
      user: updatedUser
    })

  } catch (error) {
    logger.error(`Error updating user privacy ${error}`)
    response.status(500).json({ message: 'Failed to update user privacy' })
  }
})

// Get all comments for a user [from their own context]
router.get("/comments", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const comments = await Comment.find(
      {user: {$eq: userId}}
    )
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)

    

    if (!comments) {
      return response.status(404).json({ message: 'No comments exist under this user' })
    }

    const totalComments = await Comment.countDocuments({user: {$eq: userId}})

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

// User's workouts
router.get("/workouts", middleware.protectRoute, async (request, response) => {
  // const response = await fetch("https://localhost:3001/api/workouts?page=1&limit=5")
  try {
    const userId = request.user._id.toString()
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const workouts = await Workout.find(
      {user: {$eq: userId}}
    )
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)

    

    if (!workouts) {
      return response.status(404).json({ message: 'No workouts exist for this user' })
    }

    const totalWorkouts = await Workout.countDocuments({user: {$eq: userId}})

    response.status(200).json({
      message: 'Workouts found', 
      workouts: workouts,
      currentPage: page,
      totalWorkouts,
      totalPages: Math.ceil(totalWorkouts / limit)
    })

  } catch (error) {
    logger.error(`Error retrieving workouts ${error}`)
    response.status(500).json({ message: 'Failed to retrieve workouts for this user' })
  }
})

// Send follow request
router.post("/follow/:userId", middleware.protectRoute, async (request, response) => {
  try {
    const userId = mongoose.Types.ObjectId.createFromHexString(request.params.userId)
    const thisUser = request.user._id

    const userToFollow = await User.findById(userId)


    if (!userToFollow) {
      return response.status(404).json({ message: 'User does not exist' })
    }

    if (request.params.userId === thisUser.toString()) {
      return response.status(400).json({ message: 'Cannot follow yourself' })
    }

    const alreadyFollowed = userToFollow.followers.find(follower => follower.toString() === thisUser.toString())

    if (alreadyFollowed) {
      return response.status(400).json({ message: 'Already following' })
    }

    let updatedReqUser = User.findById(thisUser)

    if (userToFollow.privacy === 'public') {
      userToFollow.followers.push(thisUser)
      userToFollow.followerCount += 1

      updatedReqUser = await User.findByIdAndUpdate(thisUser, {
        $push: {following: userToFollow},
        $inc: {followingCount: 1}
      }, {new: true})

      await userToFollow.save()
    } else {
      const alreadySentRequest = userToFollow.followRequestsReceived.find(requester => requester.toString() === thisUser.toString())

      if (alreadySentRequest) {
        return response.status(400).json({ message: 'Already sent follow request' })
      }

      userToFollow.followRequestsReceived.push(thisUser)
      userToFollow.receivedRequestCount += 1

      updatedReqUser = await User.findByIdAndUpdate(thisUser, {
        $push: {pendingFollowRequests: userToFollow},
        $inc: {pendingRequestCount: 1}
      }, {new: true})

      await userToFollow.save()
    }

    response.status(200).json({
      message: 'User followed/request sent',
      thisUser: updatedReqUser,
      userToFollow
    })

  } catch (error) {
    logger.error(`Error following user ${error}`)
    response.status(500).json({ message: 'Failed to follow user' })
  }
})

// Unfollow user
router.delete("/follow/:userId", middleware.protectRoute, async (request, response) => {
  try {
    const targetUser = mongoose.Types.ObjectId.createFromHexString(request.params.userId)

    const thisUser = request.user._id

    const userToUnFollow = await User.findById(targetUser)

    if (!userToUnFollow) {
      return response.status(404).json({ message: 'User does not exist' })
    }

    if (request.params.userId === thisUser.toString()) {
      return response.status(400).json({ message: 'Cannot unfollow yourself' })
    }

    const userFollowing = await userToUnFollow.followers.find(follower => {
      return follower.toString() === thisUser.toString()
    })

    if (!userFollowing) {
      return response.status(400).json({ message: 'User not followed' })
    }

    const session = await mongoose.startSession()

    await session.withTransaction(async () => {
      await User.updateOne(
        { _id: targetUser },
        { $pull: { followers: thisUser }, $inc: { followerCount: -1 } }, {session}
      )

      await User.updateOne(
        {_id: thisUser},
        { $pull: { following: targetUser } , $inc: { followingCount: -1 } }, {session}
      )
    })

    const unFollowedUser = await User.findById(targetUser)
    const currentUser = await User.findById(thisUser)

    response.status(200).json({
      message: 'User unfollowed',
      unFollowedUser,
      currentUser
    })

  } catch (error) {
    logger.error(`Error unfollowing user ${error}`)
    response.status(500).json({ message: 'Failed to unfollow user' })
  }
})

// Remove follower
router.delete("/followers/:userId", middleware.protectRoute, async (request, response) => {
  try {
    const currentUserId = request.user._id
    const followerToRemoveId = mongoose.Types.ObjectId.createFromHexString(request.params.userId)

    const userExists = await User.findById(followerToRemoveId)

    if (!userExists) {
      return response.status(404).json({ message: 'User does not exist' })
    }

    const follower = userExists.following.find(follow => follow.toString() === currentUserId.toString())

    if (!follower) {
      return response.status(400).json({ message: 'User is not a follower' })
    }

    await User.updateOne(
      {_id: currentUserId},
      {
        $pull: { followers: followerToRemoveId },
        $inc: { followerCount: -1 }
      }
    )

    await User.updateOne(
      { _id: followerToRemoveId },
      {
        $pull: { following: currentUserId },
        $inc: { followingCount: -1 }
      }
    )

    const currentUser = await User.findById(currentUserId)
    const followerUser = await User.findById(followerToRemoveId)

    response.status(200).json({
      message: 'Follower removed',
      currentUser,
      followerUser
    })
  } catch (error) {
    logger.error(`Error removing follower ${error}`)
    response.status(500).json({ message: 'Failed to remove follower'})
  }
})

// Delete follow request 
router.delete("/followRequest/:userId", middleware.protectRoute, async (request, response) => {
  try {
    const currentUserId = request.user._id
    const removeRequestUser = mongoose.Types.ObjectId.createFromHexString(request.params.userId)

    const userExists = await User.findById(removeRequestUser)

    if (!userExists) {
      return response.status(404).json({ message: 'User does not exist' })
    }

    const requester = userExists.followRequestsReceived.find(request => request.toString() === currentUserId.toString())

    if (!requester) {
      return response.status(400).json({ message: 'User has not made a follow request' })
    }

    const session = await mongoose.startSession()

    await session.withTransaction(async () => {
      await User.updateOne(
        { _id: removeRequestUser },
        { $pull: { followRequestsReceived: currentUserId }, $inc: { receivedRequestCount: -1 } }, {session}
      )

      await User.updateOne(
        {_id: currentUserId},
        { $pull: { pendingFollowRequests: removeRequestUser } , $inc: { pendingRequestCount: -1 } }, {session}
      )
    })

    const requestee = await User.findById(removeRequestUser)
    const currentUser = await User.findById(currentUserId)

    response.status(200).json({
      message: 'Follow request deleted',
      requestee,
      currentUser
    })

  } catch (error) {
    logger.error(`Error removing user request ${error}`)
    response.status(500).json({ message: 'Failed to remove follow request' })
  }
})

// Accept follow request
router.post("/followRequest/:userId/accept", middleware.protectRoute, async (request, response) => {
  try {
    const currentUserId = request.user._id
    const requesterId = mongoose.Types.ObjectId.createFromHexString(request.params.userId)

    const requestingUser = await User.findById(requesterId)

    if (!requestingUser) {
      return response.status(404).json({ message: 'User does not exist' })
    }

    logger.info(requestingUser)
    logger.info(requestingUser.pendingFollowRequests)

    const requesting = requestingUser.pendingFollowRequests.find(user => user.toString() === currentUserId.toString())

    if (!requesting) {
      return response.status(404).json({ message: 'Follow request not received' })
    }

    const session = await mongoose.startSession()

    await session.withTransaction(async () => {

      await User.updateOne(
        {_id: currentUserId},
        {
          $pull: { followRequestsReceived: requesterId }, 
          $push: { followers: requesterId },
          $inc: {
            followerCount: 1,
            receivedRequestCount: -1
          }
        },
        {session}
      )

      await User.updateOne(
        {_id: requesterId},
        {
          $pull: { pendingFollowRequests: currentUserId },
          $push: { following: currentUserId },
          $inc: {
            followingCount: 1,
            pendingRequestCount: -1
          }
        },
        {session}
      )
    })

    const currentUser = await User.findById(currentUserId)
    const requester = await User.findById(requesterId)

    response.status(200).json({
      message: 'Follow request accepted',
      currentUser, 
      requester
    })
  } catch (error) {
    logger.error(`Error accepting follow request ${error}`)
    response.status(500).json({ message: 'Failed to accept follow request' })
  }
})

// Decline follow request
router.post("/followRequest/:userId/decline", middleware.protectRoute, async (request, response) => {
  try {
    const currentUserId = request.user._id
    const requesterId = mongoose.Types.ObjectId.createFromHexString(request.params.userId)

    const requestingUser = await User.findById(requesterId)

    if (!requestingUser) {
      return response.status(404).json({ message: 'User does not exist' })
    }

    const requesting = requestingUser.pendingFollowRequests.find(user => user.toString() === currentUserId.toString())

    if (!requesting) {
      return response.status(404).json({ message: 'Follow request not received' })
    }

    const session = await mongoose.startSession()

    await session.withTransaction(async () => {

      await User.updateOne(
        {_id: currentUserId},
        {
          $pull: { followRequestsReceived: requesterId }, 
          $inc: { receivedRequestCount: -1 }
        },
        {session}
      )

      await User.updateOne(
        {_id: requesterId},
        {
          $pull: { pendingFollowRequests: currentUserId },
          $inc: { pendingRequestCount: -1 }
        },
        {session}
      )
    })

    const currentUser = await User.findById(currentUserId)
    const requester = await User.findById(requesterId)

    response.status(200).json({
      message: 'Follow request declined',
      currentUser, 
      requester
    })
  } catch (error) {
    logger.error(`Error declining follow request ${error}`)
    response.status(500).json({ message: 'Failed to decline follow request' })
  }
})

// View sent requests
router.get("/followRequest/sent", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const user = await User.findById(userId)
    

    const requests = user.pendingFollowRequests
                        .slice(skip, skip + limit)

    const totalRequests = user.pendingRequestCount

    response.status(200).json({
      message: 'Sent requests found', 
      requests,
      currentPage: page,
      totalRequests,
      totalPages: Math.ceil(totalRequests / limit)
    })
  } catch (error) {
    logger.error(`Error receiving requests ${error}`)
    response.status(500).json({ message: 'Failed to retrieve sent follow requests' })
  }
})

// View received requests
router.get("/followRequest/received", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const user = await User.findById(userId)
    
    const requests = user.followRequestsReceived
                        .slice(skip, skip + limit)

    const totalRequests = user.receivedRequestCount

    response.status(200).json({
      message: 'Received requests found', 
      requests,
      currentPage: page,
      totalRequests,
      totalPages: Math.ceil(totalRequests / limit)
    })
  } catch (error) {
    logger.error(`Error receiving requests ${error}`)
    response.status(500).json({ message: 'Failed to retrieve received follow requests' })
  }
})

// User's followers
router.get("/followers", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const user = await User.findById(userId)
    

    const requests = user.followers
                        .slice(skip, skip + limit)

    const totalFollowers = user.followerCount

    response.status(200).json({
      message: 'Followers found', 
      requests,
      currentPage: page,
      totalFollowers,
      totalPages: Math.ceil(totalFollowers / limit)
    })
  } catch (error) {
    logger.error(`Error receiving followers ${error}`)
    response.status(500).json({ message: 'Failed to retrieve followers' })
  }
})

// Who user follows
router.get("/following", middleware.protectRoute, async (request, response) => {
  try {
    const userId = request.user._id
    const page = request.query.page || 1
    const limit = request.query.limit || 5
    const skip = (page - 1) * limit

    const user = await User.findById(userId)
    

    const requests = user.following
                        .slice(skip, skip + limit)

    const totalFollowing = user.followingCount

    response.status(200).json({
      message: 'Following found', 
      requests,
      currentPage: page,
      totalFollowing,
      totalPages: Math.ceil(totalFollowing / limit)
    })
  } catch (error) {
    logger.error(`Error receiving following ${error}`)
    response.status(500).json({ message: 'Failed to retrieve following' })
  }
})

// Get follow status
router.get("/:userId/followStatus", middleware.protectRoute, async (request, response) => {
  try {
    const targetUserId =  mongoose.Types.ObjectId.createFromHexString(request.params.userId)
    const currentUserId = request.user._id

    const targetUser = await User.findById(targetUserId)

    if (!targetUser) {
      return response.status(404).json({ message: 'User does not exist' })
    }

    // targetUser follows currentUser
    const followingUser = await User.findOne(
      {_id: targetUser},
      { $in: { following: currentUserId } }
    )

    // currentUser follows targetUser 
    const followedUser = await User.findOne(
      {_id: targetUser},
      { $in: { followers: currentUserId } }
    )

    // currentUser has sent a follow request to targetUser
    const requestedUser = await User.findOne(
      {_id: targetUser},
      { $in: { followRequestsReceived: currentUserId } }
    )

    // targetUser has sent a follow request to currentUser
    const requestingUser = await User.findOne(
      {_id: targetUser},
      { $in: { pendingFollowRequests: currentUserId } }
    )

    let message = ''

    if (followingUser && followedUser) {
      return response.status(200).json({
        message: 'Mutual following'
      })
    }
    // dont know the point of the route right now 

  } catch (error) {
    logger.error(`Error retrieving user follow status ${error}`)
    response.status(500).json({ message: 'Failed to retrieve user follow status'})
  }
})




module.exports = router