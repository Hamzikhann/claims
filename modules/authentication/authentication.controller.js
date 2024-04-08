const db = require("../../models");
const jwt = require("../../utils/jwt");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const Joi = require("@hapi/joi");

const fs = require("fs");

const { sequelize } = require("../../models");
const { promises } = require("dns");

const filePath = "../utils/synthetic.json";

const Users = db.users;
const Roles = db.roles;
const Claims = db.claims;
const Providers = db.providers;
const Members = db.members;
const Procedure = db.procedures;
const Diagnoses = db.diagnoses;
const ClaimProviders = db.claimProviders;
const ClaimDiagnoses = db.claimDiagnoses;
const ClaimProcedures = db.claimProcedures;
const PhysicianFlaggedTop = db.physicianFlaggedChargesTopHcpc;
const PhysicianFlaggedCharges = db.physicianFlaggedCharges;

const mysql = require("mysql");

const connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "fwa_django"
});

exports.login = async (req, res) => {
	try {
		const userExist = await Users.findOne({
			where: {
				email: req.body.email.trim(),
				isActive: "Y"
			}
		});
		if (userExist) {
			const user = await Users.findOne({
				where: {
					email: req.body.email.trim(),
					password: req.body.password,
					isActive: "Y"
				},
				include: [
					{
						model: Roles,
						attributes: ["title"]
					}
				],
				attributes: ["id", "firstName", "lastName", "email", "roleId"]
			});
			if (user) {
				encryptHelper(user);
				const token = jwt.signToken({
					userId: user.id,
					profileId: user.userProfile.id,
					clientId: user.clientId,
					roleId: user.roleId,
					role: user.role.title
				});
				res.status(200).send({
					messgae: "Logged in successful",
					data: { user },
					token
				});
			} else {
				res.status(403).send({ message: "Incorrect Logins" });
			}
		} else {
			res.status(401).send({
				title: "Incorrect Email.",
				message: "Email does not exist in our system, Please verify you have entered correct email."
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
exports.forgotPassword = async (req, res) => {
	try {
		var email = req.body.email.trim();
		const user = await Users.findOne({
			where: {
				email: email,
				isActive: "Y"
			}
		});
		if (user) {
			// emails.forgotPassword(user);
			res.status(200).send({ message: "Email send to user." });
		} else {
			res.status(401).send({
				title: "Incorrect Email.",
				message: "Email does not exist in our system, Please verify you have entered correct email."
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};
exports.resetPassword = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			password: Joi.string().min(8).max(16).required(),
			confirmPassword: Joi.any().valid(Joi.ref("password")).required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			var email = req.email;
			const user = await Users.findOne({
				where: {
					email: email,
					isActive: "Y"
				}
			});

			if (user) {
				var password = req.body.password;

				Users.update({ password: crypto.encrypt(password) }, { where: { id: user.id } })
					.then((result) => {
						res.send({
							message: "User password reset successfully."
						});
					})
					.catch((err) => {
						emails.errorEmail(req, err);
						res.status(500).send({
							message: "Error while reset User password"
						});
					});
			} else {
				res.status(401).send({
					title: "Incorrect Email.",
					message: "Email does not exist in our system, Please verify you have entered correct email."
				});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.createDiagnoses = async (req, res) => {
	try {
		const data = fs.readFileSync("./utils/synthe.json", "utf8");
		let newData = [];
		let count = 0;
		let members = [];
		let providers = [];
		let diagnoses = [];
		let procedures = [];
		let claims = [];
		connection.connect(async (err) => {
			if (err) {
				console.error("Error connecting to database:", err);
				res.send({ message: "Error connecting to database:", err });
				return;
			} else {
				console.log("Connected to database");

				JSON.parse(data).forEach((e) => {
					newData.push(JSON.parse(e));
				});

				for (e of newData) {
					let num = 1;
					members.push(e.member);
					// providers.push(e.providers);
					// diagnoses.push(e.diagnoses);

					e.providers.forEach((provider) => {
						providers.push(provider);
					});

					e.diagnoses.forEach((diagnose) => {
						diagnoses.push(diagnose);
					});

					e.flaggedProcedureCodes.forEach((procdere) => {
						let proedureObj = {
							code: procdere.code,
							description: procdere.description
						};
						procedures.push(proedureObj);
					});
					console.log(num++);
				}

				let mem = removeDuplicates(members, "memberId");
				let pro = removeDuplicates(providers, "providerId");
				let diag = removeDuplicates(diagnoses, "code");
				let proce = removeDuplicates(procedures, "code");
				mem.forEach((member) => {
					const membersQuery = `INSERT INTO app_members SET ?`;
					connection.query(membersQuery, member, (err, results, fields) => {
						if (err) {
							console.error("Error inserting data into Members table:", err);
							return;
						}
						console.log("Member data inserted successfully");
					});
				});
				pro.forEach((provider) => {
					const providerQuery = `INSERT INTO app_providers SET ?`;
					connection.query(providerQuery, provider, (err, results, fields) => {
						if (err) {
							console.error("Error inserting data into Members table:", err);
							return;
						}
						console.log("Provider data inserted successfully");
					});
				});
				diag.forEach((diagnose) => {
					const diagnoseQuery = `INSERT INTO app_diagnoses SET ?`;
					connection.query(diagnoseQuery, diagnose, (err, results, fields) => {
						if (err) {
							console.error("Error inserting data into Members table:", err);
							return;
						}
						console.log("Diagnose data inserted successfully");
					});
				});
				proce.forEach((procedure) => {
					const procedureQuery = `INSERT INTO app_procedures SET ?`;
					connection.query(procedureQuery, procedure, (err, results, fields) => {
						if (err) {
							console.error("Error inserting data into Members table:", err);
							return;
						}
						console.log("Procedure data inserted successfully");
					});
				});
				// let createMember = await Members.bulkCreate(mem);
				// let createProvider = await Providers.bulkCreate(pro);
				// let createDiagnoses = await Diagnoses.bulkCreate(diag);
				// let createProcedures = await Procedure.bulkCreate(proce);

				// await Promise.all([
				// 	Members.bulkCreate(mem),
				// 	Providers.bulkCreate(pro),
				// 	Diagnoses.bulkCreate(diag)
				// 	// Procedure.bulkCreate(proce)
				// ]);

				res.send({ data: newData });
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.createClaims = async (req, res) => {
	try {
		const data = fs.readFileSync("./utils/synthe.json", "utf8");
		let newData = [];
		let count = 0;
		let members = [];
		let providers = [];
		let diagnoses = [];
		let procedures = [];
		let claims = [];
		let claimsarray = [];

		connection.connect(async (err) => {
			if (err) {
				console.error("Error connecting to database:", err);
				res.send({ message: "Error connecting to database:", err });
				return;
			} else {
				console.log("Connected to database");

				JSON.parse(data).forEach((e) => {
					newData.push(JSON.parse(e));
				});

				for (let e of newData) {
					let claimObj = {
						claimId: e.claimId,
						claimStatus: e.claimStatus,
						claimFirstDate: e.claimFirstDate,
						claimLastDate: e.claimLastDate,
						claimSubmitDate: e.claimSubmitDate,
						chargesFlagged: e.chargesFlagged,
						chargesTotal: e.chargesTotal,
						flaggedReason: e.flaggedReason,
						serviceType: e.serviceType,
						medicalRecordReviewRecommendation: e.medicalRecordReviewRecommendation,
						medicalRecordReviewNotes: e.medicalRecordReviewNotes,
						billingOrganization: e.billingOrganization,
						billingID: e.billingID,
						claimFlagged: e.claimFlagged
					};
					const selectQueryForMembers = `SELECT * FROM app_members WHERE memberId = ?`;
					connection.query(selectQueryForMembers, [e.member.memberId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							claimObj.memberId = results[0].id;
							claimsarray.push(claimObj);
							const claimsQuery = `INSERT INTO app_claims SET ?`;
							connection.query(claimsQuery, claimObj, (err, results, fields) => {
								if (err) {
									console.error("Error inserting data into Members table:", err);
									return;
								}
								console.log("Claims data inserted successfully");
							});
							return results[0];
						}
					});
					console.log("hi");
				}

				// for (let e of newData) {
				// 	let claimProviderObj = {
				// 		providerType: e.providers[0].providerType
				// 	};
				// 	let claimDiagnosesObj = {};
				// 	let claimProcedureObj = {};
				// 	const selectQueryForClaims = `SELECT * FROM app_claims WHERE claimId = ?`;
				// 	connection.query(selectQueryForClaims, [e.claimId], (err, results, fields) => {
				// 		if (err) {
				// 			console.error("Error executing query:", err);
				// 			return;
				// 		} else {
				// 			console.log(results[0]);
				// 			claimProviderObj.claimId = results[0].id;
				// 			claimDiagnosesObj.claimId = results[0].id;
				// 			claimProcedureObj.claimId = results[0].id;
				// 			console.log("Claim:", results[0].id);
				// 		}
				// 	});

				// 	const selectQueryForProviders = `SELECT * FROM app_providers WHERE providerId = ?`;
				// 	var provider;

				// 	connection.query(selectQueryForProviders, [e.providers[0].providerId], (err, results, fields) => {
				// 		if (err) {
				// 			console.error("Error executing query:", err);
				// 			return;
				// 		} else {
				// 			claimProviderObj.providerId = results[0].id;
				// 			console.log("Provider:", results[0].id);
				// 			const claimsProvidersQuery = `INSERT INTO app_claimproviders SET ?`;
				// 			connection.query(claimsProvidersQuery, claimProviderObj, (err, results, fields) => {
				// 				if (err) {
				// 					console.error("Error inserting data into Members table:", err);
				// 					return;
				// 				}
				// 				console.log("ClaimProvider data inserted successfully");
				// 			});
				// 		}
				// 	});

				// 	claims.push(claimProviderObj);

				// 	for (let diag of e.diagnoses) {
				// 		const selectQueryForappDiagnoses = `SELECT * FROM app_diagnoses WHERE code = ?`;
				// 		connection.query(selectQueryForappDiagnoses, [diag.code], (err, results, fields) => {
				// 			if (err) {
				// 				console.error("Error executing query:", err);
				// 				return;
				// 			} else {
				// 				claimDiagnosesObj.diagnosisId = results[0].id;
				// 				console.log("diag:", diag.code);
				// 				const claimDiagnosesQuery = `INSERT INTO app_claimprocedures SET ?`;
				// 				connection.query(claimDiagnosesQuery, claimDiagnosesObj, (err, results, fields) => {
				// 					if (err) {
				// 						console.error("Error inserting data into Members table:", err);
				// 						return;
				// 					}
				// 					console.log("claimDiagnoses data inserted successfully");
				// 				});
				// 			}
				// 		});
				// 		diagnoses.push(claimDiagnosesObj);
				// 	}

				// 	for (let procedure of e.flaggedProcedureCodes) {
				// 		claimProcedureObj.service_line_identifier = procedure.service_line_identifier;
				// 		claimProcedureObj.amountCharged = procedure.amountCharged;
				// 		const selectQueryForAppProcedure = `SELECT * FROM app_procedures WHERE code = ?`;
				// 		var proc;
				// 		connection.query(selectQueryForAppProcedure, [procedure.code], (err, results, fields) => {
				// 			if (err) {
				// 				console.error("Error executing query:", err);
				// 				return;
				// 			} else {
				// 				claimProcedureObj.procedureId = results[0].id;
				// 				console.log("proc:", results[0].id);
				// 				const claimsProceduresQuery = `INSERT INTO app_claimprocedures SET ?`;
				// 				connection.query(claimsProceduresQuery, claimProcedureObj, (err, results, fields) => {
				// 					if (err) {
				// 						console.error("Error inserting data into Members table:", err);
				// 						return;
				// 					}
				// 					console.log("claimsProcedures data inserted successfully");
				// 				});
				// 			}
				// 		});

				// 		procedures.push(claimProcedureObj);
				// 	}
				// }

				// claims.forEach((claimProvider) => {
				// 	const claimsProvidersQuery = `INSERT INTO app_claimproviders SET ?`;
				// 	connection.query(claimsProvidersQuery, claimProvider, (err, results, fields) => {
				// 		if (err) {
				// 			console.error("Error inserting data into Members table:", err);
				// 			return;
				// 		}
				// 		console.log("ClaimProvider data inserted successfully");
				// 	});
				// });

				// procedures.forEach((claimProcedures) => {
				// 	const claimsProceduresQuery = `INSERT INTO app_claimprocedures SET ?`;
				// 	connection.query(claimsProceduresQuery, claimProcedures, (err, results, fields) => {
				// 		if (err) {
				// 			console.error("Error inserting data into Members table:", err);
				// 			return;
				// 		}
				// 		console.log("claimsProcedures data inserted successfully");
				// 	});
				// });

				// diagnoses.forEach((claimDiagnoses) => {
				// 	const claimDiagnosesQuery = `INSERT INTO app_claimprocedures SET ?`;
				// 	connection.query(claimDiagnosesQuery, claimDiagnoses, (err, results, fields) => {
				// 		if (err) {
				// 			console.error("Error inserting data into Members table:", err);
				// 			return;
				// 		}
				// 		console.log("claimDiagnoses data inserted successfully");
				// 	});
				// });

				// let createClaimProviders = await ClaimProviders.bulkCreate(claims);
				// let createClaimProcedures = await ClaimProcedures.bulkCreate(procedures);
				// let createClaimDiagnoses = await ClaimDiagnoses.bulkCreate(diagnoses);

				// let createClaims = await Claims.bulkCreate(claims);
				// console.log("1");
				res.send({ data: newData });
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.createPhysicianFlaggedTop = async (req, res) => {
	try {
		const physicianFlaggedChargesTop = JSON.parse(fs.readFileSync("./utils/physicianFlaggedChargesTop.json", "utf8"));
		const physicianFlaggedCharges = JSON.parse(fs.readFileSync("./utils/physicianFlaggedCharges.json", "utf8"));
		connection.connect((err) => {
			if (err) {
				console.error("Error connecting to database:", err);
				res.send({ message: "Error connecting to database:", err });
				return;
			} else {
				console.log("Connected to database");

				// let physicianFlgged = [];
				// let physicianFlggedCharges = [];
				// for (let e of physicianFlaggedChargesTop) {
				// 	let findProvider = await Providers.findOne({ where: { providerId: e.servicingPhysicianId } });

				// 	let physicianObj = {
				// 		providerId: findProvider.id,
				// 		claimSubmissionYear: e.claimSubmissionYear,
				// 		top1Hcpcs: e.top1Hcpcs,
				// 		top1HcpcsDescription: e.top1HcpcsDescription,
				// 		top1FlaggedAmt: e.top1FlaggedAmt,
				// 		top2Hcpcs: e.top2Hcpcs,
				// 		top2HcpcsDescription: e.top2HcpcsDescription,
				// 		top2FlaggedAmt: e.top2FlaggedAmt,
				// 		top3Hcpcs: e.top3Hcpcs,
				// 		top3HcpcsDescription: e.top3HcpcsDescription,
				// 		top3FlaggedAmt: e.top3FlaggedAmt
				// 	};

				// 	physicianFlgged.push(physicianObj);
				// }
				// for (let e of physicianFlaggedCharges) {
				// 	let findProvider = await Providers.findOne({ where: { providerId: e.servicingPhysicianId } });
				// 	console.log(e.flaggedChargedAmount);
				// 	let physicianChargesObj = {
				// 		providerId: findProvider.id,
				// 		claimSubmissionYear: e.claimSubmissionYear,
				// 		flaggedChargedAmount: e.flaggedChargedAmount
				// 	};

				// 	physicianFlggedCharges.push(physicianChargesObj);
				// }

				// let createPhysicianFlaggedTop = await PhysicianFlaggedTop.bulkCreate(physicianFlgged);
				// let createPhysicianFlaggedCharges = await PhysicianFlaggedCharges.bulkCreate(physicianFlggedCharges);

				// res.send({ physicianFlgged, physicianFlggedCharges });
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

function removeDuplicates(array, propertyName) {
	return array.filter((item, index, self) => index === self.findIndex((t) => t[propertyName] === item[propertyName]));
}

exports.createClaimProviders = async (req, res) => {
	try {
		const data = fs.readFileSync("./utils/synthe.json", "utf8");
		let newData = [];
		let count = 0;
		let members = [];
		let providers = [];
		let diagnoses = [];
		let procedures = [];
		let claims = [];
		let claimsarray = [];
		connection.connect(async (err) => {
			if (err) {
				console.error("Error connecting to database:", err);
				res.send({ message: "Error connecting to database:", err });
				return;
			} else {
				console.log("Connected to database");

				JSON.parse(data).forEach((e) => {
					newData.push(JSON.parse(e));
				});

				for (let e of newData) {
					let claimProviderObj = {
						providerType: e.providers[0].providerType
					};
					// let claimDiagnosesObj = {};
					// let claimProcedureObj = {};
					const selectQueryForClaims = `SELECT * FROM app_claims WHERE claimId = ?`;

					connection.query(selectQueryForClaims, [e.claimId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							console.log(results[0]);
							claimProviderObj.claimId = results[0].id;
							// claimDiagnosesObj.claimId = results[0].id;
							// claimProcedureObj.claimId = results[0].id;
							console.log("Claim:", results[0].id);

							const selectQueryForProviders = `SELECT * FROM app_providers WHERE providerId = ?`;
							connection.query(selectQueryForProviders, [e.providers[0].providerId], (err, results, fields) => {
								if (err) {
									console.error("Error executing query:", err);
									return;
								} else {
									claimProviderObj.providerId = results[0].id;
									console.log("Provider:", results[0].id);
									const claimsProvidersQuery = `INSERT INTO app_claimproviders SET ?`;
									connection.query(claimsProvidersQuery, claimProviderObj, (err, results, fields) => {
										if (err) {
											console.error("Error inserting data into Members table:", err);
											return;
										}
										console.log("ClaimProvider data inserted successfully");
									});
								}
							});
						}
					});

					// for (let diag of e.diagnoses) {
					// 	const selectQueryForappDiagnoses = `SELECT * FROM app_diagnoses WHERE code = ?`;
					// 	connection.query(selectQueryForappDiagnoses, [diag.code], (err, results, fields) => {
					// 		if (err) {
					// 			console.error("Error executing query:", err);
					// 			return;
					// 		} else {
					// 			claimDiagnosesObj.diagnosisId = results[0].id;
					// 			console.log("diag:", diag.code);
					// 			const claimDiagnosesQuery = `INSERT INTO app_claimprocedures SET ?`;
					// 			connection.query(claimDiagnosesQuery, claimDiagnosesObj, (err, results, fields) => {
					// 				if (err) {
					// 					console.error("Error inserting data into Members table:", err);
					// 					return;
					// 				}
					// 				console.log("claimDiagnoses data inserted successfully");
					// 			});
					// 		}
					// 	});
					// 	diagnoses.push(claimDiagnosesObj);
					// }

					// for (let procedure of e.flaggedProcedureCodes) {
					// 	claimProcedureObj.service_line_identifier = procedure.service_line_identifier;
					// 	claimProcedureObj.amountCharged = procedure.amountCharged;
					// 	const selectQueryForAppProcedure = `SELECT * FROM app_procedures WHERE code = ?`;
					// 	var proc;
					// 	connection.query(selectQueryForAppProcedure, [procedure.code], (err, results, fields) => {
					// 		if (err) {
					// 			console.error("Error executing query:", err);
					// 			return;
					// 		} else {
					// 			claimProcedureObj.procedureId = results[0].id;
					// 			console.log("proc:", results[0].id);
					// 			const claimsProceduresQuery = `INSERT INTO app_claimprocedures SET ?`;
					// 			connection.query(claimsProceduresQuery, claimProcedureObj, (err, results, fields) => {
					// 				if (err) {
					// 					console.error("Error inserting data into Members table:", err);
					// 					return;
					// 				}
					// 				console.log("claimsProcedures data inserted successfully");
					// 			});
					// 		}
					// 	});

					// 	procedures.push(claimProcedureObj);
					// }
				}

				res.send({ data: newData });
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.createClaimDiagnoses = async (req, res) => {
	try {
		const data = fs.readFileSync("./utils/synthe.json", "utf8");
		let newData = [];
		let count = 0;
		let members = [];
		let providers = [];
		let diagnoses = [];
		let procedures = [];
		let claims = [];
		let claimsarray = [];
		connection.connect(async (err) => {
			if (err) {
				console.error("Error connecting to database:", err);
				res.send({ message: "Error connecting to database:", err });
				return;
			} else {
				console.log("Connected to database");

				JSON.parse(data).forEach((e) => {
					newData.push(JSON.parse(e));
				});

				for (let e of newData) {
					// let claimProviderObj = {
					// 	providerType: e.providers[0].providerType
					// };
					let claimDiagnosesObj = {};
					// let claimProcedureObj = {};
					const selectQueryForClaims = `SELECT * FROM app_claims WHERE code = ?`;

					connection.query(selectQueryForClaims, [e.claimId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							console.log(results[0]);
							// claimProviderObj.claimId = results[0].id;
							claimDiagnosesObj.claimId = results[0].id;
							// claimProcedureObj.claimId = results[0].id;
							console.log("Claim:", results[0].id);

							const selectQueryForDiagnoses = `SELECT * FROM app_claimdiagnoses WHERE providerId = ?`;
							connection.query(selectQueryForDiagnoses, [diag.code], (err, results, fields) => {
								if (err) {
									console.error("Error executing query:", err);
									return;
								} else {
									claimDiagnosesObj.diagnosisId = results[0].id;
									console.log("diagnoses:", results[0].id);
									const claimsDiagnosesQuery = `INSERT INTO app_claimdiagnoses SET ?`;
									connection.query(claimsDiagnosesQuery, claimDiagnosesObj, (err, results, fields) => {
										if (err) {
											console.error("Error inserting data into Members table:", err);
											return;
										}
										console.log("ClaimProvider data inserted successfully");
									});
								}
							});
						}
					});

					// for (let diag of e.diagnoses) {
					// 	const selectQueryForappDiagnoses = `SELECT * FROM app_diagnoses WHERE code = ?`;
					// 	connection.query(selectQueryForappDiagnoses, [diag.code], (err, results, fields) => {
					// 		if (err) {
					// 			console.error("Error executing query:", err);
					// 			return;
					// 		} else {
					// 			claimDiagnosesObj.diagnosisId = results[0].id;
					// 			console.log("diag:", diag.code);
					// 			const claimDiagnosesQuery = `INSERT INTO app_claimprocedures SET ?`;
					// 			connection.query(claimDiagnosesQuery, claimDiagnosesObj, (err, results, fields) => {
					// 				if (err) {
					// 					console.error("Error inserting data into Members table:", err);
					// 					return;
					// 				}
					// 				console.log("claimDiagnoses data inserted successfully");
					// 			});
					// 		}
					// 	});
					// 	diagnoses.push(claimDiagnosesObj);
					// }

					// for (let procedure of e.flaggedProcedureCodes) {
					// 	claimProcedureObj.service_line_identifier = procedure.service_line_identifier;
					// 	claimProcedureObj.amountCharged = procedure.amountCharged;
					// 	const selectQueryForAppProcedure = `SELECT * FROM app_procedures WHERE code = ?`;
					// 	var proc;
					// 	connection.query(selectQueryForAppProcedure, [procedure.code], (err, results, fields) => {
					// 		if (err) {
					// 			console.error("Error executing query:", err);
					// 			return;
					// 		} else {
					// 			claimProcedureObj.procedureId = results[0].id;
					// 			console.log("proc:", results[0].id);
					// 			const claimsProceduresQuery = `INSERT INTO app_claimprocedures SET ?`;
					// 			connection.query(claimsProceduresQuery, claimProcedureObj, (err, results, fields) => {
					// 				if (err) {
					// 					console.error("Error inserting data into Members table:", err);
					// 					return;
					// 				}
					// 				console.log("claimsProcedures data inserted successfully");
					// 			});
					// 		}
					// 	});

					// 	procedures.push(claimProcedureObj);
					// }
				}

				res.send({ data: newData });
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.createClaimProcedures = async (req, res) => {
	try {
		const data = fs.readFileSync("./utils/synthe.json", "utf8");
		let newData = [];
		let count = 0;
		let members = [];
		let providers = [];
		let diagnoses = [];
		let procedures = [];
		let claims = [];
		let claimsarray = [];
		connection.connect(async (err) => {
			if (err) {
				console.error("Error connecting to database:", err);
				res.send({ message: "Error connecting to database:", err });
				return;
			} else {
				console.log("Connected to database");

				JSON.parse(data).forEach((e) => {
					newData.push(JSON.parse(e));
				});

				for (let e of newData) {
					// let claimProviderObj = {
					// 	providerType: e.providers[0].providerType
					// };
					// let claimDiagnosesObj = {};
					let claimProcedureObj = {};
					const selectQueryForClaims = `SELECT * FROM app_claims WHERE code = ?`;

					connection.query(selectQueryForClaims, [e.claimId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							console.log(results[0]);
							// claimProviderObj.claimId = results[0].id;
							// claimDiagnosesObj.claimId = results[0].id;
							claimProcedureObj.claimId = results[0].id;
							console.log("Claim:", results[0].id);

							const selectQueryForDiagnoses = `SELECT * FROM app_claimdiagnoses WHERE providerId = ?`;
							connection.query(selectQueryForDiagnoses, [diag.code], (err, results, fields) => {
								if (err) {
									console.error("Error executing query:", err);
									return;
								} else {
									claimDiagnosesObj.diagnosisId = results[0].id;
									console.log("diagnoses:", results[0].id);
									const claimsDiagnosesQuery = `INSERT INTO app_claimdiagnoses SET ?`;
									connection.query(claimsDiagnosesQuery, claimDiagnosesObj, (err, results, fields) => {
										if (err) {
											console.error("Error inserting data into Members table:", err);
											return;
										}
										console.log("ClaimProvider data inserted successfully");
									});
								}
							});
						}
					});

					// for (let diag of e.diagnoses) {
					// 	const selectQueryForappDiagnoses = `SELECT * FROM app_diagnoses WHERE code = ?`;
					// 	connection.query(selectQueryForappDiagnoses, [diag.code], (err, results, fields) => {
					// 		if (err) {
					// 			console.error("Error executing query:", err);
					// 			return;
					// 		} else {
					// 			claimDiagnosesObj.diagnosisId = results[0].id;
					// 			console.log("diag:", diag.code);
					// 			const claimDiagnosesQuery = `INSERT INTO app_claimprocedures SET ?`;
					// 			connection.query(claimDiagnosesQuery, claimDiagnosesObj, (err, results, fields) => {
					// 				if (err) {
					// 					console.error("Error inserting data into Members table:", err);
					// 					return;
					// 				}
					// 				console.log("claimDiagnoses data inserted successfully");
					// 			});
					// 		}
					// 	});
					// 	diagnoses.push(claimDiagnosesObj);
					// }

					// for (let procedure of e.flaggedProcedureCodes) {
					// 	claimProcedureObj.service_line_identifier = procedure.service_line_identifier;
					// 	claimProcedureObj.amountCharged = procedure.amountCharged;
					// 	const selectQueryForAppProcedure = `SELECT * FROM app_procedures WHERE code = ?`;
					// 	var proc;
					// 	connection.query(selectQueryForAppProcedure, [procedure.code], (err, results, fields) => {
					// 		if (err) {
					// 			console.error("Error executing query:", err);
					// 			return;
					// 		} else {
					// 			claimProcedureObj.procedureId = results[0].id;
					// 			console.log("proc:", results[0].id);
					// 			const claimsProceduresQuery = `INSERT INTO app_claimprocedures SET ?`;
					// 			connection.query(claimsProceduresQuery, claimProcedureObj, (err, results, fields) => {
					// 				if (err) {
					// 					console.error("Error inserting data into Members table:", err);
					// 					return;
					// 				}
					// 				console.log("claimsProcedures data inserted successfully");
					// 			});
					// 		}
					// 	});

					// 	procedures.push(claimProcedureObj);
					// }
				}

				res.send({ data: newData });
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};
