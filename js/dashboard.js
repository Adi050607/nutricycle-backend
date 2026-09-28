import Auth from "./auth.js";
import Profile from "./profile.js";
import Analytics from "./analytics.js";
import Notification from "./notification.js";

class Dashboard{

    constructor(){

        this.refreshInterval=null;

    }

    async initialize(){

        await Profile.loadProfile();

        await Analytics.calculate();

        this.loadGreeting();

        this.updateEngineStatus();

        this.loadRecentActivity();

        this.startRealtimeRefresh();

    }

    loadGreeting(){

        const hour=new Date().getHours();

        let greeting="Welcome";

        if(hour<12){

            greeting="Good Morning";

        }

        else if(hour<17){

            greeting="Good Afternoon";

        }

        else{

            greeting="Good Evening";

        }

        this.setText(

            "greeting",

            greeting

        );

    }

    async updateEngineStatus(){

        this.updateStatus(

            "firebaseStatus",

            true

        );

        try{

            const response=

            await fetch(

            "http://127.0.0.1:5000"

            );

            this.updateStatus(

                "aiStatus",

                response.ok

            );

        }

        catch{

            this.updateStatus(

                "aiStatus",

                false

            );

        }

    }

    updateStatus(id,status){

        const element=

        document.getElementById(id);

        if(!element) return;

        if(status){

            element.innerHTML=

            "🟢 Online";

        }

        else{

            element.innerHTML=

            "🔴 Offline";

        }

    }

    async loadRecentActivity(){

        const activity=

        document.getElementById(

        "recentActivity"

        );

        if(!activity) return;

        activity.innerHTML=

        `Dashboard Ready`;

    }

    setText(id,value){

        const element=

        document.getElementById(id);

        if(element){

            element.innerText=value;

        }

    }

    startRealtimeRefresh(){

        if(this.refreshInterval)

        clearInterval(

            this.refreshInterval

        );

        this.refreshInterval=

        setInterval(

            async()=>{

                await Analytics.calculate();

                await this.updateEngineStatus();

            },

            5000

        );

    }

}

const dashboard=

new Dashboard();

export default dashboard;