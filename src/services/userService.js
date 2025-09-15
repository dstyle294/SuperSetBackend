const User = require("../models/user")
const logger = require('../utils/logger')

const autoAcceptPendingRequests = async (userId) => {
  const user = await User.findById(userId);

  if (user.followRequestsReceived.length > 0) {

    await User.updateOne(
      {_id: userId},
      {
        $push: { followers: { $each: user.followRequestsReceived } },
        $inc: { followerCount: user.followRequestsReceived.length },
        $set: {
          followRequestsReceived: [],
          receivedRequestCount: 0
        }
      }
    )
    await User.updateMany(
      {_id: { $in: user.followRequestsReceived } },
      {
        $push: { following: userId },
        $inc: {
          followingCount: 1,
          pendingRequestCount: -1
        },
        $pull: { pendingFollowRequests: userId },
      }, 
      {new: true}
    )
  }
}

const isViewable = async (currentUserId, targetUserId) => {
  const result = await User.findOne({
    $or: [
      { currentUserId: {$eq: targetUserId } },
      {_id: targetUserId, privacy: 'public'},
      {
        _id: currentUserId,
        following: targetUserId
      }
    ]
  })

  return !!result
}

module.exports = { autoAcceptPendingRequests, isViewable }