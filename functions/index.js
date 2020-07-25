const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const config = {
    apiKey: "AIzaSyDCSgfRrgVRAqxpFJ26TAOMmTbomoi7Cbg",
    authDomain: "social-media-app-d2370.firebaseapp.com",
    databaseURL: "https://social-media-app-d2370.firebaseio.com",
    projectId: "social-media-app-d2370",
    storageBucket: "social-media-app-d2370.appspot.com",
    messagingSenderId: "359809266205",
    appId: "1:359809266205:web:c357dbb9be0612ea720cf4",
    measurementId: "G-DWR107V5FG"
};

const firebase = require("firebase");
firebase.initializeApp(config);
const db = admin.firestore();

const express = require("express");
const app = express();

// getting docs from firebase, then firebase deploy to get url and in postman
// you paste it and get back a json file of your data in the firebase database

app.get("/posts", (request, response) => {
    db
        .collection("post")
        .orderBy("createdAt", "desc")
        .get()
        .then(data => {
            let post = [];
            data.forEach(doc => {
                post.push({
                    postId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                })
            });
            return response.json(post);
        })
        .catch((err) => console.error(err));
});

// function for creating docs through a post request 

app.post("/posts", (request, response) => {
    const newPosts = {
        body: request.body.body,
        userHandle: request.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db
        .collection("post")
        .add(newPosts)
        .then((doc) => {
            response.json({ message: `document ${doc.id} created successfully` });
        })
        .catch((err) => {
            response.status(500).json({
                error: "something went wrong"
            });
            console.error(err);
        });
});

//sign up route

app.post("/signup", (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userHandle: request.body.userHandle
    };

    let token, userId;

    // check if the handle is unique: if not thrown an error, if yes allow the creation of the user

    db.doc(`/"users"/${newUser.userHandle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                return response.status(400).json({ handle: "this handle is already taken" });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })

    .then(data => {
        userId = data.user.uid
        return data.user.getIdToken();
    })

    .then(idToken => {
        token = idToken;
        const userCredentials = {
            handle: newUser.userHandle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId
        };

        return db.doc(`/users/${newUser.userHandle}`).set(userCredentials);
    })

    .then(() => {
        return response.status(201).json({ token });
    })

    .catch(error => {
        console.error(error);
        if (error.code === "auth/email-already-in-use") {
            return response.status(400).json({ email: "email already in use" });
        } else {
            return response.status(500).json({
                error: error.code
            })
        }
    })
})

exports.api = functions.region("europe-west1").https.onRequest(app);