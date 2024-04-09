import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo,
        getAllVideos,
        getMyVideos,
        getVideoById,
        publishAVideo,
        togglePublishStatus,
        updateVideo,
        updateViews, } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();


router
    .route("/")
    .get(getAllVideos)
    .post(verifyJWT,
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route('/myVideos')
    .get(getMyVideos)


router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

//Added newly
router.route("/views/:videoId").patch(updateViews);


export default router