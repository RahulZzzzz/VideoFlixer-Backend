import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const publicIdFromUrl = (url)=>{

    try {
        const public_id = url.split("/upload/")[1].split('/')[1].split('.')[0]
        return public_id;
    } catch (error) {
        return null;
    }

}

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        
        if(!localFilePath) return null;//OR WE CAN RETURN ERROR MESSAGE
        
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //FIle has uploaded successfully
        // console.log("file is uploaded on cloudinary ",response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file
        return null;
    }
}

const deleteOnCloudinaryFromPublicId = async(public_id,resource_type="image")=>{

    try {
 
        //  console.log("public id of image on clodinary : ",public_id);
 
         const deletion = await cloudinary.uploader.destroy(public_id,{resource_type});
 
        //  console.log(deletion);
 
         if (deletion.result !== 'ok') {
            // console.log("after cloud");
             return false;
         }
  
         return true;
    } catch (error) {
         return false;
    }
}

const deleteOnCloudinary = async(url)=>{

   try {
     //extract public_id from url
        const public_id = publicIdFromUrl(url);

        // console.log("public id of image on clodinary : ",public_id);

        const deletion = await cloudinary.uploader.destroy(public_id);

        // console.log(deletion);

        if (deletion.result !== 'ok') {
            // console.log("after cloud");
            return false;
        }
 
        return true;
   } catch (error) {
        return false;
   }

   

}

export {
        uploadOnCloudinary,
        deleteOnCloudinary,
        deleteOnCloudinaryFromPublicId
    }

