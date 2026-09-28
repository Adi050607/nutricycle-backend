import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
CREATE DONATION
========================= */

export async function createDonation(data){

  const donation = {

    donorName:
      data.donorName || "",

    donorAddress:
      data.donorAddress || "",

    donorLocation:
      data.donorLocation || null,

    foodName:
      data.foodName || "",

    quantity:
      data.quantity || 0,

    unit:
      data.unit || "KG",

    pickupDate:
      data.pickupDate || "",

    pickupTime:
      data.pickupTime || "",

    image:
      data.image || "",

    ngoName:
      null,

    assignedDriver:
      null,

    vehicleType:
      data.vehicleType || "",

    status:
      "Pending NGO Review",

    createdAt:
      serverTimestamp()

  };

  return await addDoc(
    collection(db,"donations"),
    donation
  );

}

/* =========================
NGO ACCEPT
========================= */

export async function ngoAccept(
  donationId,
  ngoName
){

  await updateDoc(

    doc(
      db,
      "donations",
      donationId
    ),

    {

      ngoName,

      status:
      "Awaiting Driver"

    }

  );

}

/* =========================
DRIVER ACCEPT
========================= */

export async function driverAccept(
  donationId,
  driverName
){

  await updateDoc(

    doc(
      db,
      "donations",
      donationId
    ),

    {

      assignedDriver:
      driverName,

      status:
      "Driver Assigned"

    }

  );

}

/* =========================
UPDATE STATUS
========================= */

export async function updateStatus(
  donationId,
  newStatus
){

  await updateDoc(

    doc(
      db,
      "donations",
      donationId
    ),

    {

      status:newStatus

    }

  );

}

/* =========================
LISTEN ALL DONATIONS
========================= */

export function listenDonations(
  callback
){

  return onSnapshot(

    collection(
      db,
      "donations"
    ),

    snapshot=>{

      const donations = [];

      snapshot.forEach(docSnap=>{

        donations.push({

          id:docSnap.id,

          ...docSnap.data()

        });

      });

      callback(
        donations
      );

    }

  );

}

/* =========================
LISTEN BY STATUS
========================= */

export function listenByStatus(
  status,
  callback
){

  const q = query(

    collection(
      db,
      "donations"
    ),

    where(
      "status",
      "==",
      status
    )

  );

  return onSnapshot(

    q,

    snapshot=>{

      const donations = [];

      snapshot.forEach(docSnap=>{

        donations.push({

          id:docSnap.id,

          ...docSnap.data()

        });

      });

      callback(
        donations
      );

    }

  );

}