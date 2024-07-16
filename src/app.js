import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

const app = express();

// Enable CORS for specific origin and allow credentials
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//     res.header('Access-Control-Allow-Credentials', 'true');
//     next();
// });

const allowedOrigins = [
    'http://localhost:5173',
    'https://video-flixer.vercel.app/'
];

app.use(cors({
    // origin: process.env.CORS_ORIGIN,
    origin: function (origin, callback) {
        // Allow requests with no origin, like mobile apps or curl requests
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            // Origin is allowed
            callback(null, true);
        } else {
            // Origin is not allowed
            callback(new Error('Not allowed by CORS'));
        }
    },
    // origin:true,
    credentials: true,
    methods:["GET","POST","PUT","PATCH","DELETE"]
}))

// app.use(cors())

app.use(express.json())
// app.use(express.json({limit: "16kb"}))
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(express.urlencoded({extended: true}))
// app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//import routes
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js";
import tweetRouter from "./routes/tweet.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import likeRouter from "./routes/like.routes.js"
import commentRouter from "./routes/comment.routes.js"

//routes declaration
app.use("/api/v1/users",userRouter);
app.use("/api/v1/video",videoRouter);
app.use("/api/v1/subscription",subscriptionRouter);
app.use("/api/v1/tweet",tweetRouter);
app.use("/api/v1/playlist",playlistRouter);
app.use("/api/v1/like",likeRouter);
app.use("/api/v1/comment",commentRouter);

//localhost:8000/api/v1/users/register



export {app}