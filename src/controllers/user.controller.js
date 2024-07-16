import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {deleteOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs"
import jwt from "jsonwebtoken"
import mongoose, { Mongoose } from "mongoose";

const generateAccessTokenAndRefreshToken = async(userId)=>{
    try {
        
        const user = await User.findById(userId)
        console.log(process.env.ACCESS_TOKEN_EXPIRY);
        // console.log(user);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false}) 

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    console.log(req.body);
    console.log(req.files);
    // res.status(200).json({
    //     message: "whore bhai?! kii haal chaal "
    // })

    //get user from frontend
    //validation - not empty
    //check if user already exist : username,email
    //check for images, check for avatar
    //upload them to cloudinary, check if uploaded
    //create user in mongodb
    //remove password and refreshToken
    //check for user creation
    //return res from APIresponse
    
    // console.log(req.files);//<-------IMPORTANT IN CASE OF ANY PROBLEM--------->
    // const avatarLocalPath = req.files?.avatar[0]?.path;
    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path
    }
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    const {username,email,fullName,password} = req.body
    // console.log(fullName);

    if(
        [fullName,email,username,password].some((value)=>value?.trim() === "")
    ){
        if(avatarLocalPath)fs.unlinkSync(avatarLocalPath);
        if(coverImageLocalPath)fs.unlinkSync(coverImageLocalPath);
        throw new ApiError(400,"All fields are Required")
    }

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    // console.log(`existedUser : ${existedUser}`);

    if(existedUser){
        if(avatarLocalPath)fs.unlinkSync(avatarLocalPath);
        if(coverImageLocalPath)fs.unlinkSync(coverImageLocalPath);
        throw new ApiError(409,"User with Email or username already exists")
    }

    if(!avatarLocalPath){
        if(avatarLocalPath)fs.unlinkSync(avatarLocalPath);
        if(coverImageLocalPath)fs.unlinkSync(coverImageLocalPath);
        throw new ApiError(400,"Avatar file is required1")
    }
    // console.log(`avatar : ${avatarLocalPath}`);


    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // console.log(`avatar after uploadOnCloudinary : ${avatar}`);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        email,
        username,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    console.log(createdUser);

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User created successfully")
    )

})
// const registerUser = asyncHandler(async (req,res)=>{
//     console.log(req.body);
//     console.log(req.files);
    
//     res.send('hello');

// })

const loginUser = asyncHandler(async(req,res)=>{
    //get data from frontend
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies
    console.log(req.body);

    const {email,username,password} = req.body


    if(!(username || email)){
        throw new ApiError(400,"username or email is required")
    }

    const user  = await User.findOne({
        $or: [{username},{email}]
    })

    // console.log(user._id);

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    // console.log(isPasswordValid);

    if(!isPasswordValid){
        throw new ApiError(401,"Password incorrect Invalid user credential")
    }

    const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    // console.log(accessToken);
    // console.log(refreshToken);

    if(!(accessToken && refreshToken)){
        throw new ApiError(500,"Something went wrong while generating access and refresh token");
    }

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    console.log(loggedInUser);

    //FOR COOKIES SECURITY
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(200,{
            user: loggedInUser, 
            accessToken, 
            refreshToken
        },"User logged in successfully")
    )
    
})

const logoutUser = asyncHandler(async(req,res)=>{
    //remove refreshToken from database user
    //remove cookies
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiError(200,{},"User Logged Out"))


})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'None'
        }
    
        const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken},
                "AccessToken refreshed Successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token at last")
    }

})

//middleware lagega
const changeCurrentPassword = asyncHandler(async(req,res)=>{

    const {oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json( new ApiResponse(200,{},"Password changed Successfully") )

})

//middleware lagega
const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json( new ApiResponse(200,req.user,"Current user fetched successfully"))
})

//middleware lagega
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName} = req.body

    if (!fullName) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName
            }
        },
        {new: true}
        
    ).select("-password")

    return res                                                                                                                                                                                         .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

//in route, 2 middleware should be there to upload avatar file 
const updateUserAvatar = asyncHandler(async(req,res)=>{

    const avatarLocalPath = req.file?.path;

    //TODO: Delete prev file in clodinary using destroy

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(500,"Error while uploading avatar on cloudinary")
    }

    const beforeUpdatingUser = await User.findById(req.user?._id);
    // console.log(beforeUpdatingUser);

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    const del = await deleteOnCloudinary(beforeUpdatingUser.avatar)
    // console.log(del);

    return res.status(200)
    .json(new ApiResponse(200,user,"Avatar Updated Succesfully"))

})

//in route, 2 middleware should be there to upload coverImage file 
const updateUserCoverImage = asyncHandler(async(req,res)=>{

    const coverImageLocalPath = req.file?.path

    //TODO: Delete prev file in clodinary using destroy

    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(500,"Error while uploading coverImage on cloudinary")
    }

    const beforeUpdatingUser = await User.findById(req.user?._id);
    // console.log(beforeUpdatingUser);

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")


    const del = await deleteOnCloudinary(beforeUpdatingUser.coverImage)
    // console.log(del);

    return res.status(200)
    .json(new ApiResponse(200,user,"Cover Image Updated Succesfully"))

})

//from params
const getUserChannelProfile = asyncHandler(async(req,res)=>{

    const {userId} = req.params;

    if(!userId?.trim()){
        throw new ApiError(400,"userId is missing")
    }

    //returns an array
    const channel = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from:"subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )

})

//middleware for req.user from verifyJWT
const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

const removeFromWatchHistory = asyncHandler(async(req, res) => {

    const {videoId} = req.params;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $pull:{
                watchHistory: new mongoose.Types.ObjectId(videoId)
            }
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user.watchHistory,
            "video removed from watchHistory successfully"
        )
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    removeFromWatchHistory
};