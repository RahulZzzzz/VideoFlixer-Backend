import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query;

    const skipped = (page-1)*limit

    const videoComments = await Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort:{
                "createdAt": -1
            }
        },
        {
            $skip: skipped
        },
        {
            $limit: limit
        },
        {
            $lookup:{
                from:"users",
                localField: "owner",
                foreignField: "_id",
                as:"ownerDetails"
            }
        },
        {
            $addFields:{
                ownerName:{
                    $arrayElemAt: ["$ownerDetails.fullName",0]
                },
                ownerUsername:{
                    $arrayElemAt: ["$ownerDetails.username",0]
                },
                ownerAvatar:{
                    $arrayElemAt: ["$ownerDetails.avatar",0]
                },
            }
        },
        {
            $project:{
                content:1,
                video:1,
                owner:1,
                createdAt:1,
                ownerName:1,
                ownerUsername:1,
                ownerAvatar:1,
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,videoComments,"Video comments fetched")
    )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const {content} = req.body

    const user = req.user

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404,"Video doesnot exist")
    }

    const comment = await Comment.create({
        content,
        video: new mongoose.Types.ObjectId(video),
        owner: user._id
    })

    return res.status(200).json(
        new ApiResponse(200,comment,"Comment added successfully")
    )


})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const user = req.user
    const {content} = req.body;

    const beforeComment = await Comment.findById(commentId);

    if(!beforeComment){
        throw new ApiError(404,"Comment not found")
    }

    if(!beforeComment.owner.equals(user._id)){
        throw new ApiError(401,"You cannot manage this comment");
    }

    const comment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content
            }
        },
        {new: true}
    )

    return res.status(200).json(
        new ApiResponse(200,comment,"Comment updated successfully")
    )

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params
    const user = req.user

    const beforeComment = await Comment.findById(commentId);

    if(!beforeComment){
        throw new ApiError(404,"Comment not found")
    }

    if(!beforeComment.owner.equals(user._id)){
        throw new ApiError(401,"You cannot manage this comment");
    }

    const del = await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(
        new ApiResponse(200,del,"Comment deleted successfully")
        )

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}