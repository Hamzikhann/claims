"use strict";
const rolesController = require("./roles.controller");
const express = require("express");
const router = express.Router();

router.post("/list", (req, res) => {
	if (req.role == "Administrator") {
		rolesController.findAll(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

module.exports = router;
