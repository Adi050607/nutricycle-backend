import { db } from "./firebase-config.js";

import {

doc,

getDoc,

setDoc,

updateDoc,

increment

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import Auth from "./auth.js";

import eventBus from "./event-bus.js";

class RewardEngine{

    constructor(){

        eventBus.subscribe(

            "donationCompleted",

            (donation)=>{

                this.process(donation);

            }

        );

    }

    async process(donation){

        const user=

        Auth.getCurrentUser();

        if(!user) return;

        const xp=

        this.calculateXP(

            donation

        );

        const level=

        this.calculateLevel(xp);

        const badge=

        this.calculateBadge(

            donation,

            xp

        );

        const ref=

        doc(

            db,

            "rewards",

            user.uid

        );

        const snapshot=

        await getDoc(ref);

        if(!snapshot.exists()){

            await setDoc(

                ref,

                {

                    xp,

                    level,

                    badges:[badge],

                    streak:1,

                    updated:new Date()

                }

            );

            return;

        }

        await updateDoc(

            ref,

            {

                xp:increment(xp),

                updated:new Date()

            }

        );

    }

    calculateXP(d){

        let xp=0;

        xp+=20;

        xp+=

        Number(d.quantity||0)*5;

        if(

            d.freshness==="Fresh"

        )

            xp+=40;

        if(

            d.priority==="Critical"

        )

            xp+=60;

        if(

            d.status==="Completed"

        )

            xp+=80;

        return xp;

    }

    calculateLevel(xp){

        return Math.floor(

            xp/250

        )+1;

    }

    calculateBadge(d,xp){

        if(xp>500)

            return "Gold Donor";

        if(

            d.quantity>20

        )

            return "Bulk Saver";

        if(

            d.freshness==="Fresh"

        )

            return "Food Hero";

        return "Contributor";

    }

}

const reward=

new RewardEngine();

export default reward;