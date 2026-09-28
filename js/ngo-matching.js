import { db } from "../firebase-config.js";

import {

collection,
getDocs

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

class NGOMatching{

    constructor(){

        this.bestNGO=null;

    }

    async recommend(food){

        const snapshot=

        await getDocs(

            collection(db,"ngos")

        );

        let bestScore=-1;

        let bestNGO=null;

        snapshot.forEach(doc=>{

            const ngo=doc.data();

            const score=

            this.calculateScore(

                ngo,

                food

            );

            if(score>bestScore){

                bestScore=score;

                bestNGO={

                    id:doc.id,

                    score,

                    ...ngo

                };

            }

        });

        this.bestNGO=bestNGO;

        return bestNGO;

    }

    calculateScore(ngo,food){

        let score=0;

        if(ngo.status==="Open")

            score+=30;

        if(ngo.availableStorage>0)

            score+=20;

        if(

            ngo.acceptedFoods?.includes(

                food.category

            )

        )

            score+=25;

        score+=

        Math.max(

            0,

            20-ngo.distance

        );

        score+=

        Math.max(

            0,

            10-ngo.pendingRequests

        );

        return score;

    }

    getBestNGO(){

        return this.bestNGO;

    }

}

const ngoEngine=

new NGOMatching();

export default ngoEngine;