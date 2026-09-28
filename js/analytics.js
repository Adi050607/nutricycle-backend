import { db } from "./firebase-config.js";

import {

collection,
query,
where,
getDocs

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import Auth from "./auth.js";

class Analytics{

    constructor(){

        this.stats={

            totalDonations:0,

            mealsServed:0,

            carbonSaved:0,

            impactScore:0,

            rewardXP:0,

            ngoCount:0,

            completed:0,

            pending:0

        };

    }

    async calculate(){

        const user=

        Auth.getCurrentUser();

        if(!user) return;

        const donationQuery=query(

            collection(db,"donations"),

            where(

                "uid",

                "==",

                user.uid

            )

        );

        const snapshot=

        await getDocs(

            donationQuery

        );

        this.stats.totalDonations=

        snapshot.size;

        let meals=0;

        let carbon=0;

        let completed=0;

        let pending=0;

        snapshot.forEach(doc=>{

            const data=

            doc.data();

            const quantity=

            Number(

                data.quantity || 0

            );

            meals+=

            Math.round(quantity*4);

            carbon+=

            quantity*2.5;

            if(

                data.status==="Completed"

            ){

                completed++;

            }

            else{

                pending++;

            }

        });

        this.stats.mealsServed=

        meals;

        this.stats.carbonSaved=

        carbon.toFixed(1);

        this.stats.completed=

        completed;

        this.stats.pending=

        pending;

        this.stats.rewardXP=

        completed*50;

        this.stats.impactScore=

        this.calculateImpact();

        this.updateDashboard();

    }

    calculateImpact(){

        const score=

        this.stats.completed*10+

        this.stats.mealsServed*0.2+

        this.stats.carbonSaved*0.5;

        return Math.min(

            Math.round(score),

            100

        );

    }

    updateDashboard(){

        this.set(

            "totalDonations",

            this.stats.totalDonations

        );

        this.set(

            "mealsServed",

            this.stats.mealsServed

        );

        this.set(

            "carbonSaved",

            this.stats.carbonSaved+" kg"

        );

        this.set(

            "impactScore",

            this.stats.impactScore+"%"

        );

        this.set(

            "rewardXP",

            this.stats.rewardXP

        );

        this.set(

            "completedDonations",

            this.stats.completed

        );

        this.set(

            "pendingDonations",

            this.stats.pending

        );

    }

    set(id,value){

        const element=

        document.getElementById(id);

        if(element){

            element.innerText=value;

        }

    }

    getStats(){

        return this.stats;

    }

}

const analytics=

new Analytics();

export default analytics;