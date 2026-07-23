import mongoose from "mongoose";
import { DB_NAME } from "../../../constants.js";

const connectDB = async () => {
    try {
        let uri = process.env.MONGODB_URI.trim();
        if (uri.endsWith("/")) {
            uri = uri.slice(0, -1);
        }
        const connectionInstance = await mongoose.connect(
            `${uri}/${DB_NAME}`
        );
        console.log(`\n MongoDB connected! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MONGODB connection FAILED ", error);
        process.exit(1);
    }
};

export default connectDB;
