import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    const user = req.user

    if(!content){
        throw new ApiError(400,"Content is not there")
    }

    const tweet = await Tweet.create({
        content,
        owner: user._id
    })

    if(!tweet){
        throw new ApiError(500,"Something went wrong while creating tweet")
    }

    return res.status(201).json(
        new ApiResponse(200,tweet,"Tweet created successfully")
    )

})

//we can return much more things
const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params

    if(!userId?.trim()){
        throw new ApiError(400,"userId is missing")
    }

    const tweets = await Tweet.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,tweets,"Tweets fetched successfully")
    )

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const user = req.user
    const {content} = req.body

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400,"TweetId is wrong")
    }
    // console.log(tweet.owner);
    // console.log(user._id);
    if(!tweet.owner.equals(user._id)){
        throw new ApiError(400,"You cannot manage this tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content:content
            }
        },
        {new: true}
    )

    return res.status(200).json(
        new ApiResponse(200,updatedTweet,"Tweet updated successfully")
    )


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    const user = req.user

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400,"TweetId is wrong")
    }

    if(!tweet.owner.equals(user._id)){
        throw new ApiError(400,"You cannot manage this tweet")
    }

    const deleted = await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(
        new ApiResponse(200,deleted,"Tweet deleted successfully")
    )


})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}