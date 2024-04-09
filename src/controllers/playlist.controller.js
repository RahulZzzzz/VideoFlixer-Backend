import mongoose, {Mongoose, isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const user = req.user
    //TODO: create playlist

    if(!name || !description){
        throw new ApiError(400,"Name and description is must");
    }

    const playlist = await Playlist.create({
        name,
        description,
        videos: [],
        owner: user._id
    })

    if(!playlist){
        throw new ApiError(401,"Something went wrong while creating playlist")
    }

    return res.status(201).json(
        new ApiResponse(200,playlist,"Playlist created successfully")
    )

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(404,"playlist doesn't exist");
    }

    if(playlist.videos.length==0){
        return res.status(200).json(
            new ApiResponse(200,playlist,"Playlist fetched succesfully")
        )
    }

    const playlistWithVideoDetails = await Playlist.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField: "videos",
                foreignField: "_id",
                as: "videosDetails"
            }
        },
        {
            $unwind:"$videosDetails"
        },
        {
            $lookup:{
                from: "users",
                localField: "videosDetails.owner",
                foreignField: "_id",
                as: "videoOwnerDetails"
            }
        },
        {
            $group: {
              _id: "$_id",
              name: { $first: "$name" },
              description: { $first: "$description" },
              owner: { $first: "$owner" },
              createdAt: {$first: "$createdAt"},
              videos: {
                $push: {
                  _id: "$videosDetails._id",
                  thumbnail: "$videosDetails.thumbnail",
                //   videoFile: "$videosDetails.videoFile",
                  description: "$videosDetails.description",
                  title: "$videosDetails.title",
                  duration: "$videosDetails.duration",
                  views: "$videosDetails.views",
                  isPublished: "$videosDetails.isPublished",
                  owner: "$videosDetails.owner",
                  createdAt: "$videosDetails.createdAt",
                //   videoOwnerDetails: { $arrayElemAt: ["$videoOwnerDetails", 0] }, // Extract owner details
                  ownerName: { $arrayElemAt: ["$videoOwnerDetails.fullName", 0] },
                  ownerUsername:{ $arrayElemAt: ["$videoOwnerDetails.username",0]},
                  ownerAvatar:{ $arrayElemAt: ["$videoOwnerDetails.avatar",0] },
                }
              }
            }
        }
        // {
        //     $project:{
                
        //     }
        // }
    ])

    console.log(playlistWithVideoDetails);


    return res.status(200).json(
        new ApiResponse(200,playlistWithVideoDetails[0],"Playlist fetched succesfully")
    )


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    const user = req.user;

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist doesn't exist");
    }

    if(!user._id.equals(playlist.owner)){
        throw new ApiError(401,"You cannot Manage this playlist")
    }

    const deleted = await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json(
        new ApiResponse(200,deleted,"Playlist deleted successfully")
    )

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    const user = req.user;

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist doesn't exist");
    }

    if(!user._id.equals(playlist.owner)){
        throw new ApiError(401,"You cannot Manage this playlist")
    }

    const update = {};
    if(name)update.name = name;
    if(description)update.description = description;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:update
        },
        {new: true}
    )

    const playlistDetails = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField: "videos",
                foreignField: "_id",
                as: "videosObj"
            }
        },
        {
            $addFields: {
                firstVideoThumbnail: {
                    $arrayElemAt: ["$videosObj.thumbnail", 0] 
                }
            }
        },
        {
            $lookup: {
                from:"users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerUser"
            }
        },
        {
            $addFields:{
                ownerName: {
                    $arrayElemAt: ["$ownerUser.fullName",0]
                },
                ownerAvatar: {
                    $arrayElemAt: ["$ownerUser.avatar",0]
                }
            }
        },
        {
            $project:{
                name:1,
                description: 1,
                firstVideoThumbnail: 1,
                owner: 1,
                ownerName: 1,
                ownerAvatar: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,playlistDetails[0],"Playlist pdated successfully")
    )

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    const user = req.user;

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if(!playlist){
        throw new ApiError(404,"playlist doesn't exist");
    }
    if(!video){
        throw new ApiError(404,"Video doesnot Exist")
    }

    if(!user._id.equals(playlist.owner)){
        throw new ApiError(401,"You cannot Manage this playlist")
    }
    
    // const updatedPlaylist = await Playlist.updateOne(
    //     {_id: playlistId},
    //     {
    //         $push:{
    //             videos: new mongoose.Types.ObjectId(videoId)
    //         }
    //     }
    //     // {
    //     //     $addToSet:{
    //     //         videos: new mongoose.Types.ObjectId(videoId)
    //     //     }
    //     // }
    // )

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push:{
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        // {
        //     $addToSet:{
        //         videos: new mongoose.Types.ObjectId(videoId)
        //     }
        // },
        {new: true}
    )

    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Video added in playlist")
    )
    
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    const user = req.user;

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if(!playlist){
        throw new ApiError(404,"playlist doesn't exist");
    }
    if(!video){
        throw new ApiError(404,"Video doesnot Exist")
    }

    if(!user._id.equals(playlist.owner)){
        throw new ApiError(401,"You cannot Manage this playlist")
    }   
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {new: true}
    )

    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Video removed successfully")
    )
    
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField: "videos",
                foreignField: "_id",
                as: "videosObj"
            }
        },
        {
            $addFields: {
                firstVideoThumbnail: {
                    $arrayElemAt: ["$videosObj.thumbnail", 0] 
                }
            }
        },
        {
            $lookup: {
                from:"users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerUser"
            }
        },
        {
            $addFields:{
                ownerName: {
                    $arrayElemAt: ["$ownerUser.fullName",0]
                },
                ownerAvatar: {
                    $arrayElemAt: ["$ownerUser.avatar",0]
                }
            }
        },
        {
            $project:{
                name:1,
                description: 1,
                firstVideoThumbnail: 1,
                owner: 1,
                ownerName: 1,
                ownerAvatar: 1
            }
        }
    ])

    console.log(playlists);

    return res.status(200).json(
        new ApiResponse(200,playlists,"User Playlist Fetched successfully")
    )


})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}