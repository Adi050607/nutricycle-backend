import Dashboard from "./dashboard.js";
import Analytics from "./analytics.js";

class Scanner{

    constructor(){

        this.video=null;

        this.canvas=null;

        this.stream=null;

        this.currentImage=null;

        this.lastScan=null;

    }

    initialize(){

        this.video=

        document.getElementById("video");

        this.canvas=

        document.getElementById("canvas");

    }

    async startCamera(){

        try{

            this.stream=

            await navigator.mediaDevices.getUserMedia({

                video:true

            });

            this.video.srcObject=this.stream;

            Dashboard.updateStatus(

                "cameraStatus",

                true

            );

        }

        catch(e){

            Dashboard.updateStatus(

                "cameraStatus",

                false

            );

            console.error(e);

        }

    }

    stopCamera(){

        if(!this.stream) return;

        this.stream.getTracks()

        .forEach(track=>track.stop());

    }

    capture(){

        const context=

        this.canvas.getContext("2d");

        this.canvas.width=

        this.video.videoWidth;

        this.canvas.height=

        this.video.videoHeight;

        context.drawImage(

            this.video,

            0,

            0

        );

        this.currentImage=

        this.canvas.toDataURL(

            "image/jpeg",

            .95

        );

        return this.currentImage;

    }

    async scan(){

        if(!this.currentImage){

            alert(

            "Capture image first"

            );

            return;

        }

        this.showScanning();

        const blob=

        await fetch(

        this.currentImage)

        .then(r=>r.blob());

        const formData=

        new FormData();

        formData.append(

            "image",

            blob,

            "food.jpg"

        );

        const response=

        await fetch(

        "http://127.0.0.1:5000/scan-food",

        {

            method:"POST",

            body:formData

        });

        const result=

        await response.json();

        this.lastScan=result;

        this.hideScanning();

        this.display(result);

    }

    display(data){

        document.getElementById(

        "foodDetected"

        ).innerText=

        data.food || "Unknown";

        document.getElementById(

        "confidenceResult"

        ).innerText=

        data.confidence

        ?

        data.confidence+" %"

        :

        "--";

        document.getElementById(

        "freshnessResult"

        ).innerText=

        data.freshness||

        "--";

        document.getElementById(

        "shelfLifeResult"

        ).innerText=

        data.shelfLife||

        "--";

    }

    showScanning(){

        document.getElementById(

        "scannerOverlay"

        ).style.display="flex";

    }

    hideScanning(){

        document.getElementById(

        "scannerOverlay"

        ).style.display="none";

    }

    getResult(){

        return this.lastScan;

    }

}

const scanner=

new Scanner();

export default scanner;