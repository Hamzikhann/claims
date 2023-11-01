"use strict";

const express = require("express");
const router = express.Router();

const courseObjectivesController = require("./courseObjectives.controller");

router.post("/list", courseObjectivesController.list);

router.post("/create", (req, res) => {
	if (req.role == "Administrator") {
		courseObjectivesController.create(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/update", (req, res) => {
	if (req.role == "Administrator") {
		courseObjectivesController.update(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/delete", (req, res) => {
	if (req.role == "Administrator") {
		courseObjectivesController.delete(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

module.exports = router;
