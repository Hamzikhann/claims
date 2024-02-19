"use strict";

const express = require("express");
const router = express.Router();
const dashboardController = require("./dashboard.controller");

router.post("/list/claims", (req, res) => {
	dashboardController.claimsList(req, res);
	// if (req.role == "Administrator") {
	// 	dashboardController.adminDashboard(req, res);
	// } else if (req.role == "User") {
	// 	dashboardController.userDashboard(req, res);
	// } else if (req.role == "Client") {
	// 	dashboardController.clientDashboard(req, res);
	// }
});

router.post("/list/states", (req, res) => {
	dashboardController.states(req, res);
});

router.post("/list", (req, res) => {
	dashboardController.dashboard(req, res);
});

router.post("/list/employeer", (req, res) => {
	dashboardController.employeer(req, res);
});

router.post("/list/flaggedReason", (req, res) => {
	dashboardController.flaggedReason(req, res);
});

router.post("/list/specialty", (req, res) => {
	dashboardController.providerSpeciality(req, res);
});

router.post("/list/serviceTypes", (req, res) => {
	dashboardController.serviceTypes(req, res);
});
module.exports = router;
