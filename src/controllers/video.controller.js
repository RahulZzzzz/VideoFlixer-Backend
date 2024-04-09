import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudinary, deleteOnCloudinaryFromPublicId, uploadOnCloudinary} from "../utils/cloudinary.js"
import fs from "fs"
import { Like } from "../models/like.model.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType=-1, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const skipped = (page-1)*limit

    const allVideos = await Video.aggregate([
        {
            $match:{
                isPublished: true
            }
        },
        {
            $sort: {
                [sortBy] : sortType,
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
                title:1,
                description:1,
                thumbnail:1,
                duration:1,
                createdAt:1,
                isPublished:1,
                owner:1,
                ownerName:1,
                ownerUsername:1,
                ownerAvatar:1,
                views:1,
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,allVideos,"All videos fetched successfully")
    )
    

})

const getMyVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType=-1, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    let id = userId

    console.log(userId);

    if(!userId){
        id = req.user._id
    }

    const skipped = (page-1)*limit

    const allVideos = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(id)
            }
        },
        {
            $sort: {
                [sortBy] : sortType,
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
                title:1,
                description:1,
                thumbnail:1,
                duration:1,
                createdAt:1,
                isPublished:1,
                owner:1,
                ownerName:1,
                ownerUsername:1,
                ownerAvatar:1,
                views:1,
            }
        }
    ])

    // console.log(allVideos);

    return res.status(200).json(
        new ApiResponse(200,allVideos,"All videos fetched successfully")
    )
    

})

