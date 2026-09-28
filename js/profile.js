import Auth from "./auth.js";
import { db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

class ProfileManager{

    constructor(){

        this.user=null;

    }

    async loadProfile(){

        const currentUser=Auth.getCurrentUser();

        if(!currentUser) return;

        const snapshot=await getDoc(

            doc(db,"users",currentUser.uid)

        );

        if(!snapshot.exists()) return;

        this.user=snapshot.data();

        this.renderProfile();

    }

    renderProfile(){

        if(!this.user) return;

        const defaultImage=
        "assets/default-user.png";

        const image=
        this.user.profileImage &&

        this.user.profileImage.length>0

        ?

        this.user.profileImage

        :

        defaultImage;

        this.setImage(

            "profileImage",

            image

        );

        this.setImage(

            "sidebarProfile",

            image

        );

        this.setText(

            "profileName",

            this.user.name

        );

        this.setText(

            "sidebarName",

            this.user.name

        );

        this.setText(

            "profileEmail",

            this.user.email

        );

        this.setText(

            "profileRole",

            this.user.role

        );

        this.setText(

            "phone",

            this.user.phone

        );

        this.setText(

            "address",

            this.user.address

        );

    }

    setText(id,value){

        const element=document.getElementById(id);

        if(element){

            element.innerText=value ?? "";

        }

    }

    setImage(id,value){

        const image=document.getElementById(id);

        if(image){

            image.src=value;

        }

    }

    async updateProfile(data){

        if(!this.user) return;

        await updateDoc(

            doc(db,"users",this.user.uid),

            data

        );

        await this.loadProfile();

    }

    async updateProfileImage(imageUrl){

        await this.updateProfile({

            profileImage:imageUrl

        });

    }

    async updateTheme(theme){

        await this.updateProfile({

            theme:theme

        });

    }

    async updatePhone(phone){

        await this.updateProfile({

            phone:phone

        });

    }

    async updateAddress(address){

        await this.updateProfile({

            address:address

        });

    }

    getUser(){

        return this.user;

    }

}

const Profile=new ProfileManager();

export default Profile;