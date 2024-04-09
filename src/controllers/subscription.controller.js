import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    const user = req.user

    // console.log(user?._id);
    // console.log(new mongoose.Types.ObjectId(channelId));

    if(user._id.equals(new mongoose.Types.ObjectId(channelId)) ){
        throw new ApiError(400,"You cannot subscribe to your own channel")
    }

    const subscription = await Subscription.findOne({subscriber: user?._id,channel: channelId})

    if(subscription){
        const del = await Subscription.findByIdAndDelete(subscription._id);
        //returns deleted object
        // console.log(del);

        return res.status(201).json(
            new ApiResponse(200,{},"Unsubscribed Successfully")
        )

    }else{
        const createdSubscription = await Subscription.create({
            subscriber: user._id,
            channel: channelId
        })
        if(!createdSubscription){
            throw new ApiError(500,"Something went wrong while creating Subscription")
        }
        // console.log(createdSubscription);

        return res.status(201).json(
            new ApiResponse(200,createdSubscription,"Subscribed Successfully")
        )

    }

    

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId?.trim()){
        throw new ApiError(400,"channelId is missing")
    }

    //What u want only userId or their detail
    //returns an array
    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        }
    ])

    const subscribersDetails = [];

    for(let i = 0;i<subscribers.length;i++){
        //make an array that has info about channels
        
        const channelDetails = await User.aggregate([
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(subscribers[i].subscriber)
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

        console.log('channelDetails',channelDetails);

        subscribersDetails.push(channelDetails[0]);


    }
    
    // find({channel:channelId});
    

    return res.status(200).json(
        new ApiResponse(200,subscribersDetails,"Subscribers Fetched Successfully")
    )

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    console.log(channelId);

    if(!channelId?.trim()){
        throw new ApiError(400,"subcriberId is missing")
    }

    //What u want only userId or their detail
    //returns an array
    const subscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(channelId)
            }
        }
    ])

    console.log(subscribedChannels);

    const subscribedChannnelsDetails = [];

    for(let i = 0;i<subscribedChannels.length;i++){
        //make an array that has info about channels
        
        const channelDetails = await User.aggregate([
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(subscribedChannels[i].channel)
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

        console.log('channelDetails',channelDetails);

        subscribedChannnelsDetails.push(channelDetails[0]);


    }

    console.log('subscribedChannnelsDetails',subscribedChannnelsDetails);

    return res.status(200).json(
        new ApiResponse(200,subscribedChannnelsDetails,"Subscribed Channel Fetched")
    )




})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}