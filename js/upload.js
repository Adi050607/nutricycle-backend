import { db } from "./firebase-config.js";

import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.submitDonation = async function () {

  try {

    const foodName =
      document.getElementById("foodName").value.trim();

    const quantity =
      document.getElementById("quantity").value;

    const unit =
      document.getElementById("unit").value;

    const datetime =
      document.getElementById("datetime").value;

    const image =
      document.getElementById("capturedImage").src;

    const quality =
      document.getElementById("qualityResult").innerText;

    const ngo =
      document.getElementById("ngoResult").innerText;

    const deliveryAgent =
      document.getElementById("agentResult").innerText;

    /* VALIDATION */

    if(foodName === ""){

      alert("Food name is required");
      return;

    }

    if(quantity === "" || quantity <= 0){

      alert("Enter valid quantity");
      return;

    }

    if(datetime === ""){

      alert("Select pickup date and time");
      return;

    }

    if(
      !image ||
      image === "" ||
      image.includes("undefined")
    ){

      alert("Capture food image first");
      return;

    }

    /* FIRESTORE UPLOAD */

    await addDoc(

      collection(db, "donations"),

      {

        foodName: foodName,

        quantity: quantity,

        unit: unit,

        datetime: datetime,

        image: image,

        quality: quality,

        ngo: ngo,

        deliveryAgent: deliveryAgent,

        donorName:
          localStorage.getItem("userName") || "",

        donorEmail:
          localStorage.getItem("userEmail") || "",

        donorRole:
          localStorage.getItem("userRole") || "donor",

        createdAt:
          new Date().toISOString()

      }

    );

    alert(
      "Donation Uploaded Successfully"
    );

    /* RESET FORM */

    document.getElementById(
      "foodName"
    ).value = "";

    document.getElementById(
      "quantity"
    ).value = "";

    document.getElementById(
      "datetime"
    ).value = "";

  }

  catch(error){

    console.error(error);

    alert(
      "Upload Failed: " +
      error.message
    );

  }

};