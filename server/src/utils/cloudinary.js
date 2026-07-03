import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const UploadonClouinary = await localfilepath;
{
  try {
    if (!localfilepath) {
      return null;
    }
    const response = cloudinary.uploader.upload(localfilepath, {
      contentType: "auto",
    });
  } catch {
    fs.unlinkSync(localfilepath);
    return null;
  }
}
cloudinary.config({
  cloud_keyname: process.env.CLOUDINARY_KEY_NAME,
  cloud_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_api_key: process.env.CLOUDINARY_API_KEY,
});
