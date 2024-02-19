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

		JSON.parse(data).forEach((e) => {
			newData.push(JSON.parse(e));
		});

		for (e of newData) {
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
		}

		let mem = removeDuplicates(members, "memberId");
		let pro = removeDuplicates(providers, "providerId");
		let diag = removeDuplicates(diagnoses, "code");
		let proce = removeDuplicates(procedures, "code");

		let createMember = await Members.bulkCreate(mem);
		let createProvider = await Providers.bulkCreate(pro);
		let createDiagnoses = await Diagnoses.bulkCreate(diag);
		let createProcedures = await Procedure.bulkCreate(proce);

		// await Promise.all([
		// 	Members.bulkCreate(mem),
		// 	Providers.bulkCreate(pro),
		// 	Diagnoses.bulkCreate(diag)
		// 	// Procedure.bulkCreate(proce)
		// ]);

		res.send({ data: newData });
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

			let checkMember = await Members.findOne({ where: { memberId: e.member.memberId } });
			claimObj.memberId = checkMember.id;

			// claims.push(claimObj);
			// let createClaims = await Claims.create(claimObj);
			claimsarray.push(claimObj);
		}

		let createClaims = await Claims.bulkCreate(claimsarray);

		for (let e of newData) {
			let claim = await Claims.findOne({ where: { claimId: e.claimId } });
			let findProvider = await Providers.findOne({ where: { providerId: e.providers[0].providerId } });

			let claimProviderObj = {
				claimId: claim.id,
				providerId: findProvider.id,
				providerType: e.providers[0].providerType
			};
			claims.push(claimProviderObj);

			// let createClaimProvider = await ClaimProviders.create(claimProviderObj);

			for (let diag of e.diagnoses) {
				let findDiagnose = await Diagnoses.findOne({ where: { code: diag.code } });
				if (findDiagnose) {
					let claimDiagnosesObj = {
						claimId: claim.id,
						diagnosisId: findDiagnose.id
					};
					diagnoses.push(claimDiagnosesObj);
					// let crateClaimDiagnoses = await ClaimDiagnoses.create(claimDiagnosesObj);
				}
			}
			for (let procedure of e.flaggedProcedureCodes) {
				let findProcedure = await Procedure.findOne({ where: { code: procedure.code } });
				if (findProcedure) {
					let claimProcedureObj = {
						claimId: claim.id,
						procedureId: findProcedure.id,
						service_line_identifier: procedure.service_line_identifier,
						amountCharged: procedure.amountCharged
					};
					procedures.push(claimProcedureObj);
					// let crateClaimDiagnoses = await ClaimProcedures.create(claimProcedureObj);
				}
			}
		}
		let createClaimProviders = await ClaimProviders.bulkCreate(claims);
		let createClaimProcedures = await ClaimProcedures.bulkCreate(procedures);
		let createClaimDiagnoses = await ClaimDiagnoses.bulkCreate(diagnoses);

		// let createClaims = await Claims.bulkCreate(claims);

		res.send({ data: newData });
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

		let physicianFlgged = [];
		let physicianFlggedCharges = [];
		for (let e of physicianFlaggedChargesTop) {
			let findProvider = await Providers.findOne({ where: { providerId: e.servicingPhysicianId } });

			let physicianObj = {
				providerId: findProvider.id,
				claimSubmissionYear: e.claimSubmissionYear,
				top1Hcpcs: e.top1Hcpcs,
				top1HcpcsDescription: e.top1HcpcsDescription,
				top1FlaggedAmt: e.top1FlaggedAmt,
				top2Hcpcs: e.top2Hcpcs,
				top2HcpcsDescription: e.top2HcpcsDescription,
				top2FlaggedAmt: e.top2FlaggedAmt,
				top3Hcpcs: e.top3Hcpcs,
				top3HcpcsDescription: e.top3HcpcsDescription,
				top3FlaggedAmt: e.top3FlaggedAmt
			};

			physicianFlgged.push(physicianObj);
		}
		for (let e of physicianFlaggedCharges) {
			let findProvider = await Providers.findOne({ where: { providerId: e.servicingPhysicianId } });
			console.log(e.flaggedChargedAmount);
			let physicianChargesObj = {
				providerId: findProvider.id,
				claimSubmissionYear: e.claimSubmissionYear,
				flaggedChargedAmount: e.flaggedChargedAmount
			};

			physicianFlggedCharges.push(physicianChargesObj);
		}

		let createPhysicianFlaggedTop = await PhysicianFlaggedTop.bulkCreate(physicianFlgged);
		let createPhysicianFlaggedCharges = await PhysicianFlaggedCharges.bulkCreate(physicianFlggedCharges);

		res.send({ physicianFlgged, physicianFlggedCharges });
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
