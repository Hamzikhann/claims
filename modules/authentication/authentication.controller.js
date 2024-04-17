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
					e.member.isActive = "Y";
					members.push(e.member);

					e.providers.forEach((provider) => {
						provider.isActive = "Y";
						providers.push(provider);
					});

					e.diagnoses.forEach((diagnose) => {
						diagnose.isActive = "Y";
						diagnoses.push(diagnose);
					});

					e.flaggedProcedureCodes.forEach((procdere) => {
						let proedureObj = {
							isActive: "Y",
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
						chargesFlagged: e.chargesFlagged ? e.chargesFlagged : 0,
						chargesTotal: e.chargesTotal ? e.chargesTotal : 0,
						flaggedReason: e.flaggedReason,
						claimType: e.claimType,
						serviceType: e.serviceType,
						medicalRecordReviewRecommendation: e.medicalRecordReviewRecommendation,
						medicalRecordReviewNotes: e.medicalRecordReviewNotes,
						billingOrganization: e.billingOrganization,
						billingID: e.billingID,
						claimFlagged: e.claimFlagged,
						isActive: "Y"
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

				for (let e of physicianFlaggedChargesTop) {
					const selectQueryForAppProviders = `SELECT * FROM app_providers WHERE providerId = ?`;

					connection.query(selectQueryForAppProviders, [e.servicingPhysicianId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							console.log("Connected to database");
							let physicianObj = {
								providerId: results[0].id,
								claimSubmissionYear: e.claimSubmissionYear,
								top1Hcpcs: e.top1Hcpcs,
								top1HcpcsDescription: e.top1HcpcsDescription,
								top1FlaggedAmt: e.top1FlaggedAmt,
								top2Hcpcs: e.top2Hcpcs,
								top2HcpcsDescription: e.top2HcpcsDescription,
								top2FlaggedAmt: e.top2FlaggedAmt,
								top3Hcpcs: e.top3Hcpcs,
								top3HcpcsDescription: e.top3HcpcsDescription,
								top3FlaggedAmt: e.top3FlaggedAmt,
								isActive: "Y"
							};
							const physicianFlaggedChargesTopQuery = `INSERT INTO app_physicianflaggedchargestophcpcs SET ?`;
							connection.query(physicianFlaggedChargesTopQuery, physicianObj, (err, results, fields) => {
								if (err) {
									console.error("Error inserting data into Members table:", err);
									return;
								}
								console.log("physicianFlaggedChargesTop data inserted successfully");
							});
						}
					});
				}
				// for (let e of physicianFlaggedCharges) {
				// 	// let findProvider = await Providers.findOne({ where: { providerId: e.servicingPhysicianId } });
				// 	// console.log(e.flaggedChargedAmount);

				// 	const selectQueryForAppProviders = `SELECT * FROM app_providers WHERE providerId = ?`;

				// 	connection.query(selectQueryForAppProviders, [e.servicingPhysicianId], (err, results, fields) => {
				// 		if (err) {
				// 			console.error("Error executing query:", err);
				// 			return;
				// 		} else {
				// 			console.log("Connected to database");
				// 			let physicianChargesObj = {
				// 				providerId: results[0].id,
				// 				claimSubmissionYear: e.claimSubmissionYear,
				// 				flaggedChargedAmount: e.flaggedChargedAmount,
				// 				isActive: "Y"
				// 			};

				// 			const physicianFlaggedChargesQuery = `INSERT INTO app_physicianflaggedcharges SET ?`;
				// 			connection.query(physicianFlaggedChargesQuery, physicianChargesObj, (err, results, fields) => {
				// 				if (err) {
				// 					console.error("Error inserting data into Members table:", err);
				// 					return;
				// 				}
				// 				console.log("app_physicianflaggedcharges data inserted successfully");
				// 			});
				// 		}
				// 	});
				// }

				// let createPhysicianFlaggedTop = await PhysicianFlaggedTop.bulkCreate(physicianFlgged);
				// let createPhysicianFlaggedCharges = await PhysicianFlaggedCharges.bulkCreate(physicianFlggedCharges);

				res.send({ physicianFlaggedCharges });
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
					const selectQueryForClaims = `SELECT * FROM app_claims WHERE claimId = ?`;

					connection.query(selectQueryForClaims, [e.claimId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							claimProviderObj.claimId = results[0].id;
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
		let diagnoses = [];
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
					let claimDiagnosesObj = {
						isActive: "Y"
					};
					const selectQueryForClaims = `SELECT * FROM app_claims WHERE claimId = ?`;

					connection.query(selectQueryForClaims, [e.claimId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							claimDiagnosesObj.claimId = results[0].id;
							console.log("Claim:", results[0].id);
							for (let diag of e.diagnoses) {
								const selectQueryForappDiagnoses = `SELECT * FROM app_diagnoses WHERE code = ?`;
								console.log("code ", diag.code);
								if (diag.code !== "N/A") {
									connection.query(selectQueryForappDiagnoses, [diag.code], (err, results, fields) => {
										if (err) {
											console.error("Error executing query:", err);
											return;
										} else {
											if (results[0]) {
												claimDiagnosesObj.diagnosisId = results[0].id;
												console.log("id ", results[0].id);
												const claimDiagnosesQuery = `INSERT INTO app_claimdiagnoses SET ?`;
												connection.query(claimDiagnosesQuery, claimDiagnosesObj, (err, results, fields) => {
													if (err) {
														console.error("Error inserting data into Members table:", err);
														return;
													}
													console.log("claimDiagnoses data inserted successfully");
												});
											}
										}
									});
								}
								diagnoses.push(claimDiagnosesObj);
							}
						}
					});
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
					let claimProcedureObj = {
						isActive: "Y"
					};
					const selectQueryForClaims = `SELECT * FROM app_claims WHERE claimId = ?`;

					connection.query(selectQueryForClaims, [e.claimId], (err, results, fields) => {
						if (err) {
							console.error("Error executing query:", err);
							return;
						} else {
							claimProcedureObj.claimId = results[0].id;
							console.log("Claim:", results[0].id);
							if (e.flaggedProcedureCodes.length) {
								for (let procedure of e.flaggedProcedureCodes) {
									claimProcedureObj.service_line_identifier = procedure.service_line_identifier;
									claimProcedureObj.amountCharged = procedure.amountCharged;
									claimProcedureObj.isFlagged = 1;
									const selectQueryForAppProcedure = `SELECT * FROM app_procedures WHERE code = ?`;
									connection.query(selectQueryForAppProcedure, [procedure.code], (err, results, fields) => {
										if (err) {
											console.error("Error executing query:", err);
											return;
										} else {
											claimProcedureObj.procedureId = results[0].id;
											console.log("proc:", results[0].id);
											const claimsProceduresQuery = `INSERT INTO app_claimprocedures SET ?`;
											connection.query(claimsProceduresQuery, claimProcedureObj, (err, results, fields) => {
												if (err) {
													console.error("Error inserting data into Members table:", err);
													return;
												}
												console.log("claimsProcedures data inserted successfully");
											});
										}
									});
								}
							} else if (e.otherProcedureCodes.length) {
								for (let procedure of e.otherProcedureCodes) {
									claimProcedureObj.service_line_identifier = procedure.service_line_identifier;
									claimProcedureObj.amountCharged = procedure.amountCharged;
									claimProcedureObj.isFlagged = 1;
									const selectQueryForAppProcedure = `SELECT * FROM app_procedures WHERE code = ?`;
									connection.query(selectQueryForAppProcedure, [procedure.code], (err, results, fields) => {
										if (err) {
											console.error("Error executing query:", err);
											return;
										} else {
											if (results[0]) {
												claimProcedureObj.procedureId = results[0].id;
												console.log("proc:", results[0].id);
												const claimsProceduresQuery = `INSERT INTO app_claimprocedures SET ?`;
												connection.query(claimsProceduresQuery, claimProcedureObj, (err, results, fields) => {
													if (err) {
														console.error("Error inserting data into Members table:", err);
														return;
													}
													console.log("claimsProcedures data inserted successfully");
												});
											}
										}
									});
								}
							}
						}
					});
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
