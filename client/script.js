const examname = document.getElementById("exam-name");
const examdate = document.getElementById("exam-date");
const duration = document.getElementById("exam-duration");
const starttime = document.getElementById("exam-start");

const syllabus = document.getElementById("syllabus-text");
const notes = document.getElementById("custom-instructions");
examname.addEventListener("keypress",function(e){
    if(e.key == "Enter")
    {
        let exvalue = examname.value;
        duration.focus();
    }
})
duration.addEventListener("keypress",function(e){
    if(e.key == "Enter")
    {
        let durationval = duration.value;
        starttime.focus();
    }
})
starttime.addEventListener("keypress",function(e){
    if(e.key == "Enter")
    {
        let startval = starttime.value;
        // console.log(startval)
        syllabus.focus();
    }
})
syllabus.addEventListener("keypress",function(e){
    if(e.key == "Enter")
    {
        let syllval = syllabus.value;
        notes.focus();
    }
})
notes.addEventListener("keypress",function(e){
    if(e.key == "Enter")
    {
        e.preventDefault();
        let notesval = notes.value;
    }})
const genbtn = document.getElementById("generate-strategy-btn");
if(genbtn)
{
    genbtn.addEventListener("click", examsub);
}
async function examsub(){
    if (examname.value && duration.value && starttime.value && notes.value) 
    {
        const formdata = new FormData();

        formdata.append("ExamName",examname.value);
        formdata.append("Duration",duration.value);
        formdata.append("StartTime",starttime.value);
        const syllabusdata = document.getElementById("syllabus-file");

        if(!syllabusdata || !syllabusdata.files[0])
        {
            if(!document.getElementById("files-alert"))
            {
                const par = document.createElement("p");
                par.id = "files-alert";
                par.innerText = "Please choose the files";
                document.body.appendChild(par);
            }
            return;
        }
        // formdata.append("")
        const existingalert = document.getElementById("files-alert");
        if(existingalert){
            existingalert.remove();
        }
        formdata.append("Syllabus-file",syllabusdata.files[0])

        const result = await sendDataTobackend(formdata);

        if(result){
            console.log("Sent successfully");
        }
        else{
            console.log("Error occured");
        }

    }
}
async function sendDataTobackend(formdata)
{
    try {
        const response = await fetch('',{
            method: 'POST',
            body: formdata
        });
        const res = await response.json();
        console.log('Success:', res);
        return res;

    }catch(error){
        console.error("Something went wrong",error);
        return null;
    }


}





