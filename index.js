import mongoose from "mongoose";
import express from "express";
import { DB_NAME } from "./constants.js";
import dotenv from "dotenv";
import dns from "dns"

dotenv.config({path: './.env'});

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

(async() =>{
    try{
        const chk1 = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        // console.log(chk1)
        app.on("error",(error)=>{
            console.log("ERROR: ",error);
            throw error;
        });

        app.listen(process.env.PORT || 3000,()=>{
            console.log(`App successfully running on ${process.env.PORT}`)
        })

    }catch(error)
    {
        console.log("Error occured from index",error);
        throw error;

    }
})()