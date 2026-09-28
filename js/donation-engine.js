import { db } from "./firebase-config.js";

import {

collection,
addDoc,
serverTimestamp

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import Auth from "./auth.js";
import Scanner from "./scanner.js";
import VehicleEngine from "./vehicle-engine.js";
import NGOEngine from "../ngo-matching.js";
import Analytics from "./analytics.js";
import RewardEngine from "./reward-engine.js";
import Notification from "./notification.js";

class DonationEngine{

    constructor(){

        this.currentDonation=null;

    }

    async create(quantity,unit){

        const user=

        Auth.getCurrentUser();

        if(!user)

            throw "User not logged in";

        const scan=

        Scanner.getResult();

        if(!scan)

            throw "Food not scanned";

        const vehicle=

        VehicleEngine.calculate(

            quantity,

            unit,

            scan.shelfLifeHours || 24

        );

        const ngo=

        await NGOEngine.recommend(scan);

        this.currentDonation={

            uid:user.uid,

            donor:user.name,

            food:scan.food,

            category:scan.category,

            freshness:scan.freshness,

            confidence:scan.confidence,

            shelfLife:scan.shelfLife,

            quantity,

            unit,

            vehicle,

            ngo,

            status:"Pending",

            createdAt:serverTimestamp()

        };

        return this.currentDonation;

    }

    async save(){

        if(!this.currentDonation)

            throw "No Donation";

        const docRef=

        await addDoc(

            collection(db,"donations"),

            this.currentDonation

        );

        this.currentDonation.id=

        docRef.id;

        await Analytics.calculate();

        await RewardEngine.addXP(100);

        Notification.success(

            "Donation Created"

        );

        return docRef.id;

    }

    getDonation(){

        return this.currentDonation;

    }

}

const Donation=

new DonationEngine();

export default Donation;