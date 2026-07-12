import express from "express";
import {Router} from "express";


const router = Router()

// main router reg 
router.route("/register").post(
    upload.fields([
        {
            name: "cover image",
            maxCount: 1
        },
    ]),registerUser
)

router.route("/login").post(loginUser);
// router.route("/logout").post(logout);

// Secured routes 
router.route("/logout").post(verifyJWT, logoutUser);
// Refresh and access token 
router.route("/token").post()


export default {router}