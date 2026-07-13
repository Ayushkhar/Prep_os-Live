import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_KEY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadoncloudinary = async(localfilepath) => {
  try{
    if(!localfilepath) return null;
    // uploading on cloudinary 
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto"
    });
    // file upload success
    console.log("file is uploaded successfully");
    fs.unlinkSync(localfilepath)
    return response;
  }
  catch(error){
    fs.unlinkSync(localfilepath)
    return null;

  }
}
export {uploadoncloudinary};