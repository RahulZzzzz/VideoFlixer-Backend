import mongoose, {Mongoose, isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Tweet } from "../models/tweet.model.js"
import {Comment} from "../models/comment.model.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const user = req.user

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"video doesnot exist")
    }

    const data = await Like.findOne({video: videoId, likedBy:user._id})

    if(data){

        const del = await Like.findByIdAndDelete(data._id);

        return res.status(200).json(
            new ApiResponse(200,del,"Like retrieve successfully")
        )

    }else{
        const likedVideo = await Like.create({
            video: new mongoose.Types.ObjectId(videoId),
            likedBy: user._id
        })

        return res.status(200).json(
            new ApiResponse(200,likedVideo,"Video liked successfully")
        )

    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const user = req.user

    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(404,"Comment doesnot exist")
    }

    const data = await Like.findOne({comment: commentId, likedBy:user._id})

    if(data){

        const del = await Like.findByIdAndDelete(data._id);

        return res.status(200).json(
            new ApiResponse(200,del,"Unliked successfully")
        )

    }else{
        const likedComment = await Like.create({
            comment: new mongoose.Types.ObjectId(commentId),
            likedBy: user._id
        })

        return res.status(200).json(
            new ApiResponse(200,likedComment,"Comment liked successfully")
        )

    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    const user = req.user

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,"Tweet doesnot exist")
    }

    const data = await Like.findOne({tweet: tweetId, likedBy:user._id})

    if(data){

        const del = await Like.findByIdAndDelete(data._id);

        return res.status(200).json(
            new ApiResponse(200,del,"Unliked successfully")
        )

    }else{
        const likedTweet = await Like.create({
            tweet: new mongoose.Types.ObjectId(tweetId),
            likedBy: user._id
        })

        return res.status(200).json(
            new ApiResponse(200,likedTweet,"Tweet liked successfully")
        )

    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const user = req.user;

    const likedVideos = await Like.aggregate([
        {
            $match:{
                likedBy: user._id,
            }
        },
        {
            $match: {
                video: { $exists: true }
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,likedVideos,"User liked videos fetched successfully")
    )

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}