//multer: videoFile,thumbnail //verifyJwt
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    const user = req.user; //from verifyJwt

    // TODO: get video, upload to cloudinary, create video

    let videoFileLocalPath;
    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0){
        videoFileLocalPath = req.files.videoFile[0].path;
    }

    let thumbnailLocalPath;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if(!videoFileLocalPath){
        if(videoFileLocalPath)fs.unlinkSync(videoFileLocalPath)
        if(thumbnailLocalPath)fs.unlinkSync(thumbnailLocalPath)
        throw new ApiError(400,"Video is required")
    }
    if(!thumbnailLocalPath){
        if(videoFileLocalPath)fs.unlinkSync(videoFileLocalPath)
        if(thumbnailLocalPath)fs.unlinkSync(thumbnailLocalPath)
        throw new ApiError(400,"Thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile){
        throw new ApiError(400,"Video file is required");
    }
    if(!thumbnail){
        throw new ApiError(400,"Thumbnail is required");
    }

    // console.log("VideoFile : ",videoFile);
    // console.log("Thumbnail : ",thumbnail);

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        videoFileId: videoFile.public_id.trim(),
        thumbnailId: thumbnail.public_id.trim(),
        owner: user._id
    })

    if(!video){
        throw new ApiError(500,"Something went wrong while publishing the video")
    }


    const videoDetails = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(video._id)
            }
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
                title:1,
                description:1,
                thumbnail:1,
                duration:1,
                createdAt:1,
                isPublished:1,
                owner:1,
                ownerName:1,
                ownerUsername:1,
                ownerAvatar:1,
                views:1,
            }
        }
    ])
    

    // console.log(video);

    return res.status(201).json(
        new ApiResponse(200,videoDetails[0],"Uploaded successfully")
        );

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const userId = req.user._id;

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404,"video doesnot exist");
    }

    let isLiked = 0;

    const like = await Like.find({video:videoId,likedBy:userId});

    console.log("Like : ",like);

    if(like.length>0){
        isLiked = 1;
    }

    const videoDetails = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likeDetails"
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
                likes:{
                    $size: "$likeDetails"
                },
            }
        },
        {
            $project:{
                title:1,
                description:1,
                thumbnail:1,
                duration:1,
                createdAt:1,
                isPublished:1,
                owner:1,
                ownerName:1,
                ownerUsername:1,
                ownerAvatar:1,
                videoFile:1,
                views:1,
                likes:1,
            }
        }
    ])

    videoDetails[0].isLiked = isLiked;

    // const updatedUser = await User.findByIdAndUpdate(
    //     userId,
    //     {
    //         $pull:{
    //             watchHistory: {$in: [new mongoose.Types.ObjectId(videoId)]}
    //         },
    //         $push:{
    //             watchHistory: {$each: [new mongoose.Types.ObjectId(videoId)],$position: 0}
    //         },
    //     },
    //     {new: true}
    // )

    const user = await User.findById(userId)

    const index = user.watchHistory.indexOf(videoId)

    if(index !== -1){
        user.watchHistory.splice(index,1);
    }

    user.watchHistory.unshift(videoId);

    await user.save();

    return res.status(200).json(
        new ApiResponse(200,videoDetails[0],"video fetched successfully")
    )


})


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const beforeUpdatingVideo = await Video.findById(videoId);

    if(!beforeUpdatingVideo){
        throw new ApiError(404,"video doesnot exist");
    }

    const userId = req.user?._id;
    if(!(userId.equals(beforeUpdatingVideo.owner))){
        throw new ApiError(401,"You cannot manage this video")
    }

    const {title,description} = req.body;

    const thumbnailLocalPath = req.file?.path;

    let thumbnail ;
    if(thumbnailLocalPath){
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if(!thumbnail.url){
            throw new ApiError(500,"Error while uploading thumbnail")
        }
    }

    if(!(title||description||thumbnail)){
        throw new ApiError(400,"Atleast One Field is required");
    }

    let update = {};
    if(title)update.title=title;
    if(description)update.description = description;
    if(thumbnail){
        update.thumbnail = thumbnail.url.trim();
        update.thumbnailId = thumbnail.public_id.trim();
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:update
        },
        {new: true}
    )

    if(thumbnail){
        const del = await deleteOnCloudinaryFromPublicId(beforeUpdatingVideo.thumbnailId);
        // console.log(del);
    }

    const videoDetails = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
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
                title:1,
                description:1,
                thumbnail:1,
                duration:1,
                createdAt:1,
                isPublished:1,
                owner:1,
                ownerName:1,
                ownerUsername:1,
                ownerAvatar:1,
                views:1,
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,videoDetails[0],"Video updated successfully")
    )



})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    
    const beforeDeletingVideo = await Video.findById(videoId);
    
    if(!beforeDeletingVideo){
        throw new ApiError(404,"video doesnot exist");
    }
    
    const userId = req.user?._id;
    if(!(userId.equals(beforeDeletingVideo.owner))){
        throw new ApiError(401,"You cannot manage this video")
    }

    const delVideo = await deleteOnCloudinaryFromPublicId(beforeDeletingVideo.videoFileId.trim(),"video")
    // console.log(delVideo);
    const delThumbnail = await deleteOnCloudinaryFromPublicId(beforeDeletingVideo.thumbnailId.trim())
    // console.log(delThumbnail);

    const deleted = await Video.findByIdAndDelete(videoId);
    // console.log(deleted);


    return res.status(200).json(
        new ApiResponse(200,deleted,"Video deleted successfully")
    )


})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const before = await Video.findById(videoId)

    const userId = req.user?._id;
    if(!(userId.equals(before.owner))){
        throw new ApiError(401,"You cannot manage this video")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished: !(before.isPublished)
            }
        },
        {new: true}
    );

    // console.log(video);

    return res.status(200).json(
        new ApiResponse(200,video,"Toggled PublishStatus successfully")
    )

})

const updateViews = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const before = await Video.findById(videoId)

    if(!before){
        throw new ApiError(404,"video doesnot exist");
    }

    const userId = req.user?._id;
    // if(!(userId.equals(before.owner))){
    //     throw new ApiError(401,"You cannot manage this video")
    // }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc:{
                views: 1
            }
        },
        {new: true}
    );

    // console.log(video);

    return res.status(200).json(
        new ApiResponse(200,video,"Views updated successfully")
    )

})

export {
    getAllVideos,
    getMyVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    updateViews
}