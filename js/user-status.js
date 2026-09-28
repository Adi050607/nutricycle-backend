import { db }
from "./firebase-config.js";

import {

collection,
query,
where,
onSnapshot

}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* CHANGE THIS LATER */

const donorName =
localStorage.getItem("userName");

const q = query(
collection(db,"donations")
);

onSnapshot(q,(snapshot)=>{

snapshot.forEach(docSnap=>{

const data =
docSnap.data();

if(
data.donorName !== donorName
){
return;
}

document.getElementById(
"donationStatus"
).innerText =
data.status;

if(
data.status ===
"Driver Assigned"
){

document.getElementById(
"trackBtn"
).style.display =
"block";

document.getElementById(
"driverInfo"
).innerHTML =

`
Driver:
${data.assignedDriver}

<br>

Vehicle:
${data.vehicleType}

<br>

Number:
${data.vehicleNumber}
`;

}

});

});