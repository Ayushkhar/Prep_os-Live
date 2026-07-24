import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

let isConfigured = false;

const configureCloudinary = () => {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_KEY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    isConfigured = true;
  }
};

const uploadoncloudinary = async (localfilepath) => {
  try {
    if (!localfilepath || !fs.existsSync(localfilepath)) return null;
    configureCloudinary();

    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto"
    });

    console.log("File uploaded successfully to Cloudinary:", response.secure_url);
    if (fs.existsSync(localfilepath)) fs.unlinkSync(localfilepath);
    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    if (localfilepath && fs.existsSync(localfilepath)) {
      try { fs.unlinkSync(localfilepath); } catch (_) {}
    }
    return null;
  }
};

export { uploadoncloudinary };