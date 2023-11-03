const express = require("express");
const router = express.Router();
const courseTaskAssessmentDetailController = require("./courseAssesmentDetail.controller");

router.post("/create", (req, res) => {
	if (req.role == "Administrator") {
		courseTaskAssessmentDetailController.create(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/update", (req, res) => {
	if (req.role == "Administrator" || req.role == "client") {
		courseTaskAssessmentDetailController.update(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/delete", (req, res) => {
	if (req.role == "Administrator") {
		courseTaskAssessmentDetailController.delete(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/detail", (req, res) => {
	courseTaskAssessmentDetailController.detail(req, res);
});

module.exports = router;
