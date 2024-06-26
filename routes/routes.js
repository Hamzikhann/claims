"use strict";
const jwt = require("../utils/jwt");

const authenticationRouteHandler = require("../modules/authentication/router");
const rolesRouteHandler = require("../modules/roles/router");
const usersRouteHandler = require("../modules/users/router");
const dashboardRouteHandler = require("../modules/dashboard/router");

class Routes {
	constructor(app) {
		this.app = app;
	}
	appRoutes() {
		this.app.use("/api/auth", authenticationRouteHandler);
		this.app.use("/api/roles", jwt.protect, rolesRouteHandler);
		this.app.use("/api/users", jwt.protect, usersRouteHandler);
		this.app.use("/api/dashboard", dashboardRouteHandler);
	}
	routesConfig() {
		this.appRoutes();
	}
}
module.exports = Routes;
