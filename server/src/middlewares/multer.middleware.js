import multer from "multer";
import path from "path";
import {fileURLToPath} from "url";

const _filename = fileURLToPath(import.meta.url);

const _dirname = path.dirname(_filename)
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        console.log("Multer destination hit");
        cb(null, path.join(_dirname, "../../Public/Temp"))

    },
    filename: function(req, file, cb){
        cb(null, file.originalname);

    }
})

const upload = multer({storage})
export {upload}


