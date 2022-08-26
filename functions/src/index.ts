/* eslint-disable import/default */
import path from "path";
import express from "express";
import * as functions from "firebase-functions";
import router from "./router";
import cors from "cors";

const app = express();

app.use(cors({origin: true}));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, "router")));
app.use("/", router);

exports.api = functions.region("asia-northeast1").https.onRequest(app);
