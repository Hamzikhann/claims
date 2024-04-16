"use strict";

const express = require("express");
const router = express.Router();
const jwt = require("../../utils/jwt");

const authcontroller = require("./authentication.controller");

router.post("/login", authcontroller.login);
router.post("/forgot/password", authcontroller.forgotPassword);
router.post("/reset/password/:token", jwt.resetPasswordProtect, authcontroller.resetPassword);
// router.post("/data", authcontroller.insertData);
// router.post("/members", authcontroller.createMembers);
// router.post("/providers", authcontroller.createProviders);
router.post("/diagnose", authcontroller.createDiagnoses);
router.post("/claims", authcontroller.createClaims);
router.post("/claims/providers", authcontroller.createClaimProviders);
router.post("/claims/procedures", authcontroller.createClaimProcedures);
router.post("/claims/diagnoses", authcontroller.createClaimDiagnoses);
router.post("/physicianFlagged", authcontroller.createPhysicianFlaggedTop);

module.exports = router;
